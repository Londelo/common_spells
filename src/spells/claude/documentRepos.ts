#!/usr/bin/env node
import { echo } from 'shelljs'
import inquirer from 'inquirer'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { execute } from '../../shared/shell'
import { green, yellow, cyan } from '../../shared/colors'
import setup from '../../shared/dockerSandbox/setup'

type Classification = 'service' | 'worker' | 'frontend' | 'library' | 'infrastructure' | 'pipeline'

type RepoConfig = {
  path: string
  dirName: string
  name: string
  classification: Classification
}

const CLASSIFICATIONS: Classification[] = ['service', 'worker', 'frontend', 'library', 'infrastructure', 'pipeline']

const EXCLUDED_PATTERNS = ['node_modules', 'vendor', '.venv', '/.']

const DOCTOMOS_PLUGIN = 'doctomos'

const extractDirName = (repoPath: string): string => repoPath.split('/').filter(Boolean).pop() || 'unknown'

const discoverRepos = async (cwd: string): Promise<string[]> => {
  echo(yellow('Discovering repositories...'))

  const result = await execute(
    `find "${cwd}" -maxdepth 4 -name ".git" -type d 2>/dev/null`,
    'Failed to discover repositories'
  )

  const repos = result
    .split('\n')
    .filter((line: string) => line.trim().length > 0)
    .map((gitDir: string) => gitDir.replace(/\/\.git$/, ''))
    .filter((path: string) => path !== cwd)
    .filter((path: string) => !EXCLUDED_PATTERNS.some(pattern => path.includes(pattern)))

  echo(yellow(`Found ${repos.length} repositories`))
  return repos
}

const selectRepos = async (repoPaths: string[]): Promise<string[]> => {
  const choices = repoPaths
    .map((path: string) => ({
      name: `${extractDirName(path)}  ${yellow(path).dim}`,
      value: path,
      checked: false,
      sortKey: extractDirName(path).toLowerCase(),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select repositories to document:',
      choices,
    },
  ])

  return selected
}

const configureRepo = async (repoPath: string): Promise<RepoConfig> => {
  const dirName = extractDirName(repoPath)
  echo(yellow(`\nConfiguring: ${dirName}\nPath: ${repoPath}`))

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Documentation name:',
      default: dirName,
    },
  ])

  const { classification } = await inquirer.prompt([
    {
      type: 'list',
      name: 'classification',
      message: 'Classification:',
      choices: CLASSIFICATIONS,
    },
  ])

  return { path: repoPath, dirName, name, classification }
}

const configureRepos = async (selectedPaths: string[]): Promise<RepoConfig[]> =>
  selectedPaths.reduce(
    async (accPromise: Promise<RepoConfig[]>, repoPath: string) => {
      const acc = await accPromise
      const config = await configureRepo(repoPath)
      return [...acc, config]
    },
    Promise.resolve([] as RepoConfig[])
  )

const buildPrompt = (config: RepoConfig): string =>
  `/document-repos Path: ${config.path}, Name: ${config.name}, Classification: ${config.classification}`

type LaunchMode = 'tabs' | 'windows'

const buildOsascript = (terminalCommand: string, mode: LaunchMode): string =>
  mode === 'tabs'
    ? [
        'osascript',
        '-e \'tell application "Terminal" to activate\'',
        '-e \'tell application "System Events" to keystroke "t" using command down\'',
        '-e \'delay 0.5\'',
        `-e 'tell application "Terminal" to do script "${terminalCommand}" in front window'`,
      ].join(' ')
    : `osascript -e 'tell application "Terminal" to do script "${terminalCommand}"'`

const selectLaunchMode = async (): Promise<LaunchMode> => {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Open sandboxes in:',
      choices: [
        { name: 'Tabs (in one window)', value: 'tabs' },
        { name: 'Separate windows', value: 'windows' },
      ],
    },
  ])
  return mode
}

const launchDockerSandboxInTerminal = async (config: RepoConfig, mode: LaunchMode): Promise<void> => {
  const sandboxName = config.dirName
  const prompt = buildPrompt(config)
  const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  // Build the docker sandbox command
  const dockerCommand = `docker sandbox run --name "${sandboxName}" -t docker-sandbox:latest claude "${config.path}" -- --print "${escapedPrompt}"`
  const terminalCommand = dockerCommand.replace(/"/g, '\\"')

  const osascript = buildOsascript(terminalCommand, mode)

  echo(cyan(`Launching sandbox for ${config.name} in new ${mode === 'tabs' ? 'tab' : 'window'}...`))
  await execute(osascript, `Failed to launch Terminal for ${config.name}`)
}

const launchAllDockerSandboxes = async (configs: RepoConfig[]): Promise<void> => {
  // Step 1: Run ds-setup with doctomos plugin
  echo(cyan('\n=== Setting up Docker Sandbox with doctomos plugin ===\n'))
  await setup(DOCTOMOS_PLUGIN)

  // Step 2: Ask user how to open sandboxes
  const mode = await selectLaunchMode()

  // Step 3: Launch sandboxes in terminal windows/tabs
  echo(cyan('\n=== Launching Docker Sandboxes ===\n'))

  // Launch all sandboxes in parallel (they run in separate terminals)
  await Promise.all(
    configs.map((config) => launchDockerSandboxInTerminal(config, mode))
  )

  echo(green('\n=== All sandboxes launched ===\n'))
  echo(green(`✓ Launched ${configs.length} repository documentation session(s):`))
  configs.forEach((config, index) => {
    echo(green(`  ${index + 1}. ${config.name} (${config.classification}) — ${config.path}`))
  })
  echo(yellow('\nCheck Terminal.app for the running Docker sandboxes'))
}

const errorMessage = 'Error in document-repos'

const document_repos = async () => {
  const cwd = (await execute('pwd', 'Failed to get current directory')).trim()

  const repoPaths = await discoverRepos(cwd)
  if (repoPaths.length === 0) {
    echo(yellow('No repositories found in the current directory'))
    return
  }

  const selectedPaths = await selectRepos(repoPaths)
  if (selectedPaths.length === 0) {
    echo(yellow('No repositories selected'))
    return
  }

  const configs = await configureRepos(selectedPaths)

  await launchAllDockerSandboxes(configs)
}

;(async () => await errorHandlerWrapper(document_repos, errorMessage))()
