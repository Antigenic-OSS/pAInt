// Component detection types for the Components tab

export type DetectionMethod =
  | 'semantic-html'
  | 'custom-element'
  | 'aria-role'
  | 'class-pattern'
  | 'data-attribute';

export interface ComponentBoundingRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface VariantOption {
  label: string;
  className: string | null;
  removeClassNames: string[] | null;
  pseudoState: string | null;
  pseudoStyles: Record<string, string> | null;
}

export interface VariantGroup {
  groupName: string;
  type: 'class' | 'pseudo';
  options: VariantOption[];
  activeIndex: number;
}

export interface DetectedComponent {
  selectorPath: string;
  name: string;
  tagName: string;
  detectionMethod: DetectionMethod;
  className: string | null;
  elementId: string | null;
  innerText: string | null;
  boundingRect: ComponentBoundingRect;
  variants: VariantGroup[];
  childComponentCount: number;
}

export interface CreatedComponent {
  name: string;
  selectorPath: string;
  timestamp: number;
}
