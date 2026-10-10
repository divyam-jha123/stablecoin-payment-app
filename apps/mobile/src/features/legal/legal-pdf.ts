import {
  formatLegalDate,
  LEGAL_EFFECTIVE_DATE,
  type LegalDocument,
} from './legal-documents';

// A4 in points, with 56pt margins.
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Font = 'F1' | 'F2';
type Line = { text: string; font: Font; size: number; gapBefore: number };

// The built-in Helvetica fonts only cover Latin-1, so typographic characters
// become plain ASCII and anything else is dropped.
const ASCII: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '→': '>',
  '…': '...',
  '₹': 'Rs ',
};

export function toPdfText(text: string) {
  return [...text]
    .map((char) => ASCII[char] ?? (char.charCodeAt(0) < 128 ? char : ''))
    .join('')
    .replace(/[\\()]/g, (char) => `\\${char}`);
}

/** Rough Helvetica width; slightly generous so lines never overflow. */
function textWidth(text: string, font: Font, size: number) {
  return text.length * size * (font === 'F2' ? 0.56 : 0.5);
}

export function wrapText(text: string, font: Font, size: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, font, size) > TEXT_WIDTH) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function layout(document: LegalDocument): Line[] {
  const lines: Line[] = [];
  const add = (text: string, font: Font, size: number, gapBefore: number) =>
    wrapText(text, font, size).forEach((part, index) =>
      lines.push({ text: part, font, size, gapBefore: index ? 0 : gapBefore }),
    );
  add(document.title, 'F2', 22, 0);
  add(`Effective date: ${formatLegalDate(LEGAL_EFFECTIVE_DATE)}`, 'F1', 11, 8);
  document.sections.forEach((section, index) => {
    add(`${index + 1}. ${section.heading}`, 'F2', 14, 20);
    section.body.forEach((block, at) => {
      const gap = at ? 8 : 6;
      if (typeof block === 'string') add(block, 'F1', 11, gap);
      else if ('bullets' in block)
        block.bullets.forEach((item, i) =>
          add(`- ${item}`, 'F1', 11, i ? 4 : gap),
        );
      else add(`${block.label}: ${block.text}`, 'F1', 11, gap);
    });
  });
  add('TravelPe - Tempo testnet. INR settlement is simulated.', 'F1', 9, 28);
  return lines;
}

function paginate(lines: Line[]) {
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE_HEIGHT - MARGIN;
  for (const line of lines) {
    const height = line.size * 1.4;
    if (y - line.gapBefore - height < MARGIN && ops.length) {
      pages.push(ops.join('\n'));
      ops = [];
      y = PAGE_HEIGHT - MARGIN;
    } else y -= line.gapBefore;
    y -= height;
    ops.push(
      `BT /${line.font} ${line.size} Tf ${MARGIN} ${y.toFixed(1)} Td (${toPdfText(line.text)}) Tj ET`,
    );
  }
  pages.push(ops.join('\n'));
  return pages;
}

/** A text-only PDF of a legal document, as bytes ready to save. */
export function legalDocumentPdf(document: LegalDocument) {
  const pages = paginate(layout(document));
  // Objects 1-4 are fixed; each page then takes a page and a content object.
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  pages.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });

  // Every character is ASCII, so string offsets are byte offsets.
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i);
  return bytes;
}

/** A file name such as travelpe-terms-of-service.pdf. */
export function legalPdfFileName(document: LegalDocument) {
  return `travelpe-${document.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.pdf`;
}
