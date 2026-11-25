import { useEffect, useMemo, useState } from 'react';

/**
 * Demo portfolio balance.
 *
 * The wallet shows a headline balance that starts at a fixed amount and grows
 * by a fixed percentage on a fixed interval, but only on working days
 * (Monday to Friday). Weekend time never accrues growth.
 *
 * Change the whole behaviour by editing the single line below. The compact
 * format is `<amount>,<interval>,<rate>`:
 *
 *   '20k,1min,3%'   -> $20,000 growing 3% every 1 minute
 *   '40k,5mins,2%'  -> $40,000 growing 2% every 5 minutes
 *   '1.5m,30s,0.5%' -> $1,500,000 growing 0.5% every 30 seconds
 */
export const DEMO_PORTFOLIO_SPEC = '20k,1min,3%';

/**
 * Growth stops once the balance reaches this multiple of the base amount, so a
 * fast rate cannot turn the demo balance into an absurd number while the tab
 * stays open.
 */
export const DEMO_MAX_MULTIPLIER = 100;

export interface DemoPortfolioSpec {
  baseAmount: number;
  intervalMs: number;
  ratePerInterval: number;
}

export const DEFAULT_DEMO_PORTFOLIO: DemoPortfolioSpec = {
  baseAmount: 20_000,
  intervalMs: 60_000,
  ratePerInterval: 0.03,
};

const AMOUNT_PATTERN = /^(\d+(?:\.\d+)?)\s*([km])?$/i;
const INTERVAL_PATTERN = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i;
const RATE_PATTERN = /^(\d+(?:\.\d+)?)\s*%$/;

const AMOUNT_SUFFIXES: Record<string, number> = { k: 1_000, m: 1_000_000 };
const INTERVAL_UNITS: Record<string, number> = {
  s: 1_000, sec: 1_000, secs: 1_000, second: 1_000, seconds: 1_000,
  m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
};

/**
 * Parses the compact demo spec. Returns `null` for anything malformed so the
 * caller can fall back to the defaults instead of crashing the portfolio.
 */
export const parseDemoPortfolioSpec = (spec: string): DemoPortfolioSpec | null => {
  if (typeof spec !== 'string') return null;
  const parts = spec.split(',').map((part) => part.trim());
  if (parts.length !== 3) return null;

  const amountMatch = AMOUNT_PATTERN.exec(parts[0]);
  const intervalMatch = INTERVAL_PATTERN.exec(parts[1]);
  const rateMatch = RATE_PATTERN.exec(parts[2]);
  if (!amountMatch || !intervalMatch || !rateMatch) return null;

  const baseAmount = Number(amountMatch[1]) * (AMOUNT_SUFFIXES[amountMatch[2]?.toLowerCase() ?? ''] ?? 1);
  const intervalMs = Number(intervalMatch[1]) * INTERVAL_UNITS[intervalMatch[2].toLowerCase()];
  const ratePerInterval = Number(rateMatch[1]) / 100;

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return null;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return null;
  if (!Number.isFinite(ratePerInterval) || ratePerInterval <= 0) return null;

  return { baseAmount, intervalMs, ratePerInterval };
};

export const resolveDemoPortfolioSpec = (spec: string): DemoPortfolioSpec =>
  parseDemoPortfolioSpec(spec) ?? DEFAULT_DEMO_PORTFOLIO;

const MAX_WEEKDAY_SCAN_DAYS = 400;

/**
 * Counts the minutes between two instants that fall on a working day
 * (Monday to Friday). Weekend time is skipped entirely, so a balance left
 * untouched over a weekend resumes growing on Monday.
 */
export const countWeekdayMinutes = (fromMs: number, toMs: number): number => {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return 0;

  let minutes = 0;
  let cursor = fromMs;
  let scannedDays = 0;
  while (cursor < toMs && scannedDays < MAX_WEEKDAY_SCAN_DAYS) {
    const day = new Date(cursor);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    const segmentEnd = Math.min(dayEnd, toMs);
    const weekday = day.getDay();
    if (weekday >= 1 && weekday <= 5) {
      minutes += (segmentEnd - cursor) / 60_000;
    }
    cursor = segmentEnd;
    scannedDays += 1;
  }
  return minutes;
};

/**
 * Compounds the base amount once per completed interval of working-day time.
 * Growth is stepwise, so the balance is stable inside an interval and jumps at
 * each boundary.
 */
export const demoPortfolioValue = (
  spec: DemoPortfolioSpec,
  anchorMs: number,
  nowMs: number
): number => {
  const elapsedMinutes = countWeekdayMinutes(anchorMs, nowMs);
  const elapsedIntervals = Math.floor(elapsedMinutes / (spec.intervalMs / 60_000));
  const maxIntervals = Math.log(DEMO_MAX_MULTIPLIER) / Math.log(1 + spec.ratePerInterval);
  const intervals = Math.max(0, Math.min(elapsedIntervals, maxIntervals));
  return spec.baseAmount * Math.pow(1 + spec.ratePerInterval, intervals);
};

export const formatDemoInterval = (intervalMs: number): string => {
  if (intervalMs % 3_600_000 === 0) {
    const hours = intervalMs / 3_600_000;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (intervalMs % 60_000 === 0) {
    const minutes = intervalMs / 60_000;
    return `${minutes} min`;
  }
  const seconds = Math.round(intervalMs / 1_000);
  return `${seconds}s`;
};

export const formatDemoRate = (ratePerInterval: number): string => {
  const percent = ratePerInterval * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, '')}%`;
};

export const describeDemoPortfolio = (spec: DemoPortfolioSpec): string =>
  `+${formatDemoRate(spec.ratePerInterval)} every ${formatDemoInterval(spec.intervalMs)} · Mon–Fri`;

const SPEC_KEY = 'demo-portfolio-spec';
const ANCHOR_KEY = 'demo-portfolio-anchor';

const scopedKey = (key: string, scope: string): string => (scope ? `${key}:${scope}` : key);

/**
 * The demo spec is a display setting for this browsing session only. It is kept
 * in `sessionStorage` (never `localStorage`) and mirrored to MongoDB by the
 * portfolio so it follows the account across devices.
 */
export const readDemoPortfolioSpec = (scope = ''): string => {
  try {
    const stored = window.sessionStorage.getItem(scopedKey(SPEC_KEY, scope));
    return stored && parseDemoPortfolioSpec(stored) ? stored : DEMO_PORTFOLIO_SPEC;
  } catch {
    return DEMO_PORTFOLIO_SPEC;
  }
};

export const writeDemoPortfolioSpec = (spec: string, scope = ''): void => {
  try {
    window.sessionStorage.setItem(scopedKey(SPEC_KEY, scope), spec);
  } catch {
    // A blocked sessionStorage must not stop the balance from updating.
  }
};

/**
 * The demo balance is anchored to the first time this tab opened the wallet, so
 * the growth is visible immediately instead of being derived from midnight.
 * Each account gets its own anchor so several accounts can be compared.
 */
const readDemoAnchor = (scope: string): number => {
  try {
    const stored = Number(window.sessionStorage.getItem(scopedKey(ANCHOR_KEY, scope)));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const now = Date.now();
    window.sessionStorage.setItem(scopedKey(ANCHOR_KEY, scope), String(now));
    return now;
  } catch {
    return Date.now();
  }
};

export interface DemoPortfolioState {
  value: number;
  spec: DemoPortfolioSpec;
  growthLabel: string;
}

/** Re-renders once a second so the headline balance ticks at each interval. */
export const useDemoPortfolio = (specText: string, scope = ''): DemoPortfolioState => {
  const [now, setNow] = useState(() => Date.now());
  const anchor = useMemo(() => readDemoAnchor(scope), [scope]);
  const spec = useMemo(() => resolveDemoPortfolioSpec(specText), [specText]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return {
    value: demoPortfolioValue(spec, anchor, now),
    spec,
    growthLabel: describeDemoPortfolio(spec),
  };
};
