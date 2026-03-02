import { create } from 'zustand'
import { createUISlice, type UISlice } from './uiSlice'
import { createElementSlice, type ElementSlice } from './elementSlice'
import { createTreeSlice, type TreeSlice } from './treeSlice'
import { createChangeSlice, type ChangeSlice } from './changeSlice'
import { createClaudeSlice, type ClaudeSlice } from './claudeSlice'
import {
  createCSSVariableSlice,
  type CSSVariableSlice,
} from './cssVariableSlice'
import { createComponentSlice, type ComponentSlice } from './componentSlice'
import { createConsoleSlice, type ConsoleSlice } from './consoleSlice'
import { createTerminalSlice, type TerminalSlice } from './terminalSlice'

export type EditorStore = UISlice &
  ElementSlice &
  TreeSlice &
  ChangeSlice &
  ClaudeSlice &
  CSSVariableSlice &
  ComponentSlice &
  ConsoleSlice &
  TerminalSlice

export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createUISlice(...a),
  ...createElementSlice(...a),
  ...createTreeSlice(...a),
  ...createChangeSlice(...a),
  ...createClaudeSlice(...a),
  ...createCSSVariableSlice(...a),
  ...createComponentSlice(...a),
  ...createConsoleSlice(...a),
  ...createTerminalSlice(...a),
}))
