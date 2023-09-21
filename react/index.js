// The only reason this file exists is to appease Vite's optimizeDeps feature which requires a root-level import.

module.exports = new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === '__esModule') {
        return {}
      }

      throw new Error(
        `Importing from \`@muiicons/react\` directly is not supported. Please import from either \`@muiicons/react/24/filled\`, or \`@muiicons/react/24/outlined\` instead.`
      )
    },
  }
)
