import fs from 'fs'
import path from 'path'
import os from 'os'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, yellow } from '../colors'
import { BedrockConfig, SandboxPaths, SandboxMode, LOG_DIR, OUTPUT_DIR } from './types'

// --- Bedrock Config (used by: dccRun, dccGastown, dccSetup) ---

const readSettingsFile = (): any => {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
  if (!fs.existsSync(settingsPath)) return null

  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const readBedrockConfig = (): BedrockConfig => {
  const settings = readSettingsFile()
  const env = settings?.env ?? {}

  const bedrockFromSettings = env.CLAUDE_CODE_USE_BEDROCK ?? null
  const apiProviderFallback = settings?.apiProvider === 'bedrock' ? '1' : null
  const bedrockEnabled = bedrockFromSettings ?? apiProviderFallback ?? process.env.CLAUDE_CODE_USE_BEDROCK

  return {
    bedrockEnabled: bedrockEnabled || undefined,
    awsRegion: env.AWS_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    awsProfile: env.AWS_PROFILE ?? process.env.AWS_PROFILE ?? undefined,
    model: env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? undefined,
  }
}

// --- Prompt Escaping (used by: dccRun, dccGastown, dccTask) ---

export const escapePrompt = (prompt: string): string => prompt.replace(/'/g, "'\\''")

// --- Sandbox Lifecycle (used by: dccRun, dccGastown, dccTask, dccCleanup) ---

export const sandboxExists = async (sandboxName: string): Promise<boolean> => {
  try {
    const command = 'docker sandbox ls'
    echo(yellow(command))
    const output = await execute(command, 'Failed to list sandboxes')
    return output.includes(sandboxName)
  } catch {
    return false
  }
}

export const removeSandbox = async (sandboxName: string): Promise<void> => {
  const exists = await sandboxExists(sandboxName)
  if (!exists) return

  echo(yellow(`Removing existing sandbox '${sandboxName}'...`))
  try {
    const command = `docker sandbox rm "${sandboxName}"`
    echo(yellow(command))
    await execute(command, `Failed to remove sandbox ${sandboxName}`)
  } catch (error) {
    echo(yellow(`⚠ Could not remove sandbox '${sandboxName}' (may have already stopped)`))
  }
}

export const listSandboxNames = async (filterPrefix?: string[]): Promise<readonly string[]> => {
  try {
    const command = 'docker sandbox ls'
    echo(yellow(command))
    const output = await execute(command, 'Failed to list sandboxes')

    // Parse table output - first column is the name
    // Format: NAME    IMAGE    STATUS    ...
    const lines = output.split('\n').filter((line: string) => line.trim().length > 0)

    // Skip header row (first line) and extract first column (name)
    const names = lines
      .slice(1)
      .map((line: string) => line.trim().split(/\s+/)[0])
      .filter((name: string) => name.length > 0)

    return names
  } catch (error) {
    echo(yellow(`  Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`))
    return []
  }
}

// --- Path Resolution (used by: dccRun, dccGastown) ---

export const resolveWorkspace = (workspace: string): string => {
  const resolved = path.resolve(workspace)

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Workspace directory does not exist: ${resolved}`)
  }

  return fs.realpathSync(resolved)
}

export const resolveSandboxPaths = (sandboxName: string, outputFile?: string): SandboxPaths => ({
  logDir: LOG_DIR,
  outputDir: OUTPUT_DIR,
  logFile: path.join(LOG_DIR, `${sandboxName}.log`),
  outputFile: outputFile ?? path.join(OUTPUT_DIR, `${sandboxName}.json`),
})

// --- Directory & Log Helpers (used by: dccRun, dccGastown, dccTask) ---

export const ensureDirectories = (paths: SandboxPaths): void => {
  fs.mkdirSync(paths.logDir, { recursive: true })
  fs.mkdirSync(paths.outputDir, { recursive: true })
}

export const writeLogHeader = (
  logFile: string,
  config: { workspace: string; prompt?: string },
  mode: SandboxMode
): void => {
  const promptLine = config.prompt ? `Prompt: ${config.prompt.slice(0, 100)}...\n` : ''
  const header = `Started: ${new Date().toISOString()}\nWorkspace: ${config.workspace}\nMode: ${mode}\n${promptLine}---\n`
  fs.writeFileSync(logFile, header)
}

// --- Docker Command Building (used by: dccRun, dccGastown) ---

export const buildSandboxCommand = (
  name: string,
  workspace: string,
  bedrockConfig: BedrockConfig,
  options: { detached?: boolean; continueFlag?: boolean }
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

  return [...cmd, ...detachedFlag, ...bedrockFlags, ...awsMount, 'claude', ...continueFlag].join(' ')
}

// --- Docker Environment Validation (used by: dccRun, dccGastown, dccSetup) ---

export const validateDockerEnvironment = async (): Promise<void> => {
  try {
    const dockerVersionCommand = 'docker --version'
    echo(yellow(dockerVersionCommand))
    await execute(dockerVersionCommand, 'Docker check')
  } catch {
    throw new Error('Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop')
  }

  try {
    const sandboxHelpCommand = 'docker sandbox --help'
    echo(yellow(sandboxHelpCommand))
    await execute(sandboxHelpCommand, 'Docker sandbox check')
  } catch {
    throw new Error('Docker sandbox support not found. Update Docker Desktop to v29+ for sandbox feature.')
  }

  echo(green('✓ Docker environment validated'))
}
