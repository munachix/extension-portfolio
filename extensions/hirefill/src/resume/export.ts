/** ATS-friendly CV export: single column, standard headings. PDF (pdf-lib) and Word (docx). */
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { Profile } from '../profile/schema';

const range = (s: string, e: string, cur: boolean) => [s, cur ? 'Present' : e].filter(Boolean).join(' – ');
const bullets = (d: string) => d.split('\n').map((l) => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
const contact = (p: Profile) => [p.email, p.phone, [p.city, p.state || p.country].filter(Boolean).join(', '), p.linkedin, p.github, p.website].filter(Boolean).join(' · ');

/** Standard PDF fonts only cover Latin-1; swap the common exceptions instead of crashing. */
const latin = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/•/g, '-').replace(/…/g, '...').replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '');

export async function exportPdf(p: Profile): Promise<Blob> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 50, LH = 14;
  let page = doc.addPage([W, H]);
  let y = H - M;
  const need = (h: number) => { if (y - h < M) { page = doc.addPage([W, H]); y = H - M; } };
  const write = (text: string, font: PDFFont, size: number, indent = 0) => {
    const words = latin(text).split(/\s+/);
    let line = '';
    const flush = () => { need(LH); page.drawText(line, { x: M + indent, y, size, font, color: rgb(0.1, 0.1, 0.1) }); y -= size + 4; line = ''; };
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > W - 2 * M - indent) flush();
      line = line ? `${line} ${w}` : w;
    }
    if (line) flush();
  };
  const heading = (t: string) => { y -= 6; need(24); write(t.toUpperCase(), bold, 11); page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) }); y -= 2; };

  write(`${p.firstName} ${p.lastName}`, bold, 20);
  write(contact(p), reg, 9.5);
  if (p.summary) { heading('Summary'); write(p.summary, reg, 10); }
  if (p.work.length) {
    heading('Experience');
    for (const w of p.work) {
      write(`${w.title}${w.company ? `, ${w.company}` : ''}`, bold, 10.5);
      write([range(w.start, w.end, w.current), w.location].filter(Boolean).join(' · '), reg, 9);
      for (const b of bullets(w.description)) write(`- ${b}`, reg, 10, 10);
      y -= 4;
    }
  }
  if (p.education.length) {
    heading('Education');
    for (const e of p.education) { write(`${[e.degree, e.field].filter(Boolean).join(', ')}${e.school ? `, ${e.school}` : ''}`, bold, 10.5); write(range(e.start, e.end, false), reg, 9); }
  }
  if (p.skills.length) { heading('Skills'); write(p.skills.join(', '), reg, 10); }
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' });
}

export async function exportDocx(p: Profile): Promise<Blob> {
  const H = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } });
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: `${p.firstName} ${p.lastName}`, bold: true, size: 36 })] }),
    new Paragraph({ children: [new TextRun({ text: contact(p), size: 19 })] }),
  ];
  if (p.summary) children.push(H('Summary'), new Paragraph(p.summary));
  if (p.work.length) {
    children.push(H('Experience'));
    for (const w of p.work) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${w.title}${w.company ? `, ${w.company}` : ''}`, bold: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: [range(w.start, w.end, w.current), w.location].filter(Boolean).join(' · '), size: 18 })] }));
      for (const b of bullets(w.description)) children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
    }
  }
  if (p.education.length) {
    children.push(H('Education'));
    for (const e of p.education) children.push(new Paragraph({ children: [new TextRun({ text: `${[e.degree, e.field].filter(Boolean).join(', ')}${e.school ? `, ${e.school}` : ''}`, bold: true }), new TextRun({ text: `  ${range(e.start, e.end, false)}` })] }));
  }
  if (p.skills.length) children.push(H('Skills'), new Paragraph(p.skills.join(', ')));
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}
