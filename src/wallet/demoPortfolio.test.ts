import {
  countWeekdayMinutes,
  demoPortfolioValue,
  describeDemoPortfolio,
  parseDemoPortfolioSpec,
  readDemoPortfolioSpec,
  resolveDemoPortfolioSpec,
  writeDemoPortfolioSpec,
} from './demoPortfolio';

describe('parseDemoPortfolioSpec', () => {
  it('parses the default spec', () => {
    expect(parseDemoPortfolioSpec('20k,1min,3%')).toEqual({
      baseAmount: 20_000,
      intervalMs: 60_000,
      ratePerInterval: 0.03,
    });
  });

  it('parses the terse spec the user types', () => {
    expect(parseDemoPortfolioSpec('40k,5mins,2%')).toEqual({
      baseAmount: 40_000,
      intervalMs: 300_000,
      ratePerInterval: 0.02,
    });
  });

  it('accepts plain amounts, seconds and fractional rates', () => {
    expect(parseDemoPortfolioSpec('1500000,30s,0.5%')).toEqual({
      baseAmount: 1_500_000,
      intervalMs: 30_000,
      ratePerInterval: 0.005,
    });
    expect(parseDemoPortfolioSpec('1.5m,2h,10%')).toEqual({
      baseAmount: 1_500_000,
      intervalMs: 7_200_000,
      ratePerInterval: 0.1,
    });
  });

  it('tolerates spacing and casing', () => {
    expect(parseDemoPortfolioSpec(' 40K , 5 Mins , 2 % ')).toEqual({
      baseAmount: 40_000,
      intervalMs: 300_000,
      ratePerInterval: 0.02,
    });
  });

  it('rejects malformed specs', () => {
    expect(parseDemoPortfolioSpec('')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,5mins')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,5mins,2%,extra')).toBeNull();
    expect(parseDemoPortfolioSpec('abc,5mins,2%')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,soon,2%')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,5mins,2')).toBeNull();
    expect(parseDemoPortfolioSpec('0,5mins,2%')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,0mins,2%')).toBeNull();
    expect(parseDemoPortfolioSpec('40k,5mins,0%')).toBeNull();
  });

  it('falls back to the defaults for malformed specs', () => {
    expect(resolveDemoPortfolioSpec('nonsense')).toEqual({
      baseAmount: 20_000,
      intervalMs: 60_000,
      ratePerInterval: 0.03,
    });
  });
});

describe('countWeekdayMinutes', () => {
  it('counts a full weekday', () => {
    // Wednesday 2024-01-03 00:00 -> Thursday 2024-01-04 00:00, local time.
    const start = new Date(2024, 0, 3).getTime();
    expect(countWeekdayMinutes(start, new Date(2024, 0, 4).getTime())).toBe(1_440);
  });

  it('skips weekend time entirely', () => {
    // Friday 2024-01-05 00:00 -> Monday 2024-01-08 00:00, local time.
    const friday = new Date(2024, 0, 5).getTime();
    const monday = new Date(2024, 0, 8).getTime();
    expect(countWeekdayMinutes(friday, monday)).toBe(1_440);
  });

  it('returns zero for a weekend-only window', () => {
    const saturday = new Date(2024, 0, 6).getTime();
    const sunday = new Date(2024, 0, 7).getTime();
    expect(countWeekdayMinutes(saturday, sunday)).toBe(0);
  });

  it('returns zero when time does not move forward', () => {
    const start = new Date(2024, 0, 3).getTime();
    expect(countWeekdayMinutes(start, start)).toBe(0);
    expect(countWeekdayMinutes(start, start - 1_000)).toBe(0);
  });
});

describe('demoPortfolioValue', () => {
  const spec = { baseAmount: 20_000, intervalMs: 60_000, ratePerInterval: 0.03 };
  const monday = new Date(2024, 0, 1).getTime();

  it('starts at the base amount', () => {
    expect(demoPortfolioValue(spec, monday, monday)).toBe(20_000);
  });

  it('compounds once per completed interval', () => {
    expect(demoPortfolioValue(spec, monday, monday + 60_000)).toBeCloseTo(20_600, 6);
    expect(demoPortfolioValue(spec, monday, monday + 120_000)).toBeCloseTo(21_218, 6);
  });

  it('holds the value inside an interval', () => {
    expect(demoPortfolioValue(spec, monday, monday + 59_000)).toBe(20_000);
  });

  it('does not grow over a weekend', () => {
    // Friday noon to Sunday noon is 12 working hours, less than one 24h step.
    const daily = { baseAmount: 20_000, intervalMs: 24 * 60 * 60 * 1_000, ratePerInterval: 0.03 };
    const friday = new Date(2024, 0, 5, 12).getTime();
    const sunday = new Date(2024, 0, 7, 12).getTime();
    expect(demoPortfolioValue(daily, friday, sunday)).toBe(20_000);
  });

  it('caps runaway growth', () => {
    const value = demoPortfolioValue(spec, monday, monday + 400 * 24 * 60 * 60 * 1_000);
    expect(value).toBeLessThan(20_000 * 100 * 1.0001);
  });
});

describe('describeDemoPortfolio', () => {
  it('describes the active rule', () => {
    expect(describeDemoPortfolio({ baseAmount: 40_000, intervalMs: 300_000, ratePerInterval: 0.02 }))
      .toBe('+2% every 5 min · Mon–Fri');
    expect(describeDemoPortfolio({ baseAmount: 20_000, intervalMs: 60_000, ratePerInterval: 0.03 }))
      .toBe('+3% every 1 min · Mon–Fri');
    expect(describeDemoPortfolio({ baseAmount: 20_000, intervalMs: 30_000, ratePerInterval: 0.005 }))
      .toBe('+0.5% every 30s · Mon–Fri');
    expect(describeDemoPortfolio({ baseAmount: 20_000, intervalMs: 3_600_000, ratePerInterval: 0.1 }))
      .toBe('+10% every 1 hour · Mon–Fri');
  });
});

describe('demo spec storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('defaults when nothing is stored', () => {
    expect(readDemoPortfolioSpec()).toBe('20k,1min,3%');
  });

  it('round-trips a valid spec per account', () => {
    writeDemoPortfolioSpec('40k,5mins,2%', 'user_1');
    expect(readDemoPortfolioSpec('user_1')).toBe('40k,5mins,2%');
    expect(readDemoPortfolioSpec('user_2')).toBe('20k,1min,3%');
  });

  it('ignores a stored spec that no longer parses', () => {
    window.sessionStorage.setItem('demo-portfolio-spec', 'garbage');
    expect(readDemoPortfolioSpec()).toBe('20k,1min,3%');
  });
});
