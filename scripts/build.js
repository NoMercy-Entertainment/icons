const fs = require('fs').promises
const camelcase = require('camelcase')
const { promisify } = require('util')
const rimraf = promisify(require('rimraf'))
const svgr = require('@svgr/core').default
const babel = require('@babel/core')
const { compile: compileVue } = require('@vue/compiler-dom')
const { dirname } = require('path')

let transform = {
  react: async (svg, componentName, format) => {
    let component = await svgr(svg, { ref: true, titleProp: true }, { componentName })
    let { code } = await babel.transformAsync(component, {
      plugins: [[require('@babel/plugin-transform-react-jsx'), { useBuiltIns: true }]],
    })

    if (format === 'esm') {
      return code
    }

    return code
      .replace('import * as React from "react"', 'const React = require("react")')
      .replace('export default', 'module.exports =')
  },
  vue: (svg, componentName, format) => {
    let { code } = compileVue(svg, {
      mode: 'module',
    })

    if (format === 'esm') {
      return code.replace('export function', 'export default function')
    }

    return code
      .replace(
        /import\s+\{\s*([^}]+)\s*\}\s+from\s+(['"])(.*?)\2/,
        (_match, imports, _quote, mod) => {
          let newImports = imports
            .split(',')
            .map((i) => i.trim().replace(/\s+as\s+/, ': '))
            .join(', ')

          return `const { ${newImports} } = require("${mod}")`
        }
      )
      .replace('export function render', 'module.exports = function render')
  },
}

async function getIcons(style) {
  let files = await fs.readdir(`./optimized/${style}`)
  return Promise.all(
    files.map(async (file) => ({
      svg: await fs.readFile(`./optimized/${style}/${file}`, 'utf8'),
      componentName: `${camelcase(file.replace(/\.svg$/, ''), {
        pascalCase: true,
      })}Icon`,
    }))
  )
}

function exportAll(icons, format, includeExtension = true) {
  return icons
    .map(({ componentName }) => {
      let extension = includeExtension ? '.js' : ''
      if (format === 'esm') {
        return `export { default as ${componentName.replace(/Icon$/gu, '')} } from './${componentName}${extension}'`
      }
      return `module.exports.${componentName.replace(/Icon$/gu, '')} = require("./${componentName}${extension}")`
    })
    .join('\n')
}

async function ensureWrite(file, text) {
  await fs.mkdir(dirname(file), { recursive: true })
  await fs.writeFile(file, text, 'utf8')
}

async function ensureWriteJson(file, json) {
  await ensureWrite(file, JSON.stringify(json, null, 2) + '\n')
}

async function buildIcons(type, style, format) {
  let outDir = `./${type}/${style}`
  if (format === 'esm') {
    outDir += '/esm'
  }

  let icons = await getIcons(style)

  await Promise.all(
    icons.flatMap(async ({ componentName, svg }) => {
      let content = await transform[type](svg, componentName, format)
      let types =
        type === 'react'
          ? `import * as React from 'react';\ndeclare const ${componentName.replace(/Icon$/gu, '')}: React.ForwardRefExoticComponent<React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & { title?: string, titleId?: string } & React.RefAttributes<SVGSVGElement>>;\nexport default ${componentName.replace(/Icon$/gu, '')};\n`
          : `import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';\ndeclare const ${componentName.replace(/Icon$/gu, '')}: FunctionalComponent<HTMLAttributes & VNodeProps>;\nexport default ${componentName.replace(/Icon$/gu, '')};\n`

      return [
        ensureWrite(`${outDir}/${componentName}.js`, content),
        ...(types ? [ensureWrite(`${outDir}/${componentName}.d.ts`, types)] : []),
      ]
    })
  )

  await ensureWrite(`${outDir}/index.js`, exportAll(icons, format))

  await ensureWrite(`${outDir}/index.d.ts`, exportAll(icons, 'esm', false))
}

/**
 * @param {string[]} styles
 */
async function buildExports(styles) {
  let pkg = {}

  // To appease Vite's optimizeDeps feature which requires a root-level import
  pkg[`.`] = {
    import: `./index.esm.js`,
    require: `./index.js`,
  }

  // For those that want to read the version from package.json
  pkg[`./package.json`] = { default: './package.json' }

  // Backwards compatibility with v1 imports (points to proxy that prints an error message):
  pkg['./mui'] = { default: './mui/index.js' }
  pkg['./mui/index'] = { default: './mui/index.js' }
  pkg['./mui/index.js'] = { default: './mui/index.js' }

  pkg['./brands'] = { default: './brands/index.js' }
  pkg['./brands/index'] = { default: './brands/index.js' }
  pkg['./brands/index.js'] = { default: './brands/index.js' }

  // Explicit exports for each style:
  for (let style of styles) {
    pkg[`./${style}`] = {
      types: `./${style}/index.d.ts`,
      import: `./${style}/esm/index.js`,
      require: `./${style}/index.js`,
    }
    pkg[`./${style}/*`] = {
      types: `./${style}/*.d.ts`,
      import: `./${style}/esm/*.js`,
      require: `./${style}/*.js`,
    }
    pkg[`./${style}/*.js`] = {
      types: `./${style}/*.d.ts`,
      import: `./${style}/esm/*.js`,
      require: `./${style}/*.js`,
    }

    // This dir is basically an implementation detail, but it's needed for
    // backwards compatibility in case people were importing from it directly.
    pkg[`./${style}/esm/*`] = {
      types: `./${style}/*.d.ts`,
      import: `./${style}/esm/*.js`,
    }
    pkg[`./${style}/esm/*.js`] = {
      types: `./${style}/*.d.ts`,
      import: `./${style}/esm/*.js`,
    }
  }

  return pkg
}

async function main(type) {
  const cjsPackageJson = { module: './esm/index.js', sideEffects: false }
  const esmPackageJson = { type: 'module', sideEffects: false }

  console.log(`Building ${type} package...`)

  await Promise.all([
    rimraf(`./${type}/mui/*`),
    rimraf(`./${type}/brands/*`),
  ])

  await Promise.all([
    buildIcons(type, 'mui', 'cjs'),
    buildIcons(type, 'mui', 'esm'),
    ensureWriteJson(`./${type}/mui/esm/package.json`, esmPackageJson),
    ensureWriteJson(`./${type}/mui/package.json`, cjsPackageJson),
    buildIcons(type, 'brands', 'cjs'),
    buildIcons(type, 'brands', 'esm'),
    ensureWriteJson(`./${type}/brands/esm/package.json`, esmPackageJson),
    ensureWriteJson(`./${type}/brands/package.json`, cjsPackageJson),
  ])

  let packageJson = JSON.parse(await fs.readFile(`./${type}/package.json`, 'utf8'))

  packageJson.exports = await buildExports([
    'mui',
    'brands',
  ]);

  await ensureWriteJson(`./${type}/package.json`, packageJson)

  return console.log(`Finished building ${type} package.`)
}

let [type] = process.argv.slice(2)

if (!type) {
  throw new Error('Please specify a package')
}

main(type)
