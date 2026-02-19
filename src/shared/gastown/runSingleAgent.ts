import fs from 'fs'
import { echo } from 'shelljs'
import { execute, executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { SandboxConfig, SandboxMode, SandboxResult } from './types'
import {
  readBedrockConfig,
  removeSandbox,
  resolveWorkspace,
  resolveSandboxPaths,
  ensureDirectories,
  writeLogHeader,
  buildSandboxCommand,
} from './helpers'

// --- Private helpers (only used by runSingleAgent) ---

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
  echo(`  Logs:      Use 'docker logs ${sandboxName}' to view`)
  echo('')
}

// --- Main Entry Point ---

const runSingleAgent = async (config: SandboxConfig): Promise<SandboxResult> => {
  const workspace = resolveWorkspace(config.workspace)
  const paths = resolveSandboxPaths(config.sandboxName, config.outputFile)
  ensureDirectories(paths)

  await removeSandbox(config.sandboxName)

  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const mode = config.mode || 'interactive'
  const resolvedConfig = { ...config, prompt, workspace, mode }

  const bedrockConfig = readBedrockConfig()
  const needsDetached = mode === 'headless'
  const command = buildSandboxCommand(config.sandboxName, workspace, bedrockConfig, {
    detached: needsDetached,
    continueFlag: config.continueConversation,
    prompt,
  })

  printStartupInfo(config.sandboxName, workspace)
  echo(yellow(command))
  writeLogHeader(paths.logFile, resolvedConfig, mode)
  echo('')

  if (mode === 'interactive') {
    await executeInteractive(command, `Failed to run sandbox ${config.sandboxName}`)
    await removeSandbox(config.sandboxName)
    echo('')
    echo(green('Sandbox exited'))
    return { sandboxName: config.sandboxName, mode, workspace, logFile: paths.logFile, status: 'completed' }
  } else {
    // Headless mode
    await execute(command, `Failed to start sandbox ${config.sandboxName}`)
    echo(green('Sandbox started in background'))
    return { sandboxName: config.sandboxName, mode, workspace, logFile: paths.logFile, status: 'running' }
  }
}

export default runSingleAgent
