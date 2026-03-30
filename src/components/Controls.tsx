import React from 'react';
import { Eye, EyeOff, FastForward, Save, User, VolumeX } from 'lucide-react';
import { SubtitleTrack, TTSSettings } from '../types';

interface ControlsProps {
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
  voices: any[];
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
    <div className={`${isDark ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-4 shadow-sm space-y-5 shrink-0`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>DubSync 设置</p>
          <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>即时 TTS 测试和播放配置</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSettingsChange({ ...settings, muteOriginal: !settings.muteOriginal })}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${settings.muteOriginal ? 'bg-blue-600 text-white' : isDark ? 'bg-[#2d2d2d] text-gray-300' : 'bg-gray-100 text-gray-700'}`}
          >
            <VolumeX size={14} />
            {settings.muteOriginal ? '已消声' : '原声'}
          </button>
        </div>
      </div>

      {/* TTS Engine Selection */}
      <div className="space-y-2">
        <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
          <FastForward size={14} className="text-blue-500" />
          TTS 引擎 (Engine)
        </label>
        <select
          value={settings.engine}
          onChange={(e) => onSettingsChange({ ...settings, engine: e.target.value as 'edge' | 'chrome' })}
          className={`w-full ${isDark ? 'bg-[#2d2d2d] border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'} rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
        >
          <option value="edge">Edge 内置 TTS</option>
          <option value="chrome">Chrome 内置 TTS</option>
        </select>
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
              {voice.displayName || voice.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sync Speed and Display */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
            <span className="text-blue-500">⚡</span>
            朗读速度跟随视频 ({settings.playbackRate.toFixed(2)}x)
          </label>
          <span className={`text-[10px] font-mono ${isDark ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50'} px-2 py-1 rounded border border-blue-500/20`}>
            SYNCED
          </span>
        </div>

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
      </div>

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
