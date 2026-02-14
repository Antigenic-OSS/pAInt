import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dev Editor',
  description: 'Visual design editor for localhost projects',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
