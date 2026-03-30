import React from 'react';
import { Languages, User, Save, Eye, EyeOff, Type, Sun, VolumeX } from 'lucide-react';
import { SubtitleTrack, TTSSettings } from '../types';

interface ControlsProps {
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
  voices: SpeechSynthesisVoice[];
  tracks: SubtitleTrack[];
  selectedTrackId: string;
  onTrackChange: (trackId: string) => void;
  onSave: () => void;
  isDark?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ 
  settings,
  onSettingsChange,
  voices, 
  tracks, 
  selectedTrackId, 
  onTrackChange,
  onSave,
  isDark
}) => {
  return (
    <div className={`${isDark ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-4 shadow-sm space-y-5`}>
      {/* Language Selection */}
      <div className="space-y-2">
        <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
          <Languages size={14} className="text-blue-500" />
          目标语言 (Target Language)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {tracks.map(track => (
            <button 
              key={track.id}
              onClick={() => onTrackChange(track.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
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
      <div className="space-y-2">
        <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
          <User size={14} className="text-blue-500" />
          发音人 (Voice)
        </label>
        <select 
          value={settings.voice}
          onChange={(e) => onSettingsChange({ ...settings, voice: e.target.value })}
          className={`w-full ${isDark ? 'bg-[#2d2d2d] border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
        >
          {voices.map(voice => (
            <option key={voice.name} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>
      </div>

      {/* Overlay Settings */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
            <Eye size={14} className="text-blue-500" />
            视频内显示字幕
          </label>
          <button 
            onClick={() => onSettingsChange({ ...settings, showOverlay: !settings.showOverlay })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.showOverlay ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showOverlay ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
            <EyeOff size={14} className="text-blue-500" />
            弹窗内显示列表
          </label>
          <button 
            onClick={() => onSettingsChange({ ...settings, showPopupList: !settings.showPopupList })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.showPopupList ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showPopupList ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
            <VolumeX size={14} className="text-blue-500" />
            消除原声 (Mute Original)
          </label>
          <button 
            onClick={() => onSettingsChange({ ...settings, muteOriginal: !settings.muteOriginal })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.muteOriginal ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.muteOriginal ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
              <Sun size={12} />
              字幕透明度 ({Math.round(settings.overlayOpacity * 100)}%)
            </label>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1"
            value={settings.overlayOpacity}
            onChange={(e) => onSettingsChange({ ...settings, overlayOpacity: parseFloat(e.target.value) })}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
              <Type size={12} />
              字幕大小 ({settings.overlaySize}px)
            </label>
          </div>
          <input 
            type="range" 
            min="12" 
            max="48" 
            step="2"
            value={settings.overlaySize}
            onChange={(e) => onSettingsChange({ ...settings, overlaySize: parseInt(e.target.value) })}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Save Button */}
      <button 
        onClick={onSave}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-[11px] font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
      >
        <Save size={14} />
        保存设置 (Save Settings)
      </button>
    </div>
  );
};
