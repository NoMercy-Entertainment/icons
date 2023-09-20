// The only reason this file exists is to appease Vite's optimizeDeps feature which requires a root-level import.

module.exports = new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === '__esModule') {
        return {}
      }

      throw new Error(
        `Importing from \`@nomercy/icons/react\` directly is not supported. Please import from either \`@nomercy/icons/react/24/filled\`, or \`@nomercy/icons/react/24/outlined\` instead.`
      )
    },
  }
)
