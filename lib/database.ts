import fs from 'fs';
import path from 'path';

export interface PolicyRecord {
  policy_number: string;
  cert_number: string;
  first_name: string;
  last_name: string;
  dob: string;
  issue_date: string;
  expiry_date: string;
  validated: boolean;
}

const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

export function readDatabase(): PolicyRecord[] {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Database read error:', err);
    return [];
  }
}

export function findByPolicyNumber(policyNumber: string): PolicyRecord | null {
  const db = readDatabase();
  return db.find((r) => r.policy_number === policyNumber) || null;
}

// In-memory tracking (Vercel filesystem is read-only at runtime)
const validatedSet = new Set<string>();

export function markAsValidated(policyNumber: string): boolean {
  validatedSet.add(policyNumber);
  return true;
}

export function isValidated(policyNumber: string): boolean {
  return validatedSet.has(policyNumber);
}
