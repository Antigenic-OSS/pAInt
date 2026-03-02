/**
 * DOM tree serialization for the inspector.
 * Converts live DOM into TreeNode structure for the editor's left panel.
 */

import type { TreeNode } from '@/types/tree'

export function generateSelectorPath(element: Element): string {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector += `#${current.id}`
      parts.unshift(selector)
      break
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean)
      if (classes.length > 0) {
        selector += '.' + classes.join('.')
      }
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName,
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

const SKIP_TAGS = new Set(['script', 'style', 'link', 'noscript'])

export function serializeTree(element: Element): TreeNode | null {
  if (!element || element.nodeType !== 1) return null

  const tagName = element.tagName.toLowerCase()
  if (SKIP_TAGS.has(tagName)) return null

  const children: TreeNode[] = []
  for (let i = 0; i < element.children.length; i++) {
    const child = serializeTree(element.children[i])
    if (child) children.push(child)
  }

  return {
    id: generateSelectorPath(element),
    tagName,
    className:
      element.className && typeof element.className === 'string'
        ? element.className
        : null,
    elementId: element.id || null,
    children,
    imgSrc: tagName === 'img' ? element.getAttribute('src') || null : null,
  }
}
