import type { StateCreator } from 'zustand';
import type { DetectedComponent, CreatedComponent } from '@/types/component';

export interface ComponentSlice {
  detectedComponents: DetectedComponent[];
  selectedComponentPath: string | null;
  componentSearchQuery: string;
  createdComponents: Record<string, CreatedComponent>;

  setDetectedComponents: (components: DetectedComponent[]) => void;
  setSelectedComponentPath: (path: string | null) => void;
  setComponentSearchQuery: (query: string) => void;
  addCreatedComponent: (component: CreatedComponent) => void;
  removeCreatedComponent: (selectorPath: string) => void;
  updateComponentVariantActiveIndex: (selectorPath: string, groupIndex: number, optionIndex: number) => void;
  clearComponents: () => void;
}

export const createComponentSlice: StateCreator<ComponentSlice, [], [], ComponentSlice> = (set) => ({
  detectedComponents: [],
  selectedComponentPath: null,
  componentSearchQuery: '',
  createdComponents: {},

  setDetectedComponents: (components) => {
    set({ detectedComponents: components });
  },

  setSelectedComponentPath: (path) => {
    set({ selectedComponentPath: path });
  },

  setComponentSearchQuery: (query) => {
    set({ componentSearchQuery: query });
  },

  addCreatedComponent: (component) => {
    set((state) => ({
      createdComponents: {
        ...state.createdComponents,
        [component.selectorPath]: component,
      },
    }));
  },

  removeCreatedComponent: (selectorPath) => {
    set((state) => {
      const next = { ...state.createdComponents };
      delete next[selectorPath];
      return { createdComponents: next };
    });
  },

  updateComponentVariantActiveIndex: (selectorPath, groupIndex, optionIndex) => {
    set((state) => ({
      detectedComponents: state.detectedComponents.map((comp) => {
        if (comp.selectorPath !== selectorPath) return comp;
        return {
          ...comp,
          variants: comp.variants.map((group, gi) => {
            if (gi !== groupIndex) return group;
            return { ...group, activeIndex: optionIndex };
          }),
        };
      }),
    }));
  },

  clearComponents: () => {
    set({
      detectedComponents: [],
      selectedComponentPath: null,
      componentSearchQuery: '',
    });
  },
});
