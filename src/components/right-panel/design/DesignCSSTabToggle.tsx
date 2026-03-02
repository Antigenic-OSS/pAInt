'use client'

interface DesignCSSTabToggleProps {
  activeTab: 'design' | 'css'
  onTabChange: (tab: 'design' | 'css') => void
}

export function DesignCSSTabToggle({
  activeTab,
  onTabChange,
}: DesignCSSTabToggleProps) {
  return (
    <div
      className="flex items-center justify-center px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center gap-0.5 rounded p-0.5"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => onTabChange('design')}
          className="px-3 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background:
              activeTab === 'design'
                ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                : 'transparent',
            color:
              activeTab === 'design' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          Design
        </button>
        <button
          onClick={() => onTabChange('css')}
          className="px-3 py-0.5 text-[11px] rounded transition-colors"
          style={{
            background:
              activeTab === 'css'
                ? 'var(--accent-bg, rgba(74,158,255,0.15))'
                : 'transparent',
            color: activeTab === 'css' ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          CSS
        </button>
      </div>
    </div>
  )
}
