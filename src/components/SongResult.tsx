import { motion } from 'framer-motion';
import { Music, ExternalLink, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface SongData {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  releaseDate?: string;
  externalUrl?: string;
}

interface SongResultProps {
  song: SongData;
  delay?: number;
}

export const SongResult = ({ song, delay = 0 }: SongResultProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
        <div className="flex gap-6">
          {/* Album Art */}
          <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {song.albumArt ? (
              <img
                src={song.albumArt}
                alt={song.album || 'Album art'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                <Music className="w-12 h-12 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-foreground mb-2 truncate">
              {song.title}
            </h3>
            <p className="text-lg text-muted-foreground mb-3 truncate">
              {song.artist}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {song.album && (
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span className="truncate">{song.album}</span>
                </div>
              )}
              {song.releaseDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{song.releaseDate}</span>
                </div>
              )}
            </div>

            {song.externalUrl && (
              <a
                href={song.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 transition-colors"
              >
                <span className="text-sm font-medium">Listen on Spotify</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
