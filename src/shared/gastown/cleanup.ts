import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, yellow } from '../colors'
import { DCC_DIR, LOG_DIR, WORKTREE_DIR } from './types'

// --- Types ---

type CleanupOptions = {
  readonly target?: string
  readonly removeWorktrees?: boolean
  readonly removeLogs?: boolean
}

type CleanupResult = {
  readonly sandboxesRemoved: readonly string[]
  readonly worktreesRemoved: boolean
  readonly logsRemoved: boolean
}

// --- Sandbox Cleanup ---

const listGastownSandboxes = async (): Promise<readonly string[]> => {
  try {
    const command = 'docker sandbox ls --format "{{.Name}}" 2>/dev/null'
    echo(yellow(command))
    const output = await execute(
      command,
      'List sandboxes',
      { fatal: false }
    )

    return output
      .split('\n')
      .filter((name: string) => name.trim().length > 0)
      .filter((name: string) => name.startsWith('agent-') || name.startsWith('dcc-'))
  } catch {
    return []
  }
}

const removeSandbox = async (name: string): Promise<boolean> => {
  try {
    const command = `docker sandbox rm "${name}" 2>/dev/null`
    echo(yellow(command))
    await execute(command, `Remove sandbox ${name}`, {
      fatal: false,
    })
    echo(`  Removed ${name}`)
    return true
  } catch {
    echo(yellow(`  Not found: ${name}`))
    return false
  }
}

const removeSandboxes = async (target?: string): Promise<readonly string[]> => {
  echo(green('Removing sandboxes...'))

  if (target && target !== '--all') {
    const success = await removeSandbox(target)
    return success ? [target] : []
  }

  const sandboxes = await listGastownSandboxes()

  if (sandboxes.length === 0) {
    echo('  None found')
    return []
  }

  const removed = await sandboxes.reduce(
    async (promiseAcc: Promise<readonly string[]>, name: string) => {
      const acc = await promiseAcc
      const success = await removeSandbox(name)
      return success ? [...acc, name] : acc
    },
    Promise.resolve([] as readonly string[])
  )

  return removed
}

// --- Worktree Cleanup ---

const removeWorktrees = (): boolean => {
  if (!fs.existsSync(WORKTREE_DIR)) {
    return false
  }

  echo('')
  echo(green('Removing worktrees...'))

  try {
    const entries = fs.readdirSync(WORKTREE_DIR)

    entries.forEach((entry: string) => {
      const fullPath = path.join(WORKTREE_DIR, entry)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true })
      }
    })

    echo('  Done')
    return true
  } catch (error) {
    echo(yellow('  Failed to remove worktrees'))
    return false
  }
}

// --- Log Cleanup ---

const removeLogs = (): boolean => {
  if (!fs.existsSync(LOG_DIR)) {
    return false
  }

  echo('')
  echo(green('Removing logs...'))

  try {
    const entries = fs.readdirSync(LOG_DIR)

    entries
      .filter((entry: string) => entry.endsWith('.log'))
      .forEach((entry: string) => {
        fs.unlinkSync(path.join(LOG_DIR, entry))
      })

    echo('  Done')
    return true
  } catch (error) {
    echo(yellow('  Failed to remove logs'))
    return false
  }
}

// --- Main Function ---

export const cleanup = async (options: CleanupOptions = {}): Promise<CleanupResult> => {
  const { target, removeWorktrees: shouldRemoveWorktrees, removeLogs: shouldRemoveLogs } = options

  echo('=== Cleanup ===')

  const sandboxesRemoved = await removeSandboxes(target)

  const worktreesRemoved = shouldRemoveWorktrees ? removeWorktrees() : false

  const logsRemoved = shouldRemoveLogs ? removeLogs() : false

  echo('')
  echo(green('Cleanup complete'))

  return {
    sandboxesRemoved,
    worktreesRemoved,
    logsRemoved,
  }
}

export const cleanupAll = async (): Promise<CleanupResult> =>
  cleanup({
    target: '--all',
    removeWorktrees: true,
    removeLogs: true,
  })

export const cleanupSandbox = async (sandboxName: string): Promise<CleanupResult> =>
  cleanup({ target: sandboxName })
