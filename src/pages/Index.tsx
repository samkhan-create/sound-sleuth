import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Sparkles } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { SongResult, SongData } from '@/components/SongResult';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [searchResult, setSearchResult] = useState<SongData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { isRecording, audioData, startRecording, stopRecording, error } = useAudioRecorder();
  const { toast } = useToast();

  const handleListenClick = async () => {
    if (isListening) {
      // Stop listening
      const audioBlob = stopRecording();
      setIsListening(false);
      
      if (audioBlob) {
        setIsSearching(true);
        
        // Simulate API call - In production, this would call a real music recognition API
        setTimeout(() => {
          // Mock result
          const mockResult: SongData = {
            title: "Bohemian Rhapsody",
            artist: "Queen",
            album: "A Night at the Opera",
            releaseDate: "1975",
            externalUrl: "https://open.spotify.com/track/example"
          };
          
          setSearchResult(mockResult);
          setIsSearching(false);
          
          toast({
            title: "Song Found! 🎵",
            description: `${mockResult.title} by ${mockResult.artist}`,
          });
        }, 2000);
      }
    } else {
      // Start listening
      await startRecording();
      setIsListening(true);
      setSearchResult(null);
    }
  };

  if (error) {
    toast({
      title: "Microphone Error",
      description: error,
      variant: "destructive",
    });
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-primary">
                <Music2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Sound Search
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover any song in seconds. Just play it and let us identify it for you.
            </p>
          </motion.div>

          {/* Main listening area */}
          <div className="space-y-8 mb-12">
            <AudioVisualizer isListening={isListening} audioData={audioData || undefined} />
            
            <div className="flex justify-center">
              <ListenButton isListening={isListening} onClick={handleListenClick} />
            </div>

            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-3 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-lg font-medium">Identifying song...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Results */}
          {searchResult && (
            <div className="space-y-6">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-bold text-foreground"
              >
                Found It! 🎉
              </motion.h2>
              <SongResult song={searchResult} />
            </div>
          )}

          {/* Instructions */}
          {!searchResult && !isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 p-8 rounded-2xl bg-card/50 border border-border"
            >
              <h3 className="text-xl font-semibold text-foreground mb-4">How it works</h3>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span>Press the microphone button to start listening</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span>Play the song you want to identify (5-10 seconds is enough)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span>Press the button again to stop and get instant results</span>
                </li>
              </ol>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
