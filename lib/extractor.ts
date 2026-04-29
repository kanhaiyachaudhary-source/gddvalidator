/**
 * Pure regex-based certificate data extractor.
 * No LLM. No external API calls. Fast and deterministic.
 *
 * Designed for Good Driver Certificate PDFs with this format:
 *   Certificate No: GDC-YYYY-XX-NNNNNN
 *   Policyholder: First Last  (or  Name: First Last)
 *   Date of Birth: YYYY-MM-DD
 */

export interface ExtractedCertData {
  cert_number: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
}

/** Try several patterns; first match wins. */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

/** Split a "First Last" or "First Middle Last" into first and last name. */
function splitName(fullName: string | null): { first: string | null; last: string | null } {
  if (!fullName) return { first: null, last: null };
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return {
    first: parts[0],
    // Treat everything after the first token as the last name
    last: parts.slice(1).join(' '),
  };
}

export function extractCertDataFromText(rawText: string): ExtractedCertData {
  // Normalize whitespace but keep newlines so line-based patterns can work
  const text = rawText.replace(/\r\n/g, '\n');

  // -------- Certificate Number --------
  const certNumber = firstMatch(text, [
    /Certificate\s*(?:No|Number)\.?\s*[:\-]?\s*(GDC-\d{4}-[A-Z]{2}-\d+)/i,
    /Cert(?:ificate)?\s*ID\.?\s*[:\-]?\s*(GDC-\d{4}-[A-Z]{2}-\d+)/i,
    // Last resort: any GDC-XXXX-XX-XXXXXX pattern in the document
    /\b(GDC-\d{4}-[A-Z]{2}-\d+)\b/,
  ]);

  // -------- Full Name --------
  let fullName = firstMatch(text, [
    /Policyholder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]{1,60}?)(?=\n|Date|DOB|Issue|Expiry|State|$)/i,
    /Name\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]{1,60}?)(?=\n|Date|DOB|Issue|Expiry|State|$)/i,
    /Holder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]{1,60}?)(?=\n|Date|DOB|Issue|Expiry|State|$)/i,
  ]);

  // Fallback: find an ALL-CAPS name line (common for stylized certificate PDFs)
  if (!fullName) {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // ALL CAPS, 2-4 words, only letters/spaces
      if (/^[A-Z][A-Z\s]{2,40}[A-Z]$/.test(trimmed)) {
        const wordCount = trimmed.split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 4) {
          fullName = trimmed;
          break;
        }
      }
    }
  }

  const { first, last } = splitName(fullName);

  // -------- Date of Birth --------
  // Prefer ISO format; fall back to other common formats and normalize
  const dobIso = firstMatch(text, [
    /Date\s*of\s*Birth\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
    /DOB\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
    /Born\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
  ]);

  let dob: string | null = dobIso;

  if (!dob) {
    // Try DD/MM/YYYY or DD-MM-YYYY → normalize to YYYY-MM-DD
    const dmy = firstMatch(text, [
      /Date\s*of\s*Birth\s*[:\-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      /DOB\s*[:\-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
    ]);
    if (dmy) {
      const parts = dmy.split(/[-\/]/);
      if (parts.length === 3) {
        const [d, m, y] = parts;
        dob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }

  return {
    cert_number: certNumber,
    first_name: first,
    last_name: last,
    dob,
  };
}
