import type { Profile } from '../profile/schema';

export function profileText(p: Profile): string {
  return [
    `${p.firstName} ${p.lastName}`, p.headline, p.summary,
    ...p.work.map((w) => `${w.title} at ${w.company} (${w.start} – ${w.current ? 'present' : w.end})\n${w.description}`),
    ...p.education.map((e) => `${e.degree} ${e.field}, ${e.school} (${e.start}–${e.end})`),
    `Skills: ${p.skills.join(', ')}`,
  ].filter(Boolean).join('\n');
}

export const tailorPrompt = (p: Profile, job: string, workIndex: number) => `PROFILE:
${profileText(p)}

JOB POST:
${job.slice(0, 6000)}

Rewrite ONLY the bullet points of this role so they match the job post better: "${p.work[workIndex].title} at ${p.work[workIndex].company}".
Original bullets:
${p.work[workIndex].description}

Rules: keep every fact true to PROFILE, reorder by relevance, use the job post's wording where it truthfully applies, at most ${Math.max(3, p.work[workIndex].description.split('\n').filter(Boolean).length)} bullets, one per line starting with "• ". Output only the bullets.`;

export const coverLetterPrompt = (p: Profile, job: string, tone: 'formal' | 'warm' | 'short') => `PROFILE:
${profileText(p)}

JOB POST:
${job.slice(0, 6000)}

Write a ${tone === 'short' ? 'short (120 words)' : tone === 'warm' ? 'warm, personal (250 words)' : 'formal (250 words)'} cover letter for this job. Only use facts from PROFILE. No placeholders like [Company] — use the names from the job post. Sign with ${p.firstName} ${p.lastName}.`;

export const answerPrompt = (p: Profile, job: string, question: string) => `PROFILE:
${profileText(p)}

JOB POST:
${job.slice(0, 4000)}

Application question: "${question}"
Draft an honest answer in under 150 words using only facts from PROFILE. First person.`;
