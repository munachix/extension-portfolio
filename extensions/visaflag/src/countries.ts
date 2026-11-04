/** How each country's data is described in badges. */
export type CC = 'uk' | 'us' | 'ca' | 'nl';
export const ALL: CC[] = ['us', 'uk', 'ca', 'nl'];

export const INFO: Record<CC, { flag: string; short: string; name: string; register: string; yes: string; no: string }> = {
  us: { flag: '🇺🇸', short: 'US', name: 'United States', register: 'US H-1B filings (Dept. of Labor)', yes: 'Files H-1B visas', no: 'No H-1B filings found' },
  uk: { flag: '🇬🇧', short: 'UK', name: 'United Kingdom', register: 'UK register of licensed sponsors', yes: 'UK licensed sponsor', no: 'Not on UK register' },
  ca: { flag: '🇨🇦', short: 'CA', name: 'Canada', register: 'Canada positive LMIA employers (last 4 quarters)', yes: 'Recent positive LMIA', no: 'No positive LMIA in the last year' },
  nl: { flag: '🇳🇱', short: 'NL', name: 'Netherlands', register: 'IND public register of recognised sponsors', yes: 'IND recognised sponsor', no: 'Not an IND recognised sponsor' },
};

export interface Dataset {
  country: CC;
  updated: string;
  source: string;
  fields: string[];
  meta?: Record<string, unknown>;
  rows: (string | number | null)[][];
}

export interface Result {
  cc: CC;
  status: 'yes' | 'likely' | 'no' | 'nodata';
  label: string;
  official?: string;
  /** Extra facts (Pro only for US numbers). */
  details: string[];
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Facts about one matched row. `pro` unlocks US filing counts and salary. */
export function describe(ds: Dataset, row: (string | number | null)[], pro: boolean): string[] {
  const f = (name: string) => row[ds.fields.indexOf(name)];
  switch (ds.country) {
    case 'uk': {
      const routes = String(f('routes') ?? '').split('|').filter(Boolean);
      const rating = f('rating');
      return [routes.slice(0, 3).join(', ') + (routes.length > 3 ? ` +${routes.length - 3}` : ''), rating ? `${rating}-rated` : '', f('town') ? String(f('town')) : ''].filter(Boolean);
    }
    case 'us': {
      if (!pro) return ['H-1B filing counts and salaries: Pro'];
      const m = ds.meta as { thisYear?: string; prevYear?: string } | undefined;
      const n = (v: unknown) => Number(v ?? 0).toLocaleString('en-US');
      const out = [`${n(f('filingsThisYear'))} certified H-1B in ${m?.thisYear ?? 'this year'}`];
      if (m?.prevYear) out.push(`${n(f('filingsPrevYear'))} in ${m.prevYear}`);
      if (f('medianWage')) out.push(`median offer ${money(Number(f('medianWage')))}`);
      return out;
    }
    case 'ca':
      return [`${f('positions')} approved position(s) in the last 4 quarters`, `latest ${f('lastQuarter')}`, String(f('provinces') ?? '').split('|').slice(0, 3).join(', ')].filter(Boolean);
    case 'nl':
      return f('kvk') ? [`KVK ${f('kvk')}`] : [];
  }
}
