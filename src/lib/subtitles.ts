import { Subtitle, SubtitleTrack } from '../types';

const sentenceSplitRegex = /[^。！？!?；;，,]+[。！？!?；;，,]?/g;
const sentenceEndRegex = /[。！？!?；;]$/;

function normalizeText(text: string) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinText(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  if (/[，,；;]$/.test(left) || /^[，,；;]/.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

function mergeNearbyRawSubtitles(subtitles: Subtitle[]): Subtitle[] {
  if (!subtitles || subtitles.length === 0) return [];

  const sorted = [...subtitles].sort((a, b) => a.start - b.start);
  const merged: Subtitle[] = [];
  let current = { ...sorted[0], text: normalizeText(sorted[0].text), duration: Math.max(sorted[0].duration, 0.05) };

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    const nextText = normalizeText(next.text);
    if (!nextText) continue;

    const currentEnd = current.start + current.duration;
    const gap = next.start - currentEnd;
    const currentIsSentenceEnd = sentenceEndRegex.test(current.text);
    const shouldMerge =
      gap < 0.35 ||
      current.text.length < 7 ||
      nextText.length < 7 ||
      !currentIsSentenceEnd ||
      (gap >= 0 && gap < 0.6 && current.text.length + nextText.length < 22);

    if (shouldMerge) {
      const combinedEnd = Math.max(currentEnd, next.start + Math.max(next.duration, 0.05));
      current = {
        id: `${current.id}+${next.id}`,
        start: current.start,
        duration: combinedEnd - current.start,
        text: joinText(current.text, nextText)
      };
    } else {
      merged.push(current);
      current = { ...next, text: nextText, duration: Math.max(next.duration, 0.05) };
    }
  }

  merged.push(current);
  return merged;
}

export function splitSubtitleTextIntoSentences(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const matches = normalized.match(sentenceSplitRegex);
  if (!matches || matches.length === 0) {
    return [normalized];
  }

  const rawSegments = matches.map(segment => segment.trim()).filter(Boolean);
  if (rawSegments.length === 0) return [normalized];

  const segments: string[] = [];
  for (const segment of rawSegments) {
    if (!segments.length) {
      segments.push(segment);
      continue;
    }

    const previous = segments[segments.length - 1];
    const shouldMerge =
      segment.length < 6 ||
      !sentenceEndRegex.test(segment) ||
      /^[，,；;]/.test(segment) ||
      /[，,；;]$/.test(previous);

    if (shouldMerge) {
      segments[segments.length - 1] = joinText(previous, segment);
    } else {
      segments.push(segment);
    }
  }

  return segments.length > 0 ? segments : [normalized];
}

export function splitSubtitlesBySentence(subtitles: Subtitle[]): Subtitle[] {
  const result: Subtitle[] = [];
  const normalizedSubtitles = mergeNearbyRawSubtitles(subtitles);

  for (const subtitle of normalizedSubtitles) {
    const segments = splitSubtitleTextIntoSentences(subtitle.text);
    if (segments.length <= 1) {
      result.push({ ...subtitle, text: subtitle.text });
      continue;
    }

    const safeDuration = subtitle.duration > 0 ? subtitle.duration : 1;
    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
    const minDuration = 0.05;
    let accumulatedStart = subtitle.start;
    let accumulatedDuration = 0;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const ratio = totalLength > 0 ? segment.length / totalLength : 1 / segments.length;
      const rawDuration = safeDuration * ratio;
      const duration = isLast ? Math.max(minDuration, safeDuration - accumulatedDuration) : Math.max(minDuration, rawDuration);

      result.push({
        id: `${subtitle.id}-${index}`,
        start: accumulatedStart,
        duration,
        text: segment
      });

      accumulatedDuration += duration;
      accumulatedStart += duration;
    });
  }
  return result;
}

// -----------------------------------------------------------------------------
// 新增TTS优化处理，用于减少断句不自然和延迟问题
// -----------------------------------------------------------------------------

const TTS_PROCESS_CONFIG = {
  // 短字幕阈值：≤2个字自动合并（含中文、英文字符均可）
  shortTextThreshold: 2,
  // 无语气标点（TTS请求时移除）
  neutralPunctuation: /[，。；：、]/g,
  // 语气标点（TTS请求时保留）
  emotionPunctuation: /[！？…]/g,
  // 分句标点：用于分割完整语句
  splitPunctuation: /(?<=[！？。；：…])/g,
};

/**
 * 核心：字幕智能分句 + TTS预处理
 * @param track 原始字幕轨道
 * @returns 处理后适配TTS的字幕轨道
 */
export function processSubtitlesForTTS(track: SubtitleTrack): SubtitleTrack {
  if (!track.subtitles.length) return track;

  const processedSubs: Subtitle[] = [];
  const originalSubs = [...track.subtitles];

  // 第一步：合并极短字幕（1-2个字）
  for (let i = 0; i < originalSubs.length; i++) {
    let current = originalSubs[i];
    const currentText = current.text.trim();

    if (currentText.length <= TTS_PROCESS_CONFIG.shortTextThreshold) {
      if (i + 1 < originalSubs.length) {
        originalSubs[i + 1].text = currentText + originalSubs[i + 1].text;
        originalSubs[i + 1].start = current.start;
        originalSubs[i + 1].duration += current.duration;
      } else if (processedSubs.length > 0) {
        const last = processedSubs[processedSubs.length - 1];
        last.text += currentText;
        last.duration += current.duration;
      }
      continue;
    }

    processedSubs.push(current);
  }

  // 第二步：按标点智能分句 + 清理标点（适配TTS）
  const finalSubs: Subtitle[] = [];
  let subtitleIdCounter = 1;

  for (const sub of processedSubs) {
    const text = sub.text.trim();
    if (!text) continue;

    const sentences = text.split(TTS_PROCESS_CONFIG.splitPunctuation).filter(s => s.trim());

    const timePerSentence = sub.duration / sentences.length;

    sentences.forEach((sentence, index) => {
      const cleanText = cleanTextForTTS(sentence);
      if (!cleanText) return;

      finalSubs.push({
        id: `${sub.id}-${subtitleIdCounter++}`,
        start: sub.start + index * timePerSentence,
        duration: timePerSentence,
        text: cleanText,
        actualStartTime: sub.actualStartTime,
      });
    });
  }

  return {
    ...track,
    subtitles: finalSubs,
  };
}

/**
 * TTS文本清理：移除无语气标点，保留语气标点
 * @param text 原始句子
 * @returns 清理后适合TTS的文本
 */
function cleanTextForTTS(text: string): string {
  return text
    .trim()
    .replace(TTS_PROCESS_CONFIG.neutralPunctuation, '')
    .replace(/\s+/g, '');
}

/**
 * 工具函数：直接获取可用于TTS请求的纯文本数组
 */
export function getTTSTextList(processedTrack: SubtitleTrack): string[] {
  return processedTrack.subtitles.map(sub => sub.text);
}

