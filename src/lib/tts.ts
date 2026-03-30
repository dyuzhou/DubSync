import { Subtitle, TTSSettings } from "../types";

export class TTSManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSubtitle: Subtitle | null = null;
  private pendingSettings: TTSSettings | null = null;
  private pendingRateOverride: number | undefined = undefined;
  private readonly maxRate = 4.0;

  private isChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  private getBrowserVoice(text: string, settings: TTSSettings): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const target = settings.voice?.toLowerCase() || '';
    const exactMatch = voices.find(voice => voice.name.toLowerCase() === target || voice.voiceURI.toLowerCase() === target);
    if (exactMatch) return exactMatch;

    const partialMatch = voices.find(voice => voice.name.toLowerCase().includes(target) || voice.lang.toLowerCase().includes(target));
    if (partialMatch) return partialMatch;

    if (this.isChinese(text)) {
      return voices.find(voice => voice.lang.toLowerCase().startsWith('zh')) || voices[0];
    }

    return voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || voices[0];
  }

  private getEffectiveRate(settings: TTSSettings, rateOverride?: number) {
    const baseRate = rateOverride ?? settings.playbackRate;
    return Math.max(0.1, Math.min(baseRate, this.maxRate));
  }

  private speakWithBrowserTTS(text: string, settings: TTSSettings, rateOverride?: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Browser SpeechSynthesis is not available in this environment.');
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.isChinese(text) ? 'zh-CN' : 'en-US';
    utterance.volume = settings.volume;
    utterance.rate = this.getEffectiveRate(settings, rateOverride);
    utterance.pitch = Math.max(0.1, Math.min(settings.pitch, 2));

    const browserVoice = this.getBrowserVoice(text, settings);
    if (browserVoice) {
      utterance.voice = browserVoice;
    }

    utterance.onend = () => {
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
      if (this.pendingSubtitle && this.pendingSettings) {
        const nextSubtitle = this.pendingSubtitle;
        const nextSettings = this.pendingSettings;
        const nextRate = this.pendingRateOverride;
        this.pendingSubtitle = null;
        this.pendingSettings = null;
        this.pendingRateOverride = undefined;
        this.speak(nextSubtitle, nextSettings, nextRate);
      }
    };
    utterance.onerror = (event) => {
      console.error('DubSync: Browser TTS error', event.error || event);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async prefetch(subtitles: Subtitle[], settings: TTSSettings) {
    // Prefetch is not needed for built-in browser TTS.
    return;
  }

  async speak(subtitle: Subtitle, settings: TTSSettings, rateOverride?: number) {
    if (!this.isChinese(subtitle.text)) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && this.currentUtterance) {
      this.pendingSubtitle = subtitle;
      this.pendingSettings = settings;
      this.pendingRateOverride = rateOverride;
      return;
    }

    try {
      this.speakWithBrowserTTS(subtitle.text, settings, rateOverride);
    } catch (e) {
      console.error('DubSync: Failed to speak with browser TTS', e);
    }
  }

  stop() {
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.pendingSubtitle = null;
    this.pendingSettings = null;
    this.pendingRateOverride = undefined;
  }

  clearCache() {
    // No cache needed for built-in browser TTS.
  }
}

export const ttsManager = new TTSManager();
