import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SalesMap Intelligence — powered by Marco Milanello SC',
  description: 'Analisi di mercato di livello consulenziale top-tier per PMI italiane',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
