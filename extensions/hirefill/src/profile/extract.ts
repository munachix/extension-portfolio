/** CV file -> plain text, on the user's computer (pdf.js for PDF, mammoth for Word). */
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.mjs');

export async function extractText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    const lines: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // group text runs into lines by their y position
      let lastY: number | null = null;
      let line = '';
      for (const it of content.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
        line += (line && !line.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
        lastY = y;
        if (it.hasEOL) { lines.push(line); line = ''; lastY = null; }
      }
      if (line) lines.push(line);
    }
    return lines.map((l) => l.trim()).filter(Boolean).join('\n');
  }
  if (/\.docx$/i.test(file.name)) return (await mammoth.extractRawText({ arrayBuffer: buf })).value;
  if (/\.txt$/i.test(file.name) || file.type.startsWith('text/')) return new TextDecoder().decode(buf);
  throw new Error('Please upload a PDF, Word (.docx) or text file.');
}
