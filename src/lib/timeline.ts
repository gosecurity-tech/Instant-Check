/**
 * 5-Year Timeline Validation
 *
 * BS7858 requires candidates to account for all time in the last 5 years
 * with both address history and activity/employment history.
 * This module detects gaps and overlaps in timeline data.
 */

import { differenceInMonths, differenceInDays, parseISO, isAfter, isBefore, isEqual, subYears, format } from 'date-fns';

// ============================================================
// Types
// ============================================================

export interface TimelinePeriod {
  id: string;
  dateFrom: string;   // ISO date string
  dateTo: string | null;  // null = current/ongoing
  label?: string;      // For display (e.g. address or employer name)
}

export interface TimelineGap {
  from: string;   // ISO date
  to: string;     // ISO date
  days: number;
}

export interface TimelineOverlap {
  periodA: string;  // ID of first period
  periodB: string;  // ID of second period
  from: string;
  to: string;
  days: number;
}

export interface TimelineValidation {
  isValid: boolean;
  totalMonths: number;
  requiredMonths: number;
  gaps: TimelineGap[];
  overlaps: TimelineOverlap[];
  coveragePercent: number;
  errors: string[];
}

// ============================================================
// Constants
// ============================================================

const REQUIRED_YEARS = 5;
const REQUIRED_MONTHS = REQUIRED_YEARS * 12;
// Allow up to 30 days gap without flagging (reasonable for moving between addresses, etc.)
const ACCEPTABLE_GAP_DAYS = 30;

// ============================================================
// Core validation
// ============================================================

/**
 * Validate that the given timeline periods cover the required 5-year span.
 * Returns detailed validation result including gaps and overlaps.
 */
export function validateTimeline(
  periods: TimelinePeriod[],
  referenceDate: Date = new Date(),
): TimelineValidation {
  const errors: string[] = [];
  const fiveYearsAgo = subYears(referenceDate, REQUIRED_YEARS);

  if (periods.length === 0) {
    return {
      isValid: false,
      totalMonths: 0,
      requiredMonths: REQUIRED_MONTHS,
      gaps: [{ from: format(fiveYearsAgo, 'yyyy-MM-dd'), to: format(referenceDate, 'yyyy-MM-dd'), days: differenceInDays(referenceDate, fiveYearsAgo) }],
      overlaps: [],
      coveragePercent: 0,
      errors: ['No timeline entries provided'],
    };
  }

  // Parse and sort periods by start date
  const sorted = periods
    .map((p) => ({
      ...p,
      start: parseISO(p.dateFrom),
      end: p.dateTo ? parseISO(p.dateTo) : referenceDate,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Validate individual periods
  for (const p of sorted) {
    if (isAfter(p.start, p.end)) {
      errors.push(`Period "${p.label ?? p.id}" has start date after end date`);
    }
  }

  // Detect gaps
  const gaps: TimelineGap[] = [];

  // Check gap before first period (from 5 years ago)
  const firstStart = sorted[0].start;
  if (isAfter(firstStart, fiveYearsAgo)) {
    const gapDays = differenceInDays(firstStart, fiveYearsAgo);
    if (gapDays > ACCEPTABLE_GAP_DAYS) {
      gaps.push({
        from: format(fiveYearsAgo, 'yyyy-MM-dd'),
        to: format(firstStart, 'yyyy-MM-dd'),
        days: gapDays,
      });
    }
  }

  // Check gaps between consecutive periods
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].end;
    const nextStart = sorted[i + 1].start;

    if (isAfter(nextStart, currentEnd)) {
      const gapDays = differenceInDays(nextStart, currentEnd);
      if (gapDays > ACCEPTABLE_GAP_DAYS) {
        gaps.push({
          from: format(currentEnd, 'yyyy-MM-dd'),
          to: format(nextStart, 'yyyy-MM-dd'),
          days: gapDays,
        });
      }
    }
  }

  // Check gap after last period (to reference date)
  const lastEnd = sorted[sorted.length - 1].end;
  if (isBefore(lastEnd, referenceDate)) {
    const gapDays = differenceInDays(referenceDate, lastEnd);
    if (gapDays > ACCEPTABLE_GAP_DAYS) {
      gaps.push({
        from: format(lastEnd, 'yyyy-MM-dd'),
        to: format(referenceDate, 'yyyy-MM-dd'),
        days: gapDays,
      });
    }
  }

  // Detect overlaps
  const overlaps: TimelineOverlap[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      // Two periods overlap if a.start < b.end AND b.start < a.end
      if (isBefore(a.start, b.end) && isBefore(b.start, a.end)) {
        const overlapStart = isAfter(a.start, b.start) ? a.start : b.start;
        const overlapEnd = isBefore(a.end, b.end) ? a.end : b.end;
        const overlapDays = differenceInDays(overlapEnd, overlapStart);

        if (overlapDays > 0) {
          overlaps.push({
            periodA: a.id,
            periodB: b.id,
            from: format(overlapStart, 'yyyy-MM-dd'),
            to: format(overlapEnd, 'yyyy-MM-dd'),
            days: overlapDays,
          });
        }
      }
    }
  }

  // Calculate total coverage (merge overlapping intervals)
  const merged = mergeIntervals(
    sorted.map((p) => ({
      start: p.start < fiveYearsAgo ? fiveYearsAgo : p.start,
      end: p.end > referenceDate ? referenceDate : p.end,
    })),
  );

  let totalCoveredDays = 0;
  for (const interval of merged) {
    totalCoveredDays += differenceInDays(interval.end, interval.start);
  }

  const totalRequiredDays = differenceInDays(referenceDate, fiveYearsAgo);
  const coveragePercent = Math.min(100, Math.round((totalCoveredDays / totalRequiredDays) * 100));
  const totalMonths = Math.round(totalCoveredDays / 30.44); // Average days per month

  // Build error messages for gaps
  if (gaps.length > 0) {
    for (const gap of gaps) {
      errors.push(`Gap of ${gap.days} days from ${gap.from} to ${gap.to}`);
    }
  }

  // Overlaps are warnings, not errors (people can work while at university, etc.)
  const isValid = gaps.length === 0 && totalMonths >= REQUIRED_MONTHS && errors.length === 0;

  return {
    isValid,
    totalMonths,
    requiredMonths: REQUIRED_MONTHS,
    gaps,
    overlaps,
    coveragePercent,
    errors,
  };
}

// ============================================================
// Helper: merge overlapping intervals
// ============================================================

interface Interval {
  start: Date;
  end: Date;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (isAfter(current.start, last.end)) {
      // No overlap — add as new interval
      merged.push(current);
    } else {
      // Overlap — extend the last interval
      last.end = isAfter(current.end, last.end) ? current.end : last.end;
    }
  }

  return merged;
}

// ============================================================
// Convenience: validate address history
// ============================================================

export function validateAddressTimeline(
  addresses: Array<{ id: string; date_from: string; date_to: string | null; address_line_1: string }>,
): TimelineValidation {
  return validateTimeline(
    addresses.map((a) => ({
      id: a.id,
      dateFrom: a.date_from,
      dateTo: a.date_to,
      label: a.address_line_1,
    })),
  );
}

// ============================================================
// Convenience: validate activity history
// ============================================================

export function validateActivityTimeline(
  activities: Array<{ id: string; date_from: string; date_to: string | null; organisation_name: string | null; activity_type: string }>,
): TimelineValidation {
  return validateTimeline(
    activities.map((a) => ({
      id: a.id,
      dateFrom: a.date_from,
      dateTo: a.date_to,
      label: a.organisation_name ?? a.activity_type,
    })),
  );
}
