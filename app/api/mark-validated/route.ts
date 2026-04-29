import { NextRequest, NextResponse } from 'next/server';
import { findByPolicyNumber, markAsValidated, isValidated } from '@/lib/database';

export const runtime = 'nodejs';

/**
 * POST /api/mark-validated
 * Body: { policy_number: "..." }
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const policy_number = body.policy_number;
  if (!policy_number) {
    return NextResponse.json(
      { error: 'policy_number is required' },
      { status: 400 }
    );
  }

  const record = findByPolicyNumber(policy_number);
  if (!record) {
    return NextResponse.json(
      { success: false, error: `Policy ${policy_number} not found` },
      { status: 404 }
    );
  }

  markAsValidated(policy_number);
  return NextResponse.json({
    success: true,
    policy_number,
    validated: true,
    validated_at: new Date().toISOString(),
  });
}

/**
 * GET /api/mark-validated?policy_number=XXX
 */
export async function GET(req: NextRequest) {
  const policy_number = req.nextUrl.searchParams.get('policy_number');
  if (!policy_number) {
    return NextResponse.json(
      { error: 'policy_number query param required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    policy_number,
    validated: isValidated(policy_number),
  });
}
