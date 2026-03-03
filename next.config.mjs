const nextConfig = {
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
    ]
  },
}

export default nextConfig
