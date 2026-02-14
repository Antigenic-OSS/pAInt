/**
 * Dev Editor Inspector — Standalone Script
 *
 * Add this script to your project to enable Dev Editor inspection:
 *   <script src="http://localhost:4000/dev-editor-inspector.js"></script>
 *
 * The script auto-detects the editor origin from its own src attribute.
 * It does nothing when the page is not loaded inside an iframe.
 */
(function() {
  // Iframe guard — script does nothing if not loaded inside an iframe
  if (window.parent === window) return;

  // Auto-detect editor origin from this script's src attribute.
  // document.currentScript is null when the script is inserted dynamically
  // (e.g., by React/Next.js hydration), so we fall back to querying the DOM.
  var scriptSrc = document.currentScript && document.currentScript.src;
  if (!scriptSrc) {
    var scripts = document.querySelectorAll('script[src*="dev-editor-inspector"]');
    if (scripts.length > 0) scriptSrc = scripts[scripts.length - 1].src;
  }
  var parentOrigin;
  try {
    parentOrigin = new URL(scriptSrc).origin;
  } catch(e) {
    // Fallback: cannot determine editor origin, abort
    return;
  }

  var DEV_EDITOR_INSPECTOR = (function() {

    function send(message) {
      window.parent.postMessage(message, parentOrigin);
    }

    // Convert kebab-case to camelCase: 'padding-top' → 'paddingTop'
    function kebabToCamel(str) {
      return str.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
    }

    // Convert camelCase to kebab-case: 'paddingTop' → 'padding-top'
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
        'flex-wrap','gap','grid-template-columns','grid-template-rows',
        'position','top','right','bottom','left','z-index'
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
      for (var si = 0; si < document.styleSheets.length; si++) {
        var sheet = document.styleSheets[si];
        var rules;
        try { rules = sheet.cssRules || sheet.rules; } catch(e) { continue; }
        if (!rules) continue;
        for (var ri = 0; ri < rules.length; ri++) {
          var rule = rules[ri];
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
      return definitions;
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
    selectionOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999997;border:2px solid #4a9eff;background:rgba(74,158,255,0.15);display:none;';
    document.body.appendChild(selectionOverlay);

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
      if (!el || el === selectionOverlay) return;
      selectElement(el);
    }, true);

    function selectElement(el) {
      selectedElement = el;
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

    // Update selection overlay on scroll so it follows the selected element
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
    var SKIP_TEXT_EDIT_TAGS = { INPUT: 1, TEXTAREA: 1, SELECT: 1, IMG: 1, VIDEO: 1, IFRAME: 1, SVG: 1, CANVAS: 1 };

    function commitTextEdit() {
      if (!textEditingActive || !textEditTarget) return;
      var newText = textEditTarget.textContent || '';
      var el = textEditTarget;
      var selectorPath = generateSelectorPath(el);

      // Clean up editing state
      el.contentEditable = 'false';
      el.style.removeProperty('outline');
      el.style.removeProperty('outline-offset');
      el.style.removeProperty('min-width');
      textEditingActive = false;
      textEditTarget = null;

      // Reconnect observer
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });

      // Re-show selection overlay
      selectionOverlay.style.display = 'block';
      updateSelectionOverlay();

      // Send change if text actually changed
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
      // Restore original text
      textEditTarget.textContent = originalTextContent;
      textEditTarget.contentEditable = 'false';
      textEditTarget.style.removeProperty('outline');
      textEditTarget.style.removeProperty('outline-offset');
      textEditTarget.style.removeProperty('min-width');
      textEditingActive = false;
      textEditTarget = null;
      originalTextContent = null;

      // Reconnect observer
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });

      // Re-show selection overlay
      selectionOverlay.style.display = 'block';
      updateSelectionOverlay();
    }

    document.addEventListener('dblclick', function(e) {
      if (!selectionModeEnabled) return;
      e.preventDefault();
      e.stopPropagation();

      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === selectionOverlay) return;

      // Only leaf elements (no child elements)
      if (el.children.length > 0) return;
      // Skip form elements and media
      if (SKIP_TEXT_EDIT_TAGS[el.tagName]) return;
      // Must have some text content
      var text = el.textContent;
      if (text === null || text === undefined) return;

      // Enter text editing mode
      textEditingActive = true;
      textEditTarget = el;
      originalTextContent = text;

      // Disconnect MutationObserver to prevent DOM_UPDATED during typing
      observer.disconnect();

      // Hide selection overlay during editing
      selectionOverlay.style.display = 'none';

      // Make element editable
      el.contentEditable = 'true';
      el.style.setProperty('outline', '2px solid #4a9eff', 'important');
      el.style.setProperty('outline-offset', '2px', 'important');
      el.style.setProperty('min-width', '20px', 'important');
      el.focus();

      // Select all text
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, true);

    // Keydown handler for text editing
    document.addEventListener('keydown', function(e) {
      if (!textEditingActive) return;
      e.stopPropagation();

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitTextEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelTextEdit();
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

    var SIZE_SUFFIXES = ['xs','sm','md','lg','xl','2xl'];
    var COLOR_SUFFIXES = ['primary','secondary','success','danger','warning','info','light','dark'];
    var STATE_SUFFIXES = ['active','disabled','loading','selected','checked'];

    function detectClassVariants(el) {
      var groups = [];
      var cls = el.className;
      if (!cls || typeof cls !== 'string') return groups;
      var classes = cls.trim().split(/\s+/).filter(Boolean);
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
            var escapedBase = base.replace(/[-\/\\^*+?.()|[\]]/g, '\\$&');
            var match = rule.selectorText.match(new RegExp('\\.' + escapedBase + '-([\\w-]+)'));
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
          var defs = scanCSSVariableDefinitions();
          send({ type: 'CSS_VARIABLES', payload: { definitions: defs } });
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
        case 'HEARTBEAT': {
          send({ type: 'HEARTBEAT_RESPONSE' });
          break;
        }
      }
    });

    // --- SPA Navigation Detection ---
    // Detect client-side navigation and notify the editor
    var lastPathname = window.location.pathname;

    function notifyNavigationIfChanged() {
      var currentPath = window.location.pathname;
      if (currentPath !== lastPathname) {
        lastPathname = currentPath;
        send({ type: 'PAGE_NAVIGATE', payload: { path: currentPath } });
      }
    }

    // popstate fires on back/forward navigation
    window.addEventListener('popstate', notifyNavigationIfChanged);

    // Navigation API (Chrome 102+) — fires on all navigation types
    if (window.navigation) {
      window.navigation.addEventListener('navigatesuccess', notifyNavigationIfChanged);
    }

    // Signal ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        send({ type: 'INSPECTOR_READY' });
      });
    } else {
      send({ type: 'INSPECTOR_READY' });
    }

    return { selectElement: selectElement, clearSelection: clearSelection };
  })();
})();
