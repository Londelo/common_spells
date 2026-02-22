import path from 'path'
import os from 'os'

// --- Constants (used by all dockerSandbox scripts) ---

export const DS_DIR = path.join(os.homedir(), '.dockerSandbox')
export const SANDBOX_DIR = path.join(os.homedir(), '.sandboxd')
export const PROXY_CONFIG_PATH = path.join(SANDBOX_DIR, 'proxy-config.json')

// --- Types ---

export type SandboxConfig = {
  readonly sandboxName: string
  readonly workspace: string
  readonly prompt?: string
  readonly promptFile?: string
}

export type BedrockConfig = {
  readonly bedrockEnabled?: string
  readonly awsRegion: string
  readonly awsProfile?: string
  readonly model?: string
}

export type SandboxResult = {
  readonly sandboxName: string
  readonly workspace: string
  readonly status: 'running' | 'completed' | 'failed'
  readonly error?: string
}

export type ProxyConfig = {
  readonly policy: 'deny'
  readonly allow: readonly string[]
}
