import { diffWords } from "diff";

export type DiffToken =
  | { type: "equal"; text: string }
  | { type: "added"; text: string }
  | { type: "removed"; text: string };

export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  
  let intersection = 0;
  setA.forEach(word => {
    if (setB.has(word)) intersection++;
  });
  
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export const SIGNIFICANCE_THRESHOLD = 0.8;

export function isSignificantChange(original: string, tailored: string, threshold = SIGNIFICANCE_THRESHOLD): boolean {
  const similarity = stringSimilarity(original, tailored);
  return similarity <= threshold;
}

export function diffText(original: string, tailored: string): DiffToken[] {
  if (!original && !tailored) return [];
  if (!original) return [{ type: "added", text: tailored }];
  if (!tailored) return [{ type: "removed", text: original }];

  const changes = diffWords(original, tailored);
  
  return changes.map((change) => {
    if (change.added) {
      return { type: "added", text: change.value };
    } else if (change.removed) {
      return { type: "removed", text: change.value };
    } else {
      return { type: "equal", text: change.value };
    }
  });
}

export function hasChanges(tokens: DiffToken[]): boolean {
  return tokens.some(t => t.type !== "equal");
}

export function countChanges(tokens: DiffToken[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  tokens.forEach(t => {
    if (t.type === "added") added++;
    if (t.type === "removed") removed++;
  });
  return { added, removed };
}

export interface SkillsDiffResult {
  intersection: string[];
  added: string[];
  removed: string[];
}

export function diffSkills(original: string[], tailored: string[]): SkillsDiffResult {
  const originalSet = new Set(original.map(s => s.toLowerCase().trim()));
  const tailoredSet = new Set(tailored.map(s => s.toLowerCase().trim()));
  
  const originalNormalized = new Map(original.map(s => [s.toLowerCase().trim(), s]));
  const tailoredNormalized = new Map(tailored.map(s => [s.toLowerCase().trim(), s]));
  
  const intersection: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  
  Array.from(tailoredNormalized.entries()).forEach(([norm, display]) => {
    if (originalSet.has(norm)) {
      intersection.push(display);
    } else {
      added.push(display);
    }
  });
  
  Array.from(originalNormalized.entries()).forEach(([norm, display]) => {
    if (!tailoredSet.has(norm)) {
      removed.push(display);
    }
  });
  
  return { intersection, added, removed };
}

export interface ExperienceEntry {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets: string[];
}

export interface ExperienceMatchPair {
  original: ExperienceEntry | null;
  tailored: ExperienceEntry | null;
  matchKey: string;
}

function normalizeExperienceKey(entry: { title?: string; company?: string; employer?: string }): string {
  const title = (entry.title || "").toLowerCase().trim();
  const company = (entry.company || entry.employer || "").toLowerCase().trim();
  return `${title}@${company}`;
}

export function matchExperienceEntries(
  originalEntries: ExperienceEntry[],
  tailoredEntries: ExperienceEntry[]
): ExperienceMatchPair[] {
  const pairs: ExperienceMatchPair[] = [];
  const usedTailoredIndices = new Set<number>();
  
  for (const orig of originalEntries) {
    const origKey = normalizeExperienceKey(orig);
    let matched = false;
    
    for (let i = 0; i < tailoredEntries.length; i++) {
      if (usedTailoredIndices.has(i)) continue;
      
      const tail = tailoredEntries[i];
      const tailKey = normalizeExperienceKey(tail);
      
      if (origKey === tailKey) {
        pairs.push({
          original: orig,
          tailored: tail,
          matchKey: origKey,
        });
        usedTailoredIndices.add(i);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      pairs.push({
        original: orig,
        tailored: null,
        matchKey: origKey,
      });
    }
  }
  
  for (let i = 0; i < tailoredEntries.length; i++) {
    if (!usedTailoredIndices.has(i)) {
      const tail = tailoredEntries[i];
      pairs.push({
        original: null,
        tailored: tail,
        matchKey: normalizeExperienceKey(tail),
      });
    }
  }
  
  return pairs;
}

export interface BulletDiff {
  type: "matched" | "added" | "removed";
  originalBullet?: string;
  tailoredBullet?: string;
  diff?: DiffToken[];
  similarity?: number;
  isSignificant?: boolean;
}

export function diffBullets(originalBullets: string[], tailoredBullets: string[]): BulletDiff[] {
  const result: BulletDiff[] = [];
  const usedTailoredIndices = new Set<number>();
  const MATCH_THRESHOLD = 0.3;
  
  for (const origBullet of originalBullets) {
    let bestMatch: { index: number; similarity: number } | null = null;
    
    for (let i = 0; i < tailoredBullets.length; i++) {
      if (usedTailoredIndices.has(i)) continue;
      
      const similarity = stringSimilarity(origBullet, tailoredBullets[i]);
      if (similarity >= MATCH_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { index: i, similarity };
        }
      }
    }
    
    if (bestMatch) {
      const tailBullet = tailoredBullets[bestMatch.index];
      usedTailoredIndices.add(bestMatch.index);
      
      const isSignificant = isSignificantChange(origBullet, tailBullet);
      
      result.push({
        type: "matched",
        originalBullet: origBullet,
        tailoredBullet: tailBullet,
        diff: diffText(origBullet, tailBullet),
        similarity: bestMatch.similarity,
        isSignificant,
      });
    } else {
      result.push({
        type: "removed",
        originalBullet: origBullet,
        isSignificant: true,
      });
    }
  }
  
  for (let i = 0; i < tailoredBullets.length; i++) {
    if (!usedTailoredIndices.has(i)) {
      result.push({
        type: "added",
        tailoredBullet: tailoredBullets[i],
        isSignificant: true,
      });
    }
  }
  
  return result;
}

export interface DiffStats {
  summaryRewritten: boolean;
  skillsAdded: number;
  skillsDeEmphasized: number;
  bulletsUpdated: number;
  bulletsAdded: number;
  bulletsRemoved: number;
}

export function computeDiffStats(
  originalSummary: string,
  tailoredSummary: string,
  skillsDiff: SkillsDiffResult,
  bulletDiffs: BulletDiff[]
): DiffStats {
  const summaryRewritten = isSignificantChange(originalSummary, tailoredSummary);
  
  const bulletsUpdated = bulletDiffs.filter(b => b.type === "matched" && b.isSignificant).length;
  const bulletsAdded = bulletDiffs.filter(b => b.type === "added").length;
  const bulletsRemoved = bulletDiffs.filter(b => b.type === "removed").length;
  
  return {
    summaryRewritten,
    skillsAdded: skillsDiff.added.length,
    skillsDeEmphasized: skillsDiff.removed.length,
    bulletsUpdated,
    bulletsAdded,
    bulletsRemoved,
  };
}
