import type { TreeNode } from './tree';
import type { CSSVariableDefinition } from './cssVariables';
import type { DetectedComponent } from './component';

// Inspector → Editor messages

export interface InspectorReadyMessage {
  type: 'INSPECTOR_READY';
}

export interface ElementSelectedMessage {
  type: 'ELEMENT_SELECTED';
  payload: {
    selectorPath: string;
    tagName: string;
    className: string | null;
    id: string | null;
    attributes: Record<string, string>;
    innerText: string | null;
    computedStyles: Record<string, string>;
    cssVariableUsages?: Record<string, string>;
    boundingRect: {
      x: number;
      y: number;
      width: number;
      height: number;
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

export interface ElementHoveredMessage {
  type: 'ELEMENT_HOVERED';
  payload: {
    selectorPath: string | null;
  };
}

export interface DOMUpdatedMessage {
  type: 'DOM_UPDATED';
  payload: {
    tree: TreeNode;
    removedSelectors: string[];
  };
}

export interface DOMTreeMessage {
  type: 'DOM_TREE';
  payload: {
    tree: TreeNode;
  };
}

export interface PageLinksMessage {
  type: 'PAGE_LINKS';
  payload: {
    links: Array<{ href: string; text: string }>;
  };
}

export interface HeartbeatResponseMessage {
  type: 'HEARTBEAT_RESPONSE';
}

export interface CSSVariablesMessage {
  type: 'CSS_VARIABLES';
  payload: {
    definitions: Record<string, CSSVariableDefinition>;
  };
}

export interface ComponentsDetectedMessage {
  type: 'COMPONENTS_DETECTED';
  payload: {
    components: DetectedComponent[];
  };
}

export interface VariantAppliedMessage {
  type: 'VARIANT_APPLIED';
  payload: {
    selectorPath: string;
    computedStyles: Record<string, string>;
    cssVariableUsages: Record<string, string>;
    boundingRect: { top: number; left: number; width: number; height: number };
  };
}

export interface PageNavigateMessage {
  type: 'PAGE_NAVIGATE';
  payload: {
    path: string;
  };
}

export interface TextChangedMessage {
  type: 'TEXT_CHANGED';
  payload: {
    selectorPath: string;
    originalText: string;
    newText: string;
  };
}

// Editor → Inspector messages

export interface SelectElementMessage {
  type: 'SELECT_ELEMENT';
  payload: {
    selectorPath: string;
  };
}

export interface PreviewChangeMessage {
  type: 'PREVIEW_CHANGE';
  payload: {
    selectorPath: string;
    property: string;
    value: string;
  };
}

export interface RevertChangeMessage {
  type: 'REVERT_CHANGE';
  payload: {
    selectorPath: string;
    property: string;
  };
}

export interface RevertAllMessage {
  type: 'REVERT_ALL';
}

export interface SetBreakpointMessage {
  type: 'SET_BREAKPOINT';
  payload: {
    width: number;
  };
}

export interface RequestDOMTreeMessage {
  type: 'REQUEST_DOM_TREE';
}

export interface RequestPageLinksMessage {
  type: 'REQUEST_PAGE_LINKS';
}

export interface HeartbeatMessage {
  type: 'HEARTBEAT';
}

export interface RequestCSSVariablesMessage {
  type: 'REQUEST_CSS_VARIABLES';
}

export interface SetSelectionModeMessage {
  type: 'SET_SELECTION_MODE';
  payload: {
    enabled: boolean;
  };
}

export interface RequestComponentsMessage {
  type: 'REQUEST_COMPONENTS';
  payload: {
    rootSelectorPath?: string;
  };
}

export interface ApplyVariantMessage {
  type: 'APPLY_VARIANT';
  payload: {
    selectorPath: string;
    type: 'class' | 'pseudo';
    addClassName?: string;
    removeClassNames?: string[];
    pseudoStyles?: Record<string, string>;
    revertPseudo?: boolean;
  };
}

export interface RevertVariantMessage {
  type: 'REVERT_VARIANT';
  payload: {
    selectorPath: string;
    removeClassName?: string;
    restoreClassName?: string;
    revertPseudo?: boolean;
    pseudoProperties?: string[];
  };
}

export interface SetTextContentMessage {
  type: 'SET_TEXT_CONTENT';
  payload: {
    selectorPath: string;
    text: string;
  };
}

export interface RevertTextContentMessage {
  type: 'REVERT_TEXT_CONTENT';
  payload: {
    selectorPath: string;
    originalText: string;
  };
}

// Union types
export type InspectorToEditorMessage =
  | InspectorReadyMessage
  | ElementSelectedMessage
  | ElementHoveredMessage
  | DOMUpdatedMessage
  | DOMTreeMessage
  | PageLinksMessage
  | HeartbeatResponseMessage
  | CSSVariablesMessage
  | ComponentsDetectedMessage
  | VariantAppliedMessage
  | PageNavigateMessage
  | TextChangedMessage;

export type EditorToInspectorMessage =
  | SelectElementMessage
  | PreviewChangeMessage
  | RevertChangeMessage
  | RevertAllMessage
  | SetBreakpointMessage
  | RequestDOMTreeMessage
  | RequestPageLinksMessage
  | HeartbeatMessage
  | RequestCSSVariablesMessage
  | SetSelectionModeMessage
  | RequestComponentsMessage
  | ApplyVariantMessage
  | RevertVariantMessage
  | SetTextContentMessage
  | RevertTextContentMessage;

export type PostMessageType =
  | InspectorToEditorMessage['type']
  | EditorToInspectorMessage['type'];
