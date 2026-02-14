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
          styles[props[i]] = computed.getPropertyValue(props[i]);
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

      // Click selection — prevent default to stop page navigation
      document.addEventListener('click', function(e) {
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
        console.log('[DevEditor] CSS variable usages for', el.tagName, el.className, varUsages);

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

      // MutationObserver for DOM changes
      var observer = new MutationObserver(function() {
        var tree = serializeTree(document.body);
        if (!tree) return;
        var removedSelectors = [];
        if (selectedElement && !document.body.contains(selectedElement)) {
          removedSelectors.push(generateSelectorPath(selectedElement));
          clearSelection();
        }
        send({ type: 'DOM_UPDATED', payload: { tree: tree, removedSelectors: removedSelectors } });
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
              if (target) target.style.setProperty(msg.payload.property, msg.payload.value, 'important');
            } catch(err) {}
            break;
          }
          case 'REVERT_CHANGE': {
            try {
              var target2 = document.querySelector(msg.payload.selectorPath);
              if (target2) target2.style.removeProperty(msg.payload.property);
            } catch(err) {}
            break;
          }
          case 'REVERT_ALL': {
            var allElements = document.querySelectorAll('[style]');
            allElements.forEach(function(el) { el.removeAttribute('style'); });
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
          case 'HEARTBEAT': {
            send({ type: 'HEARTBEAT_RESPONSE' });
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
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    // Inject inspector script into HTML responses
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Rewrite asset URLs to go through proxy, preserving target param
      const encodedTarget = encodeURIComponent(targetUrl);
      html = html.replace(
        /(href|src|action)=(["'])(\/[^"']*)/g,
        (_match: string, attr: string, quote: string, originalPath: string) => {
          const separator = originalPath.includes('?') ? '&' : '?';
          return `${attr}=${quote}/api/proxy${originalPath}${separator}${PROXY_HEADER}=${encodedTarget}`;
        }
      );

      // Build interceptor script — sets a cookie for dynamic resource loading,
      // blocks HMR WebSocket (which causes infinite reload), and suppresses errors.
      // Must run BEFORE any other scripts.
      const urlInterceptorScript = `<script data-dev-editor-interceptor>
(function(){
  document.cookie='${PROXY_HEADER}='+encodeURIComponent('${targetUrl}')+';path=/;SameSite=Strict;max-age=86400';
  // Block HMR WebSocket — the editor's dev server sends "refresh" to the iframe
  // causing an infinite reload loop. We intercept WebSocket and EventSource to
  // prevent any HMR connections from the proxied page.
  var OWS=window.WebSocket;
  window.WebSocket=function(url,protocols){
    if(typeof url==='string'&&(url.indexOf('webpack-hmr')>=0||url.indexOf('_next/webpack')>=0||url.indexOf('turbopack')>=0)){
      var dummy={readyState:3,CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3,bufferedAmount:0,extensions:'',protocol:'',url:url,binaryType:'blob',onopen:null,onclose:null,onmessage:null,onerror:null};
      dummy.close=function(){};dummy.send=function(){};
      dummy.addEventListener=function(){};dummy.removeEventListener=function(){};dummy.dispatchEvent=function(){return true};
      return dummy;
    }
    return protocols?new OWS(url,protocols):new OWS(url);
  };
  window.WebSocket.CONNECTING=0;window.WebSocket.OPEN=1;window.WebSocket.CLOSING=2;window.WebSocket.CLOSED=3;
  window.WebSocket.prototype=OWS.prototype;
  var OES=window.EventSource;
  if(OES){
    window.EventSource=function(url,opts){
      if(typeof url==='string'&&(url.indexOf('webpack-hmr')>=0||url.indexOf('_next')>=0||url.indexOf('turbopack')>=0)){
        var d={readyState:2,url:url,withCredentials:false,CONNECTING:0,OPEN:1,CLOSED:2,onopen:null,onmessage:null,onerror:null};
        d.close=function(){};d.addEventListener=function(){};d.removeEventListener=function(){};d.dispatchEvent=function(){return true};
        return d;
      }
      return opts?new OES(url,opts):new OES(url);
    };
    window.EventSource.CONNECTING=0;window.EventSource.OPEN=1;window.EventSource.CLOSED=2;
    window.EventSource.prototype=OES.prototype;
  }
  // Suppress chunk load errors and block error-triggered reloads
  window.addEventListener('error',function(e){if(e.message&&(e.message.indexOf('ChunkLoadError')>=0||e.message.indexOf('Loading chunk')>=0)){e.preventDefault();e.stopPropagation();return false}},true);
  window.addEventListener('unhandledrejection',function(e){if(e.reason&&String(e.reason).indexOf('ChunkLoadError')>=0){e.preventDefault()}});
  // Block location.reload() triggered by error recovery
  var origReload=location.reload;
  Object.defineProperty(location,'reload',{value:function(){},configurable:true});
})();
</script>`;

      // Inject URL interceptor at the top of <head> (before any scripts)
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + urlInterceptorScript);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head\s[^>]*>/, '$&' + urlInterceptorScript);
      } else {
        html = urlInterceptorScript + html;
      }

      // Set cookie on the response for dynamic resource loading
      responseHeaders.append('Set-Cookie', `${PROXY_HEADER}=${encodeURIComponent(targetUrl)}; Path=/; SameSite=Strict; Max-Age=86400`);

      // Inject inspector script before </body>
      if (html.includes('</body>')) {
        html = html.replace('</body>', INSPECTOR_SCRIPT + '</body>');
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

    // Passthrough non-HTML responses
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
