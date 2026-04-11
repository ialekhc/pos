import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Tenant POS SaaS',
  description: 'Production-minded POS SaaS platform with super admin and tenant workspaces.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-grid-bg bg-pos-grid">{children}</body>
    </html>
  );
}
