import type { StateCreator } from 'zustand'
import type {
  CSSVariableDefinition,
  CSSVariableFamily,
} from '@/types/cssVariables'
import { groupVariablesIntoFamilies } from '@/lib/cssVariableUtils'
import type { TailwindColorClass } from '@/lib/tailwindClassParser'

export type TailwindClassMapEntry = TailwindColorClass & {
  variableName: string | null
}

export interface CSSVariableSlice {
  cssVariableDefinitions: Record<string, CSSVariableDefinition>
  cssVariableUsages: Record<string, string>
  cssVariableFamilies: CSSVariableFamily[]
  isExplicitTokens: boolean
  detachedProperties: Record<string, boolean>
  tailwindClassMap: Record<string, TailwindClassMapEntry>
  themeScopes: string[]

  setCSSVariableDefinitions: (
    definitions: Record<string, CSSVariableDefinition>,
    isExplicit?: boolean,
    scopes?: string[],
  ) => void
  setCSSVariableUsages: (usages: Record<string, string>) => void
  clearCSSVariableUsages: () => void
  detachProperty: (selectorPath: string, property: string) => void
  reattachProperty: (selectorPath: string, property: string) => void
  isPropertyDetached: (selectorPath: string, property: string) => boolean
  setTailwindClassMap: (map: Record<string, TailwindClassMapEntry>) => void
}

function detachKey(selectorPath: string, property: string): string {
  return `${selectorPath}::${property}`
}

export const createCSSVariableSlice: StateCreator<
  CSSVariableSlice,
  [],
  [],
  CSSVariableSlice
> = (set, get) => ({
  cssVariableDefinitions: {},
  cssVariableUsages: {},
  cssVariableFamilies: [],
  isExplicitTokens: false,
  detachedProperties: {},
  tailwindClassMap: {},
  themeScopes: [],

  setCSSVariableDefinitions: (definitions, isExplicit, scopes) => {
    set({
      cssVariableDefinitions: definitions,
      cssVariableFamilies: groupVariablesIntoFamilies(definitions),
      isExplicitTokens: isExplicit ?? false,
      themeScopes: scopes ?? [],
    })
  },

  setCSSVariableUsages: (usages) => {
    set({ cssVariableUsages: usages })
  },

  clearCSSVariableUsages: () => {
    set({ cssVariableUsages: {}, tailwindClassMap: {} })
  },

  detachProperty: (selectorPath, property) => {
    const key = detachKey(selectorPath, property)
    set((state) => ({
      detachedProperties: { ...state.detachedProperties, [key]: true },
    }))
  },

  reattachProperty: (selectorPath, property) => {
    const key = detachKey(selectorPath, property)
    set((state) => {
      const next = { ...state.detachedProperties }
      delete next[key]
      return { detachedProperties: next }
    })
  },

  isPropertyDetached: (selectorPath, property) => {
    const key = detachKey(selectorPath, property)
    return !!get().detachedProperties[key]
  },

  setTailwindClassMap: (map) => {
    set({ tailwindClassMap: map })
  },
})
