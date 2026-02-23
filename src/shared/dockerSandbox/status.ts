import { echo } from 'shelljs'
import { cyan } from '../colors'
import { getRunningSandboxes, SandboxInfo } from './helpers'

export { getRunningSandboxes }

type StatusReport = {
  readonly sandboxes: readonly SandboxInfo[]
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
