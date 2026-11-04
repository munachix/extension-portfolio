/** Time-zone requirements: "9am–5pm EST", "4h overlap with PST", "UTC-3 to UTC+3", "CET ±2h". */

export interface TimeZoneReq {
  start: number;
  end: number;
  /** Human label, e.g. "US Eastern (ET)" or "UTC+1". */
  label: string;
  zone?: string;
  fixedOffset?: number;
  /** Allowed UTC offset band in minutes, if the post gives one. */
  band?: [number, number];
  /** Working hours in that zone, 24h clock. */
  hours?: [number, number];
  overlapHours?: number;
}

interface TzDef { re: RegExp; zone: string; label: string }
// Order matters: longer/more specific names first.
const DEFS: TzDef[] = [
  { re: /\bCentral European (?:Summer |Standard )?Time\b|\bCES?T\b|\bMES?Z\b/g, zone: 'Europe/Berlin', label: 'Central European (CET)' },
  { re: /\bEastern European (?:Summer )?Time\b|\bEES?T\b/g, zone: 'Europe/Athens', label: 'Eastern European (EET)' },
  { re: /\bWestern European (?:Summer )?Time\b|\bWES?T\b(?!\s+(?:Coast|Africa|Virginia))/g, zone: 'Europe/Lisbon', label: 'Western European (WET)' },
  { re: /\bAustralian Eastern (?:Standard |Daylight )?Time\b|\bAE[SD]?T\b|\bSydney time\b/gi, zone: 'Australia/Sydney', label: 'Australian Eastern (AEST)' },
  { re: /\bAWST\b|\bPerth time\b/g, zone: 'Australia/Perth', label: 'Australian Western (AWST)' },
  { re: /\bAC[SD]T\b/g, zone: 'Australia/Adelaide', label: 'Australian Central (ACST)' },
  { re: /\bNZ[SD]?T\b|\bNew Zealand (?:Standard |Daylight )?time\b/gi, zone: 'Pacific/Auckland', label: 'New Zealand (NZT)' },
  { re: /\bEastern (?:Standard |Daylight )?Time\b|\bEastern time ?zone\b|\bE[SD]?T\b/g, zone: 'America/New_York', label: 'US Eastern (ET)' },
  { re: /\bCentral (?:Standard |Daylight )?Time\b|\bC[SD]T\b|\bCT\b/g, zone: 'America/Chicago', label: 'US Central (CT)' },
  { re: /\bMountain (?:Standard |Daylight )?Time\b|\bM[SD]T\b/g, zone: 'America/Denver', label: 'US Mountain (MT)' },
  { re: /\bPacific (?:Standard |Daylight )?Time\b|\bP[SD]?T\b/g, zone: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { re: /\bBST\b|\bUK time\b|\bLondon time\b/gi, zone: 'Europe/London', label: 'UK time' },
  { re: /\bIST\b|\bIndia(?:n)? Standard Time\b/g, zone: 'Asia/Kolkata', label: 'India (IST)' },
  { re: /\bSGT\b/g, zone: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { re: /\bJST\b/g, zone: 'Asia/Tokyo', label: 'Japan (JST)' },
  { re: /\bWAT\b/g, zone: 'Africa/Lagos', label: 'West Africa (WAT)' },
  { re: /\bEAT\b/g, zone: 'Africa/Nairobi', label: 'East Africa (EAT)' },
  { re: /\bSAST\b/g, zone: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  { re: /\bBRT\b/g, zone: 'America/Sao_Paulo', label: 'Brazil (BRT)' },
];
const FIXED = /\b(?:UTC|GMT)\s*([+\-−–]\s*\d{1,2}(?::?\d{2})?)?(?![\d:])/g;
const CONTEXT = /\b(?:time ?zones?|hours|overlap|overlapping|business hours|working hours|work hours|core hours|schedule|shift|within|Zeitzone|Arbeitszeit|Kernarbeitszeit|Uhr)\b|\d{1,2}\s*(?:am|pm)\b|\d{1,2}:\d{2}|±|\+\/-/i;

export function parseOffset(s: string): number {
  const m = s.replace(/\s/g, '').replace(/[−–]/g, '-').match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Offset of an IANA zone from UTC at `date`, in minutes. */
export function zoneOffset(zone: string, date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

export const fmtOffset = (min: number) => {
  const sign = min < 0 ? '−' : '+';
  const a = Math.abs(min);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
};

function to24(h: number, ap?: string): number {
  if (!ap) return h;
  const pm = ap.toLowerCase() === 'pm';
  if (h === 12) return pm ? 12 : 0;
  return pm ? h + 12 : h;
}

/** Find time-zone requirements in one sentence. `base` = sentence offset in the full text. */
export function findTimeZones(sentence: string, base: number, now = new Date()): TimeZoneReq[] {
  const hasContext = CONTEXT.test(sentence);
  const out: TimeZoneReq[] = [];
  const taken: [number, number][] = [];
  const free = (s: number, e: number) => !taken.some(([a, b]) => s < b && e > a);

  // Explicit band: "UTC-3 to UTC+3", "between GMT-5 and GMT+1"
  const bandRe = /\b(?:UTC|GMT)\s*([+\-−–]\s*\d{1,2}(?::?\d{2})?)\s*(?:to|-|–|and|through|until|bis)\s*(?:UTC|GMT)?\s*([+\-−–]\s*\d{1,2}(?::?\d{2})?)/gi;
  for (const m of sentence.matchAll(bandRe)) {
    const a = parseOffset(m[1]);
    const b = parseOffset(m[2]);
    taken.push([m.index!, m.index! + m[0].length]);
    out.push({ start: base + m.index!, end: base + m.index! + m[0].length, label: `${fmtOffset(Math.min(a, b))} to ${fmtOffset(Math.max(a, b))}`, band: [Math.min(a, b), Math.max(a, b)] });
  }

  const tokens: { s: number; e: number; zone?: string; fixed?: number; label: string }[] = [];
  for (const m of sentence.matchAll(FIXED)) {
    if (!free(m.index!, m.index! + m[0].length)) continue;
    const fixed = m[1] ? parseOffset(m[1]) : 0;
    tokens.push({ s: m.index!, e: m.index! + m[0].length, fixed, label: fmtOffset(fixed) });
  }
  if (hasContext) {
    for (const d of DEFS) {
      for (const m of sentence.matchAll(d.re)) {
        const s = m.index!, e = s + m[0].length;
        if (!free(s, e) || tokens.some((t) => s < t.e && e > t.s)) continue;
        tokens.push({ s, e, zone: d.zone, label: d.label });
      }
    }
  }
  if (!tokens.length) return out;

  const hoursM = sentence.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until|bis)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|Uhr)?/i);
  let hours: [number, number] | undefined;
  if (hoursM && (hoursM[3] || hoursM[6] || hoursM[2])) {
    const ap2 = hoursM[6] && hoursM[6].toLowerCase() !== 'uhr' ? hoursM[6] : undefined;
    const h1 = to24(Number(hoursM[1]), hoursM[3] ?? ap2);
    const h2 = to24(Number(hoursM[4]), ap2);
    if (h1 < 24 && h2 <= 24) hours = [h1, h2];
  }
  const ov = sentence.match(/(\d{1,2})\+?\s*(?:hours?|hrs?|h)\s*(?:of\s*)?(?:overlap|overlapping)/i) ?? sentence.match(/overlap\w*\s*(?:of\s*)?(?:at least\s*)?(\d{1,2})\s*(?:hours?|hrs?|h)\b/i);
  const overlapHours = ov ? Number(ov[1]) : undefined;

  const seen = new Set<string>();
  for (const t of tokens.sort((a, b) => a.s - b.s)) {
    const key = t.zone ?? String(t.fixed);
    if (seen.has(key)) continue;
    seen.add(key);
    const center = t.zone ? zoneOffset(t.zone, now) : t.fixed!;
    // "within 2 hours of CET" / "±3 hours of UTC" (before the token) or "CET ±2h" (after)
    const before = sentence.slice(Math.max(0, t.s - 30), t.s);
    const after = sentence.slice(t.e, t.e + 15);
    const w = before.match(/(?:within|±|\+\/-|\+-|plus or minus|\+\/−)\s*(\d{1,2})\s*(?:hours?|hrs?|h|Stunden)?\b[^.;]{0,12}?(?:of|from|von)?\s*(?:the\s*)?$/i) ?? after.match(/^\s*(?:±|\+\/-|\+-)\s*(\d{1,2})/);
    const req: TimeZoneReq = { start: base + t.s, end: base + t.e, label: t.label, zone: t.zone, fixedOffset: t.fixed, hours, overlapHours };
    if (w) req.band = [center - Number(w[1]) * 60, center + Number(w[1]) * 60];
    out.push(req);
  }
  return out;
}

/** "9am–5pm ET" shown in the user's own time zone, e.g. "3:00 PM – 11:00 PM". */
export function localWindow(req: TimeZoneReq, userZone: string, now = new Date()): { from: string; to: string; overlapTo?: string } | null {
  const srcOffset = req.zone ? zoneOffset(req.zone, now) : req.fixedOffset;
  if (srcOffset == null) return null;
  const [h1, h2] = req.hours ?? [9, 17];
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const at = (h: number) => new Date(day + h * 3600000 - srcOffset * 60000);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: userZone, hour: 'numeric', minute: '2-digit' });
  const out: { from: string; to: string; overlapTo?: string } = { from: fmt(at(h1)), to: fmt(at(h2)) };
  if (req.overlapHours) out.overlapTo = fmt(at(h1 + req.overlapHours));
  return out;
}
