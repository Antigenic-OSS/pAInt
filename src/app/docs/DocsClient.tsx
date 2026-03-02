'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

const NAV_ITEMS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'framework-guides', label: 'Framework Guides' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
] as const

export function Sidebar() {
  const [activeId, setActiveId] = useState<string>('how-it-works')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )

    const sections = NAV_ITEMS.map((item) =>
      document.getElementById(item.id),
    ).filter(Boolean) as HTMLElement[]

    sections.forEach((el) => observerRef.current!.observe(el))

    return () => observerRef.current?.disconnect()
  }, [])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav
      className="hidden lg:flex flex-col gap-1 sticky top-12 self-start"
      style={{ minWidth: 160 }}
    >
      <span
        className="text-sm font-semibold uppercase tracking-wider mb-2 px-2"
        style={{ color: 'var(--text-muted)' }}
      >
        On this page
      </span>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          className="text-left text-sm px-2 py-1.5 rounded transition-colors"
          style={{
            color:
              activeId === item.id ? 'var(--accent)' : 'var(--text-secondary)',
            background:
              activeId === item.id ? 'var(--accent-bg)' : 'transparent',
            borderLeft:
              activeId === item.id
                ? '2px solid var(--accent)'
                : '2px solid transparent',
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

const FRAMEWORK_IDS = [
  'nextjs',
  'vite-react',
  'create-react-app',
  'plain-html',
  'react-native-expo',
  'vue-nuxt',
  'svelte-sveltekit',
] as const

type FrameworkId = (typeof FRAMEWORK_IDS)[number]

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: user can manually select & copy
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors shrink-0"
      style={{
        background: copied ? 'var(--success)' : 'var(--accent)',
        color: '#fff',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function CodeBlock({
  code,
  copyText,
  language,
}: {
  code: string
  copyText?: string
  language?: string
}) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {language || 'html'}
        </span>
        <CopyButton text={copyText || code} />
      </div>
      <pre
        className="p-3 overflow-x-auto text-sm leading-relaxed m-0"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function FrameworkAccordion({
  children,
}: {
  children: React.ReactNode
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['nextjs']),
  )

  const toggle = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <AccordionContext.Provider value={{ openSections, toggle }}>
      <div className="flex flex-col gap-2">{children}</div>
    </AccordionContext.Provider>
  )
}

import { createContext, useContext } from 'react'

const AccordionContext = createContext<{
  openSections: Set<string>
  toggle: (id: string) => void
}>({
  openSections: new Set(),
  toggle: () => {},
})

export function FrameworkSection({
  id,
  title,
  icon,
  children,
}: {
  id: string
  title: string
  icon: string
  children: React.ReactNode
}) {
  const { openSections, toggle } = useContext(AccordionContext)
  const isOpen = openSections.has(id)

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{
          background: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-base font-medium">{title}</span>
        <span
          className="text-xs transition-transform"
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          &#9654;
        </span>
      </button>
      {isOpen && (
        <div
          className="px-4 py-4 flex flex-col gap-4"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function FaqAccordion({ children }: { children: React.ReactNode }) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <AccordionContext.Provider value={{ openSections, toggle }}>
      <div className="flex flex-col gap-2">{children}</div>
    </AccordionContext.Provider>
  )
}

export function FaqSection({
  id,
  question,
  children,
}: {
  id: string
  question: string
  children: React.ReactNode
}) {
  const { openSections, toggle } = useContext(AccordionContext)
  const isOpen = openSections.has(id)

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{
          background: isOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="flex-1 text-base font-medium">{question}</span>
        <span
          className="text-xs transition-transform"
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          &#9654;
        </span>
      </button>
      {isOpen && (
        <div
          className="px-4 py-4"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
