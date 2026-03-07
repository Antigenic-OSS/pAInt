import { useEditorStore } from '@/store'

let swReady = false

// Must match SW_VERSION in /public/sw-proxy/sw.js
const EXPECTED_SW_VERSION = 2

const log = (...args: unknown[]) =>
  console.debug('[sw-proxy]', ...args)

/**
 * Check the active SW's version via message. Returns the version number,
 * or 0 if the SW doesn't respond (old version without VERSION_CHECK).
 */
function checkSwVersion(sw: ServiceWorker): Promise<number> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(0), 1000)
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout)
      resolve(event.data?.version ?? 0)
    }
    sw.postMessage({ type: 'VERSION_CHECK' }, [channel.port2])
  })
}

/**
 * Register the SW proxy at /sw-proxy/sw.js with scope /sw-proxy/.
 * Sets swProxyReady in the Zustand store when activation completes.
 * Returns true if the SW is active, false otherwise.
 *
 * Handles upgrades from old SW versions by checking the version number.
 * If the active SW is outdated, it's unregistered and a fresh install
 * is performed — this ensures existing users get the latest SW code.
 */
export async function registerSwProxy(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    log('Service Workers not supported — using fallback proxy')
    return false
  }

  try {
    log('Registering...')
    let registration = await navigator.serviceWorker.register(
      '/sw-proxy/sw.js',
      { scope: '/sw-proxy/', updateViaCache: 'none' },
    )
    log('Registration successful, scope:', registration.scope)

    // If there's an active SW, check its version
    if (registration.active) {
      const version = await checkSwVersion(registration.active)
      log('Active SW version:', version, '(expected:', EXPECTED_SW_VERSION + ')')

      if (version < EXPECTED_SW_VERSION) {
        // Old SW — force unregister and re-register clean
        log('Stale SW detected — forcing clean re-registration')
        await registration.unregister()
        registration = await navigator.serviceWorker.register(
          '/sw-proxy/sw.js',
          { scope: '/sw-proxy/', updateViaCache: 'none' },
        )
        // Fall through to wait for fresh install below
      }
    }

    // Helper to mark SW as ready
    const markReady = () => {
      if (!swReady) {
        swReady = true
        useEditorStore.getState().setSwProxyReady(true)
        log('Ready')
      }
    }

    // If there's a waiting SW, tell it to activate immediately
    if (registration.waiting) {
      log('Found waiting SW — sending SKIP_WAITING')
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    // If an update is installing, wait for it before marking ready
    const installing = registration.installing
    if (installing) {
      log('SW installing, waiting for activation...')
      return new Promise<boolean>((resolve) => {
        installing.addEventListener('statechange', () => {
          log('Installing SW state:', installing.state)
          if (installing.state === 'installed' && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
          if (installing.state === 'activated') {
            markReady()
            resolve(true)
          }
        })
      })
    }

    // Listen for future updates during this page session
    registration.addEventListener('updatefound', () => {
      const newSw = registration.installing
      if (!newSw) return
      log('Update found, tracking new SW...')
      newSw.addEventListener('statechange', () => {
        if (newSw.state === 'installed' && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
        if (newSw.state === 'activated') {
          markReady()
        }
      })
    })

    // No update in progress — if already active, we're ready
    if (registration.active) {
      markReady()
      return true
    }

    // First-time install — wait for activation
    const sw = registration.waiting
    if (!sw) {
      log('No SW instance found')
      return false
    }

    log('Waiting for activation, state:', sw.state)
    return new Promise<boolean>((resolve) => {
      sw.addEventListener('statechange', () => {
        log('State changed to:', sw.state)
        if (sw.state === 'activated') {
          markReady()
          resolve(true)
        }
      })
    })
  } catch (err) {
    console.warn('[sw-proxy] Registration failed:', err)
    return false
  }
}

/** Synchronous readiness check. */
export function isSwProxyReady(): boolean {
  return swReady
}

/** Unregister the SW proxy and reset state. */
export async function unregisterSwProxy(): Promise<void> {
  swReady = false
  useEditorStore.getState().setSwProxyReady(false)
  log('Unregistered')

  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  for (const reg of registrations) {
    if (reg.scope.includes('/sw-proxy/')) {
      await reg.unregister()
    }
  }
}
