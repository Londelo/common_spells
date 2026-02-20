import fs from 'fs'
import { echo } from 'shelljs'
import { execute, executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { BedrockConfig, SandboxConfig, SandboxResult } from './types'
import {
  readBedrockConfig,
  removeSandbox,
  resolveWorkspace,
  resolveSandboxPaths,
  ensureDirectories,
  writeLogHeader,
  escapePrompt
} from './helpers'
import path from 'path'
import os from 'os'

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

const wrapCommandWithLogging = (
  baseCommand: string,
  outputFile: string,
  logFile: string
): string => {
  return `${baseCommand} | tee -a "${logFile}" | tee "${outputFile}"`
}

export const buildSandboxCommand = (
  name: string,
  workspace: string,
  bedrockConfig: BedrockConfig,
  options: { detached?: boolean; continueFlag?: boolean; prompt?: string }
): string => {
  const cmd = ['docker', 'sandbox', 'run', '--name', `"${name}"`, '-w', `"${workspace}"`, '--credentials=none']

  const detachedFlag = options.detached ? ['--detached'] : []

  const bedrockFlags = bedrockConfig.bedrockEnabled
    ? [
        `-e "CLAUDE_CODE_USE_BEDROCK=${bedrockConfig.bedrockEnabled}"`,
        `-e "AWS_REGION=${bedrockConfig.awsRegion}"`,
        ...(bedrockConfig.awsProfile ? [`-e "AWS_PROFILE=${bedrockConfig.awsProfile}"`] : []),
        ...(bedrockConfig.model ? [`-e "ANTHROPIC_MODEL=${bedrockConfig.model}"`] : []),
      ]
    : []

  const awsDir = path.join(os.homedir(), '.aws')
  const awsMount = fs.existsSync(awsDir) ? [`-v "${awsDir}:/home/agent/.aws:ro"`] : []

  const continueFlag = options.continueFlag ? ['-c'] : []

  // Build claude command with prompt if provided
  const claudeCommand = ['claude']
  if (options.prompt) {
    const escaped = escapePrompt(options.prompt)
    claudeCommand.push('-p', '--output-format', 'stream-json', '--verbose',`"${escaped}" 2>&1`)
  } else {
    claudeCommand.push(...continueFlag)
  }

  return [...cmd, ...detachedFlag, ...bedrockFlags, ...awsMount, ...claudeCommand].join(' ')
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
    logFile: paths.logFile,
    outputFile: paths.outputFile,
    status: 'completed',
  }
}

const runDetachedMode = async (
  command: string,
  sandboxName: string,
  paths: ReturnType<typeof resolveSandboxPaths>,
  resolvedConfig: SandboxConfig & { prompt?: string; workspace: string }
): Promise<SandboxResult> => {
  writeLogHeader(paths.logFile, resolvedConfig)
  const wrappedCommand = wrapCommandWithLogging(command, paths.outputFile, paths.logFile)
  echo(yellow(wrappedCommand))
  echo('')
  await executeInteractive(wrappedCommand, `Failed to start sandbox ${sandboxName}`)
  echo(green('Sandbox started in background'))
  echo(yellow(`  tail -f ${paths.outputFile}  # Watch output`))
  echo(yellow(`  cat ${paths.outputFile}      # View result`))
  return {
    sandboxName,
    workspace: '',
    logFile: paths.logFile,
    outputFile: paths.outputFile,
    status: 'running',
  }
}

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

  printStartupInfo(config.sandboxName, workspace)

  if (!needsDetached) {
    const result = await runInteractiveMode(command, config.sandboxName, paths)
    return { ...result, workspace }
  } else {
    const result = await runDetachedMode(command, config.sandboxName, paths, resolvedConfig)
    return { ...result, workspace }
  }
}

export default runSingleAgent
