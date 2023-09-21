// The only reason this file exists is to appease Vite's optimizeDeps feature which requires a root-level import.

export default new Proxy(
  {},
  {
    get: (_, property) => {
      if (property === '__esModule') {
        return {}
      }

      throw new Error(
        `Importing from \`@muiicons/vue\` directly is not supported. Please import from either \`@muiicons/vue/24/filled\`, or \`@muiicons/vue/24/outlined\` instead.`
      )
    },
  }
)
