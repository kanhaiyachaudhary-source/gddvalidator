/**
 * Pure regex-based certificate data extractor.
 * No LLM. No external API calls. Fast and deterministic.
 */

export interface ExtractedCertData {
  cert_number: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function splitName(fullName: string | null): { first: string | null; last: string | null } {
  if (!fullName) return { first: null, last: null };
  // Convert ALL CAPS to Title Case ("RAHUL SHARMA" → "Rahul Sharma")
  const normalized = fullName
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  const parts = normalized.split(' ');
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function extractCertDataFromText(rawText: string): ExtractedCertData {
  // Normalize whitespace — collapse multiple spaces/newlines into single spaces
  const text = rawText.replace(/\r\n/g, '\n');
  const flat = text.replace(/\s+/g, ' ').trim();

  // -------- Certificate Number --------
  const certNumber = firstMatch(text, [
    /Certificate\s*(?:No|Number|ID)\.?\s*[:\-]?\s*(GDC-\d{4}-[A-Z]{2}-\d+)/i,
    /\b(GDC-\d{4}-[A-Z]{2}-\d+)\b/,
  ]);

  // -------- Full Name --------
  let fullName = firstMatch(flat, [
    // Standard label-based patterns
    /Policyholder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    /Name\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    /Holder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    // Pattern: "issued to <NAME>"
    /issued\s+to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
  ]);

  // Fallback 1: ALL CAPS name on its own line
  if (!fullName) {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[A-Z][A-Z\s]{2,40}[A-Z]$/.test(trimmed)) {
        const wordCount = trimmed.split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 4) {
          fullName = trimmed;
          break;
        }
      }
    }
  }

  // Fallback 2: ALL CAPS name found anywhere in the flat text (between known anc
