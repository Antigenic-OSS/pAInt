import type { StateCreator } from 'zustand';
import type { BoundingRect } from '@/types/element';

export interface ElementSlice {
  selectorPath: string | null;
  tagName: string | null;
  className: string | null;
  elementId: string | null;
  attributes: Record<string, string>;
  innerText: string | null;
  computedStyles: Record<string, string>;
  boundingRect: BoundingRect | null;
  componentPath: string | null;

  selectElement: (data: {
    selectorPath: string;
    tagName: string;
    className: string | null;
    id: string | null;
    attributes: Record<string, string>;
    innerText: string | null;
    computedStyles: Record<string, string>;
    boundingRect: BoundingRect;
    componentPath?: string | null;
  }) => void;
  clearSelection: () => void;
  updateComputedStyles: (styles: Record<string, string>) => void;
}

export const createElementSlice: StateCreator<ElementSlice, [], [], ElementSlice> = (set) => ({
  selectorPath: null,
  tagName: null,
  className: null,
  elementId: null,
  attributes: {},
  innerText: null,
  computedStyles: {},
  boundingRect: null,
  componentPath: null,

  selectElement: (data) => {
    set({
      selectorPath: data.selectorPath,
      tagName: data.tagName,
      className: data.className,
      elementId: data.id,
      attributes: data.attributes,
      innerText: data.innerText,
      computedStyles: data.computedStyles,
      boundingRect: data.boundingRect,
      componentPath: data.componentPath ?? null,
    });
  },

  clearSelection: () => {
    set({
      selectorPath: null,
      tagName: null,
      className: null,
      elementId: null,
      attributes: {},
      innerText: null,
      computedStyles: {},
      boundingRect: null,
      componentPath: null,
    });
  },

  updateComputedStyles: (styles) => {
    set({ computedStyles: styles });
  },
});
