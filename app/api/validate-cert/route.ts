import { NextRequest, NextResponse } from 'next/server';
import { findByPolicyNumber, isValidated } from '@/lib/database';

export const runtime = 'nodejs';

/**
 * GET /api/validate-cert?policy_number=XXX
 * Returns the expected record for a given policy.
 */
export async function GET(req: NextRequest) {
  const policy_number = req.nextUrl.searchParams.get('policy_number');
  if (!policy_number) {
    return NextResponse.json(
      { error: 'policy_number query param required' },
      { status: 400 }
    );
  }

  const record = findByPolicyNumber(policy_number);
  if (!record) {
    return NextResponse.json(
      { found: false, policy_number, error: 'Policy not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    found: true,
    policy_number: record.policy_number,
    cert_number: record.cert_number,
    first_name: record.first_name,
    last_name: record.last_name,
    dob: record.dob,
    issue_date: record.issue_date,
    expiry_date: record.expiry_date,
    validated: isValidated(record.policy_number),
  });
}

/**
 * POST /api/validate-cert
 * Body: { policy_number, cert_number, first_name, last_name, dob }
 * Validates JSON values against database (no PDF). Useful for testing.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { policy_number, cert_number, first_name, last_name, dob } = body;
  if (!policy_number) {
    return NextResponse.json(
      { error: 'policy_number is required' },
      { status: 400 }
    );
  }

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

  const mismatches: string[] = [];
  const reasons: string[] = [];

  if (cert_number !== undefined) {
    if (
      !cert_number ||
      cert_number.toString().toUpperCase() !== expected.cert_number.toUpperCase()
    ) {
      mismatches.push('cert_number');
      reasons.push(`certificate number mismatch`);
    }
  }
  if (first_name !== undefined) {
    if (
      !first_name ||
      first_name.toString().toLowerCase().trim() !==
        expected.first_name.toLowerCase().trim()
    ) {
      mismatches.push('first_name');
      reasons.push(`first name mismatch`);
    }
  }
  if (last_name !== undefined) {
    if (
      !last_name ||
      last_name.toString().toLowerCase().trim() !==
        expected.last_name.toLowerCase().trim()
    ) {
      mismatches.push('last_name');
      reasons.push(`last name mismatch`);
    }
  }
  if (dob !== undefined) {
    if (!dob || dob !== expected.dob) {
      mismatches.push('dob');
      reasons.push(`date of birth mismatch`);
    }
  }

  return NextResponse.json({
    is_valid: mismatches.length === 0,
    policy_number,
    mismatches,
    failure_reason: mismatches.length === 0 ? null : reasons.join('; '),
  });
}
