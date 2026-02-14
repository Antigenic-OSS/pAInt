import type { StateCreator } from 'zustand';
import type { CSSVariableDefinition, CSSVariableFamily } from '@/types/cssVariables';
import { groupVariablesIntoFamilies } from '@/lib/cssVariableUtils';

export interface CSSVariableSlice {
  cssVariableDefinitions: Record<string, CSSVariableDefinition>;
  cssVariableUsages: Record<string, string>;
  cssVariableFamilies: CSSVariableFamily[];
  detachedProperties: Record<string, boolean>;

  setCSSVariableDefinitions: (definitions: Record<string, CSSVariableDefinition>) => void;
  setCSSVariableUsages: (usages: Record<string, string>) => void;
  clearCSSVariableUsages: () => void;
  detachProperty: (selectorPath: string, property: string) => void;
  reattachProperty: (selectorPath: string, property: string) => void;
  isPropertyDetached: (selectorPath: string, property: string) => boolean;
}

function detachKey(selectorPath: string, property: string): string {
  return `${selectorPath}::${property}`;
}

export const createCSSVariableSlice: StateCreator<CSSVariableSlice, [], [], CSSVariableSlice> = (set, get) => ({
  cssVariableDefinitions: {},
  cssVariableUsages: {},
  cssVariableFamilies: [],
  detachedProperties: {},

  setCSSVariableDefinitions: (definitions) => {
    set({
      cssVariableDefinitions: definitions,
      cssVariableFamilies: groupVariablesIntoFamilies(definitions),
    });
  },

  setCSSVariableUsages: (usages) => {
    set({ cssVariableUsages: usages });
  },

  clearCSSVariableUsages: () => {
    set({ cssVariableUsages: {} });
  },

  detachProperty: (selectorPath, property) => {
    const key = detachKey(selectorPath, property);
    set((state) => ({
      detachedProperties: { ...state.detachedProperties, [key]: true },
    }));
  },

  reattachProperty: (selectorPath, property) => {
    const key = detachKey(selectorPath, property);
    set((state) => {
      const next = { ...state.detachedProperties };
      delete next[key];
      return { detachedProperties: next };
    });
  },

  isPropertyDetached: (selectorPath, property) => {
    const key = detachKey(selectorPath, property);
    return !!get().detachedProperties[key];
  },
});
