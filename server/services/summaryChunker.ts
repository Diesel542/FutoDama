export type { 
  ChunkSummaryRequest, 
  ChunkedParagraph, 
  ChunkSummaryResponse 
} from "@shared/schema";

import type { ChunkSummaryRequest, ChunkedParagraph, ChunkSummaryResponse } from "@shared/schema";

interface Segment {
  text: string;
  energy: number;
  digitDensity: number;
  properNounCount: number;
  acronymCount: number;
  hasFutureWords: boolean;
  hasMetrics: boolean;
  maxVerbIntensity: number;
}

const VERB_INTENSITY: Record<string, number> = {
  "owned": 0.9,
  "led": 0.85,
  "launched": 0.8,
  "shipped": 0.8,
  "spearheaded": 0.85,
  "architected": 0.8,
  "orchestrated": 0.8,
  "pioneered": 0.85,
  "transformed": 0.8,
  "designed": 0.7,
  "built": 0.7,
  "developed": 0.65,
  "implemented": 0.65,
  "created": 0.65,
  "delivered": 0.7,
  "drove": 0.75,
  "executed": 0.65,
  "managed": 0.6,
  "improved": 0.6,
  "increased": 0.6,
  "reduced": 0.6,
  "optimized": 0.6,
  "established": 0.6,
  "achieved": 0.65,
  "exceeded": 0.7,
  "supported": 0.35,
  "assisted": 0.3,
  "helped": 0.3,
  "participated": 0.25,
  "contributed": 0.4,
  "worked": 0.3,
};

const DISCOURSE_MARKERS = [
  "now",
  "currently",
  "previously",
  "before that",
  "afterwards",
  "across",
  "including",
  "beyond",
  "meanwhile",
  "today",
  "these days",
  "looking ahead",
  "going forward",
  "moving forward",
];

const FUTURE_WORDS = [
  "now",
  "currently",
  "next",
  "looking to",
  "aim",
  "aiming",
  "seeking",
  "aspire",
  "aspiring",
  "goal",
  "future",
  "looking forward",
  "eager to",
  "excited to",
  "ready to",
  "passionate about",
  "looking ahead",
  "going forward",
  "moving forward",
  "these days",
  "today",
];

const SCOPE_WORDS = [
  "years of experience",
  "years experience",
  "products",
  "platforms",
  "teams",
  "strategy",
  "enterprise",
  "global",
  "international",
  "cross-functional",
  "end-to-end",
  "full-stack",
  "portfolio",
  "multi-",
];

function preCleanText(text: string, allowList: string[]): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/[\r\n]+/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  return cleaned;
}

function protectAllowList(text: string, allowList: string[]): { text: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let protectedText = text;
  
  for (const token of allowList) {
    const placeholder = `__ALLOW_${placeholders.size}__`;
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (regex.test(protectedText)) {
      placeholders.set(placeholder, token);
      protectedText = protectedText.replace(regex, placeholder);
    }
  }
  
  return { text: protectedText, placeholders };
}

function restoreAllowList(text: string, placeholders: Map<string, string>): string {
  let restored = text;
  Array.from(placeholders.entries()).forEach(([placeholder, original]) => {
    restored = restored.replace(new RegExp(placeholder, 'g'), original);
  });
  return restored;
}

function splitIntoSegments(text: string): string[] {
  const sentencePattern = /([^.!?]+[.!?]+\s*)/g;
  const rawSegments: string[] = [];
  let match;
  let lastIndex = 0;
  
  while ((match = sentencePattern.exec(text)) !== null) {
    rawSegments.push(match[1].trim());
    lastIndex = sentencePattern.lastIndex;
  }
  
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      rawSegments.push(remaining);
    }
  }
  
  if (rawSegments.length === 0 && text.trim()) {
    rawSegments.push(text.trim());
  }
  
  const segments: string[] = [];
  for (const seg of rawSegments) {
    let current = seg;
    let foundMarker = true;
    
    while (foundMarker) {
      foundMarker = false;
      for (const marker of DISCOURSE_MARKERS) {
        const markerPattern = new RegExp(`(.*?)\\b(${marker})\\b(.*)`, 'i');
        const markerMatch = current.match(markerPattern);
        
        if (markerMatch && markerMatch[1].length > 30) {
          segments.push(markerMatch[1].trim());
          current = (markerMatch[2] + markerMatch[3]).trim();
          foundMarker = true;
          break;
        }
      }
    }
    
    if (current) {
      segments.push(current);
    }
  }
  
  return segments.filter(s => s.length > 0);
}

function computeDigitDensity(text: string): number {
  const digits = text.match(/[0-9%k+]/gi) || [];
  return digits.length / Math.max(text.length, 1);
}

function countProperNouns(text: string): number {
  const words = text.split(/\s+/);
  let count = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z]/g, '');
    if (word.length === 0) continue;
    
    const isStartOfSentence = i === 0 || 
      (i > 0 && /[.!?]$/.test(words[i - 1]));
    
    if (!isStartOfSentence && /^[A-Z][a-z]/.test(word)) {
      count++;
    }
  }
  
  return count;
}

function countAcronyms(text: string): number {
  const acronyms = text.match(/\b[A-Z]{2,6}\b/g) || [];
  return acronyms.length;
}

function findMaxVerbIntensity(text: string): number {
  const lowerText = text.toLowerCase();
  let maxIntensity = 0;
  
  for (const [verb, intensity] of Object.entries(VERB_INTENSITY)) {
    const pattern = new RegExp(`\\b${verb}\\b`, 'i');
    if (pattern.test(lowerText)) {
      maxIntensity = Math.max(maxIntensity, intensity);
    }
  }
  
  return maxIntensity;
}

function hasFutureWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return FUTURE_WORDS.some(word => {
    const pattern = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return pattern.test(lowerText);
  });
}

function hasScopeWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SCOPE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

function computeEnergy(segment: Segment): number {
  const verbIntensity = segment.maxVerbIntensity || 0.3;
  const metricsBoost = segment.digitDensity > 0.02 ? 0.15 : 0;
  const properNounBoost = segment.properNounCount > 0 ? 0.05 : 0;
  const acronymBoost = segment.acronymCount > 0 ? 0.05 : 0;
  
  const energy = verbIntensity + metricsBoost + properNounBoost + acronymBoost;
  return Math.min(Math.max(energy, 0), 1);
}

function analyzeSegment(text: string): Segment {
  const digitDensity = computeDigitDensity(text);
  const properNounCount = countProperNouns(text);
  const acronymCount = countAcronyms(text);
  const maxVerbIntensity = findMaxVerbIntensity(text);
  const futureWords = hasFutureWords(text);
  const hasMetrics = digitDensity > 0.02;
  
  const segment: Segment = {
    text,
    digitDensity,
    properNounCount,
    acronymCount,
    maxVerbIntensity,
    hasFutureWords: futureWords,
    hasMetrics,
    energy: 0,
  };
  
  segment.energy = computeEnergy(segment);
  
  return segment;
}

function startsWithDiscourseMarker(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  const futureStarters = ["now", "currently", "these days", "today", "looking", "going forward", "moving forward"];
  return futureStarters.some(starter => lowerText.startsWith(starter));
}

interface ParagraphBuffer {
  segments: Segment[];
  totalLength: number;
  avgEnergy: number;
}

function buildParagraphs(
  segments: Segment[],
  maxParaLenChars: number,
  targetParagraphs: number
): string[][] {
  if (segments.length === 0) return [];
  
  const paragraphs: ParagraphBuffer[] = [];
  let currentPara: ParagraphBuffer = { segments: [], totalLength: 0, avgEnergy: 0 };
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const lastSeg = currentPara.segments[currentPara.segments.length - 1];
    
    const wouldExceedLength = currentPara.totalLength + seg.text.length > maxParaLenChars;
    
    const energyDelta = lastSeg ? Math.abs(seg.energy - lastSeg.energy) : 0;
    const isEnergyTurn = energyDelta >= 0.25;
    
    const isTopicShift = startsWithDiscourseMarker(seg.text);
    
    const shouldBreak = currentPara.segments.length > 0 && 
      (wouldExceedLength || isEnergyTurn || isTopicShift);
    
    if (shouldBreak) {
      if (currentPara.segments.length > 0) {
        paragraphs.push(currentPara);
      }
      currentPara = { segments: [], totalLength: 0, avgEnergy: 0 };
    }
    
    currentPara.segments.push(seg);
    currentPara.totalLength += seg.text.length + 1;
    currentPara.avgEnergy = currentPara.segments.reduce((sum, s) => sum + s.energy, 0) / currentPara.segments.length;
  }
  
  if (currentPara.segments.length > 0) {
    paragraphs.push(currentPara);
  }
  
  while (paragraphs.length > targetParagraphs && paragraphs.length > 1) {
    let minDelta = Infinity;
    let mergeIndex = 0;
    
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const delta = Math.abs(paragraphs[i].avgEnergy - paragraphs[i + 1].avgEnergy);
      if (delta < minDelta) {
        minDelta = delta;
        mergeIndex = i;
      }
    }
    
    paragraphs[mergeIndex].segments.push(...paragraphs[mergeIndex + 1].segments);
    paragraphs[mergeIndex].totalLength += paragraphs[mergeIndex + 1].totalLength;
    paragraphs[mergeIndex].avgEnergy = paragraphs[mergeIndex].segments.reduce((sum, s) => sum + s.energy, 0) / paragraphs[mergeIndex].segments.length;
    paragraphs.splice(mergeIndex + 1, 1);
  }
  
  return paragraphs.map(p => p.segments.map(s => s.text));
}

function determineTopic(
  paragraphSegments: Segment[],
  index: number,
  totalParagraphs: number
): string {
  const hasMetrics = paragraphSegments.some(s => s.hasMetrics);
  const hasProperNouns = paragraphSegments.some(s => s.properNounCount > 0);
  const hasAcronyms = paragraphSegments.some(s => s.acronymCount > 0);
  const hasFuture = paragraphSegments.some(s => s.hasFutureWords);
  const combinedText = paragraphSegments.map(s => s.text).join(" ");
  const hasScope = hasScopeWords(combinedText);
  
  if (hasFuture && (index === totalParagraphs - 1 || index >= totalParagraphs / 2)) {
    return "Now/Next";
  }
  
  if ((hasMetrics || hasProperNouns || hasAcronyms) && index > 0) {
    return "Delivery proof";
  }
  
  if (index === 0) {
    if (hasScope || (!hasMetrics && !hasProperNouns)) {
      return "Positioning";
    }
    return "Intro";
  }
  
  return "General";
}

function determineSignals(paragraphSegments: Segment[]): string[] {
  const signals: string[] = [];
  
  const hasNumbers = paragraphSegments.some(s => s.digitDensity > 0.01);
  const hasProperNouns = paragraphSegments.some(s => s.properNounCount > 0);
  const hasAcronyms = paragraphSegments.some(s => s.acronymCount > 0);
  const hasFuture = paragraphSegments.some(s => s.hasFutureWords);
  const combinedText = paragraphSegments.map(s => s.text).join(" ");
  const hasScope = hasScopeWords(combinedText);
  
  if (hasNumbers) signals.push("numbers");
  if (hasProperNouns) signals.push("proper_nouns");
  if (hasAcronyms) signals.push("acronyms");
  if (hasFuture) signals.push("future");
  if (hasScope) signals.push("scope");
  
  return Array.from(new Set(signals));
}

function applyToneAdjustments(text: string, tone: "neutral" | "confident" | "warm"): string {
  let adjusted = text;
  
  if (tone === "neutral") {
    adjusted = adjusted.replace(/\bEXTREMELY\b/g, "very");
    adjusted = adjusted.replace(/\bEXCEPTIONALLY\b/g, "very");
    adjusted = adjusted.replace(/\bINCREDIBLY\b/g, "very");
    adjusted = adjusted.replace(/\bAMAZINGLY\b/g, "");
    adjusted = adjusted.replace(/\bABSOLUTELY\b/g, "");
  }
  
  if (tone === "confident") {
    adjusted = adjusted.replace(/\bI was responsible for\b/gi, "I led");
    adjusted = adjusted.replace(/\bwas responsible for\b/gi, "led");
    adjusted = adjusted.replace(/\bI was involved in\b/gi, "I drove");
    adjusted = adjusted.replace(/\bhelped to\b/gi, "contributed to");
  }
  
  adjusted = adjusted.replace(/\s{2,}/g, " ").trim();
  
  return adjusted;
}

export function chunkSummary(input: ChunkSummaryRequest): ChunkSummaryResponse {
  const {
    summary,
    maxParaLenChars = 420,
    targetParagraphs = 3,
    tone = "neutral",
    allowList = [],
  } = input;
  
  if (!summary || !summary.trim()) {
    return { paragraphs: [] };
  }
  
  const { text: protectedText, placeholders } = protectAllowList(summary, allowList);
  
  const cleanedText = preCleanText(protectedText, allowList);
  
  const rawSegments = splitIntoSegments(cleanedText);
  
  const analyzedSegments = rawSegments.map(seg => analyzeSegment(seg));
  
  const paragraphGroups = buildParagraphs(analyzedSegments, maxParaLenChars, targetParagraphs);
  
  const result: ChunkedParagraph[] = [];
  
  for (let i = 0; i < paragraphGroups.length; i++) {
    const segmentTexts = paragraphGroups[i];
    
    const matchingSegments = analyzedSegments.filter(s => segmentTexts.includes(s.text));
    
    let paragraphText = segmentTexts.join(" ");
    
    paragraphText = restoreAllowList(paragraphText, placeholders);
    
    paragraphText = applyToneAdjustments(paragraphText, tone);
    
    const topic = determineTopic(matchingSegments, i, paragraphGroups.length);
    const signals = determineSignals(matchingSegments);
    const avgEnergy = matchingSegments.length > 0
      ? matchingSegments.reduce((sum, s) => sum + s.energy, 0) / matchingSegments.length
      : 0.5;
    
    result.push({
      text: paragraphText,
      topic,
      energy: Math.round(avgEnergy * 100) / 100,
      signals,
    });
  }
  
  return { paragraphs: result };
}
