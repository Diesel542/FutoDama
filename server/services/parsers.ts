/**
 * Backend parsers for normalizing extracted data
 * Converts human-readable text into structured, sortable fields
 */

interface CurrencyRange {
  min?: number;
  max?: number;
  currency?: string;
  unit?: "hour" | "day" | "month" | "year";
}

interface DateParsed {
  iso?: string;
  confidence: number;
}

interface WorkloadParsed {
  hours_week?: number;
  confidence: number;
}

/**
 * Parse currency range from text like "$150-200k/year" or "€80-100 per day"
 */
export function parseCurrencyRange(text: string): CurrencyRange {
  if (!text) return {};

  const result: CurrencyRange = {};

  // Extract currency symbol
  const currencyMatch = text.match(/[$€£¥]/);
  if (currencyMatch) {
    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
    };
    result.currency = currencyMap[currencyMatch[0]];
  }

  // Extract unit (hour, day, month, year)
  const lowerText = text.toLowerCase();
  if (lowerText.includes('/hour') || lowerText.includes('per hour') || lowerText.includes('hourly')) {
    result.unit = 'hour';
  } else if (lowerText.includes('/day') || lowerText.includes('per day') || lowerText.includes('daily')) {
    result.unit = 'day';
  } else if (lowerText.includes('/month') || lowerText.includes('per month') || lowerText.includes('monthly')) {
    result.unit = 'month';
  } else if (lowerText.includes('/year') || lowerText.includes('per year') || lowerText.includes('annual') || lowerText.includes('yearly')) {
    result.unit = 'year';
  }

  // Extract numbers with k/K multiplier support
  const numbers = text.match(/[\d,]+\.?\d*[kK]?/g);
  if (numbers && numbers.length > 0) {
    const parseNumber = (numStr: string): number => {
      const cleanStr = numStr.replace(/,/g, '');
      const multiplier = cleanStr.match(/[kK]$/) ? 1000 : 1;
      const value = parseFloat(cleanStr.replace(/[kK]$/, ''));
      return value * multiplier;
    };

    if (numbers.length === 1) {
      // Single number - could be min or exact
      result.min = parseNumber(numbers[0]);
      result.max = result.min;
    } else if (numbers.length >= 2) {
      // Range
      result.min = parseNumber(numbers[0]);
      result.max = parseNumber(numbers[1]);
    }
  }

  return result;
}

/**
 * Parse date from various formats into ISO 8601 (YYYY-MM-DD)
 */
export function parseDate(text: string): DateParsed {
  if (!text) return { confidence: 0 };

  const lowerText = text.toLowerCase().trim();

  // ISO format already (YYYY-MM-DD)
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return { iso: isoMatch[0], confidence: 1.0 };
  }

  // Common patterns
  const now = new Date();
  const currentYear = now.getFullYear();

  // "Q1 2025", "Q2 2024"
  const quarterMatch = lowerText.match(/q([1-4])\s+(\d{4})/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    const month = (quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
    return { iso: `${year}-${String(month).padStart(2, '0')}-01`, confidence: 0.8 };
  }

  // "Early Q2 2025", "Late Q3 2024"
  const earlyLateQuarterMatch = lowerText.match(/(early|late)\s+q([1-4])\s+(\d{4})/);
  if (earlyLateQuarterMatch) {
    const timing = earlyLateQuarterMatch[1];
    const quarter = parseInt(earlyLateQuarterMatch[2]);
    const year = parseInt(earlyLateQuarterMatch[3]);
    let month = (quarter - 1) * 3 + 1;
    if (timing === 'late') month += 2;
    return { iso: `${year}-${String(month).padStart(2, '0')}-01`, confidence: 0.7 };
  }

  // Month names: "January 2025", "Feb 2024"
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbrev = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  for (let i = 0; i < monthNames.length; i++) {
    const monthPattern = new RegExp(`(${monthNames[i]}|${monthAbbrev[i]})[\\s,]+?(\\d{4})`, 'i');
    const match = text.match(monthPattern);
    if (match) {
      const year = parseInt(match[2]);
      const month = i + 1;
      return { iso: `${year}-${String(month).padStart(2, '0')}-01`, confidence: 0.9 };
    }
  }

  // "ASAP", "Immediate", "Now"
  if (lowerText.includes('asap') || lowerText.includes('immediate') || lowerText === 'now') {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    return { iso, confidence: 0.6 };
  }

  // Relative dates: "in 2 weeks", "next month"
  if (lowerText.includes('next month')) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { iso: next.toISOString().split('T')[0], confidence: 0.7 };
  }

  return { confidence: 0 };
}

/**
 * Parse workload from text like "40 hours/week", "full-time", "part-time 20h"
 */
export function parseWorkload(text: string): WorkloadParsed {
  if (!text) return { confidence: 0 };

  const lowerText = text.toLowerCase();

  // Direct hours: "40 hours/week", "35h/week", "20 hours per week"
  const hoursMatch = text.match(/(\d+)\s*(?:hours?|h)?\s*(?:\/|per)?\s*(?:week|wk)/i);
  if (hoursMatch) {
    return { hours_week: parseInt(hoursMatch[1]), confidence: 1.0 };
  }

  // Percentage: "80%", "50% time"
  const percentMatch = text.match(/(\d+)%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1]);
    return { hours_week: Math.round((percent / 100) * 40), confidence: 0.8 };
  }

  // Common terms
  if (lowerText.includes('full-time') || lowerText.includes('fulltime')) {
    return { hours_week: 40, confidence: 0.9 };
  }
  if (lowerText.includes('part-time') || lowerText.includes('parttime')) {
    return { hours_week: 20, confidence: 0.7 };
  }
  if (lowerText.includes('half-time')) {
    return { hours_week: 20, confidence: 0.8 };
  }

  return { confidence: 0 };
}

/**
 * Parse duration from text like "6 months", "12 months contract", "1 year"
 */
export function parseDuration(text: string): { days?: number; confidence: number } {
  if (!text) return { confidence: 0 };

  const lowerText = text.toLowerCase();

  // Months: "6 months", "12 months"
  const monthsMatch = text.match(/(\d+)\s*months?/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1]);
    return { days: months * 30, confidence: 0.9 };
  }

  // Years: "1 year", "2 years"
  const yearsMatch = text.match(/(\d+)\s*years?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    return { days: years * 365, confidence: 0.9 };
  }

  // Weeks: "4 weeks", "8 weeks"
  const weeksMatch = text.match(/(\d+)\s*weeks?/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1]);
    return { days: weeks * 7, confidence: 0.9 };
  }

  // Days: "90 days", "180 days"
  const daysMatch = text.match(/(\d+)\s*days?/i);
  if (daysMatch) {
    return { days: parseInt(daysMatch[1]), confidence: 1.0 };
  }

  // Common terms
  if (lowerText.includes('permanent') || lowerText.includes('indefinite')) {
    return { days: 3650, confidence: 0.5 }; // ~10 years as placeholder
  }

  return { confidence: 0 };
}

/**
 * Apply all parsers to project_details and return normalized fields
 */
export function normalizeProjectDetails(projectDetails: any): any {
  if (!projectDetails) return {};

  const normalized: any = {};

  // Parse rate_band
  if (projectDetails.rate_band) {
    const parsed = parseCurrencyRange(projectDetails.rate_band);
    if (parsed.min !== undefined) normalized.rate_min = parsed.min;
    if (parsed.max !== undefined) normalized.rate_max = parsed.max;
    if (parsed.currency) normalized.rate_currency = parsed.currency;
    if (parsed.unit) normalized.rate_unit = parsed.unit;
  }

  // Parse start_date
  if (projectDetails.start_date) {
    const parsed = parseDate(projectDetails.start_date);
    if (parsed.iso && parsed.confidence >= 0.6) {
      normalized.start_date_iso = parsed.iso;
    }
  }

  // Parse workload
  if (projectDetails.workload) {
    const parsed = parseWorkload(projectDetails.workload);
    if (parsed.hours_week && parsed.confidence >= 0.6) {
      normalized.workload_hours_week = parsed.hours_week;
    }
  }

  // Parse duration
  if (projectDetails.duration) {
    const parsed = parseDuration(projectDetails.duration);
    if (parsed.days && parsed.confidence >= 0.6) {
      normalized.duration_days = parsed.days;
    }
  }

  return normalized;
}
