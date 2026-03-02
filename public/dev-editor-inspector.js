/**
 * Dev Editor Inspector — Standalone Script
 *
 * Add this script to your project to enable Dev Editor inspection.
 * Works with both local and Vercel-hosted editors automatically.
 *
 * Next.js App Router:
 *   <script src="http://localhost:4000/dev-editor-inspector.js" />
 *   (place inside <body> in layout.tsx, after all other content)
 *
 * Plain HTML:
 *   <script src="http://localhost:4000/dev-editor-inspector.js"></script>
 *   (place before </body>)
 *
 * The script auto-detects the editor origin from its src attribute.
 * If detection fails, it discovers the editor via handshake.
 * It does nothing when the page is not loaded inside an iframe.
 */
(function() {
  // Iframe guard — script does nothing if not loaded inside an iframe
  if (window.parent === window) return;

  // --- Origin Detection ---
  // Determine the editor (parent) window's origin for postMessage.
  // Strategy: try same-origin access first (works when loaded via proxy),
  // then fall back to '*' (works for cross-origin / direct URL loading).
  // Note: postMessage does NOT throw on origin mismatch — it silently
  // drops the message. So we must detect the correct origin upfront.
  var parentOrigin = '*';
  try {
    // Same-origin: can access parent's location directly
    parentOrigin = window.parent.location.origin;
  } catch(e) {
    // Cross-origin: can't access parent's origin.
    // Use '*' — safe for localhost dev tool use case.
    parentOrigin = '*';
  }

  // Track whether the editor has acknowledged our connection
  var connected = false;

  function send(message) {
    try {
      window.parent.postMessage(message, parentOrigin);
    } catch(e) {}
  }

  // --- Console Interception (no DOM dependency, runs immediately) ---
  var originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };

  function serializeArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) return arg.stack || arg.message || String(arg);
    try { return JSON.stringify(arg); } catch(e) { return String(arg); }
  }

  function interceptConsole(level) {
    console[level] = function() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(serializeArg(arguments[i]));
      }
      originalConsole[level].apply(console, arguments);
      send({
        type: 'CONSOLE_MESSAGE',
        payload: { level: level, args: args, timestamp: Date.now() }
      });
    };
  }

  interceptConsole('log');
  interceptConsole('info');
  interceptConsole('warn');
  interceptConsole('error');

  window.onerror = function(message, source, line, column) {
    send({
      type: 'CONSOLE_MESSAGE',
      payload: {
        level: 'error',
        args: [String(message)],
        timestamp: Date.now(),
        source: source || undefined,
        line: line || undefined,
        column: column || undefined
      }
    });
  };

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    var msg = reason instanceof Error
      ? (reason.stack || reason.message || String(reason))
      : String(reason);
    send({
      type: 'CONSOLE_MESSAGE',
      payload: {
        level: 'error',
        args: ['Unhandled Promise Rejection: ' + msg],
        timestamp: Date.now()
      }
    });
  });

  // --- Inspector initialization (requires document.body) ---
  function initInspector() {

    function kebabToCamel(str) {
      return str.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
    }

    function camelToKebab(str) {
      return str.replace(/[A-Z]/g, function(c) { return '-' + c.toLowerCase(); });
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
          var classes = current.className.trim().split(/\s+/).filter(Boolean);
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

    function getComputedStylesForElement(el) {
      var computed = window.getComputedStyle(el);
      var props = [
        'width','height','min-width','min-height','max-width','max-height','overflow',
        'margin-top','margin-right','margin-bottom','margin-left',
        'padding-top','padding-right','padding-bottom','padding-left',
        'font-family','font-size','font-weight','line-height','letter-spacing',
        'text-align','text-decoration','text-transform','color',
        'border-width','border-style','border-color','border-radius',
        'border-top-left-radius','border-top-right-radius',
        'border-bottom-right-radius','border-bottom-left-radius',
        'background-color','background-image','opacity',
        'display','flex-direction','justify-content','align-items',
        'flex-wrap','gap','column-gap','row-gap',
        'grid-template-columns','grid-template-rows','grid-auto-flow',
        'justify-items','vertical-align',
        'position','top','right','bottom','left','z-index','box-sizing',
        'fill','stroke'
      ];
      var styles = {};
      for (var i = 0; i < props.length; i++) {
        styles[kebabToCamel(props[i])] = computed.getPropertyValue(props[i]);
      }
      return styles;
    }

    function scanCSSVariableDefinitions() {
      var definitions = {};
      var rootStyles = window.getComputedStyle(document.documentElement);
      var FRAMEWORK_PREFIXES = ['--tw-', '--next-', '--radix-', '--chakra-', '--mantine-', '--mui-', '--framer-', '--sb-'];

      function extractFromRules(rules) {
        for (var ri = 0; ri < rules.length; ri++) {
          var rule = rules[ri];
          // Recurse into @media and other grouping rules
          if (rule.cssRules) {
            extractFromRules(rule.cssRules);
            continue;
          }
          if (!rule.style) continue;
          for (var pi = 0; pi < rule.style.length; pi++) {
            var prop = rule.style[pi];
            if (prop.indexOf('--') === 0) {
              var rawVal = rule.style.getPropertyValue(prop).trim();
              var resolved = rootStyles.getPropertyValue(prop).trim();
              definitions[prop] = {
                value: rawVal,
                resolvedValue: resolved || rawVal,
                selector: rule.selectorText || ''
              };
            }
          }
        }
      }

      // Primary: check for <style data-design-tokens> or <link data-design-tokens>
      var taggedSheets = [];
      for (var si = 0; si < document.styleSheets.length; si++) {
        var sheet = document.styleSheets[si];
        if (sheet.ownerNode && sheet.ownerNode.hasAttribute && sheet.ownerNode.hasAttribute('data-design-tokens')) {
          taggedSheets.push(sheet);
        }
      }

      if (taggedSheets.length > 0) {
        // Explicit mode: scan only tagged sheets
        for (var ti = 0; ti < taggedSheets.length; ti++) {
          var taggedRules;
          try { taggedRules = taggedSheets[ti].cssRules || taggedSheets[ti].rules; } catch(e) { continue; }
          if (taggedRules) extractFromRules(taggedRules);
        }
        return { definitions: definitions, isExplicit: true };
      }

      // Fallback: scan all sheets
      for (var fi = 0; fi < document.styleSheets.length; fi++) {
        var fallbackSheet = document.styleSheets[fi];
        var fallbackRules;
        try { fallbackRules = fallbackSheet.cssRules || fallbackSheet.rules; } catch(e) { continue; }
        if (fallbackRules) extractFromRules(fallbackRules);
      }

      // Check for <meta name="design-tokens-prefix"> allowlist
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

      // Filter definitions
      var filtered = {};
      var keys = Object.keys(definitions);
      for (var ki = 0; ki < keys.length; ki++) {
        var key = keys[ki];
        if (metaPrefixes) {
          // Meta allowlist mode: only keep variables matching specified prefixes
          var allowed = false;
          for (var api = 0; api < metaPrefixes.length; api++) {
            if (key.indexOf(metaPrefixes[api]) === 0) { allowed = true; break; }
          }
          if (allowed) filtered[key] = definitions[key];
        } else {
          // Default fallback: filter out known framework prefixes
          var isFramework = false;
          for (var fpi = 0; fpi < FRAMEWORK_PREFIXES.length; fpi++) {
            if (key.indexOf(FRAMEWORK_PREFIXES[fpi]) === 0) { isFramework = true; break; }
          }
          if (!isFramework) filtered[key] = definitions[key];
        }
      }

      return { definitions: filtered, isExplicit: false };
    }

    function detectCSSVariablesOnElement(el) {
      var usages = {};
      if (el.style) {
        for (var si = 0; si < el.style.length; si++) {
          var inlineProp = el.style[si];
          var inlineVal = el.style.getPropertyValue(inlineProp);
          if (inlineVal && inlineVal.indexOf('var(') >= 0) {
            usages[inlineProp] = inlineVal.trim();
          }
        }
      }
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

    // Hover highlight — dashed green border + element name label
    var hoverOverlay = document.createElement('div');
    hoverOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999996;border:1px dashed #4ade80;display:none;transition:top 0.04s,left 0.04s,width 0.04s,height 0.04s;';
    document.body.appendChild(hoverOverlay);

    var hoverLabel = document.createElement('div');
    hoverLabel.style.cssText = 'position:absolute;top:-18px;left:-1px;padding:1px 6px;font-size:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:14px;color:#fff;background:#1D3F23;border-radius:3px 3px 0 0;white-space:nowrap;pointer-events:none;';
    hoverOverlay.appendChild(hoverLabel);

    var hoveredElement = null;

    function getElementLabel(el) {
      var tag = el.tagName.toLowerCase();
      if (el.id) return tag + '#' + el.id;
      var cls = el.className;
      if (cls && typeof cls === 'string') {
        var classes = cls.trim().split(/\s+/);
        // Prefer c- prefixed class for the label
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('c-') === 0) return tag + '.' + classes[i];
        }
        if (classes[0]) return tag + '.' + classes[0];
      }
      return tag;
    }

    document.addEventListener('mousemove', function(e) {
      if (!selectionModeEnabled) { hoverOverlay.style.display = 'none'; return; }
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === hoverOverlay || el === selectionOverlay || el === hoverLabel) return;
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
      if (rect.top < 20) {
        hoverLabel.style.top = 'auto';
        hoverLabel.style.bottom = '-18px';
        hoverLabel.style.borderRadius = '0 0 3px 3px';
      } else {
        hoverLabel.style.top = '-18px';
        hoverLabel.style.bottom = 'auto';
        hoverLabel.style.borderRadius = '3px 3px 0 0';
      }
    });

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
      var rect = el.getBoundingClientRect();
      selectionOverlay.style.display = 'block';
      selectionOverlay.style.top = rect.top + 'px';
      selectionOverlay.style.left = rect.left + 'px';
      selectionOverlay.style.width = rect.width + 'px';
      selectionOverlay.style.height = rect.height + 'px';

      var attrs = {};
      for (var ai = 0; ai < el.attributes.length; ai++) {
        var attr = el.attributes[ai];
        attrs[attr.name] = attr.value;
      }

      var text = (el.innerText || '').substring(0, 500) || null;
      var varUsages = detectCSSVariablesOnElement(el);

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

    function updateSelectionOverlay() {
      if (!selectedElement || selectionOverlay.style.display === 'none') return;
      var rect = selectedElement.getBoundingClientRect();
      selectionOverlay.style.top = rect.top + 'px';
      selectionOverlay.style.left = rect.left + 'px';
      selectionOverlay.style.width = rect.width + 'px';
      selectionOverlay.style.height = rect.height + 'px';
    }
    window.addEventListener('scroll', updateSelectionOverlay, true);
    window.addEventListener('resize', updateSelectionOverlay, true);

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
      updateSelectionOverlay();

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
      updateSelectionOverlay();
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
      [/\bbtn\b/i, 'Button'], [/\bcard\b/i, 'Card'], [/\bmodal\b/i, 'Modal'],
      [/\bdropdown\b/i, 'Dropdown'], [/\bbadge\b/i, 'Badge'],
      [/\bnav\b/i, 'Navigation'], [/\balert\b/i, 'Alert'], [/\btabs?\b/i, 'Tab']
    ];

    function detectCPrefixComponent(el) {
      var cls = el.className;
      if (!cls || typeof cls !== 'string') return null;
      var classes = cls.trim().split(/\s+/);
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf('c-') === 0 && classes[i].length > 2) {
          var raw = classes[i].substring(2);
          // Convert kebab-case to Title Case (e.g. "nav-bar" → "Nav Bar")
          var name = raw.split('-').map(function(part) {
            return part.charAt(0).toUpperCase() + part.slice(1);
          }).join(' ');
          return { name: name, method: 'c-prefix' };
        }
      }
      return null;
    }

    function detectSingleComponent(el) {
      var tag = el.tagName.toLowerCase();
      var dataComp = el.getAttribute('data-component');
      if (dataComp) return { name: dataComp, method: 'data-attribute' };
      // Detect c- prefixed class identifiers (e.g. "c-header" → "Header")
      var cPrefix = detectCPrefixComponent(el);
      if (cPrefix) return cPrefix;
      if (tag.indexOf('-') >= 0) return { name: tag, method: 'custom-element' };
      if (SEMANTIC_COMPONENTS[tag]) return { name: SEMANTIC_COMPONENTS[tag], method: 'semantic-html' };
      var role = el.getAttribute('role');
      if (role && ARIA_ROLE_MAP[role]) return { name: ARIA_ROLE_MAP[role], method: 'aria-role' };
      var cls = el.className;
      if (cls && typeof cls === 'string') {
        for (var pi = 0; pi < CLASS_PATTERNS.length; pi++) {
          if (CLASS_PATTERNS[pi][0].test(cls)) return { name: CLASS_PATTERNS[pi][1], method: 'class-pattern' };
        }
      }
      return null;
    }

    var SIZE_SUFFIXES = ['xs','sm','md','lg','xl','2xl'];
    var COLOR_SUFFIXES = ['primary','secondary','success','danger','warning','info','light','dark'];
    var STATE_SUFFIXES = ['active','disabled','loading','selected','checked'];

    function detectClassVariants(el) {
      var groups = [];
      var cls = el.className;
      if (!cls || typeof cls !== 'string') return groups;
      var classes = cls.trim().split(/\s+/).filter(Boolean);
      var prefixes = {};
      for (var ci = 0; ci < classes.length; ci++) {
        var parts = classes[ci].split('-');
        if (parts.length >= 2) {
          var base = parts[0];
          var suffix = parts.slice(1).join('-');
          if (!prefixes[base]) prefixes[base] = { currentClass: classes[ci], suffix: suffix };
        }
      }
      for (var base in prefixes) {
        if (!prefixes.hasOwnProperty(base)) continue;
        var sizeOpts = [], colorOpts = [], stateOpts = [];
        var currentClass = prefixes[base].currentClass;
        for (var si = 0; si < document.styleSheets.length; si++) {
          var sheet = document.styleSheets[si];
          var rules;
          try { rules = sheet.cssRules || sheet.rules; } catch(e) { continue; }
          if (!rules) continue;
          for (var ri = 0; ri < rules.length; ri++) {
            var rule = rules[ri];
            if (!rule.selectorText) continue;
            var escapedBase = base.replace(/[-\/\\^*+?.()|[\]]/g, '\\$&');
            var match = rule.selectorText.match(new RegExp('\\.' + escapedBase + '-([\\w-]+)'));
            if (!match) continue;
            var foundSuffix = match[1];
            var foundClass = base + '-' + foundSuffix;
            if (foundClass === currentClass) continue;
            var opt = { label: foundSuffix, className: foundClass, removeClassNames: [currentClass], pseudoState: null, pseudoStyles: null };
            if (SIZE_SUFFIXES.indexOf(foundSuffix) >= 0) { sizeOpts.push(opt); }
            else if (COLOR_SUFFIXES.indexOf(foundSuffix) >= 0) { colorOpts.push(opt); }
            else if (STATE_SUFFIXES.indexOf(foundSuffix) >= 0) { stateOpts.push(opt); }
          }
        }
        var currentSuffix = prefixes[base].suffix;
        var currentOpt = { label: currentSuffix, className: currentClass, removeClassNames: [], pseudoState: null, pseudoStyles: null };
        if (sizeOpts.length > 0) {
          sizeOpts.unshift(currentOpt);
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
            var childCount = 0;
            var childEls = el.querySelectorAll('*');
            for (var ci = 0; ci < childEls.length; ci++) {
              if (detectSingleComponent(childEls[ci])) childCount++;
            }
            results.push({
              selectorPath: generateSelectorPath(el),
              name: detection.name,
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

    // MutationObserver for DOM changes
    var mutationPending = false;
    var previousTreeJSON = '';
    var observer = new MutationObserver(function() {
      if (mutationPending) return;
      mutationPending = true;
      requestAnimationFrame(function() {
        mutationPending = false;
        var tree = serializeTree(document.body);
        if (!tree) return;
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
        if (dropEl.id && dropEl.id.indexOf('dev-editor') === 0) return;
        var targetParent = dropEl;
        var insertMode = 'child';
        if (VOID_TAGS_DND[dropEl.tagName.toLowerCase()]) {
          targetParent = dropEl.parentElement || document.body;
          insertMode = 'after';
        }
        var newEl = document.createElement(data.tag);
        newEl.setAttribute('data-dev-editor-inserted', 'true');
        if (data.placeholderText) newEl.textContent = data.placeholderText;
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

    // --- Handle messages from editor ---
    window.addEventListener('message', function(e) {
      // Accept messages from detected parentOrigin, or any origin if using wildcard
      if (parentOrigin !== '*' && e.origin !== parentOrigin) return;

      var msg = e.data;
      if (!msg || !msg.type) return;

      // Lock in the parent origin from first valid editor message
      if (parentOrigin === '*' && msg.type) {
        parentOrigin = e.origin;
      }

      // Mark as connected (stops INSPECTOR_READY retries)
      if (!connected) {
        connected = true;
      }

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
              var cssProp = camelToKebab(msg.payload.property);
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
            if (target2) target2.style.removeProperty(camelToKebab(msg.payload.property));
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
            var sr = selectedElement.getBoundingClientRect();
            selectionOverlay.style.top = sr.top + 'px';
            selectionOverlay.style.left = sr.left + 'px';
            selectionOverlay.style.width = sr.width + 'px';
            selectionOverlay.style.height = sr.height + 'px';
            selectionOverlay.style.display = 'block';
          }
          break;
        }
        case 'SET_BREAKPOINT': {
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
            var resolved;
            try { resolved = new URL(rawHref, window.location.origin); } catch(e) { continue; }
            if (resolved.origin !== window.location.origin) continue;
            var linkPath = resolved.pathname;
            if (linkPath.indexOf('/api/') === 0 || linkPath === '') continue;
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
          send({ type: 'CSS_VARIABLES', payload: { definitions: result.definitions, isExplicit: result.isExplicit } });
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
        case 'DELETE_ELEMENT': {
          try {
            var deEl = document.querySelector(msg.payload.selectorPath);
            if (deEl) {
              var deComputed = window.getComputedStyle(deEl);
              var deOrigDisplay = deComputed.getPropertyValue('display');
              var deSelector = msg.payload.selectorPath;
              var deAttrs = {};
              for (var deai = 0; deai < deEl.attributes.length; deai++) {
                var dea = deEl.attributes[deai];
                deAttrs[dea.name] = dea.value;
              }
              deEl.style.setProperty('display', 'none', 'important');
              if (selectedElement === deEl) {
                selectionOverlay.style.display = 'none';
                selectedElement = null;
              }
              send({
                type: 'ELEMENT_DELETED',
                payload: {
                  selectorPath: deSelector,
                  originalDisplay: deOrigDisplay,
                  tagName: deEl.tagName.toLowerCase(),
                  className: deEl.className && typeof deEl.className === 'string' ? deEl.className : null,
                  elementId: deEl.id || null,
                  innerText: (deEl.innerText || '').substring(0, 500) || null,
                  attributes: deAttrs,
                  computedStyles: getComputedStylesForElement(deEl)
                }
              });
            }
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
              var IE_VOID = {img:1,input:1,br:1,hr:1,area:1,base:1,col:1,embed:1,link:1,meta:1,param:1,source:1,track:1,wbr:1};
              var ieTarget = ieParent;
              var ieMode = 'child';
              if (IE_VOID[ieParent.tagName.toLowerCase()]) {
                ieTarget = ieParent.parentElement || document.body;
                ieMode = 'after';
              }
              var ieNew = document.createElement(msg.payload.tagName);
              ieNew.setAttribute('data-dev-editor-inserted', 'true');
              if (msg.payload.placeholderText) ieNew.textContent = msg.payload.placeholderText;
              if (msg.payload.defaultStyles) {
                var ieDS = msg.payload.defaultStyles;
                for (var ieDSKey in ieDS) {
                  if (ieDS.hasOwnProperty(ieDSKey)) ieNew.style.setProperty(ieDSKey, ieDS[ieDSKey]);
                }
              }
              if (ieMode === 'after' && ieParent.nextSibling) {
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
            if (meEl && meNewParent && meEl !== meNewParent && !meNewParent.contains(meEl) === false) {
              // Allow move even if newParent is a descendant check
            }
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
              // Update selection overlay if selected element moved
              if (selectedElement === meEl) {
                updateSelectionOverlay();
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
                updateSelectionOverlay();
              }
            }
          } catch(err) {}
          break;
        }
        case 'HEARTBEAT': {
          send({ type: 'HEARTBEAT_RESPONSE' });
          break;
        }
      }
    });

    // --- SPA Navigation Detection ---
    var lastPathname = window.location.pathname;

    function notifyNavigationIfChanged() {
      var currentPath = window.location.pathname;
      if (currentPath !== lastPathname) {
        lastPathname = currentPath;
        send({ type: 'PAGE_NAVIGATE', payload: { path: currentPath } });
      }
    }

    window.addEventListener('popstate', notifyNavigationIfChanged);

    if (window.navigation) {
      window.navigation.addEventListener('navigatesuccess', notifyNavigationIfChanged);
    }

    // --- Animation reveal ---
    // Many pages use animation libraries (Framer Motion, GSAP, etc.) that set
    // elements to opacity:0 + translateY via inline styles as an initial state,
    // then animate them on scroll or mount. When loaded through the proxy,
    // these animations may not fire (hydration issues, missing scroll context).
    // This function detects such hidden elements and forces them visible so the
    // editor can inspect and edit all content.
    function revealAnimationHidden() {
      var revealed = 0;
      var els = document.querySelectorAll('[style]');
      for (var ri = 0; ri < els.length; ri++) {
        var rel = els[ri];
        var rstyle = rel.getAttribute('style') || '';
        // Only target elements where opacity is explicitly set to 0 via inline style
        // and optionally have a translateY transform (animation initial state pattern)
        if (!/opacity\s*:\s*0\b/.test(rstyle)) continue;
        // Skip elements intentionally hidden (display:none, visibility:hidden)
        var rcs = window.getComputedStyle(rel);
        if (rcs.display === 'none' || rcs.visibility === 'hidden') continue;
        // Force visible with a smooth transition
        rel.style.setProperty('transition', 'opacity 0.3s ease, transform 0.3s ease', 'important');
        rel.style.setProperty('opacity', '1', 'important');
        // Also clear translateY transforms that are part of the animation initial state
        if (/translate[YX]\s*\(/.test(rstyle) || /matrix\s*\(/.test(rcs.transform)) {
          rel.style.setProperty('transform', 'none', 'important');
        }
        revealed++;
      }
      return revealed;
    }

    // Run reveal after a delay to give animations a chance to fire naturally.
    // If they don't fire (proxy context), this catches the stuck elements.
    // Re-run a few times to catch dynamically rendered content.
    var revealAttempts = 0;
    var revealTimer = setInterval(function() {
      revealAnimationHidden();
      revealAttempts++;
      if (revealAttempts >= 5) clearInterval(revealTimer);
    }, 800);

    // --- Signal ready with retry ---
    // Send INSPECTOR_READY immediately, then retry every second until editor responds.
    // This handles race conditions where the editor isn't listening yet.
    send({ type: 'INSPECTOR_READY' });
    var readyRetryCount = 0;
    var readyInterval = setInterval(function() {
      if (connected) {
        clearInterval(readyInterval);
        return;
      }
      readyRetryCount++;
      if (readyRetryCount >= 30) {
        clearInterval(readyInterval);
        return;
      }
      send({ type: 'INSPECTOR_READY' });
    }, 1000);
  }

  // --- Bootstrap: wait for document.body before initializing ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInspector);
  } else {
    initInspector();
  }
})();
