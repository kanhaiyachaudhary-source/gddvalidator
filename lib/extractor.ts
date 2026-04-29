/**
 * Pure regex-based certificate data extractor. No LLM.
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
  const text = rawText.replace(/\r\n/g, '\n');
  const flat = text.replace(/\s+/g, ' ').trim();

  // Certificate Number
  const certNumber = firstMatch(text, [
    /Certificate\s*(?:No|Number|ID)\.?\s*[:\-]?\s*(GDC-\d{4}-[A-Z]{2}-\d+)/i,
    /\b(GDC-\d{4}-[A-Z]{2}-\d+)\b/,
  ]);

  // Full Name — multiple patterns including the "certify that" prose form
  let fullName = firstMatch(flat, [
    /This\s+is\s+to\s+certify\s+that\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
    /certify\s+that\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
    /Policyholder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    /Name\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    /Holder\s*[:\-]?\s*([A-Za-z][A-Za-z\s.'-]+?)(?=\s+(?:Date|DOB|Issue|Expiry|State|Certificate)|$)/i,
    /issued\s+to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
  ]);

  // Fallback: ALL CAPS sequence in flat text, skipping headers
  if (!fullName) {
    const skipWords = ['CERTIFICATE', 'GOOD', 'DRIVER', 'POLICY', 'INSURANCE', 'STATE', 'NUMBER', 'NO', 'DATE', 'BIRTH', 'ISSUE', 'EXPIRY', 'CERTIFIED', 'VALID', 'DEPARTMENT', 'MOTOR', 'VEHICLE', 'OFFICIAL', 'MERIT'];
    const allMatches = flat.match(/\b[A-Z]{2,}(?:\s+[A-Z]{2,}){1,3}\b/g);
    if (allMatches) {
      for (const candidate of allMatches) {
        const words = candidate.split(/\s+/);
        if (!words.some((w) => skipWords.includes(w))) {
          fullName = candidate;
          break;
        }
      }
    }
  }

  const { first, last } = splitName(fullName);

  // Date of Birth — labeled patterns
  let dob = firstMatch(flat, [
    /Date\s*of\s*Birth\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
    /DOB\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
    /Born\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
  ]);

  // DD/MM/YYYY format
  if (!dob) {
    const dmy = firstMatch(flat, [
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

  // Fallback: earliest YYYY-MM-DD in document (DOB is older than issue/expiry)
  if (!dob) {
    const dateMatches = flat.match(/\b\d{4}-\d{2}-\d{2}\b/g);
    if (dateMatches && dateMatches.length > 0) {
      const sorted = dateMatches
        .map((d) => ({ full: d, year: parseInt(d.substring(0, 4), 10) }))
        .sort((a, b) => a.year - b.year);
      const earliest = sorted[0];
      if (earliest.year < 2010) {
        dob = earliest.full;
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
