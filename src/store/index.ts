import { create } from 'zustand';
import { createUISlice, type UISlice } from './uiSlice';
import { createElementSlice, type ElementSlice } from './elementSlice';
import { createTreeSlice, type TreeSlice } from './treeSlice';
import { createChangeSlice, type ChangeSlice } from './changeSlice';
import { createClaudeSlice, type ClaudeSlice } from './claudeSlice';
import { createCSSVariableSlice, type CSSVariableSlice } from './cssVariableSlice';

export type EditorStore = UISlice & ElementSlice & TreeSlice & ChangeSlice & ClaudeSlice & CSSVariableSlice;

export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createUISlice(...a),
  ...createElementSlice(...a),
  ...createTreeSlice(...a),
  ...createChangeSlice(...a),
  ...createClaudeSlice(...a),
  ...createCSSVariableSlice(...a),
}));
