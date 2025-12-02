import type { JobCard, ResumeCard, MatchSession } from "@shared/schema";
import type { z } from "zod";

export interface Step1MatchResult {
  profileId: string;
  profileName: string;
  overlapScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface Step2MatchResult {
  profileId: string;
  profileName: string;
  aiScore: number;
  explanation: string;
  evidence: string[];
  concerns: string[];
}

export interface MatchFlowResult {
  sessionId: string;
  jobId: string;
  status: string;
  step1Results?: Step1MatchResult[];
  step2Results?: Step2MatchResult[];
}

export interface TailorBundle {
  tailoredResume: ResumeCard;
  originalResume: ResumeCard;
  jobCard: JobCard;
  coverageAnalysis: CoverageAnalysis;
  diffs: TailorDiff[];
  warnings: TailorWarning[];
  atsReport?: AtsReport;
}

export interface CoverageAnalysis {
  overallCoverage: number;
  skillsCovered: string[];
  skillsNotCovered: string[];
  experienceAlignment: string;
  suggestions: string[];
}

export interface TailorDiff {
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface TailorWarning {
  type: "missing_skill" | "experience_gap" | "format_issue" | "general";
  message: string;
  severity: "low" | "medium" | "high";
}

export interface AtsReport {
  score: number;
  keywordsMatched: string[];
  keywordsMissing: string[];
  formatIssues: string[];
  recommendations: string[];
}

export interface TailorFlowResult {
  resumeId: string;
  jobId: string;
  status: "success" | "error";
  bundle: TailorBundle | null;
  error?: string;
}

export interface Evidence {
  field: string;
  quote: string;
  page?: number;
}

export interface MissingField {
  path: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export interface ProcessingLogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface CodexSchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
}

export interface CodexPrompts {
  system: string;
  extraction?: string;
  validation?: string;
}

export interface NormalizationRule {
  path: string;
  type: "date" | "currency" | "duration" | "workload" | "enum";
  options?: string[];
}

export interface MissingRule {
  path: string;
  severity: "info" | "warn" | "error";
  message: string;
  condition?: string;
}
