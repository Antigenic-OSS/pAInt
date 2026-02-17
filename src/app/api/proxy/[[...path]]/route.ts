import { NextRequest, NextResponse } from 'next/server';
import { PROXY_HEADER } from '@/lib/constants';

const INSPECTOR_SCRIPT = `
<script>
(function() {
  ${getInspectorCode()}
})();
</script>
`;

function getInspectorCode(): string {
  // The inspector code will be inlined here during build.
  // For now, load it dynamically via a separate endpoint.
  return `
    // Inspector bootstrap - sends INSPECTOR_READY and sets up message handling
    var DEV_EDITOR_INSPECTOR = (function() {
      var parentOrigin = window.location.origin;

      function send(message) {
        window.parent.postMessage(message, parentOrigin);
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
      selectionOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999997;border:2px solid #4a9eff;display:none;';
      document.body.appendChild(selectionOverlay);

      // Hover highlight — dotted green border + element name label (Webflow-style)
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
        e.preventDefault();
        e.stopPropagation();
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === selectionOverlay) return;
        selectElement(el);
      }, true);

      function selectElement(el) {
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
        console.log('[DevEditor] CSS variable usages for', el.tagName, el.className, varUsages);

        var sourceInfo = getReactSourceInfo(el);
        if (sourceInfo) {
          console.log('[DevEditor] sourceInfo:', sourceInfo.fileName + ':' + sourceInfo.lineNumber, 'component:', sourceInfo.componentName, 'chain:', sourceInfo.componentChain.join(' > '));
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
            }
            break;
          }
          case 'HIDE_SELECTION_OVERLAY': {
            selectionOverlay.style.display = 'none';
            break;
          }
          case 'SHOW_SELECTION_OVERLAY': {
            if (selectedElement) {
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
            var defs = scanCSSVariableDefinitions();
            console.log('[DevEditor] CSS variable definitions found:', Object.keys(defs).length, defs);
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
  `;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function handleProxy(
  request: NextRequest,
  params: { path?: string[] }
) {
  // Accept target URL from header, query param, or cookie (for dynamic chunk loading)
  const targetUrl =
    request.headers.get(PROXY_HEADER) ||
    request.nextUrl.searchParams.get(PROXY_HEADER) ||
    request.cookies.get(PROXY_HEADER)?.value;

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing X-Dev-Editor-Target header or query parameter' },
      { status: 400 }
    );
  }

  if (!isLocalhostUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Target URL must be localhost or 127.0.0.1' },
      { status: 400 }
    );
  }

  const path = (params.path || []).join('/');

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
      });
    }
    // For JS hot-update chunks, return empty script
    if (path.endsWith('.js')) {
      return new NextResponse('', {
        status: 200,
        headers: { 'content-type': 'application/javascript' },
      });
    }
    // Anything else HMR-related: empty 204
    return new NextResponse(null, { status: 204 });
  }

  const url = new URL(path || '/', targetUrl);

  // Forward query string (excluding the proxy header param)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== PROXY_HEADER) {
      url.searchParams.set(key, value);
    }
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (
        key !== PROXY_HEADER &&
        key !== 'host' &&
        !key.startsWith('x-forwarded') &&
        key !== 'connection'
      ) {
        headers.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
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
    ]);
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!STRIP_HEADERS.has(key)) {
        responseHeaders.set(key, value);
      }
    });

    // Inject inspector script into HTML responses
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Rewrite asset URLs to go through proxy, preserving target param
      const encodedTarget = encodeURIComponent(targetUrl);
      const targetOrigin = new URL(targetUrl).origin;
      const escapedOrigin = targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Helper to rewrite a single absolute path
      function proxyPath(originalPath: string): string {
        const separator = originalPath.includes('?') ? '&' : '?';
        return `/api/proxy${originalPath}${separator}${PROXY_HEADER}=${encodedTarget}`;
      }

      // Rewrite fully-qualified target-origin URLs in attributes FIRST
      // (e.g., http://localhost:4000/avatars/img.png → /api/proxy/avatars/img.png?...)
      html = html.replace(
        new RegExp(`(href|src|action|poster)=(["'])${escapedOrigin}(/[^"']*)`, 'g'),
        (_match: string, attr: string, quote: string, pathPart: string) => {
          return `${attr}=${quote}${proxyPath(pathPart)}`;
        }
      );

      // Rewrite fully-qualified target-origin URLs in srcset
      html = html.replace(
        new RegExp(`${escapedOrigin}(/[^\\s,)"']+)`, 'g'),
        (_match: string, pathPart: string) => {
          // Only rewrite inside attribute contexts (not in script text)
          return proxyPath(pathPart);
        }
      );

      // Rewrite src, href, action attributes (absolute paths starting with /)
      html = html.replace(
        /(href|src|action)=(["'])(\/[^"']*)/g,
        (_match: string, attr: string, quote: string, originalPath: string) => {
          // Skip already-rewritten paths
          if (originalPath.startsWith('/api/proxy')) return _match;
          return `${attr}=${quote}${proxyPath(originalPath)}`;
        }
      );

      // Rewrite srcset attributes — each entry is "url descriptor, ..."
      html = html.replace(
        /srcset=(["'])([^"']+)/g,
        (_match: string, quote: string, srcsetValue: string) => {
          const rewritten = srcsetValue.replace(
            /(\/[^\s,]+)/g,
            (urlPart: string) => {
              if (urlPart.startsWith('/api/proxy')) return urlPart;
              return proxyPath(urlPart);
            }
          );
          return `srcset=${quote}${rewritten}`;
        }
      );

      // Rewrite data-src and data-srcset (common lazy-loading patterns)
      html = html.replace(
        /data-src=(["'])(\/[^"']*)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match;
          return `data-src=${quote}${proxyPath(originalPath)}`;
        }
      );
      html = html.replace(
        /data-srcset=(["'])([^"']+)/g,
        (_match: string, quote: string, srcsetValue: string) => {
          const rewritten = srcsetValue.replace(
            /(\/[^\s,]+)/g,
            (urlPart: string) => {
              if (urlPart.startsWith('/api/proxy')) return urlPart;
              return proxyPath(urlPart);
            }
          );
          return `data-srcset=${quote}${rewritten}`;
        }
      );

      // Rewrite CSS url() references in inline styles — both absolute paths and full URLs
      html = html.replace(
        /url\((["']?)(\/[^)"']+)\1\)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match;
          return `url(${quote}${proxyPath(originalPath)}${quote})`;
        }
      );
      html = html.replace(
        new RegExp(`url\\((["']?)${escapedOrigin}(/[^)"']+)\\1\\)`, 'g'),
        (_match: string, quote: string, pathPart: string) => {
          return `url(${quote}${proxyPath(pathPart)}${quote})`;
        }
      );

      // Rewrite @import in <style> blocks
      html = html.replace(
        /@import\s+(["'])(\/[^"']+)\1/g,
        (_match: string, quote: string, originalPath: string) => {
          return `@import ${quote}${proxyPath(originalPath)}${quote}`;
        }
      );

      // --- Navigation blocker (replaces blanket script stripping) ---
      // Instead of stripping ALL scripts (which breaks client-rendered content),
      // we inject a navigation blocker that:
      //   1. Fixes the URL via history.replaceState so client-side routers
      //      see the correct path (not /api/proxy/...)
      //   2. Mocks HMR WebSocket/EventSource connections
      //   3. Intercepts full-page navigations to keep the iframe in the proxy
      //   4. Patches fetch/XHR so API calls route through the proxy
      //   5. Suppresses HMR-related errors
      //   6. Detects infinite reload loops as a safety net
      const targetPagePath = '/' + (path || '');
      const safePagePath = JSON.stringify(targetPagePath);
      const safeTargetUrl = JSON.stringify(targetUrl);
      const safeEncodedTarget = JSON.stringify(encodedTarget);
      const safeProxyHeader = JSON.stringify(PROXY_HEADER);

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

  // Reload safety net - detect infinite reload loops
  var rk = '_der';
  var rc = parseInt(sessionStorage.getItem(rk) || '0');
  sessionStorage.setItem(rk, String(rc + 1));
  setTimeout(function(){ sessionStorage.removeItem(rk); }, 3000);
  if (rc > 4) { sessionStorage.removeItem(rk); window.stop(); return; }

  // Mock HMR WebSocket connections
  var OWS = window.WebSocket;
  window.WebSocket = function(u, pr) {
    var s = String(u);
    if (s.indexOf('_next') >= 0 || s.indexOf('hmr') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('hot-update') >= 0) {
      var m = {readyState:3, close:function(){}, send:function(){}, addEventListener:function(){}, removeEventListener:function(){}, dispatchEvent:function(){return true}, onopen:null, onclose:null, onmessage:null, onerror:null};
      setTimeout(function(){ if(m.onclose) m.onclose({code:1000, reason:'', wasClean:true}); }, 50);
      return m;
    }
    return pr !== undefined ? new OWS(u, pr) : new OWS(u);
  };
  window.WebSocket.CONNECTING=0; window.WebSocket.OPEN=1; window.WebSocket.CLOSING=2; window.WebSocket.CLOSED=3;

  // Mock HMR EventSource
  var OES = window.EventSource;
  if (OES) {
    window.EventSource = function(u, c) {
      var s = String(u);
      if (s.indexOf('hmr') >= 0 || s.indexOf('hot') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('_next') >= 0) {
        return {close:function(){}, addEventListener:function(){}, removeEventListener:function(){}, dispatchEvent:function(){return true}, readyState:2, url:s, withCredentials:false, onopen:null, onmessage:null, onerror:null};
      }
      return c ? new OES(u, c) : new OES(u);
    };
    window.EventSource.CONNECTING=0; window.EventSource.OPEN=1; window.EventSource.CLOSED=2;
  }

  // Intercept full-page navigations via Navigation API
  if (window.navigation) {
    window.navigation.addEventListener('navigate', function(e) {
      if (e.hashChange) return;
      try {
        var d = new URL(e.destination.url);
        if (d.pathname.indexOf('/api/proxy') === 0) return;
        if (d.origin !== window.location.origin) return;
        if (e.canIntercept) {
          e.intercept({
            handler: function() {
              // Notify parent of page change (UI update only — no iframe reload)
              window.parent.postMessage({type:'PAGE_NAVIGATE', payload:{path:d.pathname}}, window.location.origin);
              // Navigate within the iframe to the proxy URL instead of
              // letting the editor set iframe.src (which causes a full reload)
              var sep = d.search ? '&' : '?';
              window.location.replace('/api/proxy' + d.pathname + d.search + sep + pH + '=' + eT);
              return new Promise(function() {});
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

  // Runtime interceptor: rewrite src/href on dynamically-created elements
  // Catches images, scripts, links set by client-side JS
  var rObs = new MutationObserver(function(mutations) {
    for (var mi = 0; mi < mutations.length; mi++) {
      var added = mutations[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++) {
        var node = added[ni];
        if (node.nodeType !== 1) continue;
        rewriteNodeUrls(node);
        if (node.querySelectorAll) {
          var children = node.querySelectorAll('[src],[href],[poster],[data-src]');
          for (var ci = 0; ci < children.length; ci++) rewriteNodeUrls(children[ci]);
        }
      }
      // Handle attribute changes (e.g., lazy-load libraries setting src)
      if (mutations[mi].type === 'attributes') {
        rewriteNodeUrls(mutations[mi].target);
      }
    }
  });
  function rewriteNodeUrls(el) {
    if (!el || !el.getAttribute) return;
    var attrs = ['src', 'href', 'poster', 'data-src'];
    for (var ai = 0; ai < attrs.length; ai++) {
      var val = el.getAttribute(attrs[ai]);
      if (!val) continue;
      // Rewrite target-origin full URLs
      if (val.indexOf(tO) === 0) {
        var path = val.substring(tO.length) || '/';
        el.setAttribute(attrs[ai], '/api/proxy' + path + (path.indexOf('?') >= 0 ? '&' : '?') + pH + '=' + eT);
      }
    }
    // Handle srcset — split on comma, rewrite each entry
    var srcset = el.getAttribute('srcset');
    if (srcset && srcset.indexOf(tO) >= 0) {
      var parts = srcset.split(',');
      var rewritten = [];
      for (var si = 0; si < parts.length; si++) {
        var part = parts[si].trim();
        if (part.indexOf(tO) === 0) {
          part = part.replace(tO, '/api/proxy');
        }
        rewritten.push(part);
      }
      el.setAttribute('srcset', rewritten.join(', '));
    }
  }
  if (document.body) {
    rObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      rObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
    });
  }

  // Suppress HMR-related errors
  window.addEventListener('error', function(e) {
    var m = e.message || '';
    if (m.indexOf('hmr') >= 0 || m.indexOf('hot') >= 0 || m.indexOf('WebSocket') >= 0 || m.indexOf('__webpack') >= 0 || m.indexOf('turbopack') >= 0) {
      e.preventDefault(); return false;
    }
  });
  window.addEventListener('unhandledrejection', function(e) {
    var r = e.reason ? String(e.reason) : '';
    if (r.indexOf('hmr') >= 0 || r.indexOf('hot') >= 0 || r.indexOf('WebSocket') >= 0 || r.indexOf('__webpack') >= 0 || r.indexOf('turbopack') >= 0) {
      e.preventDefault();
    }
  });
})();
</script>`;

      // Cookie setter for resource loading
      const urlInterceptorScript = `<script data-dev-editor-interceptor>
(function(){
  document.cookie='${PROXY_HEADER}='+encodeURIComponent('${targetUrl}')+';path=/;SameSite=Strict;max-age=86400';
})();
</script>`;

      // Inject navigation blocker + cookie setter at the top of <head>.
      // IMPORTANT: Use function replacements to prevent $ characters in the
      // injected scripts from being interpreted as special replacement patterns
      // ($' = text after match, $& = matched text, etc.).
      const headInjection = navigationBlockerScript + urlInterceptorScript;
      if (html.includes('<head>')) {
        html = html.replace('<head>', () => '<head>' + headInjection);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head\s[^>]*>/, (match) => match + headInjection);
      } else {
        html = headInjection + html;
      }

      // Set cookie on the response for dynamic resource loading
      responseHeaders.append('Set-Cookie', `${PROXY_HEADER}=${encodeURIComponent(targetUrl)}; Path=/; SameSite=Strict; Max-Age=86400`);

      // Inject inspector script before </body>
      if (html.includes('</body>')) {
        html = html.replace('</body>', () => INSPECTOR_SCRIPT + '</body>');
      } else {
        html += INSPECTOR_SCRIPT;
      }

      responseHeaders.set('content-type', 'text/html; charset=utf-8');
      responseHeaders.delete('content-length');

      return new NextResponse(html, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Rewrite url() references in CSS responses
    if (contentType.includes('text/css')) {
      let css = await response.text();
      const cssEncodedTarget = encodeURIComponent(targetUrl);
      const cssTargetOrigin = new URL(targetUrl).origin;
      const cssEscapedOrigin = cssTargetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Rewrite absolute-path url() references
      css = css.replace(
        /url\(\s*(["']?)(\/[^)"'\s]+)\1\s*\)/g,
        (_match: string, quote: string, originalPath: string) => {
          if (originalPath.startsWith('/api/proxy')) return _match;
          const separator = originalPath.includes('?') ? '&' : '?';
          return `url(${quote}/api/proxy${originalPath}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote})`;
        }
      );
      // Rewrite fully-qualified target-origin url() references
      css = css.replace(
        new RegExp(`url\\(\\s*(["']?)${cssEscapedOrigin}(/[^)"'\\s]+)\\1\\s*\\)`, 'g'),
        (_match: string, quote: string, pathPart: string) => {
          const separator = pathPart.includes('?') ? '&' : '?';
          return `url(${quote}/api/proxy${pathPart}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote})`;
        }
      );
      // Rewrite @import with absolute paths
      css = css.replace(
        /@import\s+(["'])(\/[^"']+)\1/g,
        (_match: string, quote: string, originalPath: string) => {
          const separator = originalPath.includes('?') ? '&' : '?';
          return `@import ${quote}/api/proxy${originalPath}${separator}${PROXY_HEADER}=${cssEncodedTarget}${quote}`;
        }
      );
      responseHeaders.set('content-type', 'text/css; charset=utf-8');
      responseHeaders.set('cache-control', 'public, max-age=3600');
      responseHeaders.delete('content-length');
      return new NextResponse(css, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Add CORS headers for fonts (often needed for cross-origin loading)
    if (
      contentType.includes('font/') ||
      contentType.includes('application/font') ||
      path.match(/\.(woff2?|ttf|eot|otf)(\?|$)/)
    ) {
      responseHeaders.set('access-control-allow-origin', '*');
      responseHeaders.set('cache-control', 'public, max-age=31536000, immutable');
    }

    // Cache static assets aggressively to reduce repeat load times
    if (
      contentType.includes('image/') ||
      path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?|$)/)
    ) {
      responseHeaders.set('cache-control', 'public, max-age=3600');
    }

    // Passthrough other responses (streams body directly — no buffering)
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Target server timeout (10s)' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Target server is unreachable' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const params = await context.params;
  return handleProxy(request, params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const params = await context.params;
  return handleProxy(request, params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const params = await context.params;
  return handleProxy(request, params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const params = await context.params;
  return handleProxy(request, params);
}

export async function OPTIONS(
  request: NextRequest,
) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'access-control-allow-headers': request.headers.get('access-control-request-headers') || '*',
      'access-control-max-age': '86400',
    },
  });
}
