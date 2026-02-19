import fs from 'fs'
import { echo } from 'shelljs'
import { execute, executeInteractive } from '../shell'
import { green, cyan, yellow } from '../colors'
import { SandboxConfig, SandboxMode, SandboxResult } from './types'
import {
  readBedrockConfig,
  escapePrompt,
  removeSandbox,
  resolveWorkspace,
  resolveSandboxPaths,
  ensureDirectories,
  writeLogHeader,
  buildSandboxCommand,
} from './helpers'

// --- Private helpers (only used by runSingleAgent) ---

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const determineMode = (config: SandboxConfig): SandboxMode =>
  config.detached ? 'detached' : config.prompt ? 'headless' : 'interactive'

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

// --- Mode Runners ---

const runDetached = async (
  sandboxName: string,
  command: string,
  prompt: string | undefined,
  paths: { logFile: string; outputFile: string }
): Promise<SandboxResult> => {
  // Start container - Docker will handle logging
  echo(yellow(command))
  await execute(command, `Failed to start sandbox ${sandboxName}`)

  if (prompt) {
    const escaped = escapePrompt(prompt)
    const execCmd = `docker exec "${sandboxName}" bash -c "echo '${escaped}' | claude -p --output-format stream-json --verbose" > "${paths.outputFile}" 2>&1 &`
    echo(yellow(execCmd))
    await execute(execCmd, `Failed to send prompt to sandbox ${sandboxName}`)

    echo(green('Sandbox started in background'))
    echo(`  Output: ${paths.outputFile}`)
    echo('')
    echo('Commands:')
    echo(`  docker exec -it ${sandboxName} claude    # Interactive session`)
    echo(`  tail -f ${paths.outputFile}              # Watch output`)
    echo(`  docker logs ${sandboxName}               # View logs`)
    echo(`  docker sandbox rm ${sandboxName}         # Stop sandbox (logs will be saved)`)
  } else {
    echo(green('Sandbox started in background'))
    echo('')
    echo('Commands:')
    echo(`  docker exec -it ${sandboxName} claude    # Interactive session`)
    echo(`  docker logs ${sandboxName}               # View logs`)
    echo(`  docker sandbox rm ${sandboxName}         # Stop sandbox (logs will be saved)`)
  }

  return { sandboxName, mode: 'detached', workspace: '', logFile: paths.logFile, outputFile: paths.outputFile, status: 'running' }
}

const runHeadless = async (
  sandboxName: string,
  command: string,
  prompt: string,
  paths: { logFile: string; outputFile: string }
): Promise<SandboxResult> => {
  echo(cyan('Running in headless mode...'))
  echo('')

  // Start container - Docker will handle logging
  echo(yellow(command))
  await execute(command, `Failed to start sandbox ${sandboxName}`)
  await sleep(2000)

  // Execute prompt and save output (Docker captures all logs automatically)
  const escaped = escapePrompt(prompt)
  const execCmd = `docker exec "${sandboxName}" bash -c "echo '${escaped}' | claude -p --output-format stream-json --verbose" > "${paths.outputFile}" 2>&1`

  echo(yellow(execCmd))
  await execute(execCmd, `Failed to execute prompt in sandbox ${sandboxName}`)

  // Remove sandbox (logs will be saved automatically)
  await removeSandbox(sandboxName)

  echo('')
  echo(green('Task completed'))
  echo(`  Output: ${paths.outputFile}`)

  return { sandboxName, mode: 'headless', workspace: '', logFile: paths.logFile, outputFile: paths.outputFile, status: 'completed' }
}

const runInteractive = async (
  sandboxName: string,
  command: string,
  paths: { logFile: string }
): Promise<SandboxResult> => {
  // Interactive mode runs directly - Docker captures logs automatically
  echo(yellow(command))
  echo('')

  await executeInteractive(command, `Failed to run interactive sandbox ${sandboxName}`)

  // Remove sandbox (logs will be saved automatically)
  await removeSandbox(sandboxName)

  echo('')
  echo(green('Sandbox exited'))

  return { sandboxName, mode: 'interactive', workspace: '', logFile: paths.logFile, status: 'completed' }
}

// --- Main Entry Point ---

const runSingleAgent = async (config: SandboxConfig): Promise<SandboxResult> => {
  const workspace = resolveWorkspace(config.workspace)
  const paths = resolveSandboxPaths(config.sandboxName, config.outputFile)
  ensureDirectories(paths)

  await removeSandbox(config.sandboxName)

  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const resolvedConfig = { ...config, prompt, workspace }
  const mode = determineMode(resolvedConfig)

  const bedrockConfig = readBedrockConfig()
  const needsDetached = mode === 'detached' || mode === 'headless'
  const command = buildSandboxCommand(config.sandboxName, workspace, bedrockConfig, {
    detached: needsDetached,
    continueFlag: config.continueConversation,
  })

  writeLogHeader(paths.logFile, resolvedConfig, mode)
  printStartupInfo(config.sandboxName, workspace)

  const modeRunners: Record<SandboxMode, () => Promise<SandboxResult>> = {
    detached: () => runDetached(config.sandboxName, command, prompt, paths),
    headless: () => runHeadless(config.sandboxName, command, prompt as string, paths),
    interactive: () => runInteractive(config.sandboxName, command, paths),
  }

  const result = await modeRunners[mode]()
  return { ...result, workspace }
}

export default runSingleAgent
