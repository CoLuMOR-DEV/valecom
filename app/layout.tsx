import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valorant Shop Replica',
  description: 'State-driven top-up + upgrade simulation'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-valorant">{children}</body>
    </html>
  );
}
