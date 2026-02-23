import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { SandboxConfig, SandboxResult, DS_DIR } from './types'
import { resolveWorkspace, sandboxExists } from './helpers'

const checkDockerSandboxTemplate = (): void => {
  const dockerfilePath = path.join(DS_DIR, 'Dockerfile.docker-sandbox')

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(
      'Docker Sandbox template not found. Please run "ds-setup" first to create the template.'
    )
  }
}

const readPromptFromFile = (promptFile: string): string => {
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file does not exist: ${promptFile}`)
  }
  return fs.readFileSync(promptFile, 'utf-8')
}

const printStartupInfo = (sandboxName: string, workspaces: readonly string[], isExisting: boolean): void => {
  echo(green(isExisting ? 'Using existing sandbox' : 'Starting new sandbox'))
  echo(`  Name:       ${sandboxName}`)
  echo(`  Workspaces: ${workspaces.join(', ')}`)
  echo('')
}

const parseWorkspaces = (workspacesStr: string): readonly string[] =>
  workspacesStr
    .split(',')
    .map(ws => ws.trim())
    .filter(Boolean)

export const buildSandboxCommand = (
  name: string,
  workspaces: readonly string[],
  options?: { prompt?: string; isExisting?: boolean }
): string => {
  const templateName = 'docker-sandbox:latest'
  const { prompt, isExisting } = options ?? {}

  // Existing sandbox: docker sandbox run <name> [-- --print "prompt"]
  // New sandbox: docker sandbox run --name "<name>" -t docker-sandbox:latest claude "<workspace1>" "<workspace2:ro>" ... [-- --print "prompt"]

  const quotedWorkspaces = workspaces.map(ws => `"${ws}"`)

  const baseCommand = isExisting
    ? ['docker', 'sandbox', 'run', name]
    : ['docker', 'sandbox', 'run', '--name', `"${name}"`, '-t', templateName, 'claude', ...quotedWorkspaces]

  const printArgs = prompt ? ['--', '--print', `"${prompt}"`] : []

  return [...baseCommand, ...printArgs].join(' ')
}

const runSandbox = async (
  command: string,
  sandboxName: string,
  primaryWorkspace: string
): Promise<SandboxResult> => {
  echo(yellow(command))
  echo('')

  await executeInteractive(command, `Failed to run sandbox ${sandboxName}`)

  echo('')
  echo(green('Sandbox exited'))

  return {
    sandboxName,
    workspace: primaryWorkspace,
    status: 'completed',
  }
}

const runSingleAgent = async (config: SandboxConfig): Promise<SandboxResult> => {
  // Check if template exists, prompt to run setup if not
  checkDockerSandboxTemplate()

  // Support both old 'workspace' and new 'workspaces' fields
  const workspacesStr = config.workspaces || config.workspace
  if (!workspacesStr) {
    throw new Error('Either workspace or workspaces must be provided')
  }

  // Parse comma-separated workspaces and resolve each path
  const workspaces = parseWorkspaces(workspacesStr).map(ws => {
    // Check if workspace has :ro suffix
    const hasRoSuffix = ws.endsWith(':ro')
    const path = hasRoSuffix ? ws.slice(0, -3) : ws
    const resolved = resolveWorkspace(path)
    return hasRoSuffix ? `${resolved}:ro` : resolved
  })

  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const isExisting = await sandboxExists(config.sandboxName)

  const command = buildSandboxCommand(config.sandboxName, workspaces, { prompt, isExisting })

  printStartupInfo(config.sandboxName, workspaces, isExisting)

  return runSandbox(command, config.sandboxName, workspaces[0])
}

export default runSingleAgent
