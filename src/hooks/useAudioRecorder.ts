import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioData: Uint8Array | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

// Convert Float32Array PCM samples to WAV Blob
const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

// Calculate RMS audio level from samples
const calculateRMS = (samples: Float32Array): number => {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
};

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number>();
  const samplesRef = useRef<Float32Array[]>([]);
  const peakLevelRef = useRef(0);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    setAudioData(dataArray);
    
    // Calculate current level for display
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avgLevel = sum / dataArray.length / 255;
    setAudioLevel(avgLevel);
    
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      samplesRef.current = [];
      peakLevelRef.current = 0;
      
      // Request audio with specific settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true, // Enable auto gain to help with quiet audio
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio context
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Set up analyser for visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Set up script processor for raw PCM capture
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone the data since it gets reused
        const clone = new Float32Array(inputData);
        samplesRef.current.push(clone);
        
        // Track peak level
        const rms = calculateRMS(clone);
        if (rms > peakLevelRef.current) {
          peakLevelRef.current = rms;
        }
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setIsRecording(true);
      updateAudioData();
      
      console.log('Recording started at', audioContextRef.current.sampleRate, 'Hz');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Error accessing microphone:', err);
    }
  }, [updateAudioData]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setAudioLevel(0);
      
      // Combine all samples into one array
      const totalLength = samplesRef.current.reduce((acc, arr) => acc + arr.length, 0);
      const combinedSamples = new Float32Array(totalLength);
      let offset = 0;
      
      for (const samples of samplesRef.current) {
        combinedSamples.set(samples, offset);
        offset += samples.length;
      }
      
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (combinedSamples.length === 0) {
        console.error('No audio samples captured');
        resolve(null);
        return;
      }
      
      // Calculate overall RMS to check if audio is too quiet
      const overallRMS = calculateRMS(combinedSamples);
      
      console.log('Audio analysis:', {
        samples: combinedSamples.length,
        duration: (combinedSamples.length / sampleRate).toFixed(2) + 's',
        peakLevel: peakLevelRef.current.toFixed(4),
        rmsLevel: overallRMS.toFixed(4),
        isSilent: overallRMS < 0.001
      });
      
      // Warn if audio seems too quiet
      if (overallRMS < 0.001) {
        console.warn('Audio appears to be very quiet or silent. Make sure music is playing near the microphone.');
      }
      
      // Convert to WAV
      const wavBlob = encodeWAV(combinedSamples, sampleRate);
      
      console.log('WAV audio created:', {
        size: wavBlob.size,
        sizeKB: (wavBlob.size / 1024).toFixed(2) + ' KB',
        type: wavBlob.type
      });
      
      resolve(wavBlob);
    });
  }, []);

  return {
    isRecording,
    audioData,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  };
};
