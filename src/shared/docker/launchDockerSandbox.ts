import { execute } from '../shell'
import { echo } from 'shelljs'
import { yellow } from '../colors'
import { DCC_DIR, DCC_RUN_SCRIPT } from './validateDockerEnvironment'

export type DockerSessionResult = {
  sandboxName: string
  displayName: string
  workspacePath: string
  outputFile: string
  logFile: string
  status: 'running' | 'failed'
  error?: string
}

const escapeForShell = (text: string): string =>
  text.replace(/'/g, "'\\''")

const buildDccCommand = (sandboxName: string, escapedPrompt: string, workspacePath: string): string =>
  [
    `bash "${DCC_RUN_SCRIPT}"`,
    '-d',
    `-n "${sandboxName}"`,
    `-p '${escapedPrompt}'`,
    `"${workspacePath}"`,
  ].join(' ')

const launchDockerSandbox = async (
  sandboxName: string,
  prompt: string,
  workspacePath: string,
  displayName: string
): Promise<DockerSessionResult> => {
  const escapedPrompt = escapeForShell(prompt)
  const command = buildDccCommand(sandboxName, escapedPrompt, workspacePath)
  const outputFile = `${DCC_DIR}/output/${sandboxName}.json`
  const logFile = `${DCC_DIR}/logs/${sandboxName}.log`

  echo(yellow(`Launching Docker sandbox for ${displayName}...`))

  try {
    await execute(command, `Failed to launch Docker sandbox for ${displayName}`)
    return { sandboxName, displayName, workspacePath, outputFile, logFile, status: 'running' }
  } catch (err: any) {
    return {
      sandboxName,
      displayName,
      workspacePath,
      outputFile,
      logFile,
      status: 'failed',
      error: err.message,
    }
  }
}

export default launchDockerSandbox
