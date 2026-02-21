import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { green, yellow } from '../colors'
import { WORKTREE_DIR } from './types'
import { listSandboxNames, removeSandbox } from './helpers'

// --- Types ---

type CleanupOptions = {
  readonly target?: string
  readonly removeWorktrees?: boolean
}

type CleanupResult = {
  readonly sandboxesRemoved: readonly string[]
  readonly worktreesRemoved: boolean
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


// --- Main Function ---

export const cleanup = async (options: CleanupOptions = {}): Promise<CleanupResult> => {
  const { target, removeWorktrees: shouldRemoveWorktrees } = options

  echo('=== Cleanup ===')

  const sandboxesRemoved = await removeSandboxes(target)

  const worktreesRemoved = shouldRemoveWorktrees ? removeWorktrees() : false

  echo('')
  echo(green('Cleanup complete'))

  return {
    sandboxesRemoved,
    worktreesRemoved,
  }
}

export const cleanupAll = async (): Promise<CleanupResult> =>
  cleanup({ target: '--all' })

export const cleanupSandbox = async (sandboxName: string): Promise<CleanupResult> =>
  cleanup({ target: sandboxName })
