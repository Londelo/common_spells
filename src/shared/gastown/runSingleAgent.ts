import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute, executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { SandboxConfig, SandboxResult, GT_DIR } from './types'
import {
  removeSandbox,
  resolveWorkspace,
  resolveSandboxPaths,
  ensureDirectories,
  escapePrompt,
  readAndDisplayOutputFile
} from './helpers'

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const checkGastownTemplate = (): void => {
  const dockerfilePath = path.join(GT_DIR, 'Dockerfile.gastown')

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(
      'Gastown Docker template not found. Please run "gt-setup" first to create the template.'
    )
  }
}

export const writeOutputHeader = (
  outputFile: string,
  config: { workspace: string; prompt: string }
): void => {
  const promptLine = `Prompt: ${config.prompt.slice(0, 100)}...\n`
  const header = `Started: ${new Date().toISOString()}\nWorkspace: ${config.workspace}\n${promptLine}---\n`
  fs.writeFileSync(outputFile, header)
}

export const writeOutputFooter = (outputFile: string): void => {
  const footer = `\nCompleted: ${new Date().toISOString()}\n`
  echo(green(footer))
  fs.appendFileSync(outputFile, footer)
}


const readPromptFromFile = (promptFile: string): string => {
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file does not exist: ${promptFile}`)
  }
  return fs.readFileSync(promptFile, 'utf-8')
}

const printStartupInfo = (sandboxName: string, workspace: string): void => {
  echo(green('Starting sandbox'))
  echo(`  Name:      ${sandboxName}`)
  echo(`  Workspace: ${workspace}`)
  echo(`  Logs:      Use 'docker sandbox logs ${sandboxName}' to view`)
  echo('')
}

export const buildSandboxCommand = (
  name: string,
  workspace: string,
  options: { detached?: boolean; }
): string => {
  const templateName = 'gastown:latest'
  const detachedFlag = options.detached ? ['--detach'] : []

  return [
    'docker', 'sandbox', 'run',
    '--name', `"${name}"`,
    '-t', templateName,
    ...detachedFlag,
    'claude', `"${workspace}"`
  ].join(' ')
}

const runInteractiveMode = async (
  command: string,
  sandboxName: string,
  paths: ReturnType<typeof resolveSandboxPaths>
): Promise<SandboxResult> => {

  echo(yellow(command))

  echo('')

  await executeInteractive(command, `Failed to run sandbox ${sandboxName}`)

  echo('')

  echo(green('Sandbox exited'))

  return {
    sandboxName,
    workspace: '',
    outputFile: paths.outputFile,
    status: 'completed',
  }
}

const runDetachedMode = async (
  command: string,
  sandboxName: string,
  paths: ReturnType<typeof resolveSandboxPaths>,
  resolvedConfig: SandboxConfig & { prompt: string; }
): Promise<SandboxResult> => {

  echo('')

  echo(yellow(command))
  await execute(command, `Failed to start sandbox ${sandboxName}`)

  const prompt = escapePrompt(resolvedConfig.prompt)
  const dockerExec = `docker exec "${sandboxName}" bash -c`
  const claudeCmd = `echo '${prompt}' | claude -p --output-format stream-json --verbose`
  const cdAndRun = `cd '${resolvedConfig.workspace}' && ${claudeCmd}`
  const promptCommand = `${dockerExec} "${cdAndRun}" >> "${paths.outputFile}" 2>&1`

  await sleep(2000)
  echo(yellow(promptCommand))
  await writeOutputHeader(paths.outputFile, resolvedConfig)
  echo(green('Claude is working in background'))
  await execute(promptCommand, `Failed to execute follow-up command in sandbox ${sandboxName}`)
  await writeOutputFooter(paths.outputFile)

  readAndDisplayOutputFile(paths.outputFile)

  return {
    sandboxName,
    workspace: '',
    outputFile: paths.outputFile,
    status: 'running',
  }
}

const runSingleAgent = async (config: SandboxConfig): Promise<SandboxResult> => {
  // Check if template exists, prompt to run setup if not
  checkGastownTemplate()

  const workspace = resolveWorkspace(config.workspace)
  const paths = resolveSandboxPaths(config.sandboxName, config.outputFile)

  ensureDirectories(paths)

  await removeSandbox(config.sandboxName)

  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const needsDetached = !!prompt
  const command = buildSandboxCommand(config.sandboxName, workspace, { detached: needsDetached })

  printStartupInfo(config.sandboxName, workspace)

  if (!needsDetached) {
    const result = await runInteractiveMode(command, config.sandboxName, paths)
    return { ...result, workspace }
  } else {
    const resolvedConfig = { ...config, prompt, workspace }
    const result = await runDetachedMode(command, config.sandboxName, paths, resolvedConfig)
    return { ...result, workspace }
  }
}

export default runSingleAgent
