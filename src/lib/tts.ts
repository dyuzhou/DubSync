import { Subtitle, TTSSettings } from "../types";

export class TTSManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentSubtitleId: string | null = null;
  private currentSegments: string[] = [];
  private currentSegmentIndex = 0;
  private pendingSubtitle: Subtitle | null = null;
  private pendingSettings: TTSSettings | null = null;
  private pendingRateOverride: number | undefined = undefined;
  private readonly maxRate = 5.0;

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

  private splitTextSegments(text: string): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    const matches = cleaned.match(/[^。.！？!?；;：…]+[。.！？!?；;：…]?/g);
    const baseSegments = matches ? matches.map(segment => segment.trim()).filter(Boolean) : [cleaned];

    // 额外拆分：如果单句超过60字，尝试找到最近的标点分割；否则按固定长度拆分
    const finalSegments: string[] = [];
    for (const segment of baseSegments) {
      if (segment.length <= 60) {
        finalSegments.push(segment);
        continue;
      }

      let cursor = 0;
      while (cursor < segment.length) {
        const remain = segment.slice(cursor);
        if (remain.length <= 60) {
          finalSegments.push(remain);
          break;
        }

        const indexAfterMin = remain.slice(60).search(/[。！？!?；;：…]/);
        if (indexAfterMin >= 0) {
          const splitPos = 60 + indexAfterMin + 1;
          finalSegments.push(remain.slice(0, splitPos));
          cursor += splitPos;
          continue;
        }

        // 如果 60 之后没有标点，则拿整段（按用户需求，不强制截断）
        finalSegments.push(remain);
        break;
      }
    }

    return finalSegments;
  }

  private speakSegment(text: string, settings: TTSSettings, rateOverride?: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Browser SpeechSynthesis is not available in this environment.');
    }

    this.cancelCurrentUtterance();

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
      const isLastSegment = this.currentSegmentIndex >= this.currentSegments.length - 1;
      if (!isLastSegment) {
        this.currentSegmentIndex += 1;
        this.playCurrentSegment(settings, rateOverride);
        return;
      }

      this.currentSubtitleId = null;
      this.currentSegments = [];
      this.currentSegmentIndex = 0;

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
      const error = (event as any).error;
      if (error === 'interrupted' || error === 'cancelled' || error === 'canceled') {
        return;
      }
      console.error('DubSync: Browser TTS error', error || event);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  private playCurrentSegment(settings: TTSSettings, rateOverride?: number) {
    const segment = this.currentSegments[this.currentSegmentIndex];
    if (!segment) {
      return;
    }
    this.speakSegment(segment, settings, rateOverride);
  }

  async prefetch(subtitles: Subtitle[], settings: TTSSettings) {
    // Prefetch is not needed for built-in browser TTS.
    return;
  }

  private cancelCurrentUtterance(clearPending: boolean = false) {
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    if (clearPending) {
      this.pendingSubtitle = null;
      this.pendingSettings = null;
      this.pendingRateOverride = undefined;
    }
  }

  async speak(subtitle: Subtitle, settings: TTSSettings, rateOverride?: number) {
    if (!this.isChinese(subtitle.text)) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && this.currentUtterance) {
      if (this.currentSubtitleId === subtitle.id) {
        return;
      }
      this.cancelCurrentUtterance(true);
    }

    this.currentSubtitleId = subtitle.id;
    this.currentSegments = this.splitTextSegments(subtitle.text);
    this.currentSegmentIndex = 0;

    try {
      this.playCurrentSegment(settings, rateOverride);
    } catch (e) {
      console.error('DubSync: Failed to speak with browser TTS', e);
    }
  }

  stop() {
    this.cancelCurrentUtterance(true);
    this.currentSubtitleId = null;
    this.currentSegments = [];
    this.currentSegmentIndex = 0;
  }

  clearCache() {
    // No cache needed for built-in browser TTS.
  }
}

export const ttsManager = new TTSManager();
