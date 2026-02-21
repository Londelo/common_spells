import { echo } from 'shelljs'
import { execute } from '../shell'
import { cyan, yellow } from '../colors'

type SandboxInfo = {
  readonly name: string
  readonly status: string
}

type StatusReport = {
  readonly sandboxes: readonly SandboxInfo[]
}

const getRunningSandboxes = async (): Promise<readonly SandboxInfo[]> => {
  try {
    const command = 'docker sandbox ls'
    echo(yellow(command))
    const output = await execute(command, 'List sandboxes')

    if (!output || output.trim().length === 0) {
      return []
    }

    const lines = output.split('\n').filter((line: string) => line.trim().length > 0)

    if (lines.length <= 1) {
      return []
    }

    return lines.slice(1).map((line: string) => {
      const parts = line.trim().split(/\s+/)
      return {
        name: parts[0] || 'unknown',
        status: parts[2] || 'unknown',
      }
    })
  } catch {
    return []
  }
}

const displaySandboxes = (sandboxes: readonly SandboxInfo[]): void => {
  echo(cyan('=== Running Sandboxes ==='))

  if (sandboxes.length === 0) {
    echo('None')
  } else {
    sandboxes.forEach((sandbox: SandboxInfo) => {
      echo(`  ${sandbox.name} (${sandbox.status})`)
    })
  }

  echo('')
}

export const getStatus = async (): Promise<StatusReport> => {
  const sandboxes = await getRunningSandboxes()

  return {
    sandboxes,
  }
}

export const displayStatus = async (): Promise<void> => {
  const status = await getStatus()

  displaySandboxes(status.sandboxes)
}
