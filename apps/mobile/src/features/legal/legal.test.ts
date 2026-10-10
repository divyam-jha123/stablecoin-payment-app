import { describe, expect, it } from 'vitest';
import {
  findLegalDocument,
  formatLegalDate,
  LEGAL_DOCUMENTS,
} from './legal-documents';
import {
  legalDocumentPdf,
  legalPdfFileName,
  toPdfText,
  wrapText,
} from './legal-pdf';

const terms = LEGAL_DOCUMENTS[0]!;

function decode(bytes: Uint8Array) {
  return String.fromCharCode(...bytes);
}

describe('legal documents', () => {
  it('lists each document once, with sections', () => {
    const ids = LEGAL_DOCUMENTS.map((document) => document.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const document of LEGAL_DOCUMENTS)
      expect(document.sections.length).toBeGreaterThan(0);
  });

  it('finds documents by id and ignores unknown ids', () => {
    expect(findLegalDocument('privacy')?.title).toBe('Privacy Policy');
    expect(findLegalDocument('nope')).toBeNull();
    expect(findLegalDocument(['terms'])).toBeNull();
  });

  it('formats the effective date', () => {
    expect(formatLegalDate('2026-10-01')).toBe('October 1, 2026');
    expect(formatLegalDate('2026-10-01', true)).toBe('October 2026');
  });
});

describe('legal PDF', () => {
  it('keeps text to escaped ASCII', () => {
    expect(toPdfText('Profile → Help (it’s ₹5) \\')).toBe(
      "Profile > Help \\(it's Rs 5\\) \\\\",
    );
  });

  it('wraps long paragraphs', () => {
    const lines = wrapText('word '.repeat(200), 'F1', 11);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length * 5.5 <= 483)).toBe(true);
  });

  it('writes a PDF whose cross-reference table points at each object', () => {
    const pdf = decode(legalDocumentPdf(terms));
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('(Terms of Service) Tj');

    const xref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const entries = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n/g)];
    entries.forEach((entry, i) =>
      expect(pdf.slice(Number(entry[1]))).toMatch(
        new RegExp(`^${i + 1} 0 obj`),
      ),
    );
  });

  it('writes labels and bullet points', () => {
    const pdf = decode(legalDocumentPdf(terms));
    expect(pdf).toContain('(Interface Only: The App is a non-custodial');
    expect(pdf).toContain('(- Incorrect recipient wallet addresses');
  });

  it('starts new pages for long documents', () => {
    const long = {
      ...terms,
      sections: Array.from({ length: 30 }, () => terms.sections[0]!),
    };
    expect(decode(legalDocumentPdf(long))).toMatch(/\/Count [2-9]/);
  });

  it('names the file after the document', () => {
    expect(legalPdfFileName(findLegalDocument('refunds')!)).toBe(
      'travelpe-refund-dispute-policy.pdf',
    );
  });
});
