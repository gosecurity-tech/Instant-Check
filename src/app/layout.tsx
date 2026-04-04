import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

// Note: Switch to next/font/google Inter when deploying to Vercel.
// Local build uses system font stack via CSS.

export const metadata: Metadata = {
  title: {
    default: 'Instant Check — BS7858 Vetting Platform',
    template: '%s | Instant Check',
  },
  description: 'Production-grade BS7858 pre-employment vetting and screening platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
