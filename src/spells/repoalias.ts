#!/usr/bin/env node
import { echo, test } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { input, confirm, select } from '../shared/inquirer'
import { execute } from '../shared/shell'
import { green, yellow, cyan } from '../shared/colors'
import * as fs from 'fs'

// Constants
const ALIAS_FILE = `${process.env.HOME}/.repo_aliases`

// Pure helper functions
const parseArgs = (): { configMode: boolean; openMode: boolean } => ({
  configMode: process.argv.includes('--config'),
  openMode: process.argv.includes('--open')
})

const escapePathForAlias = (path: string): string =>
  path.replace(/'/g, "'\\''")

const formatAliasLine = (alias: string, path: string, ideCommand: string | null): string =>
  ideCommand
    ? `alias ${alias}='cd ${escapePathForAlias(path)} && ${ideCommand}'`
    : `alias ${alias}='cd ${escapePathForAlias(path)}'`

const extractAliasName = (line: string): string | null => {
  const match = line.match(/^alias\s+([^=]+)=/)
  return match ? match[1] : null
}

const extractPathFromAlias = (line: string): string | null => {
  const match = line.match(/cd\s+'?([^'&]+)'?/)
  return match ? match[1].replace(/\\'/g, "'") : null
}

const getRepoNameFromPath = (path: string): string => {
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}

// I/O functions
const displayAliases = async (): Promise<void> => {
  if (!test('-f', ALIAS_FILE)) {
    echo(yellow('No aliases configured. Run: repoalias --config'))
    return
  }

  const content = fs.readFileSync(ALIAS_FILE, 'utf-8')
  const lines = content.split('\n').filter(line => line.startsWith('alias '))

  if (lines.length === 0) {
    echo(yellow('No aliases configured. Run: repoalias --config'))
    return
  }

  echo(cyan('\nConfigured repo aliases:\n'))
  lines.forEach(line => {
    const name = extractAliasName(line)
    const path = extractPathFromAlias(line)
    if (name && path) {
      echo(`  ${green(name)} -> ${path}`)
    }
  })
  echo('')
}

const findGitRepos = async (baseDir: string): Promise<string[]> => {
  const result = await execute(
    `find "${baseDir}" -maxdepth 3 -type d -name ".git" -exec dirname {} \\;`,
    'Failed to find git repositories'
  )
  return result
    .split('\n')
    .filter((line: string) => line.trim().length > 0)
    .sort()
}

const detectShellConfigFile = (): string => {
  const home = process.env.HOME
  const configs = [
    `${home}/.zshrc`,
    `${home}/.bashrc`,
    `${home}/.bash_profile`
  ]

  const found = configs.find(config => test('-f', config))
  if (!found) {
    throw new Error('No shell config file found (.zshrc, .bashrc, or .bash_profile)')
  }
  return found
}

const checkSourceLineExists = async (shellConfigPath: string): Promise<boolean> => {
  try {
    await execute(`grep -q "source.*repo_aliases" "${shellConfigPath}"`, 'grep check')
    return true
  } catch {
    return false
  }
}

const addSourceLineToConfig = async (shellConfigPath: string): Promise<void> => {
  await execute(
    `echo '\n# Common Spells repo aliases\nsource ~/.repo_aliases' >> "${shellConfigPath}"`,
    'Failed to add source line to shell config'
  )
}

const readExistingAliasFile = async (): Promise<string[]> => {
  if (!test('-f', ALIAS_FILE)) {
    return []
  }
  const content = fs.readFileSync(ALIAS_FILE, 'utf-8')
  return content.split('\n').filter(line => line.startsWith('alias '))
}

const writeAliasFile = async (aliasLines: string[]): Promise<void> => {
  const header = '# Common Spells - Auto-generated repo aliases\n# Re-run \'repoalias --config\' to update\n\n'
  const content = header + aliasLines.join('\n') + '\n'
  fs.writeFileSync(ALIAS_FILE, content)
}

// Prompt functions
const promptForIdeCommand = async (): Promise<string | null> => {
  const choice = await select('IDE command to run after cd:', [
    'code . (Recommended - VS Code)',
    'Custom command...',
    'None (cd only)'
  ])

  if (choice === 'code . (Recommended - VS Code)') {
    return 'code .'
  }
  if (choice === 'Custom command...') {
    return await input('Enter custom IDE command:')
  }
  return null
}

const promptForAliases = async (repoPaths: string[]): Promise<Array<{ path: string; alias: string }>> => {
  const results: Array<{ path: string; alias: string }> = []

  // Using for...of with await (functional reduce doesn't work well with async sequential)
  const collectAlias = async (paths: string[], acc: Array<{ path: string; alias: string }>): Promise<Array<{ path: string; alias: string }>> => {
    if (paths.length === 0) return acc
    const [path, ...rest] = paths
    const defaultAlias = getRepoNameFromPath(path)
    echo(cyan(`\n${path}`))
    const alias = await input('Alias name (empty to skip):', defaultAlias)
    const newAcc = alias.trim() ? [...acc, { path, alias: alias.trim() }] : acc
    return collectAlias(rest, newAcc)
  }

  return collectAlias(repoPaths, results)
}

const mergeAliases = (
  existingLines: string[],
  newEntries: Array<{ path: string; alias: string }>,
  ideCommand: string | null
): string[] => {
  // Build map keyed by path so re-runs overwrite aliases for the same repo
  const aliasMap = new Map<string, string>()
  existingLines.forEach(line => {
    const path = extractPathFromAlias(line)
    if (path) aliasMap.set(path, line)
  })

  newEntries.forEach(({ alias, path }) => {
    aliasMap.set(path, formatAliasLine(alias, path, ideCommand))
  })

  // Return sorted array
  return Array.from(aliasMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, line]) => line)
}

// Main orchestration
const repoalias = async () => {
  const { configMode, openMode } = parseArgs()

  if (openMode) {
    await execute(`code ${ALIAS_FILE}`, 'Failed to open alias file')
    return
  }

  // Default mode: display existing aliases
  if (!configMode) {
    await displayAliases()
    return
  }

  // Config mode: full setup flow
  const currentDir = process.cwd()
  const shouldScan = await confirm(`Scan for git repos from ${currentDir}?`, true)
  if (!shouldScan) {
    echo(yellow('Scan cancelled'))
    return
  }

  echo(cyan('Scanning for git repositories...'))
  const repoPaths = await findGitRepos(currentDir)

  if (repoPaths.length === 0) {
    echo(yellow('No git repositories found within 3 levels'))
    return
  }

  echo(green(`Found ${repoPaths.length} repositories`))

  const ideCommand = await promptForIdeCommand()
  const newAliases = await promptForAliases(repoPaths)

  if (newAliases.length === 0) {
    echo(yellow('No aliases created'))
    return
  }

  const existingLines = await readExistingAliasFile()

  const shouldReplace = existingLines.length > 0
    ? await confirm('Existing aliases found. Replace all? (No = merge)', true)
    : true

  const finalLines = shouldReplace
    ? newAliases.map(({ alias, path }) => formatAliasLine(alias, path, ideCommand))
    : mergeAliases(existingLines, newAliases, ideCommand)

  await writeAliasFile(finalLines)
  echo(green(`\n✓ Wrote ${finalLines.length} aliases to ~/.repo_aliases`))

  const shellConfig = detectShellConfigFile()
  const hasSourceLine = await checkSourceLineExists(shellConfig)

  if (!hasSourceLine) {
    const shouldAddSource = await confirm(`Add source line to ${shellConfig}?`, true)
    if (shouldAddSource) {
      await addSourceLineToConfig(shellConfig)
      echo(cyan(`Added source line to ${shellConfig}`))
    } else {
      echo(yellow('\nSkipped adding source line. Add manually:'))
      echo(cyan(`  echo 'source ~/.repo_aliases' >> ${shellConfig}`))
    }
  }

  echo(yellow(`\nRun: source ${shellConfig}`))
}

const errorMessage = 'Error in repoalias command'

;(async () => await errorHandlerWrapper(repoalias, errorMessage))()
