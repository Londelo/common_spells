import fs from 'fs'
import { echo } from 'shelljs'
import { execute, executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { SandboxConfig, SandboxResult } from './types'
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
  const resolvedConfig = { ...config, prompt, workspace }

  const bedrockConfig = readBedrockConfig()
  const needsDetached = !!prompt
  const command = buildSandboxCommand(config.sandboxName, workspace, bedrockConfig, {
    detached: needsDetached,
    continueFlag: config.continueConversation,
    prompt,
  })

  writeLogHeader(paths.logFile, resolvedConfig)
  printStartupInfo(config.sandboxName, workspace)
  echo(yellow(command))
  echo('')

  if (!needsDetached) {
    await executeInteractive(command, `Failed to run sandbox ${config.sandboxName}`)
    await removeSandbox(config.sandboxName)
    echo('')
    echo(green('Sandbox exited'))
    return { sandboxName: config.sandboxName, workspace, logFile: paths.logFile, status: 'completed' }
  } else {
    // Detached mode with prompt
    await execute(command, `Failed to start sandbox ${config.sandboxName}`)
    echo(green('Sandbox started in background'))
    return { sandboxName: config.sandboxName, workspace, logFile: paths.logFile, status: 'running' }
  }
}

export default runSingleAgent
