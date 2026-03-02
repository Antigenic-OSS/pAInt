import { NextRequest, NextResponse } from 'next/server'
import { PROXY_HEADER } from '@/lib/constants'

const INSPECTOR_SCRIPT = `
<script>
(function() {
  ${getInspectorCode()}
})();
</script>
`

function getInspectorCode(): string {
  // The inspector code will be inlined here during build.
  // For now, load it dynamically via a separate endpoint.
  return `
    // Inspector bootstrap - sends INSPECTOR_READY and sets up message handling
    var DEV_EDITOR_INSPECTOR = (function() {
      var parentOrigin = '*';
      try { parentOrigin = window.parent.location.origin; } catch(e) { parentOrigin = '*'; }

      function send(message) {
        try { window.parent.postMessage(message, parentOrigin); } catch(e) {}
      }

      function generateSelectorPath(element) {
        var parts = [];
        var current = element;
        while (current && current !== document.documentElement) {
          var selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += '#' + CSS.escape(current.id);
            parts.unshift(selector);
            break;
          }
          if (current.className && typeof current.className === 'string') {
            var classes = current.className.trim().split(/\\s+/).filter(Boolean);
            if (classes.length > 0) {
              selector += '.' + classes.map(function(c) { return CSS.escape(c); }).join('.');
            }
          }
          var parent = current.parentElement;
          if (parent) {
            var siblings = Array.from(parent.children).filter(function(c) {
              return c.tagName === current.tagName;
            });
            if (siblings.length > 1) {
              var index = siblings.indexOf(current) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
          }
          parts.unshift(selector);
          current = current.parentElement;
        }
        return parts.join(' > ');
      }

      function serializeTree(element) {
        if (!element || element.nodeType !== 1) return null;
        var tagName = element.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'link') return null;
        var children = [];
        for (var i = 0; i < element.children.length; i++) {
          var child = serializeTree(element.children[i]);
          if (child) children.push(child);
        }
        return {
          id: generateSelectorPath(element),
          tagName: tagName,
          className: element.className && typeof element.className === 'string' ? element.className : null,
          elementId: element.id || null,
          children: children
        };
      }

      function toCC(s) {
        if (s.charAt(0) === '-') s = s.substring(1);
        return s.replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
      }
      function toKC(s) {
        var k = s.replace(/[A-Z]/g, function(c) { return '-' + c.toLowerCase(); });
        if (/^(webkit|moz|ms)-/.test(k)) k = '-' + k;
        return k;
      }

      function getComputedStylesForElement(el) {
        var computed = window.getComputedStyle(el);
        var props = [
          'width','height','min-width','min-height','max-width','max-height',
          'overflow','overflow-x','overflow-y','box-sizing',
          'margin-top','margin-right','margin-bottom','margin-left',
          'padding-top','padding-right','padding-bottom','padding-left',
          'font-family','font-size','font-weight','font-style','line-height','letter-spacing',
          'text-align','text-decoration','text-transform','text-indent','text-overflow','text-shadow','color',
          'direction','word-break','line-break','white-space','column-count',
          '-webkit-text-stroke-width','-webkit-text-stroke-color',
          'border-width','border-style','border-color','border-radius',
          'border-top-width','border-right-width','border-bottom-width','border-left-width',
          'border-top-left-radius','border-top-right-radius',
          'border-bottom-right-radius','border-bottom-left-radius',
          'background-color','background-image',
          'background-size','background-position','background-repeat','background-attachment','background-clip',
          'opacity','visibility','cursor','mix-blend-mode','pointer-events',
          'display','flex-direction','justify-content','align-items',
          'flex-wrap','gap','column-gap','row-gap',
          'grid-template-columns','grid-template-rows','grid-auto-flow','justify-items',
          'vertical-align',
          'position','top','right','bottom','left','z-index','float','clear',
          'box-shadow','filter'
        ];
        var styles = {};
        for (var i = 0; i < props.length; i++) {
          styles[toCC(props[i])] = computed.getPropertyValue(props[i]);
        }
        return styles;
      }

      function scanCSSVariableDefinitions() {
        var definitions = {};
        var scopesSet = {};
        var rootStyles = window.getComputedStyle(document.documentElement);
        var FRAMEWORK_PREFIXES = ['--tw-', '--next-', '--radix-', '--chakra-', '--mantine-', '--mui-', '--framer-', '--sb-'];

        // Detect Tailwind v4 @theme usage — if present, keep --color-*, --font-*, --spacing-* vars
        var hasTailwindTheme = false;
        for (var tsi = 0; tsi < document.styleSheets.length; tsi++) {
          var tSheet = document.styleSheets[tsi];
          try {
            // Check inline <style> content for @theme directive
            if (tSheet.ownerNode && tSheet.ownerNode.textContent && tSheet.ownerNode.textContent.indexOf('@theme') >= 0) {
              hasTailwindTheme = true;
              break;
            }
            // Check linked stylesheet rules for @layer theme or @theme
            var tRules = tSheet.cssRules || tSheet.rules;
            if (tRules) {
              for (var tri = 0; tri < tRules.length; tri++) {
                var tRule = tRules[tri];
                if (tRule.cssText && tRule.cssText.indexOf('@theme') >= 0) {
                  hasTailwindTheme = true;
                  break;
                }
              }
            }
          } catch(e) { /* cross-origin stylesheet */ }
          if (hasTailwindTheme) break;
        }

        function classifyScope(selectorText, parentRule) {
          if (!selectorText) return 'custom';
          var sel = selectorText.trim().toLowerCase();
          // Check if inside a @media (prefers-color-scheme: dark) block
          if (parentRule && parentRule.conditionText) {
            var cond = parentRule.conditionText.toLowerCase();
            if (cond.indexOf('prefers-color-scheme') >= 0 && cond.indexOf('dark') >= 0) {
              return 'media-dark';
            }
          }
          if (sel === ':root' || sel === ':root, :host' || sel === ':host, :root') return 'root';
          if (sel.indexOf('.dark') >= 0 || sel.indexOf('[data-theme="dark"]') >= 0 || sel.indexOf('[data-mode="dark"]') >= 0) return 'dark';
          return 'root';
        }

        function extractFromRules(rules, parentRule) {
          for (var ri = 0; ri < rules.length; ri++) {
            var rule = rules[ri];
            if (rule.cssRules) {
              extractFromRules(rule.cssRules, rule);
              continue;
            }
            if (!rule.style) continue;
            var ruleSelector = rule.selectorText || '';
            var scope = classifyScope(ruleSelector, parentRule);
            if (ruleSelector) scopesSet[ruleSelector] = true;
            for (var pi = 0; pi < rule.style.length; pi++) {
              var prop = rule.style[pi];
              if (prop.indexOf('--') === 0) {
                var rawVal = rule.style.getPropertyValue(prop).trim();
                var resolved = rootStyles.getPropertyValue(prop).trim();
                definitions[prop] = {
                  value: rawVal,
                  resolvedValue: resolved || rawVal,
                  selector: ruleSelector,
                  scope: scope
                };
              }
            }
          }
        }

        var taggedSheets = [];
        for (var si = 0; si < document.styleSheets.length; si++) {
          var sheet = document.styleSheets[si];
          if (sheet.ownerNode && sheet.ownerNode.hasAttribute && sheet.ownerNode.hasAttribute('data-design-tokens')) {
            taggedSheets.push(sheet);
          }
        }

        if (taggedSheets.length > 0) {
          for (var ti = 0; ti < taggedSheets.length; ti++) {
            var taggedRules;
            try { taggedRules = taggedSheets[ti].cssRules || taggedSheets[ti].rules; } catch(e) { continue; }
            if (taggedRules) extractFromRules(taggedRules, null);
          }
          return { definitions: definitions, isExplicit: true, scopes: Object.keys(scopesSet) };
        }

        for (var fi = 0; fi < document.styleSheets.length; fi++) {
          var fallbackSheet = document.styleSheets[fi];
          var fallbackRules;
          try { fallbackRules = fallbackSheet.cssRules || fallbackSheet.rules; } catch(e) { continue; }
          if (fallbackRules) extractFromRules(fallbackRules, null);
        }

        var metaEl = document.querySelector('meta[name="design-tokens-prefix"]');
        var metaPrefixes = null;
        if (metaEl) {
          var content = metaEl.getAttribute('content');
          if (content) {
            metaPrefixes = content.split(',');
            for (var mpi = 0; mpi < metaPrefixes.length; mpi++) {
              metaPrefixes[mpi] = metaPrefixes[mpi].trim();
            }
          }
        }

        var filtered = {};
        var keys = Object.keys(definitions);
        for (var ki = 0; ki < keys.length; ki++) {
          var key = keys[ki];
          if (metaPrefixes) {
            var allowed = false;
            for (var api = 0; api < metaPrefixes.length; api++) {
              if (key.indexOf(metaPrefixes[api]) === 0) { allowed = true; break; }
            }
            if (allowed) filtered[key] = definitions[key];
          } else {
            var isFramework = false;
            for (var fpi = 0; fpi < FRAMEWORK_PREFIXES.length; fpi++) {
              if (key.indexOf(FRAMEWORK_PREFIXES[fpi]) === 0) { isFramework = true; break; }
            }
            // If Tailwind v4 @theme detected, keep --color-*, --font-*, --spacing-* even if --tw- internal vars are filtered
            if (isFramework && hasTailwindTheme && key.indexOf('--tw-') !== 0) {
              isFramework = false;
            }
            if (!isFramework) filtered[key] = definitions[key];
          }
        }

        return { definitions: filtered, isExplicit: false, scopes: Object.keys(scopesSet) };
      }

      function detectCSSVariablesOnElement(el) {
        var usages = {};
        // Check inline style for var() references
        if (el.style) {
          for (var si = 0; si < el.style.length; si++) {
            var inlineProp = el.style[si];
            var inlineVal = el.style.getPropertyValue(inlineProp);
            if (inlineVal && inlineVal.indexOf('var(') >= 0) {
              usages[inlineProp] = inlineVal.trim();
            }
          }
        }
        // Check stylesheet rules that match this element
        for (var shi = 0; shi < document.styleSheets.length; shi++) {
          var sheet = document.styleSheets[shi];
          var rules;
          try { rules = sheet.cssRules || sheet.rules; } catch(e) { continue; }
          if (!rules) continue;
          for (var ri = 0; ri < rules.length; ri++) {
            var rule = rules[ri];
            if (!rule.selectorText || !rule.style) continue;
            var matches = false;
            try { matches = el.matches(rule.selectorText); } catch(e) { continue; }
            if (!matches) continue;
            for (var pi = 0; pi < rule.style.length; pi++) {
              var prop = rule.style[pi];
              var val = rule.style.getPropertyValue(prop);
              if (val && val.indexOf('var(') >= 0) {
                // Don't overwrite inline style usages (higher specificity)
                if (!usages[prop]) {
                  usages[prop] = val.trim();
                }
              }
            }
          }
        }
        return usages;
      }

      // Selection highlight
      var selectionOverlay = document.createElement('div');
      selectionOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999997;border:2px solid #4a9eff;display:none;';
      document.body.appendChild(selectionOverlay);

      // Hover highlight — dotted green border + element name label (visual-editor-style)
      var hoverOverlay = document.createElement('div');
      hoverOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999996;border:1px dashed #4ade80;display:none;transition:top 0.04s,left 0.04s,width 0.04s,height 0.04s;';
      document.body.appendChild(hoverOverlay);

      var hoverLabel = document.createElement('div');
      hoverLabel.style.cssText = 'position:absolute;top:-18px;left:-1px;padding:1px 6px;font-size:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:14px;color:#fff;background:#1D3F23;border-radius:3px 3px 0 0;white-space:nowrap;pointer-events:none;';
      hoverOverlay.appendChild(hoverLabel);

      var hoveredElement = null;

      function getElementLabel(el) {
        var tag = el.tagName.toLowerCase();
        // Show id if present
        if (el.id) return tag + '#' + el.id;
        // Show first meaningful class
        var cls = el.className;
        if (cls && typeof cls === 'string') {
          var first = cls.trim().split(/\s+/)[0];
          if (first) return tag + '.' + first;
        }
        return tag;
      }

      document.addEventListener('mousemove', function(e) {
        if (!selectionModeEnabled) { hoverOverlay.style.display = 'none'; return; }
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === hoverOverlay || el === selectionOverlay || el === hoverLabel) return;
        // Don't show hover on already-selected element
        if (el === selectedElement) { hoverOverlay.style.display = 'none'; hoveredElement = null; return; }
        if (el === hoveredElement) return;
        hoveredElement = el;
        var rect = el.getBoundingClientRect();
        hoverOverlay.style.display = 'block';
        hoverOverlay.style.top = rect.top + 'px';
        hoverOverlay.style.left = rect.left + 'px';
        hoverOverlay.style.width = rect.width + 'px';
        hoverOverlay.style.height = rect.height + 'px';
        hoverLabel.textContent = getElementLabel(el);
        // If element is near top of viewport, show label below instead
        if (rect.top < 20) {
          hoverLabel.style.top = 'auto';
          hoverLabel.style.bottom = '-18px';
          hoverLabel.style.borderRadius = '0 0 3px 3px';
        } else {
          hoverLabel.style.top = '-18px';
          hoverLabel.style.bottom = 'auto';
          hoverLabel.style.borderRadius = '3px 3px 0 0';
        }
      }, true);

      document.addEventListener('mouseleave', function() {
        hoverOverlay.style.display = 'none';
        hoveredElement = null;
      });

      function getReactSourceInfo(element) {
        // Find React fiber key on DOM element
        var fiberKey = null;
        var keys = Object.keys(element);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('__reactFiber$') === 0 || keys[i].indexOf('__reactInternalInstance$') === 0) {
            fiberKey = keys[i]; break;
          }
        }
        if (!fiberKey) return null;

        var fiber = element[fiberKey];
        var source = null;
        var componentName = null;
        var componentChain = [];
        var visited = 0;

        while (fiber && visited < 50) {
          visited++;
          if (!source && fiber._debugSource) {
            source = {
              fileName: fiber._debugSource.fileName || '',
              lineNumber: fiber._debugSource.lineNumber || 0,
              columnNumber: fiber._debugSource.columnNumber
            };
          }
          // Collect component names (function/class components, forwardRef)
          var type = fiber.type;
          if (type) {
            var name = null;
            if (typeof type === 'function') {
              name = type.displayName || type.name;
            } else if (type.$$typeof && (type.render || type.type)) {
              var inner = type.render || type.type;
              if (typeof inner === 'function') name = inner.displayName || inner.name;
            }
            if (name && name !== 'Anonymous' && name.length > 1) {
              if (!componentName) componentName = name;
              componentChain.push(name);
            }
          }
          if (source && componentChain.length >= 10) break;
          fiber = fiber.return;
        }
        if (!source) return null;
        return {
          fileName: source.fileName,
          lineNumber: source.lineNumber,
          columnNumber: source.columnNumber,
          componentName: componentName,
          componentChain: componentChain
        };
      }

      var selectedElement = null;
      var selectionModeEnabled = true;

      // Click selection — when selection mode is on, intercept clicks to select elements.
      // When off, let clicks through so links and buttons work normally.
      document.addEventListener('click', function(e) {
        if (!selectionModeEnabled) return;

        // If text editing is active, clicking outside commits the edit
        if (textEditingActive) {
          var clickedEl = document.elementFromPoint(e.clientX, e.clientY);
          if (clickedEl !== textEditTarget) {
            e.preventDefault();
            e.stopPropagation();
            commitTextEdit();
          }
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === selectionOverlay || el === hoverOverlay || el === hoverLabel) return;
        hoverOverlay.style.display = 'none';
        selectElement(el);
      }, true);

      function selectElement(el) {
        // Don't select elements when selection mode is disabled (preview mode)
        if (!selectionModeEnabled) return;
        selectedElement = el;
        // Hide hover overlay when selecting
        hoverOverlay.style.display = 'none';
        hoveredElement = null;
        var rect = el.getBoundingClientRect();
        selectionOverlay.style.display = 'block';
        selectionOverlay.style.top = rect.top + 'px';
        selectionOverlay.style.left = rect.left + 'px';
        selectionOverlay.style.width = rect.width + 'px';
        selectionOverlay.style.height = rect.height + 'px';

        // Collect all attributes
        var attrs = {};
        for (var ai = 0; ai < el.attributes.length; ai++) {
          var attr = el.attributes[ai];
          attrs[attr.name] = attr.value;
        }

        // Collect truncated inner text
        var text = (el.innerText || '').substring(0, 500) || null;

        var varUsages = detectCSSVariablesOnElement(el);
        console.log('[pAInt] CSS variable usages for', el.tagName, el.className, varUsages);

        var sourceInfo = getReactSourceInfo(el);
        if (sourceInfo) {
          console.log('[pAInt] sourceInfo:', sourceInfo.fileName + ':' + sourceInfo.lineNumber, 'component:', sourceInfo.componentName, 'chain:', sourceInfo.componentChain.join(' > '));
        }

        send({
          type: 'ELEMENT_SELECTED',
          payload: {
            selectorPath: generateSelectorPath(el),
            tagName: el.tagName.toLowerCase(),
            className: el.className && typeof el.className === 'string' ? el.className : null,
            id: el.id || null,
            attributes: attrs,
            innerText: text,
            computedStyles: getComputedStylesForElement(el),
            cssVariableUsages: varUsages,
            sourceInfo: sourceInfo,
            boundingRect: {
              x: rect.x, y: rect.y,
              width: rect.width, height: rect.height,
              top: rect.top, right: rect.right,
              bottom: rect.bottom, left: rect.left
            }
          }
        });
      }

      function clearSelection() {
        selectedElement = null;
        selectionOverlay.style.display = 'none';
      }

      // Update overlays on scroll so they follow elements
      function updateOverlays() {
        if (selectedElement && selectionOverlay.style.display !== 'none') {
          var sr = selectedElement.getBoundingClientRect();
          selectionOverlay.style.top = sr.top + 'px';
          selectionOverlay.style.left = sr.left + 'px';
          selectionOverlay.style.width = sr.width + 'px';
          selectionOverlay.style.height = sr.height + 'px';
        }
        if (hoveredElement && hoverOverlay.style.display !== 'none') {
          var hr = hoveredElement.getBoundingClientRect();
          hoverOverlay.style.top = hr.top + 'px';
          hoverOverlay.style.left = hr.left + 'px';
          hoverOverlay.style.width = hr.width + 'px';
          hoverOverlay.style.height = hr.height + 'px';
        }
      }
      window.addEventListener('scroll', updateOverlays, true);
      window.addEventListener('resize', updateOverlays, true);

      // --- Inline Text Editing ---
      var textEditingActive = false;
      var originalTextContent = null;
      var textEditTarget = null;
      var SKIP_TEXT_EDIT_TAGS = { INPUT: 1, TEXTAREA: 1, SELECT: 1, IMG: 1, VIDEO: 1, IFRAME: 1, SVG: 1, svg: 1, CANVAS: 1 };

      function commitTextEdit() {
        if (!textEditingActive || !textEditTarget) return;
        var newText = textEditTarget.textContent || '';
        var el = textEditTarget;
        var selectorPath = generateSelectorPath(el);

        el.contentEditable = 'false';
        el.style.removeProperty('outline');
        el.style.removeProperty('outline-offset');
        el.style.removeProperty('min-width');
        textEditingActive = false;
        textEditTarget = null;

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });

        selectionOverlay.style.display = 'block';
        updateOverlays();

        if (newText !== originalTextContent) {
          send({
            type: 'TEXT_CHANGED',
            payload: {
              selectorPath: selectorPath,
              originalText: originalTextContent || '',
              newText: newText
            }
          });
        }
        originalTextContent = null;
      }

      function cancelTextEdit() {
        if (!textEditingActive || !textEditTarget) return;
        textEditTarget.textContent = originalTextContent;
        textEditTarget.contentEditable = 'false';
        textEditTarget.style.removeProperty('outline');
        textEditTarget.style.removeProperty('outline-offset');
        textEditTarget.style.removeProperty('min-width');
        textEditingActive = false;
        textEditTarget = null;
        originalTextContent = null;

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });

        selectionOverlay.style.display = 'block';
        updateOverlays();
      }

      // Find the best editable text target from a starting element.
      // Walks down through wrappers to find a leaf text node,
      // or returns the element itself if it has direct text content.
      // Handles: <button><svg/>Submit</button>, <a><svg/><span>text</span><svg/></a>, etc.
      function findTextTarget(el) {
        if (!el || SKIP_TEXT_EDIT_TAGS[el.tagName]) return null;
        // Leaf node with text — ideal target
        if (el.children.length === 0) {
          return (el.textContent && el.textContent.trim()) ? el : null;
        }
        // Single child — recurse into it (common: <button><span>text</span></button>)
        if (el.children.length === 1) {
          var child = el.children[0];
          if (SKIP_TEXT_EDIT_TAGS[child.tagName]) {
            return hasDirectTextNodes(el) ? el : null;
          }
          return findTextTarget(child);
        }
        // Multiple children — find the single non-skippable text-bearing child
        // (handles: <a><svg/><span>Book a Call</span><svg/></a>)
        var textChild = null;
        for (var i = 0; i < el.children.length; i++) {
          var ch = el.children[i];
          if (SKIP_TEXT_EDIT_TAGS[ch.tagName]) continue;
          if (ch.textContent && ch.textContent.trim()) {
            if (textChild) { textChild = null; break; } // ambiguous — multiple text children
            textChild = ch;
          }
        }
        if (textChild) return findTextTarget(textChild);
        // Fall back: allow editing if element has direct text nodes
        return hasDirectTextNodes(el) ? el : null;
      }

      function hasDirectTextNodes(el) {
        for (var i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) {
            return true;
          }
        }
        return false;
      }

      document.addEventListener('dblclick', function(e) {
        if (!selectionModeEnabled) return;
        e.preventDefault();
        e.stopPropagation();

        var el = document.elementFromPoint(e.clientX, e.clientY);
        // If the selection overlay is in the way, temporarily hide it
        // and re-probe to get the actual element underneath
        if (el === selectionOverlay || el === hoverOverlay) {
          var prevSel = selectionOverlay.style.display;
          var prevHov = hoverOverlay.style.display;
          selectionOverlay.style.display = 'none';
          hoverOverlay.style.display = 'none';
          el = document.elementFromPoint(e.clientX, e.clientY);
          selectionOverlay.style.display = prevSel;
          hoverOverlay.style.display = prevHov;
        }
        if (!el) return;
        if (SKIP_TEXT_EDIT_TAGS[el.tagName]) return;

        // Find the best editable text target (may walk down into children)
        el = findTextTarget(el);
        if (!el) return;

        var text = el.textContent;
        if (text === null || text === undefined) return;

        textEditingActive = true;
        textEditTarget = el;
        originalTextContent = text;

        observer.disconnect();

        selectionOverlay.style.display = 'none';

        el.contentEditable = 'true';
        el.style.setProperty('outline', '2px solid #4a9eff', 'important');
        el.style.setProperty('outline-offset', '2px', 'important');
        el.style.setProperty('min-width', '20px', 'important');
        el.focus();

        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, true);

      document.addEventListener('keydown', function(e) {
        if (textEditingActive) {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitTextEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelTextEdit();
          }
          return;
        }

        // Delete selected element (Delete or Backspace when not editing text)
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectionModeEnabled && selectedElement) {
          e.preventDefault();
          e.stopPropagation();
          var delEl = selectedElement;
          var computed = window.getComputedStyle(delEl);
          var origDisplay = computed.getPropertyValue('display');
          var delSelector = generateSelectorPath(delEl);

          var delAttrs = {};
          for (var dai = 0; dai < delEl.attributes.length; dai++) {
            var da = delEl.attributes[dai];
            delAttrs[da.name] = da.value;
          }

          // Hide the element
          delEl.style.setProperty('display', 'none', 'important');
          selectionOverlay.style.display = 'none';
          selectedElement = null;

          send({
            type: 'ELEMENT_DELETED',
            payload: {
              selectorPath: delSelector,
              originalDisplay: origDisplay,
              tagName: delEl.tagName.toLowerCase(),
              className: delEl.className && typeof delEl.className === 'string' ? delEl.className : null,
              elementId: delEl.id || null,
              innerText: (delEl.innerText || '').substring(0, 500) || null,
              attributes: delAttrs,
              computedStyles: getComputedStylesForElement(delEl)
            }
          });
        }
      }, true);

      // --- Component Detection ---
      var SEMANTIC_COMPONENTS = {
        button: 'Button', nav: 'Navigation', input: 'Input', header: 'Header',
        footer: 'Footer', dialog: 'Dialog', a: 'Link', img: 'Image',
        form: 'Form', select: 'Select', textarea: 'Textarea', table: 'Table',
        aside: 'Sidebar', main: 'Main Content', section: 'Section'
      };

      var ARIA_ROLE_MAP = {
        button: 'Button', navigation: 'Navigation', tab: 'Tab', tablist: 'Tab List',
        dialog: 'Dialog', alert: 'Alert', menu: 'Menu', menuitem: 'Menu Item',
        search: 'Search'
      };

      var CLASS_PATTERNS = [
        [/\\bbtn\\b/i, 'Button'], [/\\bcard\\b/i, 'Card'], [/\\bmodal\\b/i, 'Modal'],
        [/\\bdropdown\\b/i, 'Dropdown'], [/\\bbadge\\b/i, 'Badge'],
        [/\\bnav\\b/i, 'Navigation'], [/\\balert\\b/i, 'Alert'], [/\\btabs?\\b/i, 'Tab']
      ];

      function detectSingleComponent(el) {
        var tag = el.tagName.toLowerCase();
        // Priority 1: data-component attribute
        var dataComp = el.getAttribute('data-component');
        if (dataComp) return { name: dataComp, method: 'data-attribute' };
        // Priority 2: custom element (tag with hyphen)
        if (tag.indexOf('-') >= 0) return { name: tag, method: 'custom-element' };
        // Priority 3: semantic HTML
        if (SEMANTIC_COMPONENTS[tag]) return { name: SEMANTIC_COMPONENTS[tag], method: 'semantic-html' };
        // Priority 4: ARIA role
        var role = el.getAttribute('role');
        if (role && ARIA_ROLE_MAP[role]) return { name: ARIA_ROLE_MAP[role], method: 'aria-role' };
        // Priority 5: class pattern
        var cls = el.className;
        if (cls && typeof cls === 'string') {
          for (var pi = 0; pi < CLASS_PATTERNS.length; pi++) {
            if (CLASS_PATTERNS[pi][0].test(cls)) return { name: CLASS_PATTERNS[pi][1], method: 'class-pattern' };
          }
        }
        return null;
      }

      function titleWords(str) {
        return str.replace(/\\w\\S*/g, function(w) {
          return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase();
        });
      }

      function contextualName(el, baseName) {
        var tag = el.tagName.toLowerCase();
        // aria-label: most reliable semantic hint
        var label = (el.getAttribute('aria-label') || '').trim();
        if (label.length > 0 && label.length <= 25) return titleWords(label);
        // title attribute
        var titleAttr = (el.getAttribute('title') || '').trim();
        if (titleAttr.length > 0 && titleAttr.length <= 25) return titleWords(titleAttr);
        // Images: use alt text
        if (tag === 'img') {
          var alt = (el.getAttribute('alt') || '').trim();
          if (alt.length > 0 && alt.length <= 25) return titleWords(alt);
        }
        // Inputs: use placeholder or type
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          var ph = (el.getAttribute('placeholder') || '').trim();
          if (ph.length > 0 && ph.length <= 20) return titleWords(ph);
          var tp = el.getAttribute('type');
          if (tp && tp !== 'text' && tp !== 'hidden') return titleWords(tp) + ' ' + baseName;
        }
        // Buttons/links: use short inner text
        if (tag === 'button' || tag === 'a') {
          var txt = (el.innerText || '').trim();
          if (txt.length > 0 && txt.length <= 20 && txt.indexOf('\\n') === -1) return titleWords(txt);
        }
        // id attribute: convert to readable name
        if (el.id && el.id.length > 1 && el.id.length <= 25) {
          return titleWords(el.id.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'));
        }
        return baseName;
      }

      var SIZE_SUFFIXES = ['xs','sm','md','lg','xl','2xl'];
      var COLOR_SUFFIXES = ['primary','secondary','success','danger','warning','info','light','dark'];
      var STATE_SUFFIXES = ['active','disabled','loading','selected','checked'];

      function detectClassVariants(el) {
        var groups = [];
        var cls = el.className;
        if (!cls || typeof cls !== 'string') return groups;
        var classes = cls.trim().split(/\\s+/).filter(Boolean);
        // Extract base prefixes (e.g., "btn" from "btn-primary")
        var prefixes = {};
        for (var ci = 0; ci < classes.length; ci++) {
          var parts = classes[ci].split('-');
          if (parts.length >= 2) {
            var base = parts[0];
            var suffix = parts.slice(1).join('-');
            if (!prefixes[base]) prefixes[base] = { currentClass: classes[ci], suffix: suffix };
          }
        }
        // Scan stylesheets for matching classes
        for (var base in prefixes) {
          if (!prefixes.hasOwnProperty(base)) continue;
          var sizeOpts = [], colorOpts = [], stateOpts = [];
          var currentClass = prefixes[base].currentClass;
          // Scan all accessible stylesheets
          for (var si = 0; si < document.styleSheets.length; si++) {
            var sheet = document.styleSheets[si];
            var rules;
            try { rules = sheet.cssRules || sheet.rules; } catch(e) { continue; }
            if (!rules) continue;
            for (var ri = 0; ri < rules.length; ri++) {
              var rule = rules[ri];
              if (!rule.selectorText) continue;
              var escapedBase = base.replace(/[-\\/\\\\^*+?.()|\\[\\]]/g, '\\\\' + String.fromCharCode(36) + '&');
              var match = rule.selectorText.match(new RegExp('\\\\.' + escapedBase + '-([\\\\w-]+)'));
              if (!match) continue;
              var foundSuffix = match[1];
              var foundClass = base + '-' + foundSuffix;
              if (foundClass === currentClass) continue; // skip current
              var opt = { label: foundSuffix, className: foundClass, removeClassNames: [currentClass], pseudoState: null, pseudoStyles: null };
              if (SIZE_SUFFIXES.indexOf(foundSuffix) >= 0) { sizeOpts.push(opt); }
              else if (COLOR_SUFFIXES.indexOf(foundSuffix) >= 0) { colorOpts.push(opt); }
              else if (STATE_SUFFIXES.indexOf(foundSuffix) >= 0) { stateOpts.push(opt); }
            }
          }
          // Build groups (need 2+ options including current)
          var currentSuffix = prefixes[base].suffix;
          var currentOpt = { label: currentSuffix, className: currentClass, removeClassNames: [], pseudoState: null, pseudoStyles: null };
          if (sizeOpts.length > 0) {
            sizeOpts.unshift(currentOpt);
            // Deduplicate
            var seen = {};
            sizeOpts = sizeOpts.filter(function(o) { if (seen[o.className]) return false; seen[o.className] = true; return true; });
            if (sizeOpts.length >= 2) {
              for (var soi = 0; soi < sizeOpts.length; soi++) { sizeOpts[soi].removeClassNames = [currentClass]; }
              sizeOpts[0].removeClassNames = [];
              groups.push({ groupName: 'Size', type: 'class', options: sizeOpts, activeIndex: 0 });
            }
          }
          if (colorOpts.length > 0) {
            colorOpts.unshift(currentOpt);
            var seenC = {};
            colorOpts = colorOpts.filter(function(o) { if (seenC[o.className]) return false; seenC[o.className] = true; return true; });
            if (colorOpts.length >= 2) {
              for (var coi = 0; coi < colorOpts.length; coi++) { colorOpts[coi].removeClassNames = [currentClass]; }
              colorOpts[0].removeClassNames = [];
              groups.push({ groupName: 'Color', type: 'class', options: colorOpts, activeIndex: 0 });
            }
          }
          if (stateOpts.length > 0) {
            stateOpts.unshift(currentOpt);
            var seenS = {};
            stateOpts = stateOpts.filter(function(o) { if (seenS[o.className]) return false; seenS[o.className] = true; return true; });
            if (stateOpts.length >= 2) {
              for (var stoi = 0; stoi < stateOpts.length; stoi++) { stateOpts[stoi].removeClassNames = [currentClass]; }
              stateOpts[0].removeClassNames = [];
              groups.push({ groupName: 'State', type: 'class', options: stateOpts, activeIndex: 0 });
            }
          }
        }
        return groups;
      }

      function detectPseudoVariants(el) {
        try {
          var visualProps = ['color','backgroundColor','borderColor','opacity','transform','boxShadow','textDecoration','outline'];
          var defaultStyles = window.getComputedStyle(el);
          var pseudos = ['hover','focus','active'];
          var options = [{ label: 'default', className: null, removeClassNames: null, pseudoState: null, pseudoStyles: null }];
          for (var pi = 0; pi < pseudos.length; pi++) {
            var pseudo = pseudos[pi];
            var pseudoStyles = window.getComputedStyle(el, ':' + pseudo);
            var diffs = {};
            var hasDiff = false;
            for (var vi = 0; vi < visualProps.length; vi++) {
              var prop = visualProps[vi];
              var defaultVal = defaultStyles.getPropertyValue(prop);
              var pseudoVal = pseudoStyles.getPropertyValue(prop);
              if (defaultVal !== pseudoVal && pseudoVal) {
                diffs[prop] = pseudoVal;
                hasDiff = true;
              }
            }
            if (hasDiff) {
              options.push({ label: pseudo, className: null, removeClassNames: null, pseudoState: pseudo, pseudoStyles: diffs });
            }
          }
          if (options.length >= 2) {
            return [{ groupName: 'Pseudo States', type: 'pseudo', options: options, activeIndex: 0 }];
          }
        } catch(e) {}
        return [];
      }

      function scanForComponents(rootElement) {
        var allElements = rootElement.querySelectorAll('*');
        var results = [];
        var batchSize = 50;
        var index = 0;
        var scheduleNext = typeof requestIdleCallback === 'function'
          ? function(cb) { requestIdleCallback(cb); }
          : function(cb) { setTimeout(cb, 0); };

        function processBatch() {
          var end = Math.min(index + batchSize, allElements.length);
          for (var i = index; i < end; i++) {
            var el = allElements[i];
            var detection = detectSingleComponent(el);
            if (detection) {
              var rect = el.getBoundingClientRect();
              var text = (el.innerText || '').substring(0, 50) || null;
              // Count child components
              var childCount = 0;
              var childEls = el.querySelectorAll('*');
              for (var ci = 0; ci < childEls.length; ci++) {
                if (detectSingleComponent(childEls[ci])) childCount++;
              }
              results.push({
                selectorPath: generateSelectorPath(el),
                name: contextualName(el, detection.name),
                tagName: el.tagName.toLowerCase(),
                detectionMethod: detection.method,
                className: el.className && typeof el.className === 'string' ? el.className : null,
                elementId: el.id || null,
                innerText: text,
                boundingRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                variants: detectClassVariants(el).concat(detectPseudoVariants(el)),
                childComponentCount: childCount
              });
            }
          }
          index = end;
          if (index < allElements.length) {
            scheduleNext(processBatch);
          } else {
            send({ type: 'COMPONENTS_DETECTED', payload: { components: results } });
          }
        }
        if (allElements.length === 0) {
          send({ type: 'COMPONENTS_DETECTED', payload: { components: [] } });
        } else {
          processBatch();
        }
      }

      // MutationObserver for DOM changes — throttled to at most once per animation frame
      var mutationPending = false;
      var previousTreeJSON = '';
      var observer = new MutationObserver(function() {
        if (mutationPending) return;
        mutationPending = true;
        requestAnimationFrame(function() {
          mutationPending = false;
          var tree = serializeTree(document.body);
          if (!tree) return;
          // Skip sending if tree hasn't changed (avoids redundant postMessages)
          var treeJSON = JSON.stringify(tree);
          if (treeJSON === previousTreeJSON) return;
          previousTreeJSON = treeJSON;
          var removedSelectors = [];
          if (selectedElement && !document.body.contains(selectedElement)) {
            removedSelectors.push(generateSelectorPath(selectedElement));
            clearSelection();
          }
          send({ type: 'DOM_UPDATED', payload: { tree: tree, removedSelectors: removedSelectors } });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });

      // --- Drag-and-drop from Add Element palette ---
      var VOID_TAGS_DND = {img:1,input:1,br:1,hr:1,area:1,base:1,col:1,embed:1,link:1,meta:1,param:1,source:1,track:1,wbr:1};
      var dropIndicator = document.createElement('div');
      dropIndicator.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483645;border:2px dashed #4a9eff;background:rgba(74,158,255,0.08);display:none;transition:top 0.08s,left 0.08s,width 0.08s,height 0.08s;';
      document.body.appendChild(dropIndicator);

      document.addEventListener('dragover', function(e) {
        if (!e.dataTransfer || !e.dataTransfer.types.indexOf) return;
        if (e.dataTransfer.types.indexOf('application/x-dev-editor-element') === -1) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        var dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        if (!dropTarget || dropTarget === dropIndicator) return;
        // Skip inspector overlays
        if (dropTarget.id && dropTarget.id.indexOf('dev-editor') === 0) return;
        var rect = dropTarget.getBoundingClientRect();
        dropIndicator.style.top = rect.top + 'px';
        dropIndicator.style.left = rect.left + 'px';
        dropIndicator.style.width = rect.width + 'px';
        dropIndicator.style.height = rect.height + 'px';
        dropIndicator.style.display = 'block';
      }, true);

      document.addEventListener('dragleave', function(e) {
        if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
          dropIndicator.style.display = 'none';
        }
      }, true);

      document.addEventListener('drop', function(e) {
        dropIndicator.style.display = 'none';
        if (!e.dataTransfer) return;
        var raw = e.dataTransfer.getData('application/x-dev-editor-element');
        if (!raw) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          var data = JSON.parse(raw);
          var dropEl = document.elementFromPoint(e.clientX, e.clientY);
          if (!dropEl) return;
          // Skip inspector overlays
          if (dropEl.id && dropEl.id.indexOf('dev-editor') === 0) return;
          var targetParent = dropEl;
          var insertMode = 'child';
          if (VOID_TAGS_DND[dropEl.tagName.toLowerCase()]) {
            targetParent = dropEl.parentElement || document.body;
            insertMode = 'after';
          }
          var newEl = document.createElement(data.tag);
          newEl.setAttribute('data-dev-editor-inserted', 'true');
          if (data.placeholderText) {
            newEl.textContent = data.placeholderText;
          }
          if (data.defaultStyles) {
            var dndDS = data.defaultStyles;
            for (var dndDSKey in dndDS) {
              if (dndDS.hasOwnProperty(dndDSKey)) newEl.style.setProperty(dndDSKey, dndDS[dndDSKey]);
            }
          }
          if (insertMode === 'after' && dropEl.nextSibling) {
            targetParent.insertBefore(newEl, dropEl.nextSibling);
          } else {
            targetParent.appendChild(newEl);
          }
          var newSelector = generateSelectorPath(newEl);
          var newIndex = Array.from(targetParent.children).indexOf(newEl);
          send({
            type: 'ELEMENT_INSERTED',
            payload: {
              selectorPath: newSelector,
              parentSelectorPath: generateSelectorPath(targetParent),
              tagName: data.tag,
              insertionIndex: newIndex,
              placeholderText: data.placeholderText || '',
              defaultStyles: data.defaultStyles || undefined
            }
          });
        } catch(err) {}
      }, true);

      // Handle messages from editor
      window.addEventListener('message', function(e) {
        if (e.origin !== parentOrigin) return;
        var msg = e.data;
        if (!msg || !msg.type) return;

        switch (msg.type) {
          case 'SELECT_ELEMENT': {
            try {
              var el = document.querySelector(msg.payload.selectorPath);
              if (el) {
                selectElement(el);
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
              }
            } catch(err) {}
            break;
          }
          case 'PREVIEW_CHANGE': {
            try {
              var target = document.querySelector(msg.payload.selectorPath);
              if (target) {
                var cssProp = toKC(msg.payload.property);
                requestAnimationFrame(function() {
                  target.style.setProperty(cssProp, msg.payload.value, 'important');
                });
              }
            } catch(err) {}
            break;
          }
          case 'REVERT_CHANGE': {
            try {
              var target2 = document.querySelector(msg.payload.selectorPath);
              if (target2) target2.style.removeProperty(toKC(msg.payload.property));
            } catch(err) {}
            break;
          }
          case 'REVERT_ALL': {
            var allElements = document.querySelectorAll('[style]');
            allElements.forEach(function(el) { el.removeAttribute('style'); });
            break;
          }
          case 'SET_SELECTION_MODE': {
            selectionModeEnabled = !!msg.payload.enabled;
            if (!selectionModeEnabled) {
              selectionOverlay.style.display = 'none';
              hoverOverlay.style.display = 'none';
              hoveredElement = null;
              selectedElement = null;
            }
            break;
          }
          case 'HIDE_HOVER': {
            hoverOverlay.style.display = 'none';
            hoveredElement = null;
            break;
          }
          case 'HIDE_SELECTION_OVERLAY': {
            selectionOverlay.style.display = 'none';
            break;
          }
          case 'SHOW_SELECTION_OVERLAY': {
            if (selectionModeEnabled && selectedElement) {
              selectionOverlay.style.display = 'block';
            }
            break;
          }
          case 'SET_BREAKPOINT': {
            // Viewport controller handled externally
            break;
          }
          case 'REQUEST_DOM_TREE': {
            var tree = serializeTree(document.body);
            if (tree) send({ type: 'DOM_TREE', payload: { tree: tree } });
            break;
          }
          case 'REQUEST_PAGE_LINKS': {
            var links = [];
            var seen = {};
            var anchors = document.querySelectorAll('a[href]');
            for (var ai = 0; ai < anchors.length; ai++) {
              var rawHref = anchors[ai].getAttribute('href') || '';
              var linkText = (anchors[ai].textContent || '').trim();
              // Resolve to absolute URL
              var resolved;
              try { resolved = new URL(rawHref, window.location.origin); } catch(e) { continue; }
              // Only same-origin links
              if (resolved.origin !== window.location.origin) continue;
              var linkPath = resolved.pathname;
              // Strip /api/proxy prefix added by proxy rewriting
              if (linkPath.indexOf('/api/proxy') === 0) {
                linkPath = linkPath.substring(10) || '/';
              }
              // Skip API routes and empty paths
              if (linkPath.indexOf('/api/') === 0 || linkPath === '') continue;
              // Skip anchors, mailto, etc.
              if (!linkPath.startsWith('/')) continue;
              if (seen[linkPath]) continue;
              seen[linkPath] = true;
              links.push({ href: linkPath, text: linkText });
            }
            send({ type: 'PAGE_LINKS', payload: { links: links } });
            break;
          }
          case 'REQUEST_CSS_VARIABLES': {
            var result = scanCSSVariableDefinitions();
            initialVarCount = Object.keys(result.definitions).length;
            console.log('[pAInt] CSS variable definitions found:', initialVarCount, result.definitions);
            send({ type: 'CSS_VARIABLES', payload: { definitions: result.definitions, isExplicit: result.isExplicit, scopes: result.scopes || [] } });
            break;
          }
          case 'REQUEST_COMPONENTS': {
            try {
              var compRoot = document.body;
              if (msg.payload && msg.payload.rootSelectorPath) {
                var rootEl = document.querySelector(msg.payload.rootSelectorPath);
                if (rootEl) compRoot = rootEl;
              }
              scanForComponents(compRoot);
            } catch(err) {}
            break;
          }
          case 'APPLY_VARIANT': {
            try {
              var avEl = document.querySelector(msg.payload.selectorPath);
              if (avEl) {
                if (msg.payload.type === 'class') {
                  if (msg.payload.removeClassNames) {
                    for (var rci = 0; rci < msg.payload.removeClassNames.length; rci++) {
                      avEl.classList.remove(msg.payload.removeClassNames[rci]);
                    }
                  }
                  if (msg.payload.addClassName) {
                    avEl.classList.add(msg.payload.addClassName);
                  }
                } else if (msg.payload.type === 'pseudo') {
                  if (msg.payload.revertPseudo && msg.payload.pseudoStyles) {
                    var revertKeys = Object.keys(msg.payload.pseudoStyles);
                    for (var rki = 0; rki < revertKeys.length; rki++) {
                      avEl.style.removeProperty(revertKeys[rki]);
                    }
                  }
                  if (msg.payload.pseudoStyles && !msg.payload.revertPseudo) {
                    var psKeys = Object.keys(msg.payload.pseudoStyles);
                    for (var psi = 0; psi < psKeys.length; psi++) {
                      avEl.style.setProperty(psKeys[psi], msg.payload.pseudoStyles[psKeys[psi]], 'important');
                    }
                  }
                }
                var avStyles = getComputedStylesForElement(avEl);
                var avVarUsages = detectCSSVariablesOnElement(avEl);
                var avRect = avEl.getBoundingClientRect();
                send({ type: 'VARIANT_APPLIED', payload: {
                  selectorPath: msg.payload.selectorPath,
                  computedStyles: avStyles,
                  cssVariableUsages: avVarUsages,
                  boundingRect: { top: avRect.top, left: avRect.left, width: avRect.width, height: avRect.height }
                }});
              }
            } catch(err) {}
            break;
          }
          case 'REVERT_VARIANT': {
            try {
              var rvEl = document.querySelector(msg.payload.selectorPath);
              if (rvEl) {
                if (msg.payload.removeClassName) {
                  rvEl.classList.remove(msg.payload.removeClassName);
                }
                if (msg.payload.restoreClassName) {
                  rvEl.classList.add(msg.payload.restoreClassName);
                }
                if (msg.payload.revertPseudo && msg.payload.pseudoProperties) {
                  for (var rppi = 0; rppi < msg.payload.pseudoProperties.length; rppi++) {
                    rvEl.style.removeProperty(msg.payload.pseudoProperties[rppi]);
                  }
                }
              }
            } catch(err) {}
            break;
          }
          case 'SET_TEXT_CONTENT': {
            try {
              var stEl = document.querySelector(msg.payload.selectorPath);
              if (stEl) stEl.textContent = msg.payload.text;
            } catch(err) {}
            break;
          }
          case 'REVERT_TEXT_CONTENT': {
            try {
              var rtEl = document.querySelector(msg.payload.selectorPath);
              if (rtEl) rtEl.textContent = msg.payload.originalText;
            } catch(err) {}
            break;
          }
          case 'REVERT_DELETE': {
            try {
              var rdEl = document.querySelector(msg.payload.selectorPath);
              if (rdEl) {
                rdEl.style.removeProperty('display');
              }
            } catch(err) {}
            break;
          }
          case 'INSERT_ELEMENT': {
            try {
              var ieParent = document.querySelector(msg.payload.parentSelectorPath);
              if (ieParent) {
                var VOID_TAGS = {img:1,input:1,br:1,hr:1,area:1,base:1,col:1,embed:1,link:1,meta:1,param:1,source:1,track:1,wbr:1};
                var ieTarget = ieParent;
                var ieInsertMode = 'child';
                if (VOID_TAGS[ieParent.tagName.toLowerCase()]) {
                  ieTarget = ieParent.parentElement || document.body;
                  ieInsertMode = 'after';
                }
                var ieNew = document.createElement(msg.payload.tagName);
                ieNew.setAttribute('data-dev-editor-inserted', 'true');
                if (msg.payload.placeholderText) {
                  ieNew.textContent = msg.payload.placeholderText;
                }
                if (msg.payload.defaultStyles) {
                  var ieDS = msg.payload.defaultStyles;
                  for (var ieDSKey in ieDS) {
                    if (ieDS.hasOwnProperty(ieDSKey)) ieNew.style.setProperty(ieDSKey, ieDS[ieDSKey]);
                  }
                }
                if (ieInsertMode === 'after' && ieParent.nextSibling) {
                  ieTarget.insertBefore(ieNew, ieParent.nextSibling);
                } else {
                  ieTarget.appendChild(ieNew);
                }
                var ieSelector = generateSelectorPath(ieNew);
                var ieIndex = Array.from(ieTarget.children).indexOf(ieNew);
                send({
                  type: 'ELEMENT_INSERTED',
                  payload: {
                    selectorPath: ieSelector,
                    parentSelectorPath: generateSelectorPath(ieTarget),
                    tagName: msg.payload.tagName,
                    insertionIndex: ieIndex,
                    placeholderText: msg.payload.placeholderText || '',
                    defaultStyles: msg.payload.defaultStyles || undefined
                  }
                });
              }
            } catch(err) {}
            break;
          }
          case 'REMOVE_INSERTED_ELEMENT': {
            try {
              var rieEl = document.querySelector(msg.payload.selectorPath);
              if (rieEl && rieEl.parentElement) {
                rieEl.parentElement.removeChild(rieEl);
              }
            } catch(err) {}
            break;
          }
          case 'MOVE_ELEMENT': {
            try {
              var meEl = document.querySelector(msg.payload.selectorPath);
              var meNewParent = document.querySelector(msg.payload.newParentSelectorPath);
              if (meEl && meNewParent && meEl !== meNewParent) {
                // Prevent moving an element into its own descendant
                if (meEl.contains(meNewParent)) break;
                var meOldParent = meEl.parentElement;
                var meOldIndex = meOldParent ? Array.from(meOldParent.children).indexOf(meEl) : -1;
                var meOldParentSelector = meOldParent ? generateSelectorPath(meOldParent) : '';
                // Remove from current position
                if (meOldParent) meOldParent.removeChild(meEl);
                // Insert at new position
                var meNewIndex = msg.payload.newIndex;
                var meChildren = meNewParent.children;
                if (meNewIndex >= 0 && meNewIndex < meChildren.length) {
                  meNewParent.insertBefore(meEl, meChildren[meNewIndex]);
                } else {
                  meNewParent.appendChild(meEl);
                }
                var meNewSelector = generateSelectorPath(meEl);
                var meActualIndex = Array.from(meNewParent.children).indexOf(meEl);
                send({
                  type: 'ELEMENT_MOVED',
                  payload: {
                    selectorPath: msg.payload.selectorPath,
                    newSelectorPath: meNewSelector,
                    oldParentSelectorPath: meOldParentSelector,
                    newParentSelectorPath: msg.payload.newParentSelectorPath,
                    oldIndex: meOldIndex,
                    newIndex: meActualIndex
                  }
                });
                if (selectedElement === meEl) {
                  updateOverlays();
                }
              }
            } catch(err) {}
            break;
          }
          case 'REVERT_MOVE_ELEMENT': {
            try {
              var rmEl = document.querySelector(msg.payload.selectorPath);
              var rmOldParent = document.querySelector(msg.payload.oldParentSelectorPath);
              if (rmEl && rmOldParent) {
                var rmCurrentParent = rmEl.parentElement;
                if (rmCurrentParent) rmCurrentParent.removeChild(rmEl);
                var rmOldIndex = msg.payload.oldIndex;
                var rmChildren = rmOldParent.children;
                if (rmOldIndex >= 0 && rmOldIndex < rmChildren.length) {
                  rmOldParent.insertBefore(rmEl, rmChildren[rmOldIndex]);
                } else {
                  rmOldParent.appendChild(rmEl);
                }
                if (selectedElement === rmEl) {
                  updateOverlays();
                }
              }
            } catch(err) {}
            break;
          }
          case 'HEARTBEAT': {
            send({ type: 'HEARTBEAT_RESPONSE' });
            break;
          }
          case 'NAVIGATE_TO': {
            var navPath = msg.payload.path || '/';
            var navSep = (navPath.indexOf('?') >= 0) ? '&' : '?';
            window.location.href = '/api/proxy' + navPath + navSep + pH + '=' + eT;
            break;
          }
        }
      });

      // --- Animation reveal ---
      // Animation libraries (Framer Motion, GSAP) set elements to opacity:0 +
      // translateY via inline styles as initial state, then animate on scroll/mount.
      // In the proxy context, these animations may not fire. Detect and fix.
      function revealAnimationHidden() {
        var els = document.querySelectorAll('[style]');
        for (var ri = 0; ri < els.length; ri++) {
          var rel = els[ri];
          var rst = rel.getAttribute('style') || '';
          if (!/opacity\\s*:\\s*0\\b/.test(rst)) continue;
          var rcs = window.getComputedStyle(rel);
          if (rcs.display === 'none' || rcs.visibility === 'hidden') continue;
          rel.style.setProperty('transition', 'opacity 0.3s ease, transform 0.3s ease', 'important');
          rel.style.setProperty('opacity', '1', 'important');
          if (/translate[YX]\\s*\\(/.test(rst) || /matrix\\s*\\(/.test(rcs.transform)) {
            rel.style.setProperty('transform', 'none', 'important');
          }
        }
      }
      var revealAttempts = 0;
      var revealTimer = setInterval(function() {
        revealAnimationHidden();
        revealAttempts++;
        if (revealAttempts >= 5) clearInterval(revealTimer);
      }, 800);

      // Signal ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          send({ type: 'INSPECTOR_READY' });
        });
      } else {
        send({ type: 'INSPECTOR_READY' });
      }

      // Re-scan CSS variables after all resources (stylesheets, fonts) have loaded.
      // The initial scan on INSPECTOR_READY may miss variables from stylesheets
      // that haven't fully loaded yet (async CSS, @import chains, JS-injected styles).
      var initialVarCount = -1;
      function rescanCSSVariables() {
        var result = scanCSSVariableDefinitions();
        var count = Object.keys(result.definitions).length;
        if (count > initialVarCount) {
          initialVarCount = count;
          send({ type: 'CSS_VARIABLES', payload: { definitions: result.definitions, isExplicit: result.isExplicit, scopes: result.scopes || [] } });
        }
      }
      window.addEventListener('load', function() {
        setTimeout(rescanCSSVariables, 300);
      });
      // Also re-scan after a longer delay for JS-injected styles (React hydration, etc.)
      setTimeout(rescanCSSVariables, 3000);

      return { selectElement: selectElement, clearSelection: clearSelection };
    })();
  `
}

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

async function handleProxy(request: NextRequest, params: { path?: string[] }) {
  // Accept target URL from header, query param, or cookie (for dynamic chunk loading)
  const targetUrl =
    request.headers.get(PROXY_HEADER) ||
    request.nextUrl.searchParams.get(PROXY_HEADER) ||
    request.cookies.get(PROXY_HEADER)?.value

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing X-Dev-Editor-Target header or query parameter' },
      { status: 400 },
    )
  }

  if (!isLocalhostUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Target URL must be localhost or 127.0.0.1' },
      { status: 400 },
    )
  }

  const path = (params.path || []).join('/')

  // Short-circuit HMR requests — return empty responses so webpack's
  // hot-update polling and HMR connections stop at the proxy instead of
  // hitting the target server (which returns 404s and triggers error loops).
  if (
    path.includes('.hot-update.') ||
    path.includes('webpack-hmr') ||
    path.includes('__turbopack_hmr') ||
    path.includes('turbopack-hmr')
  ) {
    // For JSON manifests, return empty object (no updates available)
    if (path.endsWith('.json')) {
      return new NextResponse('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    // For JS hot-update chunks, return empty script
    if (path.endsWith('.js')) {
      return new NextResponse('', {
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      })
    }
    // Anything else HMR-related: empty 204
    return new NextResponse(null, { status: 204 })
  }

  const url = new URL(path || '/', targetUrl)

  // Forward query string (excluding the proxy header param)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== PROXY_HEADER) {
      url.searchParams.set(key, value)
    }
  })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const headers = new Headers()
    request.headers.forEach((value, key) => {
      if (
        key !== PROXY_HEADER &&
        key !== 'host' &&
        !key.startsWith('x-forwarded') &&
        key !== 'connection' &&
        key !== 'accept-encoding'
      ) {
        headers.set(key, value)
      }
    })
    // Request uncompressed responses from the target. The proxy streams
    // non-HTML/CSS bodies directly and strips content-encoding, so
    // receiving compressed bytes would corrupt JS chunks, fonts, etc.
    headers.set('accept-encoding', 'identity')

    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
      signal: controller.signal,
      redirect: 'manual',
    })

    clearTimeout(timeout)

    const contentType = response.headers.get('content-type') || ''
    // Headers to strip from proxied responses:
    // - content-encoding/transfer-encoding: proxy re-encodes the body
    // - COEP/COOP/CORP: block inspector script and iframe embedding
    // - CSP: may restrict inline scripts (inspector) and postMessage
    // - X-Frame-Options: prevents iframe embedding of proxied pages
    const STRIP_HEADERS = new Set([
      'content-encoding',
      'transfer-encoding',
      'cross-origin-embedder-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'content-security-policy',
      'content-security-policy-report-only',
      'x-frame-options',
    ])

    // Handle redirects from the target (e.g. auth middleware redirecting to /login).
    // Rewrite the Location header to go through the proxy so the browser stays
    // within the iframe and cookies/auth state are preserved.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        let rewrittenLocation = location
        const targetOriginForRedirect = new URL(targetUrl).origin
        try {
          const locUrl = new URL(location, targetUrl)
          // Only rewrite same-origin redirects (to the target server)
          if (locUrl.origin === targetOriginForRedirect) {
            const sep = locUrl.search ? '&' : '?'
            rewrittenLocation = `/api/proxy${locUrl.pathname}${locUrl.search}${sep}${PROXY_HEADER}=${encodeURIComponent(targetUrl)}${locUrl.hash}`
          }
        } catch {
          // If URL parsing fails, pass through as-is
        }
        const redirectHeaders = new Headers()
        response.headers.forEach((value, key) => {
          if (!STRIP_HEADERS.has(key) && key !== 'location') {
            if (key === 'set-cookie') {
              redirectHeaders.append(key, value)
            } else {
              redirectHeaders.set(key, value)
            }
          }
        })
        redirectHeaders.set('location', rewrittenLocation)
        return new NextResponse(null, {
          status: response.status,
          headers: redirectHeaders,
        })
      }
    }
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (!STRIP_HEADERS.has(key)) {
        // Use append for set-cookie to preserve multiple cookies (e.g. Supabase
        // auth sends separate access-token, refresh-token, etc. cookies).
        // Using set() would overwrite all but the last cookie.
        if (key === 'set-cookie') {
          responseHeaders.append(key, value)
        } else {
          responseHeaders.set(key, value)
        }
      }
    })

    // Inject inspector script into HTML responses
    if (contentType.includes('text/html')) {
      let html = await response.text()

      // Strip any existing pAInt inspector scripts the target app may
      // have added manually. The proxy injects its own inspector, so these
      // duplicates cause multiple overlays and conflicting message handlers.
      html = html.replace(
        /<script[^>]*src=["'][^"']*dev-editor-inspector\.js["'][^>]*><\/script>/gi,
        '',
      )

      // Rewrite asset URLs to go through proxy, preserving target param
      const encodedTarget = encodeURIComponent(targetUrl)
      const targetOrigin = new URL(targetUrl).origin
      const escapedOrigin = targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Helper to rewrite a single absolute path, preserving URL fragments
      function proxyPath(originalPath: string): string {
        let pathPart = originalPath
        let fragment = ''
        const hashIdx = originalPath.indexOf('#')
        if (hashIdx >= 0) {
          pathPart = originalPath.substring(0, hashIdx)
          fragment = originalPath.substring(hashIdx)
        }
        const separator = pathPart.includes('?') ? '&' : '?'
        return `/api/proxy${pathPart}${separator}${PROXY_HEADER}=${encodedTarget}${fragment}`
      }

      // Rewrite fully-qualified target-origin URLs in attributes FIRST
      // (e.g., http://localhost:4000/avatars/img.png → /api/proxy/avatars/img.png?...)
      html = html.replace(
        new RegExp(
          `(href|src|action|poster)=(["'])${escapedOrigin}(/[^"']*)`,
          'g',
        ),
        (_match: string, attr: string, quote: string, pathPart: string) => {
          // Tag /_next/ paths with _devproxy marker so middleware can identify
          // them as iframe-originated after history.replaceState changes the referer.
          // Do NOT add /api/proxy/ prefix — that breaks Turbopack chunk path matching.
          if (pathPart.startsWith('/_next/')) {
            const sep = pathPart.includes('?') ? '&' : '?'
            return `${attr}=${quote}${pathPart}${sep}_devproxy=1`
          }
          return `${attr}=${quote}${proxyPath(pathPart)}`
        },
      )

      // Rewrite fully-qualified target-origin URLs in srcset
      html = html.replace(
        new RegExp(`${escapedOrigin}(/[^\\s,)"']+)`, 'g'),
        (_match: string, pathPart: string) => {
          // Only rewrite inside attribute contexts (not in script text)
          return proxyPath(pathPart)
        },
      )

      // Rewrite src, href, action, poster attributes (absolute paths starting with /)
      // Tag /_next/ paths with ?_devproxy=1 so the middleware can proxy them to
      // the target server. Without this marker, after history.replaceState changes
      // the URL, the referer no longer contains /api/proxy and the middleware
      // skips the request — loading pAInt's own chunks instead of the
      // target's, which prevents React from hydrating.
      // Do NOT add /api/proxy/ prefix — that breaks Turbopack chunk path matching.
      // Turbopack's getPathFromScript() strips query strings, so the marker is safe.
      html = html.replace(
        /(href|src|action|poster)=(["'])(\/[^"']*)/g,
        (_match: string, attr: string, quote: string, originalPath: string) => {
          // Skip already-rewritten paths
          if (originalPath.startsWith('/api/proxy')) return _match
          // Tag /_next/ paths with _devproxy marker for middleware identification
          if (originalPath.startsWith('/_next/')) {
            if (originalPath.includes('_devproxy=')) return _match
            const sep = originalPath.includes('?') ? '&' : '?'
            return `${attr}=${quote}${originalPath}${sep}_devproxy=1`
          }
          return `${attr}=${quote}${proxyPath(originalPath)}`
        },
      )

      // Rewrite xlink:href for SVG <use> elements (absolute paths starting with /)
      html = html.replace(
        /xlink:href=(["'])(\/[^"']*)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match
          return `xlink:href=${quote}${proxyPath(originalPath)}`
        },
      )

      // Rewrite srcset attributes — each entry is "url descriptor, ..."
      html = html.replace(
        /srcset=(["'])([^"']+)/g,
        (_match: string, quote: string, srcsetValue: string) => {
          const rewritten = srcsetValue.replace(
            /(\/[^\s,]+)/g,
            (urlPart: string) => {
              if (urlPart.startsWith('/api/proxy')) return urlPart
              return proxyPath(urlPart)
            },
          )
          return `srcset=${quote}${rewritten}`
        },
      )

      // Rewrite data-src and data-srcset (common lazy-loading patterns)
      html = html.replace(
        /data-src=(["'])(\/[^"']*)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match
          return `data-src=${quote}${proxyPath(originalPath)}`
        },
      )
      html = html.replace(
        /data-srcset=(["'])([^"']+)/g,
        (_match: string, quote: string, srcsetValue: string) => {
          const rewritten = srcsetValue.replace(
            /(\/[^\s,]+)/g,
            (urlPart: string) => {
              if (urlPart.startsWith('/api/proxy')) return urlPart
              return proxyPath(urlPart)
            },
          )
          return `data-srcset=${quote}${rewritten}`
        },
      )

      // Rewrite CSS url() references in inline styles — both absolute paths and full URLs
      html = html.replace(
        /url\((["']?)(\/[^)"']+)\1\)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match
          return `url(${quote}${proxyPath(originalPath)}${quote})`
        },
      )
      html = html.replace(
        new RegExp(`url\\((["']?)${escapedOrigin}(/[^)"']+)\\1\\)`, 'g'),
        (_match: string, quote: string, pathPart: string) => {
          return `url(${quote}${proxyPath(pathPart)}${quote})`
        },
      )

      // Rewrite @import in <style> blocks
      html = html.replace(
        /@import\s+(["'])(\/[^"']+)\1/g,
        (_match: string, quote: string, originalPath: string) => {
          return `@import ${quote}${proxyPath(originalPath)}${quote}`
        },
      )

      // --- Strip target-page scripts to prevent hydration failures ---
      // Remove ALL <script> tags from the target HTML except:
      //   - type="application/ld+json" (structured data / JSON-LD)
      // The SSR-rendered HTML + CSS is sufficient for visual editing.
      // Allowing target scripts to execute causes Next.js hydration to
      // run, fail (missing chunks like GSAP, layout.js → 404), and wipe
      // out the pre-rendered content entirely — leaving a blank page.
      // Our own scripts (nav blocker, interceptor, inspector) are injected
      // AFTER this stripping step, so they are not affected.
      html = html.replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        (match: string) => {
          if (/type\s*=\s*["']application\/ld\+json["']/i.test(match)) {
            return match
          }
          return ''
        },
      )

      // --- Navigation blocker ---
      // Even with target scripts stripped, we inject a navigation blocker that:
      //   1. Fixes the URL via history.replaceState so the inspector reports
      //      correct paths (not /api/proxy/...)
      //   2. Rewrites dynamically-set resource URLs through the proxy
      //   3. Intercepts any remaining navigations to keep the iframe in the proxy
      //   4. Patches fetch/XHR in case the inspector or other injected scripts
      //      need to make requests through the proxy
      //   5. Suppresses HMR-related errors as a safety net
      //   6. Detects infinite reload loops as a safety net
      const targetPagePath = '/' + (path || '')
      const safePagePath = JSON.stringify(targetPagePath)
      const safeTargetUrl = JSON.stringify(targetUrl)
      const safeEncodedTarget = JSON.stringify(encodedTarget)
      const safeProxyHeader = JSON.stringify(PROXY_HEADER)

      const navigationBlockerScript = `<script data-dev-editor-nav-blocker>
(function(){
  var tP=${safePagePath},tU=${safeTargetUrl},eT=${safeEncodedTarget},pH=${safeProxyHeader};

  // Fix URL so client-side routers see the correct path
  try {
    var p = new URLSearchParams(window.location.search);
    p.delete(pH);
    var qs = p.toString();
    history.replaceState(history.state, '', tP + (qs ? '?' + qs : ''));
  } catch(e) {}

  // Block duplicate inspector scripts — the proxy injects its own inline
  // inspector, so any external dev-editor-inspector.js must be suppressed.
  // Intercept HTMLScriptElement.src setter to prevent dynamic loading.
  var scrDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (scrDesc && scrDesc.set) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: scrDesc.get,
      set: function(val) {
        if (typeof val === 'string' && val.indexOf('dev-editor-inspector') >= 0) return;
        if (typeof val === 'string') {
          var r = proxyResUrl(val);
          if (r) val = r;
        }
        scrDesc.set.call(this, val);
      },
      configurable: true, enumerable: true
    });
  }
  // Reload safety net - detect infinite reload loops
  var rk = '_der';
  var rc = parseInt(sessionStorage.getItem(rk) || '0');
  sessionStorage.setItem(rk, String(rc + 1));
  setTimeout(function(){ sessionStorage.removeItem(rk); }, 3000);
  if (rc > 4) { sessionStorage.removeItem(rk); window.stop(); return; }

  // HMR isolation: return alive-looking WebSocket/EventSource mocks for HMR
  // connections. Turbopack bootstrapping does NOT require the HMR WebSocket —
  // initial module loading happens via <script> tags. The HMR connection is
  // only for live updates. Routing it to the target server causes CORS failures.
  // IMPORTANT: Mocks must report readyState=1 (OPEN) and fire the 'open' event
  // so the HMR client believes it's connected. Previous mocks reported CLOSED
  // and fired close/error, causing the HMR client to enter a reconnection loop
  // that eventually triggered window.location.reload() every ~40 seconds.
  var OWS = window.WebSocket;
  window.WebSocket = function(u, pr) {
    var s = String(u);
    if (s.indexOf('_next') >= 0 || s.indexOf('hmr') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('hot-update') >= 0) {
      var _wl = {};
      var m = {
        readyState: 1,
        bufferedAmount: 0, extensions: '', protocol: '', url: s, binaryType: 'blob',
        close: function(){ m.readyState = 3; },
        send: function(){},
        addEventListener: function(t, fn){ if(!_wl[t]) _wl[t]=[]; _wl[t].push(fn); },
        removeEventListener: function(t, fn){ if(_wl[t]) _wl[t]=_wl[t].filter(function(f){return f!==fn;}); },
        dispatchEvent: function(){ return true; }
      };
      setTimeout(function(){
        var ev = {type:'open'};
        if (m.onopen) try { m.onopen(ev); } catch(e) {}
        if (_wl.open) for (var i=0; i<_wl.open.length; i++) try { _wl.open[i](ev); } catch(e) {}
      }, 10);
      return m;
    }
    return pr !== undefined ? new OWS(u, pr) : new OWS(u);
  };
  window.WebSocket.CONNECTING=0; window.WebSocket.OPEN=1; window.WebSocket.CLOSING=2; window.WebSocket.CLOSED=3;

  var OES = window.EventSource;
  if (OES) {
    window.EventSource = function(u, c) {
      var s = String(u);
      if (s.indexOf('hmr') >= 0 || s.indexOf('hot') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('_next') >= 0) {
        var _el = {};
        var m = {
          readyState: 1, url: s, withCredentials: false,
          close: function(){ m.readyState = 2; },
          addEventListener: function(t, fn){ if(!_el[t]) _el[t]=[]; _el[t].push(fn); },
          removeEventListener: function(t, fn){ if(_el[t]) _el[t]=_el[t].filter(function(f){return f!==fn;}); },
          dispatchEvent: function(){ return true; }
        };
        setTimeout(function(){
          var ev = {type:'open'};
          if (m.onopen) try { m.onopen(ev); } catch(e) {}
          if (_el.open) for (var i=0; i<_el.open.length; i++) try { _el.open[i](ev); } catch(e) {}
        }, 10);
        return m;
      }
      return c ? new OES(u, c) : new OES(u);
    };
    window.EventSource.CONNECTING=0; window.EventSource.OPEN=1; window.EventSource.CLOSED=2;
  }

  // Intercept navigations via Navigation API to prevent the iframe from
  // escaping the proxy. After history.replaceState changes the URL to the
  // target path (e.g. http://localhost:4000/), any unintercepted navigation
  // would load pAInt's own page instead of the target — causing
  // the "recursive embed" bug where the setup modal appears inside the iframe.
  if (window.navigation) {
    window.navigation.addEventListener('navigate', function(e) {
      if (e.hashChange) return;
      try {
        var d = new URL(e.destination.url);
        // Already going through proxy — allow
        if (d.pathname.indexOf('/api/proxy') === 0) return;
        // Cross-origin navigation — allow (external links)
        if (d.origin !== window.location.origin) return;
        // Same-origin, not through proxy — must intercept to prevent
        // loading pAInt's own page (recursive embed)
        if (e.canIntercept) {
          e.intercept({
            handler: function() {
              // User-initiated (link click, form submit) or reload:
              // redirect through the proxy so the target page loads correctly
              if (e.userInitiated || e.navigationType === 'reload') {
                if (e.userInitiated) {
                  window.parent.postMessage({type:'PAGE_NAVIGATE', payload:{path:d.pathname}}, window.location.origin);
                }
                var sep = d.search ? '&' : '?';
                window.location.replace('/api/proxy' + d.pathname + d.search + sep + pH + '=' + eT);
                return new Promise(function() {});
              }
              // Programmatic push/replace (SPA router internal navigation):
              // resolve immediately without full navigation to prevent
              // infinite reload loops while keeping the router functional
              return Promise.resolve();
            }
          });
        }
      } catch(err) {}
    });
  }

  // Patch fetch for same-origin AND target-origin API calls
  var oF = window.fetch;
  var tO = new URL(tU).origin;
  function rewriteUrl(s) {
    if (typeof s !== 'string') return s;
    // Relative paths starting with /
    if (s.charAt(0) === '/' && s.indexOf('/api/proxy') !== 0) {
      return '/api/proxy' + s + (s.indexOf('?') >= 0 ? '&' : '?') + pH + '=' + eT;
    }
    // Fully-qualified target-origin URLs (e.g. http://localhost:4000/api/data)
    if (s.indexOf(tO) === 0) {
      var path = s.substring(tO.length) || '/';
      return '/api/proxy' + path + (path.indexOf('?') >= 0 ? '&' : '?') + pH + '=' + eT;
    }
    return s;
  }
  window.fetch = function(i, n) {
    try {
      if (typeof i === 'string') {
        i = rewriteUrl(i);
      } else if (typeof Request !== 'undefined' && i instanceof Request) {
        var u = new URL(i.url);
        if ((u.origin === window.location.origin && u.pathname.indexOf('/api/proxy') !== 0) || u.origin === tO) {
          var rp = u.origin === tO ? u.pathname : u.pathname;
          i = new Request('/api/proxy' + rp + u.search + (u.search ? '&' : '?') + pH + '=' + eT, i);
        }
      }
    } catch(e) {}
    return oF.call(this, i, n);
  };

  // Patch XMLHttpRequest for same-origin AND target-origin calls
  var oX = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    try {
      if (typeof u === 'string') {
        arguments[1] = rewriteUrl(u);
      }
    } catch(e) {}
    return oX.apply(this, arguments);
  };

  // Synchronous property interceptors — rewrite URLs BEFORE the browser
  // starts fetching resources. MutationObserver is async (too late for images).
  // All interceptors use proxyResUrl() which handles fragments correctly.
  // Patch Element.prototype.setAttribute to catch attr-based URL setting.
  var oSA = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (typeof value === 'string') {
      var n = name.toLowerCase();
      // Block duplicate inspector scripts set via setAttribute
      if (n === 'src' && this.tagName === 'SCRIPT' && value.indexOf('dev-editor-inspector') >= 0) {
        return;
      }
      if (n === 'src' || n === 'poster' || n === 'data-src' || (n === 'href' && this.tagName !== 'A')) {
        var r = proxyResUrl(value);
        if (r) value = r;
      }
      if (n === 'srcset') {
        var parts = value.split(',');
        var rewritten = [];
        for (var si = 0; si < parts.length; si++) {
          var entry = parts[si].trim();
          var spIdx = entry.indexOf(' ');
          var url = spIdx >= 0 ? entry.substring(0, spIdx) : entry;
          var desc = spIdx >= 0 ? entry.substring(spIdx) : '';
          var ru = proxyResUrl(url);
          rewritten.push((ru || url) + desc);
        }
        value = rewritten.join(', ');
      }
    }
    return oSA.call(this, name, value);
  };

  // Patch .src property on HTMLImageElement — React sets img.src directly
  var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (imgDesc && imgDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get: imgDesc.get,
      set: function(val) {
        var r = proxyResUrl(val);
        imgDesc.set.call(this, r || val);
      },
      configurable: true, enumerable: true
    });
  }

  // Patch .src on HTMLSourceElement (for <source> in <picture>/<video>)
  var srcDesc = Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src');
  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HTMLSourceElement.prototype, 'src', {
      get: srcDesc.get,
      set: function(val) {
        var r = proxyResUrl(val);
        srcDesc.set.call(this, r || val);
      },
      configurable: true, enumerable: true
    });
  }

  // Intercept FontFace constructor — Expo/React Native Web and other frameworks
  // load icon fonts (Ionicons, Material Icons, etc.) via new FontFace('name', 'url(...)')
  // instead of <style> elements. Without this, the font URL bypasses the proxy.
  var OFontFace = window.FontFace;
  if (OFontFace) {
    window.FontFace = function(family, source, descriptors) {
      if (typeof source === 'string') {
        source = source.replace(/url\\(\\s*(['"]?)([^)'"\\s]+)\\1\\s*\\)/g, function(m, q, urlVal) {
          var r = proxyResUrl(urlVal);
          return r ? 'url(' + q + r + q + ')' : m;
        });
      }
      return new OFontFace(family, source, descriptors);
    };
    window.FontFace.prototype = OFontFace.prototype;
    // Preserve static methods if any
    Object.keys(OFontFace).forEach(function(k) {
      try { window.FontFace[k] = OFontFace[k]; } catch(e) {}
    });
  }

  // Rewrite url() references in dynamically-injected <style> elements
  // (e.g., icon font CSS injected by Font Awesome, Material Icons, etc.)
  var _processedStyles = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function rewriteStyleUrls(styleEl) {
    if (_processedStyles) {
      if (_processedStyles.has(styleEl)) return;
      _processedStyles.add(styleEl);
    }
    var css = styleEl.textContent;
    if (!css || css.indexOf('url(') < 0) return;
    var newCss = css.replace(/url\\(\\s*(['"]?)([^)'"\\s]+)\\1\\s*\\)/g, function(m, q, urlVal) {
      var r = proxyResUrl(urlVal);
      return r ? 'url(' + q + r + q + ')' : m;
    });
    if (newCss !== css) styleEl.textContent = newCss;
  }

  // Runtime interceptor: rewrite src/href on dynamically-created elements
  // and url() in <style> elements (icon fonts, etc.)
  var rObs = new MutationObserver(function(mutations) {
    for (var mi = 0; mi < mutations.length; mi++) {
      var added = mutations[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++) {
        var node = added[ni];
        // Text node added inside <style> (textContent change on icon font CSS)
        if (node.nodeType === 3 && node.parentElement && node.parentElement.tagName === 'STYLE') {
          rewriteStyleUrls(node.parentElement);
          continue;
        }
        if (node.nodeType !== 1) continue;
        // <style> element with @font-face or background-image url() references
        if (node.tagName === 'STYLE') {
          rewriteStyleUrls(node);
        }
        rewriteNodeUrls(node);
        if (node.querySelectorAll) {
          var children = node.querySelectorAll('[src],[href],[poster],[data-src],[srcset]');
          for (var ci = 0; ci < children.length; ci++) rewriteNodeUrls(children[ci]);
          // Also rewrite url() in <style> elements within the added subtree
          var styles = node.querySelectorAll('style');
          for (var sti = 0; sti < styles.length; sti++) rewriteStyleUrls(styles[sti]);
        }
      }
      // Handle attribute changes (e.g., lazy-load libraries setting src)
      if (mutations[mi].type === 'attributes') {
        rewriteNodeUrls(mutations[mi].target);
      }
    }
  });
  // Rewrite a resource URL to go through proxy. Returns null if no rewrite needed.
  // Handles URL fragments (#id) by placing them after the query string.
  function proxyResUrl(val) {
    if (!val || typeof val !== 'string') return null;
    if (val.indexOf('/api/proxy') === 0) return null;
    if (val.indexOf('data:') === 0 || val.indexOf('blob:') === 0 || val.charAt(0) === '#' || val.indexOf('javascript:') === 0) return null;
    // Mark /_next/ paths with ?_devproxy=1 so the middleware can identify them as
    // iframe-originated requests. We must NOT add the /api/proxy/ prefix
    // because that corrupts turbopack's getPathFromScript() chunk path matching.
    // The middleware strips the query string before proxying. Turbopack's
    // getPathFromScript also strips query strings, so path matching still works.
    // NOTE: Do NOT use "_dp" — Next.js uses ?_dp=1 internally for CSS preloading.
    if (val.indexOf('/_next/') === 0) {
      if (val.indexOf('_devproxy=') >= 0) return null; // Already marked
      return val + (val.indexOf('?') >= 0 ? '&' : '?') + '_devproxy=1';
    }
    var fragment = '';
    var hashIdx = val.indexOf('#');
    var urlPart = val;
    if (hashIdx >= 0) { urlPart = val.substring(0, hashIdx); fragment = val.substring(hashIdx); }
    var proxied = null;
    if (urlPart.indexOf(tO) === 0) {
      proxied = '/api/proxy' + (urlPart.substring(tO.length) || '/');
    } else if (urlPart.charAt(0) === '/') {
      proxied = '/api/proxy' + urlPart;
    }
    if (proxied) {
      return proxied + (proxied.indexOf('?') >= 0 ? '&' : '?') + pH + '=' + eT + fragment;
    }
    return null;
  }
  function rewriteNodeUrls(el) {
    if (!el || !el.getAttribute) return;
    var tag = el.tagName;
    // Resource attributes that need proxy rewriting
    var attrs = ['src', 'poster', 'data-src'];
    // Rewrite href for non-anchor elements (stylesheets, etc.) but NOT <a> tags
    // (anchor clicks are handled by the Navigation API intercept above)
    if (tag !== 'A') attrs.push('href');
    for (var ai = 0; ai < attrs.length; ai++) {
      var val = el.getAttribute(attrs[ai]);
      var r = proxyResUrl(val);
      if (r) el.setAttribute(attrs[ai], r);
    }
    // SVG xlink:href for <use> elements (e.g., <use xlink:href="/sprites.svg#icon">)
    if (el.getAttributeNS) {
      var xval = el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      var xr = proxyResUrl(xval);
      if (xr) el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', xr);
    }
    // Handle srcset — split on comma, rewrite each entry
    var srcset = el.getAttribute('srcset');
    if (srcset) {
      var parts = srcset.split(',');
      var changed = false;
      var rewritten = [];
      for (var si = 0; si < parts.length; si++) {
        var entry = parts[si].trim();
        var spIdx = entry.indexOf(' ');
        var url = spIdx >= 0 ? entry.substring(0, spIdx) : entry;
        var desc = spIdx >= 0 ? entry.substring(spIdx) : '';
        var ru = proxyResUrl(url);
        if (ru) { rewritten.push(ru + desc); changed = true; }
        else rewritten.push(entry);
      }
      if (changed) {
        el.setAttribute('srcset', rewritten.join(', '));
      }
    }
  }
  // Scan existing <style> elements in <head> that may have been added before
  // the observer started (e.g., server-rendered @font-face or early JS injection)
  var existingStyles = document.querySelectorAll('head style, style');
  for (var esi = 0; esi < existingStyles.length; esi++) {
    rewriteStyleUrls(existingStyles[esi]);
  }

  // Observe document.documentElement (<html>) instead of just document.body
  // so we catch <style> elements with @font-face injected into <head> by
  // frameworks like Expo/React Native Web and icon font loaders.
  var obsRoot = document.documentElement || document.body;
  if (obsRoot) {
    rObs.observe(obsRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      rObs.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
    });
  }

  // Suppress HMR and chunk-loading errors
  function isProxyNoise(s) {
    return s.indexOf('hmr') >= 0 || s.indexOf('hot') >= 0 || s.indexOf('WebSocket') >= 0 || s.indexOf('__webpack') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('ChunkLoadError') >= 0 || s.indexOf('Loading chunk') >= 0 || s.indexOf('Loading CSS chunk') >= 0;
  }
  window.addEventListener('error', function(e) {
    if (isProxyNoise(e.message || '')) {
      e.stopImmediatePropagation(); e.preventDefault(); return false;
    }
  });
  window.addEventListener('unhandledrejection', function(e) {
    if (isProxyNoise(e.reason ? String(e.reason) : '')) {
      e.stopImmediatePropagation(); e.preventDefault();
    }
  });
  // Hide Next.js dev error overlay (uses <nextjs-portal> custom element)
  var hs=document.createElement('style');
  hs.textContent='nextjs-portal{display:none!important}';
  document.documentElement.appendChild(hs);
})();
</script>`

      // Cookie setter for resource loading
      const urlInterceptorScript = `<script data-dev-editor-interceptor>
(function(){
  document.cookie='${PROXY_HEADER}='+encodeURIComponent('${targetUrl}')+';path=/;SameSite=Strict;max-age=86400';
})();
</script>`

      // Inject navigation blocker + cookie setter at the top of <head>.
      // IMPORTANT: Use function replacements to prevent $ characters in the
      // injected scripts from being interpreted as special replacement patterns
      // ($' = text after match, $& = matched text, etc.).
      const headInjection = navigationBlockerScript + urlInterceptorScript
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, (match) => match + headInjection)
      } else if (/<head\s/i.test(html)) {
        html = html.replace(/<head\s[^>]*>/i, (match) => match + headInjection)
      } else {
        html = headInjection + html
      }

      // Set cookie on the response for dynamic resource loading
      responseHeaders.append(
        'Set-Cookie',
        `${PROXY_HEADER}=${encodeURIComponent(targetUrl)}; Path=/; SameSite=Strict; Max-Age=86400`,
      )

      // Strip CSP meta tags that could block the inline inspector script
      html = html.replace(
        /<meta\s+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
        '',
      )

      // Inject inspector script before </body> (case-insensitive)
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, () => INSPECTOR_SCRIPT + '</body>')
      } else {
        html += INSPECTOR_SCRIPT
      }

      responseHeaders.set('content-type', 'text/html; charset=utf-8')
      responseHeaders.set(
        'cache-control',
        'no-cache, no-store, must-revalidate',
      )
      responseHeaders.delete('content-length')

      return new NextResponse(html, {
        status: response.status,
        headers: responseHeaders,
      })
    }

    // Rewrite url() references in CSS responses
    if (contentType.includes('text/css')) {
      let css = await response.text()
      const cssEncodedTarget = encodeURIComponent(targetUrl)
      const cssTargetOrigin = new URL(targetUrl).origin
      const cssEscapedOrigin = cssTargetOrigin.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      )
      // Rewrite absolute-path url() references
      css = css.replace(
        /url\(\s*(["']?)(\/[^)"'\s]+)\1\s*\)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match
          const separator = originalPath.includes('?') ? '&' : '?'
          return `url(${quote}/api/proxy${originalPath}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote})`
        },
      )
      // Rewrite fully-qualified target-origin url() references
      css = css.replace(
        new RegExp(
          `url\\(\\s*(["']?)${cssEscapedOrigin}(/[^)"'\\s]+)\\1\\s*\\)`,
          'g',
        ),
        (_match: string, quote: string, pathPart: string) => {
          const separator = pathPart.includes('?') ? '&' : '?'
          return `url(${quote}/api/proxy${pathPart}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote})`
        },
      )
      // Rewrite @import with absolute paths
      css = css.replace(
        /@import\s+(["'])(\/[^"']+)\1/g,
        (_match: string, quote: string, originalPath: string) => {
          const separator = originalPath.includes('?') ? '&' : '?'
          return `@import ${quote}/api/proxy${originalPath}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote}`
        },
      )
      responseHeaders.set('content-type', 'text/css; charset=utf-8')
      responseHeaders.set(
        'cache-control',
        'no-cache, no-store, must-revalidate',
      )
      responseHeaders.delete('content-length')
      return new NextResponse(css, {
        status: response.status,
        headers: responseHeaders,
      })
    }

    // Add CORS headers for fonts (often needed for cross-origin loading)
    if (
      contentType.includes('font/') ||
      contentType.includes('application/font') ||
      path.match(/\.(woff2?|ttf|eot|otf)(\?|$)/)
    ) {
      responseHeaders.set('access-control-allow-origin', '*')
      responseHeaders.set(
        'cache-control',
        'public, max-age=31536000, immutable',
      )
    }

    // Images: always revalidate so updated assets on the target are
    // reflected immediately instead of being served from browser cache.
    if (
      contentType.includes('image/') ||
      path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?|$)/)
    ) {
      responseHeaders.set(
        'cache-control',
        'no-cache, no-store, must-revalidate',
      )
    }

    // Passthrough other responses (streams body directly — no buffering)
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Target server timeout (10s)' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: 'Target server is unreachable' },
      { status: 502 },
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const params = await context.params
  return handleProxy(request, params)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const params = await context.params
  return handleProxy(request, params)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const params = await context.params
  return handleProxy(request, params)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const params = await context.params
  return handleProxy(request, params)
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'access-control-allow-headers':
        request.headers.get('access-control-request-headers') || '*',
      'access-control-max-age': '86400',
    },
  })
}
