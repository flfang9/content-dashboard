import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Dashboard',
  description: 'Track your social media content performance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
