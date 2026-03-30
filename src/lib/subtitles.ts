import { Subtitle } from '../types';

const sentenceSplitRegex = /[^。！？!?；;，,]+[。！？!?；;，,]?/g;

function normalizeText(text: string) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .trim();
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

    const shouldMerge = segment.length <= 3 || /^[，,；;]/.test(segment) || /[，,；;]$/.test(segments[segments.length - 1]);
    if (shouldMerge) {
      segments[segments.length - 1] = `${segments[segments.length - 1]}${segment}`;
    } else {
      segments.push(segment);
    }
  }

  return segments.length > 0 ? segments : [normalized];
}

export function splitSubtitlesBySentence(subtitles: Subtitle[]): Subtitle[] {
  const result: Subtitle[] = [];
  for (const subtitle of subtitles) {
    const normalizedText = normalizeText(subtitle.text);
    if (!normalizedText) continue;

    const segments = splitSubtitleTextIntoSentences(normalizedText);
    if (segments.length <= 1) {
      result.push({ ...subtitle, text: normalizedText });
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
