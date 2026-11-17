#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const ALLOWED_BASES = new Set([
  'dark',
  'light',
  'dark-daltonized',
  'light-daltonized',
  'dark-ansi',
  'light-ansi'
])

const ALLOWED_TOKENS = new Set([
  'claude',
  'text',
  'inverseText',
  'inactive',
  'subtle',
  'suggestion',
  'permission',
  'remember',
  'success',
  'error',
  'warning',
  'merged',
  'promptBorder',
  'planMode',
  'autoAccept',
  'bashBorder',
  'ide',
  'fastMode',
  'effortUltra',
  'diffAdded',
  'diffRemoved',
  'diffAddedDimmed',
  'diffRemovedDimmed',
  'diffAddedWord',
  'diffRemovedWord',
  'userMessageBackground',
  'userMessageBackgroundHover',
  'bashMessageBackgroundColor',
  'memoryBackgroundColor',
  'selectionBg',
  'composerSidebarBackground',
  'rate_limit_fill',
  'rate_limit_empty',
  'briefLabelYou',
  'briefLabelClaude',
  'claudeShimmer',
  'warningShimmer',
  'permissionShimmer',
  'promptBorderShimmer',
  'inactiveShimmer',
  'fastModeShimmer',
  'red_FOR_SUBAGENTS_ONLY',
  'blue_FOR_SUBAGENTS_ONLY',
  'green_FOR_SUBAGENTS_ONLY',
  'yellow_FOR_SUBAGENTS_ONLY',
  'purple_FOR_SUBAGENTS_ONLY',
  'orange_FOR_SUBAGENTS_ONLY',
  'pink_FOR_SUBAGENTS_ONLY',
  'cyan_FOR_SUBAGENTS_ONLY',
  'rainbow_red',
  'rainbow_orange',
  'rainbow_yellow',
  'rainbow_green',
  'rainbow_blue',
  'rainbow_indigo',
  'rainbow_violet',
  'rainbow_red_shimmer',
  'rainbow_orange_shimmer',
  'rainbow_yellow_shimmer',
  'rainbow_green_shimmer',
  'rainbow_blue_shimmer',
  'rainbow_indigo_shimmer',
  'rainbow_violet_shimmer'
])

const ANSI_NAMES = new Set([
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'blackBright',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
  'whiteBright'
])

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX6_RE = /^#[0-9a-fA-F]{6}$/
const HEX3_RE = /^#[0-9a-fA-F]{3}$/
const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
const ANSI256_RE = /^ansi256\(\s*(\d{1,3})\s*\)$/
const ANSI_RE = /^ansi:([A-Za-z]+)$/

const errors = []
const warnings = []

function fail(message) {
  errors.push(message)
}

function warn(message) {
  warnings.push(message)
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`${path}: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

function checkRelativePath(value, label) {
  const values = Array.isArray(value) ? value : [value]
  for (const path of values) {
    if (typeof path !== 'string') {
      fail(`${label}: path must be a string or an array of strings`)
      continue
    }
    if (!path.startsWith('./')) fail(`${label}: path must start with "./" (${path})`)
    if (path.includes('..')) fail(`${label}: path must not contain ".." (${path})`)
    if (!existsSync(join(root, path))) fail(`${label}: path does not exist (${path})`)
  }
}

function isColor(value) {
  if (typeof value !== 'string') return false
  if (HEX6_RE.test(value) || HEX3_RE.test(value)) return true

  const rgb = value.match(RGB_RE)
  if (rgb) return rgb.slice(1).every((part) => Number(part) <= 255)

  const ansi256 = value.match(ANSI256_RE)
  if (ansi256) return Number(ansi256[1]) <= 255

  const ansi = value.match(ANSI_RE)
  if (ansi) return ANSI_NAMES.has(ansi[1])

  return false
}

function checkFrontmatter(file, requiredKeys, label) {
  const content = readFileSync(file, 'utf8')
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) {
    fail(`${label}: missing YAML frontmatter`)
    return
  }

  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) fields[key] = value
  }

  for (const key of requiredKeys) {
    if (!fields[key]) fail(`${label}: frontmatter is missing "${key}"`)
  }
}

function validateManifest() {
  const manifest = readJson(join(root, '.claude-plugin/plugin.json'))
  if (!manifest) return

  if (typeof manifest.name !== 'string' || !KEBAB_RE.test(manifest.name)) {
    fail('.claude-plugin/plugin.json: "name" must be kebab-case')
  }
  if (typeof manifest.version !== 'string' || !manifest.version) {
    fail('.claude-plugin/plugin.json: "version" must be a non-empty string')
  }
  if (typeof manifest.description !== 'string' || !manifest.description) {
    fail('.claude-plugin/plugin.json: "description" must be a non-empty string')
  }
  if (manifest.author === undefined) {
    warn('.claude-plugin/plugin.json: "author" is recommended')
  } else if (typeof manifest.author !== 'object' || manifest.author === null || !manifest.author.name) {
    fail('.claude-plugin/plugin.json: "author" must be an object with a "name"')
  }
  if (manifest.license !== 'MIT') {
    warn('.claude-plugin/plugin.json: expected "license" to be "MIT"')
  }

  checkRelativePath(manifest.skills, '.claude-plugin/plugin.json: skills')
  checkRelativePath(manifest.commands, '.claude-plugin/plugin.json: commands')

  const themePaths = manifest.experimental?.themes ?? './themes/'
  checkRelativePath(themePaths, '.claude-plugin/plugin.json: experimental.themes')
  validateThemes(themePaths)
}

function themeFiles(themePaths) {
  const paths = Array.isArray(themePaths) ? themePaths : [themePaths]
  const files = []
  for (const path of paths) {
    const absolute = join(root, path)
    if (!existsSync(absolute)) continue
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute)) {
        if (name.endsWith('.json')) files.push(join(absolute, name))
      }
    } else if (absolute.endsWith('.json')) {
      files.push(absolute)
    }
  }
  return files.sort()
}

function validateThemes(themePaths) {
  const files = themeFiles(themePaths)
  if (files.length === 0) {
    fail('themes/: no theme JSON files found')
    return
  }

  const tokenSets = new Map()

  for (const file of files) {
    const label = `themes/${basename(file)}`
    const theme = readJson(file)
    if (!theme) continue

    if (typeof theme.name !== 'string' || !theme.name) {
      fail(`${label}: "name" must be a non-empty string`)
    }
    if (!ALLOWED_BASES.has(theme.base)) {
      fail(`${label}: "base" must be one of ${[...ALLOWED_BASES].join(', ')}`)
    }
    if (typeof theme.overrides !== 'object' || theme.overrides === null || Array.isArray(theme.overrides)) {
      fail(`${label}: "overrides" must be an object`)
      continue
    }

    const entries = Object.entries(theme.overrides)
    if (entries.length === 0) warn(`${label}: "overrides" is empty`)

    const keys = new Set()
    for (const [token, value] of entries) {
      keys.add(token)
      if (!ALLOWED_TOKENS.has(token)) fail(`${label}: unknown override token "${token}"`)
      if (!isColor(value)) {
        fail(`${label}: "${token}" has an invalid color value (${JSON.stringify(value)})`)
      }
    }

    if (basename(file) === 'chii-light.json' && theme.base !== 'light') {
      fail(`${label}: expected base "light"`)
    }
    if (basename(file) === 'chii-dark.json' && theme.base !== 'dark') {
      fail(`${label}: expected base "dark"`)
    }

    tokenSets.set(basename(file), keys)
  }

  const entries = [...tokenSets.entries()]
  if (entries.length > 1) {
    const [referenceName, reference] = entries[0]
    for (const [name, keys] of entries.slice(1)) {
      const missing = [...reference].filter((key) => !keys.has(key))
      const extra = [...keys].filter((key) => !reference.has(key))
      if (missing.length || extra.length) {
        warn(`themes/${name}: token set differs from themes/${referenceName} (missing: ${missing.join(', ') || '-'}; extra: ${extra.join(', ') || '-'})`)
      }
    }
  }
}

function validateSkillsAndCommands() {
  const skillsDir = join(root, 'skills')
  if (!existsSync(skillsDir)) {
    fail('skills/: directory is missing')
  } else {
    const skills = readdirSync(skillsDir).filter((name) => existsSync(join(skillsDir, name, 'SKILL.md')))
    if (skills.length === 0) fail('skills/: no <name>/SKILL.md found')
    for (const name of skills) {
      checkFrontmatter(
        join(skillsDir, name, 'SKILL.md'),
        ['name', 'description'],
        `skills/${name}/SKILL.md`
      )
    }
  }

  const commandsDir = join(root, 'commands')
  if (!existsSync(commandsDir)) {
    fail('commands/: directory is missing')
  } else {
    const commands = readdirSync(commandsDir).filter((name) => name.endsWith('.md'))
    if (commands.length === 0) warn('commands/: no command markdown files found')
    for (const name of commands) {
      checkFrontmatter(join(commandsDir, name), ['description'], `commands/${name}`)
    }
  }
}

function marketplacePluginName(source) {
  if (typeof source !== 'string' || !source.startsWith('./')) return undefined
  const manifest = readJson(join(root, source, '.claude-plugin/plugin.json'))
  return manifest?.name
}

function validateMarketplace() {
  const path = join(root, '.claude-plugin/marketplace.json')
  if (!existsSync(path)) {
    fail('.claude-plugin/marketplace.json: file is missing')
    return
  }

  const marketplace = readJson(path)
  if (!marketplace) return

  if (typeof marketplace.name !== 'string' || !KEBAB_RE.test(marketplace.name)) {
    fail('.claude-plugin/marketplace.json: "name" must be kebab-case')
  }
  if (typeof marketplace.owner !== 'object' || marketplace.owner === null || !marketplace.owner.name) {
    fail('.claude-plugin/marketplace.json: "owner" must be an object with a "name"')
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail('.claude-plugin/marketplace.json: "plugins" must be a non-empty array')
    return
  }

  marketplace.plugins.forEach((entry, index) => {
    const label = `.claude-plugin/marketplace.json: plugins[${index}]`
    if (typeof entry !== 'object' || entry === null) {
      fail(`${label} must be an object`)
      return
    }
    if (typeof entry.name !== 'string' || !KEBAB_RE.test(entry.name)) {
      fail(`${label}.name must be kebab-case`)
    }
    if (typeof entry.source !== 'string') {
      warn(`${label}: this validator only checks string sources`)
      return
    }
    if (!entry.source.startsWith('./')) fail(`${label}.source must start with "./"`)
    if (entry.source.includes('..')) fail(`${label}.source must not contain ".."`)
    if (!existsSync(join(root, entry.source))) {
      fail(`${label}.source does not exist (${entry.source})`)
      return
    }

    const manifestName = marketplacePluginName(entry.source)
    if (manifestName && manifestName !== entry.name) {
      fail(`${label}.name does not match the plugin manifest name "${manifestName}"`)
    }
    if (typeof entry.description !== 'string' || !entry.description) {
      warn(`${label}.description is recommended`)
    }
  })
}

validateManifest()
validateSkillsAndCommands()
validateMarketplace()

for (const message of warnings) console.warn(`warning: ${message}`)

if (errors.length) {
  for (const message of errors) console.error(`error: ${message}`)
  console.error(`\nValidation failed with ${errors.length} error(s).`)
  process.exitCode = 1
} else {
  console.log('Validation passed.')
}
