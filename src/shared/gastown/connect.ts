import { echo } from 'shelljs'
import { executeInteractive } from '../shell'
import { select } from '../inquirer'
import { cyan, green, yellow } from '../colors'
import { getRunningSandboxes } from './status'

type SandboxInfo = {
  readonly name: string
  readonly status: string
}

type ConnectOptions = {
  readonly sandboxName?: string
}

type ConnectResult = {
  readonly sandboxName: string
  readonly connected: boolean
}

const getConnectableSandboxes = async (): Promise<readonly SandboxInfo[]> => {
  const allSandboxes = await getRunningSandboxes()
  return allSandboxes.filter((sandbox: SandboxInfo) => sandbox.status.toLowerCase() === 'running')
}

const selectSandbox = async (sandboxes: readonly SandboxInfo[]): Promise<string> => {
  const choices = sandboxes.map((sandbox: SandboxInfo) => `${sandbox.name} ${cyan('(running)')}`).concat('Cancel')

  const selection = await select('Select a sandbox to connect to:', choices)

  if (selection === 'Cancel') {
    throw new Error('Connection cancelled by user')
  }

  return selection.split(' ')[0]
}

const buildConnectCommand = (sandboxName: string): string => `docker sandbox run ${sandboxName}`

const connectToSandbox = async (sandboxName: string): Promise<ConnectResult> => {
  const command = buildConnectCommand(sandboxName)

  echo(green(`Connecting to ${sandboxName}...`))
  echo(yellow(command))
  echo('')

  try {
    await executeInteractive(command, `Failed to connect to sandbox ${sandboxName}`)

    echo('')
    echo(green('Sandbox exited'))

    return {
      sandboxName,
      connected: true,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    echo('')
    echo(yellow(`Connection to ${sandboxName} failed: ${errorMsg}`))

    return {
      sandboxName,
      connected: false,
    }
  }
}

export const connect = async (options?: ConnectOptions): Promise<ConnectResult> => {
  // If sandbox name provided, connect directly
  if (options?.sandboxName) {
    return connectToSandbox(options.sandboxName)
  }

  // Get running sandboxes
  const runningSandboxes = await getConnectableSandboxes()

  // Handle edge case: no running sandboxes
  if (runningSandboxes.length === 0) {
    echo(yellow('No running sandboxes found'))
    echo('')
    echo('To see all sandboxes: gt-status')
    echo('To start a sandbox: gt-run <workspace>')
    throw new Error('No running sandboxes available')
  }

  // Let user select sandbox
  const sandboxName = await selectSandbox(runningSandboxes)

  // Connect to selected sandbox
  return connectToSandbox(sandboxName)
}
