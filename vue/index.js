// The only reason this file exists is to appease Vite's optimizeDeps feature which requires a root-level import.

module.exports = new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === '__esModule') {
        return {}
      }

      throw new Error(
        `Importing from \`@nomercy/icons/vue\` directly is not supported. Please import from either \`@nomercy/icons/vue/24/filled\`, or \`@nomercy/icons/vue/24/outlined\` instead.`
      )
    },
  }
)
