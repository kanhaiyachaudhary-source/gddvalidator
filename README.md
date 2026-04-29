# GDD Certificate Validator

Good Driver Discount certificate validation API. **No LLM, no external dependencies** — uses
regex-based PDF text extraction. Fully self-contained, deploys to Vercel out of the box.

## How It Works

```
PDF upload → pdf-parse extracts text → regex finds cert_number/name/dob
          → compare against database.json → return is_valid + reasons
```

No `OPENAI_API_KEY`. No `OPENAI_API_BASE`. No VPN. Nothing to configure.

## Deploy to Vercel

1. **Push to GitHub:**
   - Create a new repo (e.g., `gdd-validator`) on GitHub
   - Click "Add file" → "Upload files"
   - Drag the **contents** of this folder (not the folder itself)
   - Commit

2. **Deploy:**
   - Go to https://vercel.com/new
   - Import the GitHub repo
   - Click "Deploy"
   - **No environment variables needed.**

3. **Test:**
   - Visit `https://your-app.vercel.app/api/test`
   - Should return `{"ok": true, ...}`

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/test` | GET | Health check + sample extraction |
| `/api/extract-pdf` | POST | **Main:** multipart PDF + policy_number → validation |
| `/api/validate-cert` | GET | Lookup record by policy_number |
| `/api/validate-cert` | POST | Validate JSON values against database |
| `/api/mark-validated` | POST | Mark policy validated |
| `/api/mark-validated` | GET | Check validation status |

## Test Locally

```powershell
npm install
npm run dev
# open http://localhost:3000/api/test
```

## Test Endpoints (PowerShell)

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/api/test

# DB lookup
Invoke-RestMethod "http://localhost:3000/api/validate-cert?policy_number=6580792016"

# JSON validation (no PDF)
$body = '{"policy_number":"6580792016","cert_number":"GDC-2024-MH-447821","first_name":"Rahul","last_name":"Sharma","dob":"1988-03-15"}'
Invoke-RestMethod http://localhost:3000/api/validate-cert -Method POST -ContentType "application/json" -Body $body

# PDF validation (main)
$form = @{
  file          = Get-Item "C:\path\to\certificate.pdf"
  policy_number = "6580792016"
}
Invoke-RestMethod http://localhost:3000/api/extract-pdf -Method POST -Form $form
```

## Power Automate Integration

In your validation flow:

1. **Get file content** (from OneDrive trigger)
2. **HTTP action** → POST to `https://your-app.vercel.app/api/extract-pdf`
   - Method: POST
   - Body type: `Form-Data`
   - Fields:
     - `file` = file content (binary)
     - `policy_number` = (from your variables)
3. **Parse JSON** response
4. **Condition:** `is_valid == true`
   - **YES** → Send success email
   - **NO** → Send rejection email with `failure_reason`, then call PolicyCenter APIs

## Validation Rules

A certificate is `is_valid: true` only when **ALL** of these match:
- `cert_number` (case-insensitive)
- `first_name` (case-insensitive, trimmed)
- `last_name` (case-insensitive, trimmed)
- `dob` (exact YYYY-MM-DD)

ANY single mismatch → `is_valid: false` with specific reason.

## Database

10 mock records in `data/database.json`. Edit and redeploy to change.

The `validated` flag uses in-memory state (Vercel filesystem is read-only at runtime). For
production with persistence, swap to a real database (Postgres, MongoDB, etc.).

## Supported PDF Format

Designed for certificates with text labels like:
```
Certificate No: GDC-YYYY-XX-NNNNNN
Policyholder: First Last
Date of Birth: YYYY-MM-DD
```

The extractor also handles: `Cert Number:`, `Name:`, `Holder:`, `DOB:`, `Born:`, and ALL-CAPS
name lines as fallbacks. PDFs must be text-based (not scanned images).
