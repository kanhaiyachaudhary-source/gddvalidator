import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDD Certificate Validator',
  description: 'Good Driver Discount Certificate Validation API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0d1117', color: '#e6edf3', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
