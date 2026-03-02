/**
 * Extract computed styles for the design panel.
 * Source reference — runtime code is inlined in the proxy route.
 */

import { ALL_EDITABLE_PROPERTIES } from '@/lib/constants'

export function getComputedStylesForElement(
  element: Element,
): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const styles: Record<string, string> = {}

  for (const prop of ALL_EDITABLE_PROPERTIES) {
    styles[prop] = computed.getPropertyValue(prop)
  }

  return styles
}
