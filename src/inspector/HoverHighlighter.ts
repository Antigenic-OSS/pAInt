/**
 * Webflow-style hover highlight — dotted green border + element name label.
 * Source reference — runtime code is inlined in the proxy route.
 */

export function createHoverHighlighter() {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;pointer-events:none;z-index:999996;border:1px dashed rgba(74,222,128,0.30);display:none;transition:top 0.04s,left 0.04s,width 0.04s,height 0.04s;';
  document.body.appendChild(overlay);

  const label = document.createElement('div');
  label.style.cssText =
    'position:absolute;top:-18px;left:-1px;padding:1px 6px;font-size:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:14px;color:#fff;background:rgba(74,222,128,0.70);border-radius:3px 3px 0 0;white-space:nowrap;pointer-events:none;';
  overlay.appendChild(label);

  function getElementLabel(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + el.id;
    const cls = el.className;
    if (cls && typeof cls === 'string') {
      const first = cls.trim().split(/\s+/)[0];
      if (first) return tag + '.' + first;
    }
    return tag;
  }

  return {
    show(el: Element, rect: DOMRect) {
      overlay.style.display = 'block';
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      label.textContent = getElementLabel(el);
      // Flip label below if near top
      if (rect.top < 20) {
        label.style.top = 'auto';
        label.style.bottom = '-18px';
        label.style.borderRadius = '0 0 3px 3px';
      } else {
        label.style.top = '-18px';
        label.style.bottom = 'auto';
        label.style.borderRadius = '3px 3px 0 0';
      }
    },
    hide() {
      overlay.style.display = 'none';
    },
    destroy() {
      overlay.remove();
    },
  };
}
