import { NextResponse } from 'next/server';
import { readDatabase } from '@/lib/database';
import { extractCertDataFromText } from '@/lib/extractor';

export const runtime = 'nodejs';

const SAMPLE_CERT_TEXT = `
GOOD DRIVER CERTIFICATE

Certificate No: GDC-2024-MH-447821

Policyholder: Rahul Sharma

Date of Birth: 1988-03-15
Issue Date: 2024-01-10
Expiry Date: 2027-01-10
State: Maharashtra
`;

export async function GET() {
  const db = readDatabase();
  const sampleExtraction = extractCertDataFromText(SAMPLE_CERT_TEXT);

  return NextResponse.json({
    ok: true,
    service: 'GDD Certificate Validator',
    extraction_method: 'regex (no LLM)',
    database_records: db.length,
    sample_extraction: sampleExtraction,
    timestamp: new Date().toISOString(),
  });
}
