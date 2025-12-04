import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioData: Uint8Array | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    setAudioData(dataArray);
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // Request high-quality audio for better recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Try different MIME types for better ACRCloud compatibility
      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('Using MIME type:', selectedMimeType || 'default');
      
      // Set up media recorder with higher bitrate for better quality
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
      
      // Request data more frequently for better chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      updateAudioData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('Error accessing microphone:', err);
    }
  }, [updateAudioData]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type,
            sizeKB: (audioBlob.size / 1024).toFixed(2) + ' KB'
          });
          resolve(audioBlob);
        };
        
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      } else {
        resolve(null);
      }
    });
  }, [isRecording]);

  return {
    isRecording,
    audioData,
    startRecording,
    stopRecording,
    error,
  };
};
