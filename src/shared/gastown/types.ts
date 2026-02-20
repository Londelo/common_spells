import path from 'path'
import os from 'os'

// --- Constants (used by all gastown scripts) ---

export const GT_DIR = path.join(os.homedir(), '.gastown')
export const OUTPUT_DIR = path.join(GT_DIR, 'output')
export const WORKTREE_DIR = path.join(GT_DIR, 'worktrees')

// --- Types ---

export type SandboxConfig = {
  readonly sandboxName: string
  readonly workspace: string
  readonly prompt?: string
  readonly promptFile?: string
  readonly outputFile?: string
  readonly continueConversation?: boolean
}

export type BedrockConfig = {
  readonly bedrockEnabled?: string
  readonly awsRegion: string
  readonly awsProfile?: string
  readonly model?: string
}

export type SandboxPaths = {
  readonly outputDir: string
  readonly outputFile: string
}

export type SandboxResult = {
  readonly sandboxName: string
  readonly workspace: string
  readonly outputFile?: string
  readonly status: 'running' | 'completed' | 'failed'
  readonly error?: string
}
