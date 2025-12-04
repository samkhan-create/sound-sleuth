import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioData: Uint8Array | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

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
      audioChunksRef.current = [];
      
      // Request high-quality audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Use MediaRecorder with best available format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('Using MediaRecorder with MIME type:', selectedMimeType || 'default');
      
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
      };
      
      if (selectedMimeType) {
        options.mimeType = selectedMimeType;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Record in 1-second chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      updateAudioData();
      
      console.log('Recording started with MediaRecorder');
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
      
      setAudioLevel(0);
      
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }
      
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log('Audio recording completed:', {
          chunks: audioChunksRef.current.length,
          size: audioBlob.size,
          sizeKB: (audioBlob.size / 1024).toFixed(2) + ' KB',
          type: audioBlob.type
        });
        
        resolve(audioBlob);
      };
      
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      setIsRecording(false);
    });
  }, [isRecording]);

  return {
    isRecording,
    audioData,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  };
};
