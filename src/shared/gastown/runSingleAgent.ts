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
  escapePrompt,
  readAndDisplayOutputFile
} from './helpers'
import path from 'path'
import os from 'os'

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

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
  echo(`  Logs:      Use 'docker logs ${sandboxName}' to view`)
  echo('')
}

export const buildSandboxCommand = (
  name: string,
  workspace: string,
  bedrockConfig: BedrockConfig,
  options: { detached?: boolean; }
): string => {
  const cmd = [
    'docker', 'sandbox', 'run',
    `-w "${workspace}"`,
    '--name', `"${name}"`,
    '--credentials=none'
  ]

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

  return [...cmd, ...detachedFlag, ...bedrockFlags, ...awsMount, 'claude' ].join(' ')
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
  const workspace = resolveWorkspace(config.workspace)
  const paths = resolveSandboxPaths(config.sandboxName, config.outputFile)

  ensureDirectories(paths)

  await removeSandbox(config.sandboxName)

  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const needsDetached = !!prompt
  const bedrockConfig = readBedrockConfig()
  const command = buildSandboxCommand(config.sandboxName, workspace, bedrockConfig, { detached: needsDetached })

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
