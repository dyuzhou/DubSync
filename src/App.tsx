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
  const [tracks, setTracks] = useState<any[]>([]);
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
      showOverlay: true,
      overlayOpacity: 0.8,
      overlaySize: 24,
      showPopupList: false,
    };
  });

  const lastSubtitleId = useRef<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, playbackRate, currentTime: ytTime, isDark: ytIsDark, tracks: ytTracks, subtitles: ytSubtitles } = event.data;
      
      if (type === 'YOUTUBE_TRACKS_FOUND' && ytTracks) {
        setTracks(ytTracks);
        // Auto-select first track if none selected
        if (ytTracks.length > 0 && !selectedTrackId) {
          const savedTrackId = localStorage.getItem('vidpilot_track_id');
          const trackToSelect = ytTracks.find((t: any) => t.id === savedTrackId) || ytTracks[0];
          setSelectedTrackId(trackToSelect.id);
        }
      }

      if (type === 'YOUTUBE_SUBTITLES_LOADED' && ytSubtitles) {
        setTracks(prev => prev.map(t => 
          t.id === selectedTrackId ? { ...t, subtitles: ytSubtitles } : t
        ));
      }

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
  }, [selectedTrackId]);

  useEffect(() => {
    const currentTrack = tracks.find(t => t.id === selectedTrackId);
    if (currentTrack && !currentTrack.subtitles) {
      window.postMessage({
        type: 'FETCH_YOUTUBE_SUBTITLES',
        baseUrl: currentTrack.baseUrl
      }, '*');
    }
  }, [selectedTrackId, tracks]);

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
    const currentTrack = tracks.find(t => t.id === selectedTrackId);
    if (!currentTrack || !currentTrack.subtitles) return;
    
    const activeSubtitle = currentTrack.subtitles.find(
      (sub: any) => currentTime >= sub.start && currentTime < sub.start + sub.duration
    );
    
    // Update overlay
    window.postMessage({
      type: 'DUB_SUBTITLE_UPDATE',
      text: activeSubtitle?.text || '',
      settings: {
        showOverlay: settings.showOverlay,
        overlayOpacity: settings.overlayOpacity,
        overlaySize: settings.overlaySize
      }
    }, '*');

    if (isPlaying && activeSubtitle && activeSubtitle.id !== lastSubtitleId.current) {
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
    <div className={`w-full max-h-[600px] overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8f9fb]'} flex flex-col py-4 px-4 transition-colors duration-300`}>
      <div className="w-full space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="text-white" size={14} />
            </div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>DubSync</h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`text-[9px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-tighter`}>
              {isPlaying ? '正在同步 (Syncing)' : '视频已暂停 (Paused)'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Controls Area */}
          <Controls 
            settings={settings}
            onSettingsChange={setSettings}
            voices={voices}
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            onTrackChange={setSelectedTrackId}
            onSave={saveSettings}
            isDark={isDark}
          />

          {/* Subtitle List Area - Conditional */}
          {settings.showPopupList && (
            <div className={`${isDark ? 'bg-[#1e1e1e] border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-3 shadow-sm`}>
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <Youtube size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">实时字幕流</span>
              </div>
              <SubtitleList 
                subtitles={selectedTrack?.subtitles || []}
                currentTime={currentTime}
                isDark={isDark}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
