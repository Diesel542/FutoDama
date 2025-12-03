import { diffWords } from "diff";

export type DiffToken =
  | { type: "equal"; text: string }
  | { type: "added"; text: string }
  | { type: "removed"; text: string };

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
}

function computeSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  let intersection = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) intersection++;
  });
  
  const uniqueWordsA = new Set(wordsA);
  const union = uniqueWordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function diffBullets(originalBullets: string[], tailoredBullets: string[]): BulletDiff[] {
  const result: BulletDiff[] = [];
  const usedTailoredIndices = new Set<number>();
  const SIMILARITY_THRESHOLD = 0.3;
  
  for (const origBullet of originalBullets) {
    let bestMatch: { index: number; similarity: number } | null = null;
    
    for (let i = 0; i < tailoredBullets.length; i++) {
      if (usedTailoredIndices.has(i)) continue;
      
      const similarity = computeSimilarity(origBullet, tailoredBullets[i]);
      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { index: i, similarity };
        }
      }
    }
    
    if (bestMatch) {
      const tailBullet = tailoredBullets[bestMatch.index];
      usedTailoredIndices.add(bestMatch.index);
      
      result.push({
        type: "matched",
        originalBullet: origBullet,
        tailoredBullet: tailBullet,
        diff: diffText(origBullet, tailBullet),
      });
    } else {
      result.push({
        type: "removed",
        originalBullet: origBullet,
      });
    }
  }
  
  for (let i = 0; i < tailoredBullets.length; i++) {
    if (!usedTailoredIndices.has(i)) {
      result.push({
        type: "added",
        tailoredBullet: tailoredBullets[i],
      });
    }
  }
  
  return result;
}
