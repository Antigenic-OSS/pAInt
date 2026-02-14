/**
 * Blue overlay following cursor via mousemove in capture phase.
 * Source reference — runtime code is inlined in the proxy route.
 */

export function createHoverHighlighter() {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;pointer-events:none;z-index:999998;border:2px solid #4a9eff;background:rgba(74,158,255,0.1);display:none;transition:all 0.05s;';
  document.body.appendChild(overlay);

  return {
    show(rect: DOMRect) {
      overlay.style.display = 'block';
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
    },
    hide() {
      overlay.style.display = 'none';
    },
    destroy() {
      overlay.remove();
    },
  };
}
