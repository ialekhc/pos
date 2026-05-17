import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Vendor POS SaaS',
  description: 'Production-minded POS SaaS platform with super admin and vendor workspaces.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="app-grid-bg bg-pos-grid" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
