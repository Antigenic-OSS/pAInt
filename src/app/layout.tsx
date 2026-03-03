import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://dev-editor-flow.vercel.app'),
  title: {
    default: 'pAInt | Visual Editor for Localhost Projects',
    template: '%s | pAInt',
  },
  description:
    'pAInt is a visual editor for localhost apps with bridge, server, and terminal workflows. Edit first, export precise changelogs, and save AI tokens with focused Claude Code handoff.',
  keywords: [
    'pAInt',
    'visual editor',
    'localhost web editor',
    'bridge server',
    'terminal server',
    'Claude Code',
    'AI token efficiency',
    'CSS visual editing',
    'Next.js visual editor',
    'developer tooling',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'pAInt',
    title: 'pAInt | Visual Editor for Localhost Projects',
    description:
      'Inspect, edit, and export structured UI changes. Use bridge/server/terminal modes to ship faster and reduce AI token usage.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pAInt | Visual Editor for Localhost Projects',
    description:
      'Visual-first editing plus focused changelogs for Claude Code means fewer tokens and faster delivery.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'developer tools',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
