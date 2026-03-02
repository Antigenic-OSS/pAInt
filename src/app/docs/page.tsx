import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CodeBlock,
  CopyButton,
  FaqAccordion,
  FaqSection,
  FrameworkAccordion,
  FrameworkSection,
  Sidebar,
} from './DocsClient'

export const metadata: Metadata = {
  title: 'pAInt — Setup Guide',
  description:
    'Framework-specific setup instructions for connecting pAInt to your localhost project.',
}

const SCRIPT_TAG =
  '<script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>'

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
                  built-in reverse proxy
                </strong>
                . The proxy fetches your HTML, strips client-side scripts (to
                prevent routing conflicts), and injects a lightweight inspector
                script. This inspector communicates with the editor via{' '}
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
                If automatic injection fails (e.g., non-standard HTML
                responses), a banner will prompt you to add the script tag
                manually. The framework guides below show exactly where to place
                it.
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
            <Section id="framework-guides" title="Framework Guides">
              <p style={{ ...bodyText, marginBottom: '1rem' }}>
                If the automatic connection doesn&apos;t detect the inspector
                within 5 seconds, add the script tag manually to your project.
                Select your framework below for the exact file and placement.
              </p>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-md mb-4 text-sm"
                style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>Note:</span>
                <span>
                  The snippets below use the hosted URL. If running pAInt
                  locally, replace{' '}
                  <code style={{ ...inlineCodeStyle, fontSize: '0.8em' }}>
                    https://dev-editor-flow.vercel.app
                  </code>{' '}
                  with{' '}
                  <code style={{ ...inlineCodeStyle, fontSize: '0.8em' }}>
                    http://localhost:4000
                  </code>{' '}
                  (or your custom port).
                </span>
              </div>
              <FrameworkAccordion>
                {/* Next.js */}
                <FrameworkSection id="nextjs" title="Next.js" icon="&#9650;">
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      App Router
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      Add to <code style={inlineCodeStyle}>app/layout.tsx</code>
                    </p>
                    <CodeBlock
                      language="tsx"
                      copyText={SCRIPT_TAG}
                      code={`// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
      </body>
    </html>
  );
}`}
                    />
                  </div>
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Pages Router
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      Add to{' '}
                      <code style={inlineCodeStyle}>pages/_document.tsx</code>
                    </p>
                    <CodeBlock
                      language="tsx"
                      copyText={SCRIPT_TAG}
                      code={`// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
      </body>
    </Html>
  );
}`}
                    />
                  </div>
                </FrameworkSection>

                {/* Vite + React */}
                <FrameworkSection
                  id="vite-react"
                  title="Vite + React"
                  icon="&#9889;"
                >
                  <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                    Add to <code style={inlineCodeStyle}>index.html</code>{' '}
                    (project root)
                  </p>
                  <CodeBlock
                    language="html"
                    copyText={SCRIPT_TAG}
                    code={`<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                  />
                </FrameworkSection>

                {/* Create React App */}
                <FrameworkSection
                  id="create-react-app"
                  title="Create React App"
                  icon="&#9883;"
                >
                  <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                    Add to{' '}
                    <code style={inlineCodeStyle}>public/index.html</code>
                  </p>
                  <CodeBlock
                    language="html"
                    copyText={SCRIPT_TAG}
                    code={`<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                  />
                </FrameworkSection>

                {/* Plain HTML */}
                <FrameworkSection
                  id="plain-html"
                  title="Plain HTML"
                  icon="&#128196;"
                >
                  <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                    Add before{' '}
                    <code style={inlineCodeStyle}>&lt;/body&gt;</code> in any{' '}
                    <code style={inlineCodeStyle}>.html</code> file
                  </p>
                  <CodeBlock
                    language="html"
                    copyText={SCRIPT_TAG}
                    code={`<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello</h1>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                  />
                </FrameworkSection>

                {/* React Native / Expo Web */}
                <FrameworkSection
                  id="react-native-expo"
                  title="React Native / Expo Web"
                  icon="&#128241;"
                >
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Expo Router
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      Add to{' '}
                      <code style={inlineCodeStyle}>app/_layout.tsx</code> using{' '}
                      a <code style={inlineCodeStyle}>&lt;Script&gt;</code>{' '}
                      component or the web{' '}
                      <code style={inlineCodeStyle}>index.html</code>
                    </p>
                    <CodeBlock
                      language="tsx"
                      copyText={SCRIPT_TAG}
                      code={`// app/_layout.tsx
import { Slot } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const script = document.createElement('script');
      script.src = 'https://dev-editor-flow.vercel.app/dev-editor-inspector.js';
      document.body.appendChild(script);
    }
  }, []);

  return <Slot />;
}`}
                    />
                  </div>
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Custom <code style={inlineCodeStyle}>web/index.html</code>
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      If your Expo project has a custom web entry point
                    </p>
                    <CodeBlock
                      language="html"
                      copyText={SCRIPT_TAG}
                      code={`<!-- web/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="root"></div>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                    />
                  </div>
                </FrameworkSection>

                {/* Vue / Nuxt */}
                <FrameworkSection
                  id="vue-nuxt"
                  title="Vue / Nuxt"
                  icon="&#9899;"
                >
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Vue (Vite)
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      Add to <code style={inlineCodeStyle}>index.html</code>{' '}
                      (project root)
                    </p>
                    <CodeBlock
                      language="html"
                      copyText={SCRIPT_TAG}
                      code={`<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                    />
                  </div>
                  <div>
                    <h4
                      className="text-base font-medium mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Nuxt 3
                    </h4>
                    <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                      Add via{' '}
                      <code style={inlineCodeStyle}>nuxt.config.ts</code> or{' '}
                      <code style={inlineCodeStyle}>app.html</code>
                    </p>
                    <CodeBlock
                      language="ts"
                      copyText={`app: {\n  head: {\n    script: [{ src: 'https://dev-editor-flow.vercel.app/dev-editor-inspector.js' }]\n  }\n}`}
                      code={`// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        { src: 'https://dev-editor-flow.vercel.app/dev-editor-inspector.js' }
      ]
    }
  }
});`}
                    />
                  </div>
                </FrameworkSection>

                {/* Svelte / SvelteKit */}
                <FrameworkSection
                  id="svelte-sveltekit"
                  title="Svelte / SvelteKit"
                  icon="&#127793;"
                >
                  <p style={{ ...mutedText, marginBottom: '0.5rem' }}>
                    Add to <code style={inlineCodeStyle}>src/app.html</code>
                  </p>
                  <CodeBlock
                    language="html"
                    copyText={SCRIPT_TAG}
                    code={`<!-- src/app.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
    <script src="https://dev-editor-flow.vercel.app/dev-editor-inspector.js"></script>
  </body>
</html>`}
                  />
                </FrameworkSection>
              </FrameworkAccordion>
            </Section>

            {/* Troubleshooting */}
            <Section id="troubleshooting" title="Troubleshooting">
              <div className="flex flex-col gap-4">
                <TroubleshootItem title="Inspector script not detected">
                  <p>
                    If the banner appears after 5 seconds, the automatic proxy
                    injection didn&apos;t work for your setup. Add the script
                    tag manually using the framework guides above. Make sure
                    pAInt is running on the port shown in the script URL.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="CORS or Cross-Origin errors">
                  <p>
                    pAInt proxy runs on a different port than your project. If
                    your project sets strict CORS headers, the proxy may be
                    blocked. The automatic method handles this by serving
                    everything from the same origin. For the manual method,
                    ensure your dev server allows requests from{' '}
                    <code style={inlineCodeStyle}>localhost:4000</code>.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="COEP / COOP headers blocking the iframe">
                  <p>
                    Some frameworks set{' '}
                    <code style={inlineCodeStyle}>
                      Cross-Origin-Embedder-Policy
                    </code>{' '}
                    or{' '}
                    <code style={inlineCodeStyle}>
                      Cross-Origin-Opener-Policy
                    </code>{' '}
                    headers that prevent loading in an iframe. Check your server
                    config or middleware and relax these headers in development.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="Infinite iframe reload">
                  <p>
                    This happens when the target page&apos;s client-side router
                    detects the proxy URL and redirects. pAInt&apos;s proxy
                    strips <code style={inlineCodeStyle}>&lt;script&gt;</code>{' '}
                    tags to prevent this. If you still see reloads, check that
                    no inline scripts or meta-refresh tags are causing
                    navigation.
                  </p>
                </TroubleshootItem>

                <TroubleshootItem title="Styles look different in the editor">
                  <p>
                    The proxy serves SSR HTML with CSS intact but strips
                    JavaScript. If your styles depend on client-side JS (e.g.,
                    CSS-in-JS runtime injection), some styles may be missing.
                    Use the manual script method with your full dev server if
                    CSS-in-JS is critical.
                  </p>
                </TroubleshootItem>
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" title="FAQ">
              <FaqAccordion>
                <FaqSection
                  id="faq-safe"
                  question="Is it safe to add the inspector script to my project?"
                >
                  <p>
                    Yes. The inspector script is a lightweight, read-only
                    observer that listens for hover/click events and reports
                    element metadata (tag name, styles, bounding box) back to
                    pAInt via <code style={inlineCodeStyle}>postMessage</code>.
                    It does not modify your source code, send data to external
                    servers, or execute arbitrary code. It only communicates
                    with pAInt origin.
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
                  question="Should I remove the script tag before deploying to production?"
                >
                  <p>
                    Yes. The inspector script is intended for local development
                    only. Remove it (or wrap it in an environment check) before
                    deploying. If you forget, the script will try to connect to
                    pAInt origin and silently fail — it won&apos;t affect your
                    users — but it&apos;s best practice to keep it out of
                    production builds.
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
