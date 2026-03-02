/**
 * Inspector entry point.
 * This file is the source for the inspector IIFE injected into the iframe.
 * The actual runtime code is inlined in the proxy route for simplicity.
 * This module serves as the canonical source reference.
 *
 * Modules:
 * - DOMTraverser: Serializes DOM to TreeNode
 * - HoverHighlighter: Blue overlay on mousemove
 * - ElementSelector: Click to select with computed styles
 * - SelectionHighlighter: Persistent outline on selected element
 * - StyleExtractor: getComputedStyle reader
 * - messaging: postMessage send/receive bridge
 */

export { generateSelectorPath, serializeTree } from './DOMTraverser'
export { getComputedStylesForElement } from './StyleExtractor'
