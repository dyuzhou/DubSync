import { Subtitle, TTSSettings } from "../types";

export class TTSManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

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

  private speakWithBrowserTTS(text: string, settings: TTSSettings) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Browser SpeechSynthesis is not available in this environment.');
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.isChinese(text) ? 'zh-CN' : 'en-US';
    utterance.volume = settings.volume;
    utterance.rate = Math.max(0.1, Math.min(settings.playbackRate, 2));
    utterance.pitch = Math.max(0.1, Math.min(settings.pitch, 2));

    const browserVoice = this.getBrowserVoice(text, settings);
    if (browserVoice) {
      utterance.voice = browserVoice;
    }

    utterance.onend = () => {
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
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

  async speak(subtitle: Subtitle, settings: TTSSettings) {
    this.stop();

    if (!this.isChinese(subtitle.text)) {
      return;
    }

    try {
      this.speakWithBrowserTTS(subtitle.text, settings);
    } catch (e) {
      console.error('DubSync: Failed to speak with browser TTS', e);
    }
  }

  stop() {
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  clearCache() {
    // No cache needed for built-in browser TTS.
  }
}

export const ttsManager = new TTSManager();
