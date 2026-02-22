import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { executeInteractive } from '../shell'
import { green, yellow } from '../colors'
import { SandboxConfig, SandboxResult, DS_DIR } from './types'
import { resolveWorkspace, sandboxExists } from './helpers'

const checkDockerSandboxTemplate = (): void => {
  const dockerfilePath = path.join(DS_DIR, 'Dockerfile.dockerSandbox')

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

const printStartupInfo = (sandboxName: string, workspace: string, isExisting: boolean): void => {
  echo(green(isExisting ? 'Using existing sandbox' : 'Starting new sandbox'))
  echo(`  Name:      ${sandboxName}`)
  echo(`  Workspace: ${workspace}`)
  echo('')
}

export const buildSandboxCommand = (
  name: string,
  workspace: string,
  options?: { prompt?: string; isExisting?: boolean }
): string => {
  const templateName = 'dockerSandbox:latest'
  const { prompt, isExisting } = options ?? {}

  // Existing sandbox: docker sandbox run <name> [-- --print "prompt"]
  // New sandbox: docker sandbox run --name "<name>" -t dockerSandbox:latest claude "<workspace>" [-- --print "prompt"]

  const baseCommand = isExisting
    ? ['docker', 'sandbox', 'run', name]
    : ['docker', 'sandbox', 'run', '--name', `"${name}"`, '-t', templateName, 'claude', `"${workspace}"`]

  const printArgs = prompt ? ['--', '--print', `"${prompt}"`] : []

  return [...baseCommand, ...printArgs].join(' ')
}

const runSandbox = async (
  command: string,
  sandboxName: string,
  workspace: string
): Promise<SandboxResult> => {
  echo(yellow(command))
  echo('')

  await executeInteractive(command, `Failed to run sandbox ${sandboxName}`)

  echo('')
  echo(green('Sandbox exited'))

  return {
    sandboxName,
    workspace,
    status: 'completed',
  }
}

const runSingleAgent = async (config: SandboxConfig): Promise<SandboxResult> => {
  // Check if template exists, prompt to run setup if not
  checkDockerSandboxTemplate()

  const workspace = resolveWorkspace(config.workspace)
  const prompt = config.promptFile ? readPromptFromFile(config.promptFile) : config.prompt
  const isExisting = await sandboxExists(config.sandboxName)

  const command = buildSandboxCommand(config.sandboxName, workspace, { prompt, isExisting })

  printStartupInfo(config.sandboxName, workspace, isExisting)

  return runSandbox(command, config.sandboxName, workspace)
}

export default runSingleAgent
