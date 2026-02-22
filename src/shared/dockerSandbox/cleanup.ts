import { echo } from 'shelljs'
import { green } from '../colors'
import { listSandboxNames, removeSandbox } from './helpers'

// --- Types ---

type CleanupOptions = {
  readonly target?: string
}

type CleanupResult = {
  readonly sandboxesRemoved: readonly string[]
}

// --- Sandbox Cleanup ---

const removeSandboxes = async (target?: string): Promise<readonly string[]> => {
  echo(green('Removing sandboxes...'))

  if (target && target !== '--all') {
    const success = await removeSandbox(target)
    return success ? [target] : []
  }

  const sandboxes = await listSandboxNames()

  if (sandboxes.length === 0) {
    echo('  None found')
    return []
  }

  sandboxes.forEach((name: string) => {
    removeSandbox(name)
  })

  return sandboxes
}



// --- Main Function ---

export const cleanup = async (options: CleanupOptions = {}): Promise<CleanupResult> => {
  const { target } = options

  echo('=== Cleanup ===')

  const sandboxesRemoved = await removeSandboxes(target)

  echo('')
  echo(green('Cleanup complete'))

  return {
    sandboxesRemoved
  }
}

export const cleanupAll = async (): Promise<CleanupResult> =>
  cleanup({ target: '--all' })

export const cleanupSandbox = async (sandboxName: string): Promise<CleanupResult> =>
  cleanup({ target: sandboxName })
