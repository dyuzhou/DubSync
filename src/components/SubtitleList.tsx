import React from 'react';
import { Subtitle } from '../types';
import { motion } from 'motion/react';

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime: number;
  isDark?: boolean;
}

export const SubtitleList: React.FC<SubtitleListProps> = ({ subtitles, currentTime, isDark }) => {
  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {subtitles.map((sub) => {
        const isActive = currentTime >= sub.start && currentTime < sub.start + sub.duration;
        return (
          <motion.div 
            key={sub.id}
            initial={false}
            animate={{ 
              backgroundColor: isActive 
                ? isDark ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)' 
                : 'transparent',
              borderColor: isActive 
                ? isDark ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.2)' 
                : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            }}
            className={`p-3 rounded-lg border text-xs transition-all ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500 bg-gray-800' : 'text-gray-400 bg-gray-100'} px-1.5 py-0.5 rounded`}>
                {formatTime(sub.start)}
              </span>
              {isActive && (
                <span className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                  READING
                </span>
              )}
            </div>
            <p className={`leading-snug font-medium ${
              isActive 
                ? isDark ? 'text-white' : 'text-gray-900' 
                : isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {sub.text}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
