// Service Worker Proxy for pAInt
// Intercepts iframe requests and proxies them to the target localhost server,
// preserving all <script> tags for full client-rendered content.

// SW version — bump this when making breaking changes so the registration
// code can detect stale SWs and force a clean re-registration.
const SW_VERSION = 10;

// Inspector code cached at install time
let inspectorCode = '';

// Per-client target URL mapping: clientId -> { origin, url }
const clientTargets = new Map();

// Headers to strip from proxied responses
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

// HMR patterns to short-circuit (T020)
const HMR_RE = /\.hot-update\.|webpack-hmr|turbopack-hmr|__turbopack_hmr|__webpack_hmr/;

// ── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/dev-editor-inspector.js')
      .then((res) => res.text())
      .then((code) => {
        inspectorCode = code;
      })
      .catch((err) => {
        console.warn('[sw-proxy] Failed to cache inspector code:', err);
      })
      .then(() => self.skipWaiting())
  );
});

// ── Message handler — accept SKIP_WAITING and VERSION_CHECK ─────────
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'VERSION_CHECK') {
    // Respond via MessageChannel port if available, otherwise via source
    const port = event.ports && event.ports[0];
    const reply = { type: 'SW_VERSION', version: SW_VERSION };
    if (port) {
      port.postMessage(reply);
    } else if (event.source) {
      event.source.postMessage(reply);
    }
  }
});

// ── Activate ────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Client cleanup — remove stale entries when tabs/iframes close ───
async function cleanupStaleClients() {
  const activeClients = await self.clients.matchAll({ type: 'all' });
  const activeIds = new Set(activeClients.map((c) => c.id));
  for (const clientId of clientTargets.keys()) {
    if (!activeIds.has(clientId)) {
      clientTargets.delete(clientId);
    }
  }
}
// Run cleanup periodically on fetch events (lightweight, no timer needed)
let cleanupCounter = 0;

// ── Helper: strip security headers from a response ──────────────────
function stripHeaders(originalHeaders) {
  const headers = new Headers();
  for (const [key, value] of originalHeaders.entries()) {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  return headers;
}

// ── Helper: resolve the target origin for a given clientId ──────────
function getTargetForClient(clientId) {
  return clientTargets.get(clientId) || null;
}

// ── Helper: build navigation blocker script (T011-T016, T021) ───────
function buildNavigationBlocker(targetPagePath, targetUrl, targetOrigin) {
  const safePagePath = JSON.stringify(targetPagePath);
  const safeTargetUrl = JSON.stringify(targetUrl);
  const safeTargetOrigin = JSON.stringify(targetOrigin);

  return `<script data-dev-editor-nav-blocker>
(function(){
  var tP=${safePagePath},tU=${safeTargetUrl},tO=${safeTargetOrigin};

  // Fix URL so client-side routers see the correct path (T011)
  try {
    var p = new URLSearchParams(window.location.search);
    p.delete('__sw_target');
    var qs = p.toString();
    history.replaceState(history.state, '', tP + (qs ? '?' + qs : ''));
  } catch(e) {}

  // Trigger ResizeObserver callbacks after page load (T022)
  // Components like recharts ResponsiveContainer rely on ResizeObserver to
  // detect container dimensions. After history.replaceState and hydration,
  // observers may not fire because the layout hasn't changed from their
  // perspective. Dispatching resize events nudges them to re-measure.
  function triggerResize() {
    window.dispatchEvent(new Event('resize'));
    // Also nudge any ResizeObservers by briefly toggling a root-level style
    var root = document.documentElement;
    if (root) {
      root.style.setProperty('--_sw_resize_hack', '1');
      requestAnimationFrame(function() {
        root.style.removeProperty('--_sw_resize_hack');
      });
    }
  }
  // Fire at multiple timings to catch components that mount at different points
  if (document.readyState === 'complete') {
    setTimeout(triggerResize, 50);
    setTimeout(triggerResize, 300);
  } else {
    window.addEventListener('load', function() {
      setTimeout(triggerResize, 50);
      setTimeout(triggerResize, 300);
      setTimeout(triggerResize, 1000);
    });
  }

  // Block duplicate inspector scripts via src setter (T010)
  // IMPORTANT: Do NOT silently block (return early) — that prevents the
  // script's onload event from firing, which stalls Next.js hydration
  // when the target app queues the inspector in __next_s.
  var scrDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (scrDesc && scrDesc.set) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      get: scrDesc.get,
      set: function(val) {
        if (typeof val === 'string' && val.indexOf('dev-editor-inspector') >= 0) {
          // Redirect to no-op so onload fires without running duplicate inspector
          scrDesc.set.call(this, 'data:text/javascript,//noop');
          return;
        }
        if (typeof val === 'string') {
          var r = proxyResUrl(val);
          if (r) val = r;
        }
        scrDesc.set.call(this, val);
      },
      configurable: true, enumerable: true
    });
  }

  // Reload loop detection (T021)
  var rk = '_der_sw';
  var rc = parseInt(sessionStorage.getItem(rk) || '0');
  sessionStorage.setItem(rk, String(rc + 1));
  setTimeout(function(){ sessionStorage.removeItem(rk); }, 3000);
  if (rc > 4) { sessionStorage.removeItem(rk); window.stop(); return; }

  // HMR redirect: rewrite WebSocket URLs to target origin (T012)
  // Instead of mocking, redirect HMR WebSockets to the real target server
  // so Turbopack's module system can initialize and React can hydrate.
  var OWS = window.WebSocket;
  function rewriteWsUrl(s) {
    try {
      var pu = new URL(s);
      var tu = new URL(tU);
      if (pu.hostname === window.location.hostname && pu.port === window.location.port) {
        pu.hostname = tu.hostname;
        pu.port = tu.port;
        return pu.href;
      }
    } catch(e) {}
    return s;
  }
  window.__wsTrace = [];
  window.WebSocket = function(u, pr) {
    var s = String(u);
    var orig = s;
    if (s.indexOf('_next') >= 0 || s.indexOf('hmr') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('hot-update') >= 0) {
      u = rewriteWsUrl(s);
    }
    console.debug('[sw-ws-trace]', orig, '->', String(u));
    window.__wsTrace.push({from: orig, to: String(u)});
    return pr !== undefined ? new OWS(u, pr) : new OWS(u);
  };
  window.WebSocket.CONNECTING=0; window.WebSocket.OPEN=1; window.WebSocket.CLOSING=2; window.WebSocket.CLOSED=3;
  window.WebSocket.prototype = OWS.prototype;

  // HMR redirect: rewrite EventSource URLs to target origin (T012)
  var OES = window.EventSource;
  if (OES) {
    window.EventSource = function(u, c) {
      var s = String(u);
      if (s.indexOf('hmr') >= 0 || s.indexOf('hot') >= 0 || s.indexOf('turbopack') >= 0 || s.indexOf('webpack') >= 0 || s.indexOf('_next') >= 0) {
        try {
          var pu = new URL(s, window.location.origin);
          var tu = new URL(tU);
          pu.hostname = tu.hostname;
          pu.port = tu.port;
          u = pu.href;
        } catch(e) {}
      }
      return c ? new OES(u, c) : new OES(u);
    };
    window.EventSource.CONNECTING=0; window.EventSource.OPEN=1; window.EventSource.CLOSED=2;
    window.EventSource.prototype = OES.prototype;
  }

  // Patch history.pushState/replaceState with a flag so the Navigation API
  // handler can distinguish soft navigations (router.push → pushState) from
  // hard navigations (window.location.href = x). The navigate event fires
  // synchronously during pushState, so the flag is reliable.
  var _isSoftNav = false;
  var oPush = history.pushState;
  var oReplace = history.replaceState;
  history.pushState = function() {
    _isSoftNav = true;
    try { return oPush.apply(this, arguments); }
    finally { _isSoftNav = false; }
  };
  history.replaceState = function() {
    _isSoftNav = true;
    try { return oReplace.apply(this, arguments); }
    finally { _isSoftNav = false; }
  };

  // Navigation API intercept (T013)
  // Intercept navigations that escape /sw-proxy/ scope and redirect them back.
  // - User-initiated (link clicks): always intercept
  // - Soft navigations (history.pushState from router.push): let through
  //   (the fetch patch routes RSC calls through the proxy, pushState just
  //   updates the URL bar which is fine since we already replaceState'd)
  // - Hard navigations (window.location.href/assign/replace): intercept
  //   (these would navigate the iframe to pAInt's origin → 404)
  if (window.navigation) {
    window.navigation.addEventListener('navigate', function(e) {
      if (e.hashChange) return;
      // Skip soft navigations (pushState/replaceState from client-side router)
      if (_isSoftNav) return;
      try {
        var d = new URL(e.destination.url);
        if (d.pathname.indexOf('/sw-proxy/') === 0) return;
        if (d.origin !== window.location.origin) return;
        if (e.canIntercept) {
          if (e.userInitiated) {
            window.parent.postMessage({type:'PAGE_NAVIGATE', payload:{path:d.pathname}}, window.location.origin);
          }
          e.intercept({
            handler: function() {
              window.location.replace('/sw-proxy' + d.pathname + d.search + (d.search ? '&' : '?') + '__sw_target=' + encodeURIComponent(tU));
              return new Promise(function() {});
            }
          });
        }
      } catch(err) {}
    });
  }

  // Patch fetch for same-origin and target-origin API calls (T014)
  var oF = window.fetch;
  function rewriteUrl(s) {
    if (typeof s !== 'string') return s;
    if (s.charAt(0) === '/' && s.indexOf('/sw-proxy/') !== 0) {
      return '/sw-proxy' + s;
    }
    if (s.indexOf(tO) === 0) {
      var path = s.substring(tO.length) || '/';
      return '/sw-proxy' + path;
    }
    return s;
  }
  window.fetch = function(i, n) {
    try {
      if (typeof i === 'string') {
        i = rewriteUrl(i);
      } else if (typeof Request !== 'undefined' && i instanceof Request) {
        var u = new URL(i.url);
        if ((u.origin === window.location.origin && u.pathname.indexOf('/sw-proxy/') !== 0) || u.origin === tO) {
          var rp = u.pathname;
          i = new Request('/sw-proxy' + rp + u.search, i);
        }
      }
    } catch(e) {}
    return oF.call(this, i, n);
  };

  // Patch XMLHttpRequest (T014)
  var oX = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    try {
      if (typeof u === 'string') {
        arguments[1] = rewriteUrl(u);
      }
    } catch(e) {}
    return oX.apply(this, arguments);
  };

  // Resource URL rewriting helper (T015)
  // NOTE: Returns null (no-op) because the SW intercepts all subresource
  // requests from known proxied clients via clientId mapping. Rewriting URLs
  // to /sw-proxy/ caused path mismatches in the Turbopack module system.
  function proxyResUrl(val) {
    return null;
  }

  // Patch Element.prototype.setAttribute (T015)
  var oSA = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (typeof value === 'string') {
      var n = name.toLowerCase();
      if (n === 'src' && this.tagName === 'SCRIPT' && value.indexOf('dev-editor-inspector') >= 0) {
        // Redirect to no-op (same as src setter patch — must not block onload)
        return oSA.call(this, name, 'data:text/javascript,//noop');
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

  // Patch HTMLImageElement.src (T015)
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

  // Patch HTMLSourceElement.src (T015)
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

  // Patch FontFace constructor (T015)
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
    Object.keys(OFontFace).forEach(function(k) {
      try { window.FontFace[k] = OFontFace[k]; } catch(e) {}
    });
  }

  // Rewrite url() in dynamically-injected <style> elements (T016)
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

  function rewriteNodeUrls(el) {
    if (!el || !el.getAttribute) return;
    var tag = el.tagName;
    var attrs = ['src', 'poster', 'data-src'];
    if (tag !== 'A') attrs.push('href');
    for (var ai = 0; ai < attrs.length; ai++) {
      var val = el.getAttribute(attrs[ai]);
      var r = proxyResUrl(val);
      if (r) el.setAttribute(attrs[ai], r);
    }
    if (el.getAttributeNS) {
      var xval = el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      var xr = proxyResUrl(xval);
      if (xr) el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', xr);
    }
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
      if (changed) el.setAttribute('srcset', rewritten.join(', '));
    }
  }

  // MutationObserver for dynamically-added elements (T016)
  var rObs = new MutationObserver(function(mutations) {
    for (var mi = 0; mi < mutations.length; mi++) {
      var added = mutations[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++) {
        var node = added[ni];
        if (node.nodeType === 3 && node.parentElement && node.parentElement.tagName === 'STYLE') {
          rewriteStyleUrls(node.parentElement);
          continue;
        }
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'STYLE') rewriteStyleUrls(node);
        rewriteNodeUrls(node);
        if (node.querySelectorAll) {
          var children = node.querySelectorAll('[src],[href],[poster],[data-src],[srcset]');
          for (var ci = 0; ci < children.length; ci++) rewriteNodeUrls(children[ci]);
          var styles = node.querySelectorAll('style');
          for (var sti = 0; sti < styles.length; sti++) rewriteStyleUrls(styles[sti]);
        }
      }
      if (mutations[mi].type === 'attributes') {
        rewriteNodeUrls(mutations[mi].target);
      }
    }
  });

  // Scan existing <style> elements
  var existingStyles = document.querySelectorAll('head style, style');
  for (var esi = 0; esi < existingStyles.length; esi++) rewriteStyleUrls(existingStyles[esi]);

  var obsRoot = document.documentElement || document.body;
  if (obsRoot) {
    rObs.observe(obsRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      rObs.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'poster', 'data-src', 'srcset'] });
    });
  }

  // Suppress HMR and chunk-loading errors (T012)
  function isProxyNoise(s) {
    return s.indexOf('hmr') >= 0 || s.indexOf('hot-update') >= 0 || s.indexOf('WebSocket') >= 0 || s.indexOf('__webpack') >= 0 || s.indexOf('__turbopack_hmr') >= 0 || s.indexOf('turbopack-hmr') >= 0 || s.indexOf('ChunkLoadError') >= 0 || s.indexOf('Loading chunk') >= 0 || s.indexOf('Loading CSS chunk') >= 0 || s.indexOf('Expected length, "undefined"') >= 0;
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
  // Hide Next.js dev error overlay
  var hs=document.createElement('style');
  hs.textContent='nextjs-portal{display:none!important}';
  document.documentElement.appendChild(hs);
})();
</script>`;
}

// ── Helper: build lightweight auth-mode nav script ──────────────────
// Keeps navigations within /sw-proxy/ scope so the SW can intercept them.
// Does NOT inject inspector, HMR mocking, or any editing functionality.
function buildAuthNavigationScript(targetUrl) {
  const safeTargetUrl = JSON.stringify(targetUrl);

  return `<script data-dev-editor-auth-nav>
(function(){
  var tU=${safeTargetUrl};

  // Rewrite location assignments to stay within /sw-proxy/ scope
  function toSwProxy(path) {
    if (typeof path !== 'string') return path;
    // Already prefixed
    if (path.indexOf('/sw-proxy/') === 0) return path;
    // Absolute path
    if (path.charAt(0) === '/') {
      return '/sw-proxy' + path + (path.indexOf('?') >= 0 ? '&' : '?') + '__sw_target=' + encodeURIComponent(tU) + '&__sw_auth=1';
    }
    // Full URL on same origin
    try {
      var u = new URL(path, window.location.href);
      if (u.origin === window.location.origin && u.pathname.indexOf('/sw-proxy/') !== 0) {
        return '/sw-proxy' + u.pathname + (u.search ? u.search + '&' : '?') + '__sw_target=' + encodeURIComponent(tU) + '&__sw_auth=1';
      }
    } catch(e) {}
    return path;
  }

  // Patch window.location.assign and window.location.replace
  var origAssign = window.location.assign.bind(window.location);
  var origReplace = window.location.replace.bind(window.location);
  window.location.assign = function(url) { return origAssign(toSwProxy(url)); };
  window.location.replace = function(url) { return origReplace(toSwProxy(url)); };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var rewritten = toSwProxy(href);
    if (rewritten !== href) {
      e.preventDefault();
      window.location.href = rewritten;
    }
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    var action = form.getAttribute('action');
    if (action) {
      var rewritten = toSwProxy(action);
      if (rewritten !== action) {
        form.setAttribute('action', rewritten);
      }
    }
  }, true);

  // Navigation API intercept (modern browsers)
  if (window.navigation) {
    window.navigation.addEventListener('navigate', function(e) {
      if (e.hashChange) return;
      try {
        var d = new URL(e.destination.url);
        if (d.pathname.indexOf('/sw-proxy/') === 0) return;
        if (d.origin !== window.location.origin) return;
        if (e.canIntercept) {
          e.intercept({
            handler: function() {
              window.location.href = toSwProxy(d.pathname + d.search);
              return new Promise(function() {});
            }
          });
        }
      } catch(err) {}
    });
  }
})();
</script>`;
}

// ── Helper: rewrite CSS url() references (T019) ────────────────────
function rewriteCssUrls(css, targetOrigin) {
  const escapedOrigin = targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Rewrite absolute-path url() references
  css = css.replace(
    /url\(\s*(["']?)(\/[^)"'\s]+)\1\s*\)/g,
    (match, quote, originalPath) => {
      if (originalPath.startsWith('/sw-proxy/')) return match;
      return `url(${quote}/sw-proxy${originalPath}${quote})`;
    }
  );
  // Rewrite fully-qualified target-origin url() references
  css = css.replace(
    new RegExp(`url\\(\\s*(["']?)${escapedOrigin}(/[^)"'\\s]+)\\1\\s*\\)`, 'g'),
    (match, quote, pathPart) => {
      return `url(${quote}/sw-proxy${pathPart}${quote})`;
    }
  );
  // Rewrite @import with absolute paths
  css = css.replace(
    /@import\s+(["'])(\/[^"']+)\1/g,
    (match, quote, originalPath) => {
      return `@import ${quote}/sw-proxy${originalPath}${quote}`;
    }
  );
  return css;
}

// ── Fetch ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  const hasSwPrefix = url.pathname.startsWith('/sw-proxy/');

  // For requests without /sw-proxy/ prefix, only intercept if from a known
  // proxied client. This handles dynamic import() and other resource loads
  // that escape the /sw-proxy/ scope after history.replaceState changes
  // the page URL from /sw-proxy/... to /...
  if (!hasSwPrefix) {
    // Never intercept navigations outside /sw-proxy/ scope — let the browser
    // handle them normally. This ensures the fallback to /api/proxy works
    // when the SW proxy times out.
    if (event.request.mode === 'navigate') return;

    // Don't proxy pAInt's own files to the target server — serve from origin.
    // The inspector script and other pAInt files live on the editor origin,
    // not on the target. Without this, the SW would route these requests
    // through /api/sw-fetch/ to the target server → 404.
    if (url.pathname === '/dev-editor-inspector.js') return;

    const clientId = event.clientId;
    if (!clientId || !clientTargets.has(clientId)) return;

    // Route as subresource through the proxy (including HMR requests
    // which need to reach the target's dev server for Turbopack)
    event.respondWith(handleSubresource(event, url));
    return;
  }

  // Periodic stale client cleanup (every 50 requests)
  if (++cleanupCounter % 50 === 0) cleanupStaleClients();

  // For navigation requests, extract and store the target URL
  if (event.request.mode === 'navigate') {
    const swTarget = url.searchParams.get('__sw_target');
    if (swTarget) {
      try {
        const parsed = new URL(swTarget);
        const mapping = { origin: parsed.origin, url: swTarget };
        if (event.clientId) clientTargets.set(event.clientId, mapping);
        if (event.resultingClientId) clientTargets.set(event.resultingClientId, mapping);
      } catch (e) {}
    }

    event.respondWith(handleNavigation(event, url));
    return;
  }

  // Subresource requests (T018)
  event.respondWith(handleSubresource(event, url));
});

// ── Navigation request handler (T007-T017) ─────────────────────────
async function handleNavigation(event, url) {
  // Resolve target
  const clientId = event.resultingClientId || event.clientId;
  const target = getTargetForClient(clientId);
  if (!target) {
    return new Response('No target URL configured', { status: 502 });
  }

  // Re-fetch inspector code if lost (happens when browser terminates and
  // restarts the SW — global variables reset but install doesn't re-fire)
  if (!inspectorCode) {
    try {
      const inspRes = await fetch('/dev-editor-inspector.js');
      if (inspRes.ok) {
        inspectorCode = await inspRes.text();
      }
    } catch (err) {
      console.warn('[sw-proxy] Failed to re-fetch inspector code:', err);
    }
  }

  // Build the server-side fetch URL: route through /api/sw-fetch/ to avoid
  // CORS issues (SW runs in browser, can't fetch cross-origin localhost:3000)
  let targetPath = url.pathname.replace(/^\/sw-proxy/, '') || '/';
  const params = new URLSearchParams(url.search);
  params.delete('__sw_target');
  const qs = params.toString();
  const fetchUrl = '/api/sw-fetch' + targetPath + (qs ? '?' + qs : '');

  try {
    const response = await fetch(fetchUrl, {
      headers: { 'x-sw-target': target.url },
      redirect: 'follow',
    });

    // If the target server redirected (e.g. / → /login), use the final path
    // so the navigation blocker sets the correct URL for React hydration.
    const finalUrl = response.headers.get('x-sw-final-url');
    if (finalUrl) {
      try {
        targetPath = new URL(finalUrl).pathname || '/';
      } catch (e) {}
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      // Not HTML — return with stripped headers
      return new Response(response.body, {
        status: response.status,
        headers: stripHeaders(response.headers),
      });
    }

    let html = await response.text();

    // Auth mode: skip inspector/nav-blocker injection so the user can
    // interact with login forms normally. Cookies still flow through the
    // proxy so the session persists when switching to editor mode.
    const isAuthMode = url.searchParams.has('__sw_auth');

    // Strip CSP meta tags (T009)
    html = html.replace(
      /<meta\s+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
      ''
    );

    // Remove existing inspector script tags to prevent duplicates (T010)
    html = html.replace(
      /<script[^>]*src=["'][^"']*dev-editor-inspector[^"']*["'][^>]*><\/script>/gi,
      ''
    );

    // NOTE: We intentionally do NOT rewrite src/href/action attributes in
    // the HTML. The SW intercepts all subresource requests from known proxied
    // clients via clientId mapping, so the /sw-proxy/ prefix is unnecessary.
    // Rewriting caused path mismatches in the Turbopack module system: chunks
    // registered under /sw-proxy/_next/... but flight data referenced /_next/...
    // paths, preventing React hydration.

    if (isAuthMode) {
      // Auth mode: inject lightweight nav script to keep navigations
      // within /sw-proxy/ scope (login redirects, form submissions, etc.)
      const authNav = buildAuthNavigationScript(target.url);
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, (match) => match + authNav);
      } else if (/<head\s/i.test(html)) {
        html = html.replace(/<head\s[^>]*>/i, (match) => match + authNav);
      } else {
        html = authNav + html;
      }
    } else {
      // Inject navigation blocker after <head> (T011)
      const targetOrigin = target.origin;
      const navBlocker = buildNavigationBlocker(targetPath, target.url, targetOrigin);
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, (match) => match + navBlocker);
      } else if (/<head\s/i.test(html)) {
        html = html.replace(/<head\s[^>]*>/i, (match) => match + navBlocker);
      } else {
        html = navBlocker + html;
      }

      // Inject inspector script before </body> (T017)
      // Escape </script> in the inspector code to prevent the HTML parser from
      // prematurely closing the injected <script> tag.
      if (inspectorCode) {
        const safeCode = inspectorCode.replace(/<\/script>/gi, '<\\/script>');
        const inspectorTag = '<script>' + safeCode + '</script>';
        if (/<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, () => inspectorTag + '</body>');
        } else {
          html += inspectorTag;
        }
      }
    }

    // Build response with stripped headers (T008)
    const responseHeaders = stripHeaders(response.headers);
    responseHeaders.set('content-type', 'text/html; charset=utf-8');
    responseHeaders.set('cache-control', 'no-cache, no-store, must-revalidate');
    responseHeaders.delete('content-length');

    return new Response(html, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(`Failed to fetch from target: ${err.message}`, {
      status: 502,
    });
  }
}

// ── Subresource request handler (T018-T019) ─────────────────────────
async function handleSubresource(event, url) {
  // Resolve target from clientId mapping
  const target = getTargetForClient(event.clientId);
  if (!target) {
    // Try to find any target as fallback (single-tab common case)
    const entries = Array.from(clientTargets.values());
    if (entries.length === 0) {
      return fetch(event.request);
    }
    // Use the most recent entry
    var fallback = entries[entries.length - 1];
    return proxySubresource(event, url, fallback);
  }

  return proxySubresource(event, url, target);
}

async function proxySubresource(event, url, target) {
  // Route through /api/sw-fetch/ to avoid CORS (same as navigation handler)
  const targetPath = url.pathname.replace(/^\/sw-proxy/, '') || '/';
  const fetchUrl = '/api/sw-fetch' + targetPath + url.search;

  try {
    // Forward all request headers (except host/origin which must reflect the
    // actual target). This ensures RSC headers (RSC, Next-Router-State-Tree,
    // Next-Router-Prefetch), auth headers, and custom API headers all reach
    // the target server.
    const headers = { 'x-sw-target': target.url };
    const SKIP_HEADERS = new Set(['host', 'origin', 'referer', 'connection', 'upgrade']);
    for (const [key, value] of event.request.headers.entries()) {
      if (!SKIP_HEADERS.has(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    const init = {
      method: event.request.method,
      headers,
      redirect: 'follow',
    };
    if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
      init.body = event.request.body;
      init.duplex = 'half';
    }
    const response = await fetch(fetchUrl, init);

    const responseHeaders = stripHeaders(response.headers);

    // CSS url() rewriting (T019)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/css')) {
      let css = await response.text();
      css = rewriteCssUrls(css, target.origin);
      responseHeaders.set('content-type', 'text/css; charset=utf-8');
      responseHeaders.set('cache-control', 'no-cache, no-store, must-revalidate');
      responseHeaders.delete('content-length');
      return new Response(css, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Fonts: add CORS headers
    if (
      contentType.includes('font/') ||
      contentType.includes('application/font') ||
      /\.(woff2?|ttf|eot|otf)(\?|$)/.test(url.pathname)
    ) {
      responseHeaders.set('access-control-allow-origin', '*');
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(`SW proxy error: ${err.message}`, { status: 502 });
  }
}
