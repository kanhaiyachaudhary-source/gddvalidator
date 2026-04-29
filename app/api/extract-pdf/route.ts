import { NextRequest, NextResponse } from 'next/server';
import { findByPolicyNumber, isValidated, markAsValidated } from '@/lib/database';
import { extractCertDataFromText } from '@/lib/extractor';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/extract-pdf
 * multipart/form-data:
 *   - file: PDF binary
 *   - policy_number: string
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse multipart form data' },
      { status: 400 }
    );
  }

  const fileEntry = formData.get('file');
  const policy_number = formData.get('policy_number') as string | null;

  if (!fileEntry) {
    return NextResponse.json(
      { error: 'file field is required (PDF binary)' },
      { status: 400 }
    );
  }
  if (!policy_number) {
    return NextResponse.json(
      { error: 'policy_number field is required' },
      { status: 400 }
    );
  }

  // 1. Database lookup
  const expected = findByPolicyNumber(policy_number);
  if (!expected) {
    return NextResponse.json(
      {
        is_valid: false,
        policy_number,
        error_type: 'POLICY_NOT_FOUND',
        failure_reason: `No record found for policy number ${policy_number}`,
      },
      { status: 404 }
    );
  }

  // 2. Already validated? Skip processing.
  if (isValidated(policy_number)) {
    return NextResponse.json({
      is_valid: true,
      already_validated: true,
      policy_number,
      message: 'This policy has already been validated in this session.',
    });
  }

  // 3. Parse PDF with unpdf (Mozilla pdfjs engine, handles edge cases)
  let pdfText = '';
  try {
    const fileBlob = fileEntry as Blob;
    const arrayBuffer = await fileBlob.arrayBuffer();
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const result = await extractText(pdf, { mergePages: true });
    pdfText = (result.text || '').trim();
  } catch (err: any) {
    return NextResponse.json(
      {
        is_valid: false,
        policy_number,
        error_type: 'PDF_PARSE_ERROR',
        failure_reason: `Failed to parse PDF: ${err?.message ?? 'unknown error'}`,
      },
      { status: 422 }
    );
  }

  if (pdfText.length < 20) {
    return NextResponse.json(
      {
        is_valid: false,
        policy_number,
        error_type: 'PDF_UNREADABLE',
        failure_reason:
          'PDF appears empty or image-only. Please upload a text-based PDF.',
      },
      { status: 422 }
    );
  }

  // 4. Extract fields with regex
  const extracted = extractCertDataFromText(pdfText);

  // 5. Compare each field
  const mismatches: string[] = [];
  const reasons: string[] = [];

  if (!extracted.cert_number) {
    mismatches.push('cert_number');
    reasons.push('certificate number not found in document');
  } else if (
    extracted.cert_number.toUpperCase() !== expected.cert_number.toUpperCase()
  ) {
    mismatches.push('cert_number');
    reasons.push(
      `certificate number mismatch (document: ${extracted.cert_number}, expected: ${expected.cert_number})`
    );
  }

  if (!extracted.first_name) {
    mismatches.push('first_name');
    reasons.push('first name not found in document');
  } else if (
    extracted.first_name.toLowerCase().trim() !==
    expected.first_name.toLowerCase().trim()
  ) {
    mismatches.push('first_name');
    reasons.push(
      `first name mismatch (document: '${extracted.first_name}', expected: '${expected.first_name}')`
    );
  }

  if (!extracted.last_name) {
    mismatches.push('last_name');
    reasons.push('last name not found in document');
  } else if (
    extracted.last_name.toLowerCase().trim() !==
    expected.last_name.toLowerCase().trim()
  ) {
    mismatches.push('last_name');
    reasons.push(
      `last name mismatch (document: '${extracted.last_name}', expected: '${expected.last_name}')`
    );
  }

  if (!extracted.dob) {
    mismatches.push('dob');
    reasons.push('date of birth not found in document');
  } else if (extracted.dob !== expected.dob) {
    mismatches.push('dob');
    reasons.push(
      `date of birth mismatch (document: ${extracted.dob}, expected: ${expected.dob})`
    );
  }

  const is_valid = mismatches.length === 0;

  if (is_valid) {
    markAsValidated(policy_number);
  }

  return NextResponse.json({
    is_valid,
    policy_number,
    extracted_data: extracted,
    expected_data: {
      cert_number: expected.cert_number,
      first_name: expected.first_name,
      last_name: expected.last_name,
      dob: expected.dob,
    },
    mismatches,
    failure_reason: is_valid ? null : reasons.join('; '),
    validated_at: new Date().toISOString(),
  });
}
