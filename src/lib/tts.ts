import { Subtitle } from "../types";

export class TTSManager {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  speak(subtitle: Subtitle, settings: { voice: string; rate: number; pitch: number; volume: number; autoSync: boolean; playbackRate: number }) {
    this.stop();

    const utterance = new SpeechSynthesisUtterance(subtitle.text);
    
    // Find the voice
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === settings.voice) || voices[0];
    if (voice) utterance.voice = voice;

    // Calculate rate
    // 1. Base rate from user settings
    let finalRate = settings.rate;

    // 2. Adjust for video playback speed
    // If video is 2x, TTS must be 2x faster to keep up
    finalRate *= settings.playbackRate;

    // 3. AutoSync: Adjust to fit subtitle duration
    if (settings.autoSync && subtitle.duration > 0) {
      // Adjusted duration based on video playback speed
      const actualDuration = subtitle.duration / settings.playbackRate;
      
      // Estimate characters per second (rough heuristic for Chinese/English)
      // For English: ~15 chars/sec is normal (rate 1.0)
      // For Chinese: ~5 chars/sec is normal (rate 1.0)
      const isChinese = /[\u4e00-\u9fa5]/.test(subtitle.text);
      const charCount = subtitle.text.length;
      const baseCharsPerSec = isChinese ? 5 : 15;
      
      const estimatedDuration = charCount / baseCharsPerSec;
      const syncFactor = estimatedDuration / actualDuration;
      
      finalRate *= syncFactor;
    }

    // Clamp rate between 0.5 and 4.0 (Chrome limits)
    utterance.rate = Math.max(0.5, Math.min(4.0, finalRate));
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
  }

  pause() {
    this.synth.pause();
  }

  resume() {
    this.synth.resume();
  }
}

export const ttsManager = new TTSManager();
