import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { cyan, yellow } from '../colors'
import { WORKTREE_DIR } from './types'

// --- Types ---

type SandboxInfo = {
  readonly name: string
  readonly status: string
}


type WorktreeInfo = {
  readonly name: string
  readonly path: string
}

type StatusReport = {
  readonly sandboxes: readonly SandboxInfo[]
  readonly worktrees: readonly WorktreeInfo[]
}

// --- Sandbox Status ---

const getRunningSandboxes = async (): Promise<readonly SandboxInfo[]> => {
  try {
    const command = 'docker sandbox ls'
    echo(yellow(command))
    const output = await execute(command, 'List sandboxes')

    if (!output || output.trim().length === 0) {
      return []
    }

    // Parse docker sandbox ls output
    // Format: NAME    IMAGE    STATUS    ...
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


// --- Worktree Status ---

const getWorktrees = (): readonly WorktreeInfo[] => {
  if (!fs.existsSync(WORKTREE_DIR)) {
    return []
  }

  try {
    const entries = fs.readdirSync(WORKTREE_DIR)

    return entries
      .map((name: string) => {
        const fullPath = path.join(WORKTREE_DIR, name)
        try {
          const stats = fs.statSync(fullPath)
          return stats.isDirectory() ? { name, path: fullPath } : null
        } catch {
          return null
        }
      })
      .filter((item): item is WorktreeInfo => item !== null)
  } catch {
    return []
  }
}

// --- Display Functions ---

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


const displayWorktrees = (worktrees: readonly WorktreeInfo[]): void => {
  echo(cyan('=== Worktrees ==='))

  if (worktrees.length === 0) {
    echo('None')
  } else {
    worktrees.forEach((wt: WorktreeInfo) => {
      echo(`  ${wt.name}`)
    })
  }

  echo('')
}

// --- Main Function ---

export const getStatus = async (): Promise<StatusReport> => {
  const sandboxes = await getRunningSandboxes()
  const worktrees = getWorktrees()

  return {
    sandboxes,
    worktrees,
  }
}

export const displayStatus = async (): Promise<void> => {
  const status = await getStatus()

  displaySandboxes(status.sandboxes)
  displayWorktrees(status.worktrees)
}
