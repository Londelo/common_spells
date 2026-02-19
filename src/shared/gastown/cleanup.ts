import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { green, yellow } from '../colors'
import { LOG_DIR, WORKTREE_DIR } from './types'
import { listSandboxNames, removeSandbox } from './helpers'

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
  cleanup({ target: '--all' })

export const cleanupSandbox = async (sandboxName: string): Promise<CleanupResult> =>
  cleanup({ target: sandboxName })
