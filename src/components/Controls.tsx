import React from 'react';
import { Languages, User, Save } from 'lucide-react';
import { SubtitleTrack } from '../types';

interface ControlsProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  voices: SpeechSynthesisVoice[];
  tracks: SubtitleTrack[];
  selectedTrackId: string;
  onTrackChange: (trackId: string) => void;
  onSave: () => void;
  isDark?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ 
  selectedVoice, 
  onVoiceChange, 
  voices, 
  tracks, 
  selectedTrackId, 
  onTrackChange,
  onSave,
  isDark
}) => {
  return (
    <div className={`${isDark ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm space-y-8`}>
      {/* Language Selection */}
      <div className="space-y-3">
        <label className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
          <Languages size={16} className="text-blue-500" />
          目标语言 (Target Language)
        </label>
        <div className="flex flex-wrap gap-2">
          {tracks.map(track => (
            <button 
              key={track.id}
              onClick={() => onTrackChange(track.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedTrackId === track.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                  : isDark 
                    ? 'bg-[#2d2d2d] border-gray-700 text-gray-400 hover:bg-[#3d3d3d]'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {track.language}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-3">
        <label className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
          <User size={16} className="text-blue-500" />
          发音人 (Voice)
        </label>
        <select 
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          className={`w-full ${isDark ? 'bg-[#2d2d2d] border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
        >
          {voices.map(voice => (
            <option key={voice.name} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <button 
        onClick={onSave}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
      >
        <Save size={16} />
        保存设置 (Save Settings)
      </button>
    </div>
  );
};
