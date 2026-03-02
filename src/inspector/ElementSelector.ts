/**
 * Click handler in capture phase for element selection.
 * Source reference — runtime code is inlined in the proxy route.
 */

export type SelectCallback = (element: Element) => void

export function createElementSelector(onSelect: SelectCallback) {
  const handler = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (el) onSelect(el)
  }

  document.addEventListener('click', handler, true)

  return {
    destroy() {
      document.removeEventListener('click', handler, true)
    },
  }
}
