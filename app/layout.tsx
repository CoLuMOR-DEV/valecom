import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Valora // Skin Shop",
    template: "Valora // %s",
  },
  description: "Valora storefront - VP top-up and skin bundle simulation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-valorant">
        <Script id="valora-theme-init" strategy="beforeInteractive">{`
          try {
            var savedTheme = window.localStorage.getItem('valora-theme');
            document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : 'dark';
          } catch (error) {
            document.documentElement.dataset.theme = 'dark';
          }
        `}</Script>
        {children}
      </body>
    </html>
  );
}
