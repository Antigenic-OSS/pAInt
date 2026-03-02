'use client'

import { useEditorStore } from '@/store'
import { LEFT_ICON_SIDEBAR_WIDTH } from '@/lib/constants'
import {
  LayersIcon,
  PagesIcon,
  ComponentsIcon,
  AddElementIcon,
  TerminalIcon,
} from './icons'

type LeftTab = 'layers' | 'pages' | 'components' | 'terminal' | 'add-element'

const tabs: {
  id: LeftTab
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  title: string
}[] = [
  { id: 'layers', icon: LayersIcon, title: 'Navigator' },
  { id: 'pages', icon: PagesIcon, title: 'Pages' },
  { id: 'components', icon: ComponentsIcon, title: 'Components' },
  { id: 'add-element', icon: AddElementIcon, title: 'Add Element' },
  { id: 'terminal', icon: TerminalIcon, title: 'Terminal' },
]

export function IconSidebar() {
  const activeTab = useEditorStore((s) => s.activeLeftTab)
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen)
  const setActiveTab = useEditorStore((s) => s.setActiveLeftTab)
  const togglePanel = useEditorStore((s) => s.toggleLeftPanel)

  const handleClick = (tabId: LeftTab) => {
    if (tabId === activeTab && leftPanelOpen) {
      togglePanel()
    } else {
      setActiveTab(tabId)
      if (!leftPanelOpen) {
        togglePanel()
      }
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: LEFT_ICON_SIDEBAR_WIDTH,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab && leftPanelOpen
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            title={tab.title}
            onClick={() => handleClick(tab.id)}
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: LEFT_ICON_SIDEBAR_WIDTH,
              height: 36,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              borderLeft: isActive
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              transition: 'background-color 0.15s, color 0.15s',
              cursor: 'pointer',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive
                ? 'var(--bg-active)'
                : 'transparent'
              e.currentTarget.style.color = isActive
                ? 'var(--text-primary)'
                : 'var(--text-muted)'
            }}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}
