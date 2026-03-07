import path from 'node:path'

const nextConfig = {
  webpack(config) {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    // Force runtime alias resolution even if tsconfig path loading is skipped.
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src')
    return config
  },

  async headers() {
    return [
      {
        // Serve inspector script with CORS + CORP headers so it loads
        // on target pages that set Cross-Origin-Embedder-Policy: require-corp
        source: '/dev-editor-inspector.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Allow the SW to control /sw-proxy/ scope even though the script
        // lives at /sw-proxy/sw.js (scope matches script directory)
        source: '/sw-proxy/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/sw-proxy/' },
        ],
      },
    ]
  },
}

export default nextConfig
