import type { SourceInfo } from './claude'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export interface StyleChange {
  id: string
  elementSelector: string
  property: string
  originalValue: string
  newValue: string
  breakpoint: Breakpoint
  timestamp: number
  changeScope?: 'all' | 'breakpoint-only'
}

export interface ElementSnapshot {
  selectorPath: string
  tagName: string
  className: string | null
  elementId: string | null
  attributes: Record<string, string>
  innerText: string | null
  computedStyles: Record<string, string>
  pagePath: string
  changeScope: 'all' | 'breakpoint-only'
  sourceInfo?: SourceInfo | null
}

export interface UndoRedoAction {
  elementSelector: string
  property: string
  beforeValue: string
  afterValue: string
  breakpoint: Breakpoint
  wasNewChange: boolean
  changeScope?: 'all' | 'breakpoint-only'
}

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const

export const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
} as const
