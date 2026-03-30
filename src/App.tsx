/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { SubtitleList } from './components/SubtitleList';
import { SubtitleTrack, TTSSettings } from './types';
import { fetchSubtitleTracks } from './lib/youtube';
import { ttsManager } from './lib/tts';
import { Youtube, Zap } from 'lucide-react';

export default function App() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [settings, setSettings] = useState<TTSSettings>(() => {
    const saved = localStorage.getItem('vidpilot_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return {
      engine: 'edge',
      voice: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoSync: true,
      playbackRate: 1.0,
    };
  });

  const lastSubtitleId = useRef<string | null>(null);
  const videoDuration = 30;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, playbackRate, currentTime: ytTime, isDark: ytIsDark } = event.data;
      if (type === 'YOUTUBE_RATE_CHANGE' && playbackRate !== undefined) {
        setSettings(s => ({ ...s, playbackRate }));
      }
      if (type === 'YOUTUBE_TIME_UPDATE' && ytTime !== undefined) {
        setCurrentTime(ytTime);
      }
      if (type === 'YOUTUBE_THEME_CHANGE' && ytIsDark !== undefined) {
        setIsDark(ytIsDark);
      }
      if (type === 'YOUTUBE_PLAY') setIsPlaying(true);
      if (type === 'YOUTUBE_PAUSE') setIsPlaying(false);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !settings.voice) {
        const preferred = availableVoices.find(v => 
          v.name.toLowerCase().includes('xiaoxiao') || 
          v.name.toLowerCase().includes('microsoft xiaoxiao')
        ) || availableVoices[0];
        setSettings(s => ({ ...s, voice: preferred.name }));
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [settings.voice]);

  useEffect(() => {
    fetchSubtitleTracks('mock-video-id').then(data => {
      setTracks(data);
      const savedTrackId = localStorage.getItem('vidpilot_track_id');
      if (savedTrackId && data.some(t => t.id === savedTrackId)) {
        setSelectedTrackId(savedTrackId);
      } else if (data.length > 0) {
        setSelectedTrackId(data[1].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      ttsManager.stop();
      return;
    }
    const currentTrack = tracks.find(t => t.id === selectedTrackId);
    if (!currentTrack) return;
    const activeSubtitle = currentTrack.subtitles.find(
      sub => currentTime >= sub.start && currentTime < sub.start + sub.duration
    );
    if (activeSubtitle && activeSubtitle.id !== lastSubtitleId.current) {
      lastSubtitleId.current = activeSubtitle.id;
      ttsManager.speak(activeSubtitle, settings);
    } else if (!activeSubtitle) {
      lastSubtitleId.current = null;
    }
  }, [currentTime, isPlaying, selectedTrackId, tracks, settings]);

  const saveSettings = () => {
    localStorage.setItem('vidpilot_settings', JSON.stringify(settings));
    localStorage.setItem('vidpilot_track_id', selectedTrackId);
    alert('设置已保存 (Settings saved)');
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8f9fb]'} flex flex-col items-center py-12 px-4 transition-colors duration-300`}>
      <div className="w-full max-w-4xl space-y-12">
        {/* Streamlit-style Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="text-white" size={20} />
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>DubSync</h1>
          </div>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm max-w-xl`}>
            基于 Edge TTS 的 YouTube 视频自动翻译朗读工具。
            完美适配视频语速，提供最自然的发音体验。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Controls Sidebar Style */}
          <div className="md:col-span-1">
            <Controls 
              selectedVoice={settings.voice}
              onVoiceChange={(voice) => setSettings(s => ({ ...s, voice }))}
              voices={voices}
              tracks={tracks}
              selectedTrackId={selectedTrackId}
              onTrackChange={setSelectedTrackId}
              onSave={saveSettings}
              isDark={isDark}
            />
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-8">
            <div className={`${isDark ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-gray-400">
                  <Youtube size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">实时字幕流</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'} uppercase tracking-tighter`}>
                    {isPlaying ? '正在同步播放' : '已暂停'}
                  </span>
                </div>
              </div>
              <SubtitleList 
                subtitles={selectedTrack?.subtitles || []}
                currentTime={currentTime}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
