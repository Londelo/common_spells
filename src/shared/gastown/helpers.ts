import fs from 'fs'
import path from 'path'
import os from 'os'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, red, yellow } from '../colors'
import { BedrockConfig, SandboxPaths, LOG_DIR, OUTPUT_DIR } from './types'

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
    const output = await execute(command, 'Failed to list sandboxes')
    return output.includes(sandboxName)
  } catch {
    return false
  }
}

export const removeSandbox = async (sandboxName: string): Promise<boolean> => {
  const exists = await sandboxExists(sandboxName)
  if (!exists) return false

  try {
    const command = `docker sandbox rm "${sandboxName}"`
    echo(yellow(command))
    await execute(command, `Failed to remove sandbox ${sandboxName}`)
    echo(`  Removed ${sandboxName}`)
    return true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    echo(yellow(`  ⚠ Could not remove sandbox '${sandboxName}': ${errorMsg}`))
    return false
  }
}

export const listSandboxNames = async (): Promise<readonly string[]> => {
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
  outputFile: outputFile ?? path.join(OUTPUT_DIR, `${sandboxName}.txt`),
})

// --- Directory & Log Helpers (used by: dccRun, dccGastown, dccTask) ---

export const ensureDirectories = (paths: SandboxPaths): void => {
  fs.mkdirSync(paths.logDir, { recursive: true })
  fs.mkdirSync(paths.outputDir, { recursive: true })
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

// --- JSON Output Parsing (used by: dccRun, dccGastown, output file handling) ---

export const parseNDJSON = (content: string): readonly any[] => {
  const lines = content.split('\n').filter((line: string) => line.trim().length > 0)
  return lines
    .map((line: string) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter((obj: any) => obj !== null)
}

export const findResultInNDJSON = (objects: readonly any[]): any => {
  const resultObjects = objects.filter((obj: any) => obj.type === 'result')
  return resultObjects.length > 0 ? resultObjects[resultObjects.length - 1] : null
}

export const extractResult = (jsonObj: any): string => {
  return jsonObj.result || jsonObj.message || 'No result found'
}

export const formatResultForCLI = (resultText: string): string => {
  const border = '─'.repeat(60)
  return `\n${yellow(border)}\n${green('Result:')}\n${resultText}\n${yellow(border)}\n`
}

export const parseAndDisplayResult = (content: string): void => {
  try {
    const objects = parseNDJSON(content)
    if (objects.length === 0) {
      throw new Error('No valid JSON found in output')
    }

    const resultObj = findResultInNDJSON(objects) || objects[objects.length - 1]
    const resultText = extractResult(resultObj)
    const formatted = formatResultForCLI(resultText)
    echo(formatted)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    echo(red(`⚠ Error parsing output: ${errorMsg}`))
  }
}

export const readAndDisplayOutputFile = (outputFilePath: string): void => {
  if (!fs.existsSync(outputFilePath)) {
    echo(yellow(`⚠ Output file not found: ${outputFilePath}`))
    return
  }

  if (fs.statSync(outputFilePath).isDirectory()) {
    echo(red(`⚠ Path is a directory, not a file: ${outputFilePath}`))
    return
  }

  try {
    const content = fs.readFileSync(outputFilePath, 'utf-8')
    parseAndDisplayResult(content)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    echo(red(`⚠ Error reading output file: ${errorMsg}`))
  }
}
