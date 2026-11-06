// Unified API client that routes through Vite proxy in dev mode and Service Worker proxy in production.

const DEV_PROXY_DASHSCOPE = '/proxy/dashscope'
const DEV_PROXY_DASHSCOPE_INTL = '/proxy/dashscope-intl'

function isDev() {
  return import.meta.env?.DEV || false
}

// In production, the Service Worker at <base>/sw.js intercepts <base>/__proxy/* requests
// and forwards them server-side to the original target, bypassing CORS.
const PROD_BASE = import.meta.env?.BASE_URL || '/'

export function resolveUrl(externalUrl) {
  if (isDev()) {
    if (externalUrl.includes('dashscope-intl.aliyuncs.com')) {
      return externalUrl.replace('https://dashscope-intl.aliyuncs.com', DEV_PROXY_DASHSCOPE_INTL)
    }
    if (externalUrl.includes('dashscope.aliyuncs.com')) {
      return externalUrl.replace('https://dashscope.aliyuncs.com', DEV_PROXY_DASHSCOPE)
    }
    return externalUrl
  }

  // Production: route through Service Worker proxy (<base>/__proxy/<target-url>)
  if (externalUrl.startsWith('https://') || externalUrl.startsWith('http://')) {
    return PROD_BASE + '__proxy/' + externalUrl
  }
  return externalUrl
}

// Register the Service Worker for production CORS proxy.
// The SW file lives in public/sw.js → served at <base>/sw.js
export function registerProxyServiceWorker() {
  if (!isDev() && 'serviceWorker' in navigator) {
    const swPath = PROD_BASE + 'sw.js'
    navigator.serviceWorker.register(swPath).catch(() => {
      // Fail silently — direct API calls will still work on CORS-friendly hosts
    })
  }
}
