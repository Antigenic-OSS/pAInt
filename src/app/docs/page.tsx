import type { Metadata } from 'next'
import Link from 'next/link'
import {
  FaqAccordion,
  FaqSection,
  Sidebar,
} from './DocsClient'

export const metadata: Metadata = {
  title: 'Setup Guide',
  description:
    'Framework-specific setup instructions for connecting pAInt to localhost projects, including proxy, bridge, and terminal-assisted workflows.',
  keywords: [
    'pAInt setup',
    'localhost visual editor setup',
    'bridge server setup',
    'terminal server setup',
    'Next.js inspector script',
    'Claude Code changelog workflow',
  ],
  openGraph: {
    title: 'pAInt Setup Guide',
    description:
      'Connect pAInt to your localhost app with framework-specific instructions and efficient AI handoff workflows.',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: 'pAInt Setup Guide',
    description:
      'Configure pAInt quickly for localhost projects and ship cleaner AI-assisted edits.',
  },
}

export default function DocsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto px-6 py-12" style={{ maxWidth: '1024px' }}>
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm mb-6 no-underline transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            &larr; Back to Editor
          </Link>
          <h1
            className="text-3xl font-semibold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            pAInt — Setup Guide
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: 1.6,
            }}
          >
            Connect the visual editor to your localhost project in seconds.
          </p>
        </header>

        <div className="flex gap-10">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* How It Works */}
            <Section id="how-it-works" title="How It Works">
              <p style={bodyText}>
                pAInt is a visual design tool that sits alongside your localhost
                dev server. It gives you a visual-editor-style interface for
                inspecting elements, editing CSS, and repositioning components —
                all without touching your source files directly.
              </p>
              <p style={{ ...bodyText, marginTop: '0.75rem' }}>
                When you click{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  Connect
                </strong>
                , the editor loads your page through a{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  Service Worker proxy
                </strong>
                . The proxy intercepts requests, fetches your page from
                localhost, injects a lightweight inspector script, and strips
                security headers that would block the iframe — all happening
                in the browser with no server-side proxying needed. Your
                page&apos;s scripts and client-side rendering work normally,
                so you see the fully interactive version of your site.
              </p>
              <p style={{ ...bodyText, marginTop: '0.75rem' }}>
                The inspector communicates with the editor via{' '}
                <code style={inlineCodeStyle}>postMessage</code> — reporting
                element metadata when you hover or click, and applying style
                previews in real time.
              </p>
              <p style={{ ...bodyText, marginTop: '0.75rem' }}>
                Every change you make is tracked as a changelog entry with
                original and new values. When you&apos;re done, export the
                changelog and paste it into Claude Code (or use the built-in
                Send to Claude Code feature) to have the changes applied to your
                actual source files.
              </p>
              <p style={{ ...bodyText, marginTop: '0.75rem' }}>
                <strong style={{ color: 'var(--success)' }}>
                  No script tags needed
                </strong>{' '}
                — the proxy handles everything automatically. Just click
                Connect and start editing.
              </p>
            </Section>

            {/* Use Cases */}
            <Section id="use-cases" title="Use Cases">
              <div className="flex flex-col gap-4">
                <UseCaseItem
                  title="Visual Style Tweaking"
                  description="Select any element on your page, then adjust colors, spacing, typography, borders, and layout from the right panel. Changes preview instantly in the iframe."
                />
                <UseCaseItem
                  title="Responsive Design Testing"
                  description="Switch between Mobile (375px), Tablet (768px), and Desktop (1280px) breakpoints in the top bar. Make per-breakpoint style adjustments and export them all at once."
                />
                <UseCaseItem
                  title="Layout Debugging"
                  description="Use the left panel DOM tree (Layers) to navigate the page structure. Click any node to highlight it in the preview. Inspect flexbox and grid properties, then adjust layout in the right panel."
                />
                <UseCaseItem
                  title="Drag-and-Drop Repositioning"
                  description="Toggle Free Position mode to drag elements to new positions, or Reorder mode to rearrange siblings within flex and grid containers."
                />
                <UseCaseItem
                  title="Change Tracking & Export"
                  description="Every style edit is tracked with original and new values. Review all changes in the Changes tab, undo individual edits, or export a structured changelog."
                />
                <UseCaseItem
                  title="Claude Code Integration"
                  description="Click Copy Changelog to get a formatted log you can paste into Claude Code, which reads it and applies the CSS changes to your actual source files. Or use Send to Claude Code for direct CLI integration."
                />
                <UseCaseItem
                  title="Multi-Page Editing"
                  description="Navigate between pages using the PageSelector dropdown without leaving the editor. Changes are persisted per-page and included in a combined changelog export."
                />
              </div>
            </Section>

            {/* Quick Start */}
            <Section id="quick-start" title="Quick Start">
              <ol className="list-none p-0 m-0 flex flex-col gap-5">
                <Step number={1}>
                  <strong
                    style={{ color: 'var(--text-primary)', fontSize: '1rem' }}
                  >
                    Open pAInt
                  </strong>
                  <p style={{ ...bodyText, marginTop: '0.25rem' }}>
                    Go to{' '}
                    <a
                      href="https://dev-editor-flow.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)' }}
                    >
                      dev-editor-flow.vercel.app
                    </a>
                  </p>
                  <p style={{ ...mutedText, marginTop: '0.25rem' }}>
                    Running locally? Start with{' '}
                    <code style={inlineCodeStyle}>bun dev</code> (defaults to{' '}
                    <code style={inlineCodeStyle}>http://localhost:4000</code>).
                  </p>
                </Step>
                <Step number={2}>
                  <strong
                    style={{ color: 'var(--text-primary)', fontSize: '1rem' }}
                  >
                    Start your target project
                  </strong>
                  <p style={{ ...bodyText, marginTop: '0.25rem' }}>
                    Run your project&apos;s dev server as usual (e.g.,{' '}
                    <code style={inlineCodeStyle}>npm run dev</code> on port
                    3000).
                  </p>
                </Step>
                <Step number={3}>
                  <strong
                    style={{ color: 'var(--text-primary)', fontSize: '1rem' }}
                  >
                    Connect
                  </strong>
                  <p style={{ ...bodyText, marginTop: '0.25rem' }}>
                    Open pAInt in your browser, select your project&apos;s port
                    from the dropdown, and click{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      Connect
                    </strong>
                    . The inspector activates automatically.
                  </p>
                </Step>
              </ol>
            </Section>

            {/* Framework Guides */}
            <Section id="framework-guides" title="Framework Compatibility">
              <p style={bodyText}>
                pAInt works with any framework out of the box — no script
                tags or configuration needed. The Service Worker proxy
                automatically handles inspector injection for all projects.
              </p>
              <p style={{ ...bodyText, marginTop: '0.75rem' }}>
                Tested and confirmed working with:
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <CompatItem icon="&#9650;" name="Next.js" detail="App Router & Pages Router" />
                <CompatItem icon="&#9889;" name="Vite + React" detail="Including React Router, TanStack, etc." />
                <CompatItem icon="&#9883;" name="Create React App" detail="Standard and ejected setups" />
                <CompatItem icon="&#128241;" name="React Native / Expo Web" detail="Expo Router and custom web entry" />
                <CompatItem icon="&#9899;" name="Vue / Nuxt" detail="Vue 3 (Vite) and Nuxt 3" />
                <CompatItem icon="&#127793;" name="Svelte / SvelteKit" detail="SvelteKit and plain Svelte + Vite" />
                <CompatItem icon="&#128196;" name="Plain HTML" detail="Static sites and vanilla JS" />
              </div>
              <p style={{ ...bodyText, marginTop: '1rem' }}>
                Just start your dev server, open pAInt, select the port,
                and click{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  Connect
                </strong>
                . The proxy preserves your page&apos;s scripts and
                client-side rendering, so interactive features like 3D scenes
                (Spline, Three.js), animations (GSAP, Framer Motion), and
                client-side routing all work normally.
              </p>
            </Section>

            {/* Troubleshooting */}
            <Section id="troubleshooting" title="Troubleshooting">
              <div className="flex flex-col gap-4">
                <TroubleshootItem title="Stuck on &quot;Connecting&quot;">
                  <p>
                    If the editor stays in &quot;Connecting&quot; state, your
                    browser may be caching an old Service Worker. Open DevTools
                    &rarr; Application &rarr; Service Workers, unregister any
                    workers for <code style={inlineCodeStyle}>localhost:4000</code>,
                    clear Cache Storage, then hard refresh (Cmd+Shift+R).
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="CORS or Cross-Origin errors">
                  <p>
                    The Service Worker proxy serves everything from the same
                    origin, which handles most CORS issues automatically. If
                    your project makes API calls to external services during
                    render, those requests are not proxied. This typically
                    doesn&apos;t affect visual editing.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="Page looks different or broken">
                  <p>
                    The proxy preserves all scripts and client-side rendering.
                    If something looks off, try a hard refresh to ensure the
                    latest Service Worker is active. If the issue persists,
                    check the browser console for errors — some pages with
                    very strict CSP headers may need those headers relaxed in
                    development.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="Target dev server not reachable">
                  <p>
                    Make sure your project&apos;s dev server is running on the
                    port you selected. The proxy connects to{' '}
                    <code style={inlineCodeStyle}>localhost:&lt;port&gt;</code>{' '}
                    from the browser, so the server must be accessible from
                    your machine.
                  </p>
                </TroubleshootItem>
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" title="FAQ">
              <FaqAccordion>
                <FaqSection
                  id="faq-no-setup"
                  question="Do I need to add any script tags to my project?"
                >
                  <p>
                    No. pAInt uses a Service Worker proxy that automatically
                    injects the inspector script into your page. Just click
                    Connect — no modifications to your project needed.
                  </p>
                </FaqSection>

                <FaqSection
                  id="faq-source"
                  question="Does pAInt have access to my source files?"
                >
                  <p>
                    Not directly. The editor works with the rendered HTML/CSS in
                    the browser — it never reads or writes your project&apos;s
                    source files on its own. When you use the{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      Send to Claude Code
                    </strong>{' '}
                    feature, a changelog of your visual edits is sent to Claude
                    Code (running locally on your machine), which then applies
                    changes to your files. The editor itself has no filesystem
                    access.
                  </p>
                </FaqSection>

                <FaqSection
                  id="faq-proxy"
                  question="Does the reverse proxy forward requests to external servers?"
                >
                  <p>
                    No. The proxy enforces{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      localhost-only
                    </strong>{' '}
                    validation. It will only connect to{' '}
                    <code style={inlineCodeStyle}>127.0.0.1</code> /{' '}
                    <code style={inlineCodeStyle}>localhost</code> addresses.
                    Any attempt to proxy to an external host is rejected.
                  </p>
                </FaqSection>

                <FaqSection
                  id="faq-production"
                  question="Does pAInt affect my production build?"
                >
                  <p>
                    No. pAInt runs entirely in the browser through a Service
                    Worker — nothing is added to your project&apos;s source
                    code or build output. There&apos;s nothing to remove before
                    deploying.
                  </p>
                </FaqSection>

                <FaqSection
                  id="faq-network"
                  question="Can other people on my network see my project through the editor?"
                >
                  <p>
                    By default, both pAInt and your dev server run on{' '}
                    <code style={inlineCodeStyle}>localhost</code>, which is
                    only accessible from your machine. If you&apos;ve configured
                    your dev server to listen on{' '}
                    <code style={inlineCodeStyle}>0.0.0.0</code>, other devices
                    on your network could access it directly, but the
                    pAInt&apos;s proxy still only connects to localhost.
                  </p>
                </FaqSection>

                <FaqSection
                  id="faq-hosted"
                  question="Is my data sent anywhere when using the hosted version?"
                >
                  <p>
                    The hosted version at{' '}
                    <code style={inlineCodeStyle}>
                      dev-editor-flow.vercel.app
                    </code>{' '}
                    serves the editor UI only. Your project&apos;s HTML is
                    fetched by the proxy running on that server, but no project
                    data is stored, logged, or shared. All style edits and
                    changelogs are kept in your browser&apos;s{' '}
                    <code style={inlineCodeStyle}>localStorage</code>.
                  </p>
                </FaqSection>
              </FaqAccordion>
            </Section>
          </div>
          {/* end main content */}
        </div>
        {/* end flex row */}

        {/* Footer */}
        <footer
          className="mt-16 pt-6 text-sm text-center"
          style={{
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          pAInt &middot;{' '}
          <Link
            href="/"
            className="no-underline"
            style={{ color: 'var(--accent)' }}
          >
            Open Editor
          </Link>
        </footer>
      </div>
    </div>
  )
}

/* ─── Helper components (server-rendered) ─── */

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-12">
      <h2
        className="text-xl font-semibold mb-5 pb-2"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Step({
  number,
  children,
}: {
  number: number
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: 'var(--accent)',
          color: '#fff',
        }}
      >
        {number}
      </span>
      <div className="flex-1 flex flex-col gap-2">{children}</div>
    </li>
  )
}

function TroubleshootItem({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-md px-4 py-4"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <h4
        className="text-base font-medium mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h4>
      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function CompatItem({
  icon,
  name,
  detail,
}: {
  icon: string
  name: string
  detail: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-md px-4 py-3"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <span className="text-base">{icon}</span>
      <div>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </span>
        <span
          className="text-sm ml-2"
          style={{ color: 'var(--text-muted)' }}
        >
          — {detail}
        </span>
      </div>
    </div>
  )
}

function UseCaseItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-md px-4 py-4"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <h4
        className="text-base font-medium mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h4>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  )
}

const bodyText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '1rem',
  lineHeight: 1.7,
}

const mutedText: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  lineHeight: 1.6,
}

const inlineCodeStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '0.85em',
  color: 'var(--warning)',
}
