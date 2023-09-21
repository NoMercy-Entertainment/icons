// The only reason this file exists is to appease Vite's optimizeDeps feature which requires a root-level import.

module.exports = new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === '__esModule') {
        return {}
      }

      throw new Error(
        `Importing from \`@nomercy/mui-icons-react\` directly is not supported. Please import from either \`@nomercy/mui-icons-react/24/filled\`, or \`@nomercy/mui-icons-react/24/outlined\` instead.`
      )
    },
  }
)
