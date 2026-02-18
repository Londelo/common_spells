import path from 'path'

// --- Constants (used by all gastown scripts) ---

const DCC_DEFAULT_DIR = '/Users/Brodie.Balser/Documents/WizWork/docker-claude-code'

export const DCC_DIR = process.env.DCC_DIR || DCC_DEFAULT_DIR
export const LOG_DIR = path.join(DCC_DIR, 'logs')
export const OUTPUT_DIR = path.join(DCC_DIR, 'output')
export const WORKTREE_DIR = path.join(DCC_DIR, 'worktrees')

// --- Types ---

export type SandboxMode = 'interactive' | 'headless' | 'detached'

export type SandboxConfig = {
  readonly sandboxName: string
  readonly workspace: string
  readonly prompt?: string
  readonly promptFile?: string
  readonly detached?: boolean
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
  readonly logDir: string
  readonly outputDir: string
  readonly logFile: string
  readonly outputFile: string
}

export type SandboxResult = {
  readonly sandboxName: string
  readonly mode: SandboxMode
  readonly workspace: string
  readonly logFile: string
  readonly outputFile?: string
  readonly status: 'running' | 'completed' | 'failed'
  readonly error?: string
}
