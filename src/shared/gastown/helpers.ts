import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, yellow } from '../colors'

export const escapePrompt = (prompt: string): string => prompt.replace(/'/g, "'\\''")

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

    const lines = output.split('\n').filter((line: string) => line.trim().length > 0)

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

export const resolveWorkspace = (workspace: string): string => {
  const resolved = path.resolve(workspace)

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Workspace directory does not exist: ${resolved}`)
  }

  return fs.realpathSync(resolved)
}

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

