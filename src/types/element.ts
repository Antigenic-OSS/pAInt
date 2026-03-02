export interface BoundingRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

export interface SelectedElement {
  selectorPath: string | null
  tagName: string | null
  className: string | null
  id: string | null
  attributes: Record<string, string>
  innerText: string | null
  computedStyles: Record<string, string>
  boundingRect: BoundingRect | null
}
