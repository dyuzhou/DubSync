import { Subtitle, TTSSettings } from "../types";
import { EdgeTTS } from 'edge-tts-universal';

export class TTSManager {
  private audioCache: Map<string, string> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private isPrefetching = false;

  private isChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  private formatProsody(value: number, isRate: boolean = false): string {
    const percent = Math.round((value - 1) * 100);
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent}%`;
  }

  async prefetch(subtitles: Subtitle[], settings: TTSSettings) {
    if (this.isPrefetching) return;
    this.isPrefetching = true;

    try {
      // Only prefetch translated (Chinese) text
      const toFetch = subtitles.filter(sub => this.isChinese(sub.text) && !this.audioCache.has(sub.id));
      
      // Limit prefetch to next 20 subtitles to avoid overwhelming
      const limitedFetch = toFetch.slice(0, 20);

      for (const sub of limitedFetch) {
        if (this.audioCache.has(sub.id)) continue;
        
        try {
          const effectiveRate = settings.playbackRate;

          const tts = new EdgeTTS(sub.text, settings.voice, {
            rate: this.formatProsody(effectiveRate, true),
            volume: this.formatProsody(settings.volume)
          });
          const result = await tts.synthesize();
          const url = URL.createObjectURL(result.audio);
          this.audioCache.set(sub.id, url);
        } catch (e) {
          console.error(`DubSync: Failed to prefetch TTS for ${sub.id}`, e);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } finally {
      this.isPrefetching = false;
    }
  }

  async speak(subtitle: Subtitle, settings: TTSSettings) {
    this.stop();

    // Only speak translated (Chinese) text
    if (!this.isChinese(subtitle.text)) {
      return;
    }

    let audioUrl = this.audioCache.get(subtitle.id);

    if (!audioUrl) {
      try {
        const effectiveRate = settings.playbackRate;

        const tts = new EdgeTTS(subtitle.text, settings.voice, {
          rate: this.formatProsody(effectiveRate, true),
          volume: this.formatProsody(settings.volume)
        });
        const result = await tts.synthesize();
        audioUrl = URL.createObjectURL(result.audio);
        this.audioCache.set(subtitle.id, audioUrl);
      } catch (e) {
        console.error('DubSync: Failed to generate TTS on the fly', e);
        return;
      }
    }

    if (audioUrl) {
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.play().catch(e => console.error('DubSync: Failed to play TTS audio', e));
    }
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  clearCache() {
    this.audioCache.forEach(url => URL.revokeObjectURL(url));
    this.audioCache.clear();
  }
}

export const ttsManager = new TTSManager();
