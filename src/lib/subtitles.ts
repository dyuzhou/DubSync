import { Subtitle } from '../types';

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
