export default function Home() {
  const codeBox = {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '12px 16px',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflowX: 'auto' as const,
  };

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ color: '#4fc3f7' }}>GDD Certificate Validator API</h1>
      <p style={{ color: '#94a3b8' }}>
        Good Driver Discount certificate validation. <strong>No LLM</strong> — uses
        regex-based extraction. Fully self-contained, deployable to Vercel.
      </p>

      <h2 style={{ color: '#4fc3f7', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
        Endpoints
      </h2>

      <h3>GET /api/test</h3>
      <p>Health check + sample regex extraction.</p>

      <h3>POST /api/extract-pdf</h3>
      <p>Main endpoint. Multipart form-data: <code>file</code> (PDF) + <code>policy_number</code>.</p>
      <pre style={codeBox}>{`Response (success):
{
  "is_valid": true,
  "policy_number": "6580792016",
  "extracted_data": { "cert_number": "...", "first_name": "...", ... },
  "expected_data": { ... },
  "mismatches": [],
  "failure_reason": null
}

Response (failure):
{
  "is_valid": false,
  "mismatches": ["first_name", "dob"],
  "failure_reason": "first name mismatch ...; date of birth mismatch ..."
}`}</pre>

      <h3>GET /api/validate-cert?policy_number=XXX</h3>
      <p>Lookup expected data for a policy.</p>

      <h3>POST /api/validate-cert</h3>
      <p>Validate JSON values (no PDF). Body: <code>{`{ policy_number, cert_number, first_name, last_name, dob }`}</code></p>

      <h3>POST /api/mark-validated</h3>
      <p>Mark policy as validated. Body: <code>{`{ policy_number }`}</code></p>

      <h3>GET /api/mark-validated?policy_number=XXX</h3>
      <p>Check validation status.</p>

      <h2 style={{ color: '#4fc3f7', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
        Test Policy Numbers
      </h2>
      <pre style={codeBox}>{`6580792016 → Rahul Sharma     (GDC-2024-MH-447821)
7234501892 → Priya Patel      (GDC-2023-DL-382910)
8901234567 → Arjun Nair       (GDC-2024-KA-119034)
3456789012 → Deepa Krishnan   (GDC-2023-TN-560278)
5678901234 → Vikram Mehta     (GDC-2024-GJ-783456)
9012345678 → Ananya Singh     (GDC-2023-RJ-294710)
1234567890 → Saurav Chatterjee (GDC-2024-WB-631892)
2345678901 → Manpreet Kaur    (GDC-2024-PB-872103)
4567890123 → Suresh Menon     (GDC-2023-KL-419075)
6789012345 → Neha Verma       (GDC-2024-UP-905621)`}</pre>
    </main>
  );
}
