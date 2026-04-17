import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Valora // Skin Shop',
    template: 'Valora // %s'
  },
  description: 'Valora storefront - VP top-up and skin bundle simulation'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-valorant">{children}</body>
    </html>
  );
}
