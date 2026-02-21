import fs from 'fs'
import path from 'path'
import os from 'os'
import { BedrockConfig, SANDBOX_DIR, PROXY_CONFIG_PATH, ProxyConfig } from '../types'

// --- File Reading Helpers ---

export const readSettingsFile = (): any => {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
  if (!fs.existsSync(settingsPath)) return null

  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const readBedrockConfig = (): BedrockConfig => {
  const settings = readSettingsFile()
  const env = settings?.env ?? {}

  const bedrockFromSettings = env.CLAUDE_CODE_USE_BEDROCK ?? null
  const apiProviderFallback = settings?.apiProvider === 'bedrock' ? '1' : null
  const bedrockEnabled = bedrockFromSettings ?? apiProviderFallback ?? process.env.CLAUDE_CODE_USE_BEDROCK

  return {
    bedrockEnabled: bedrockEnabled || undefined,
    awsRegion: env.AWS_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    awsProfile: env.AWS_PROFILE ?? process.env.AWS_PROFILE ?? undefined,
    model: env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? undefined,
  }
}

export const readProxyConfig = (): ProxyConfig | null => {
  if (!fs.existsSync(PROXY_CONFIG_PATH)) return null

  try {
    const raw = fs.readFileSync(PROXY_CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as ProxyConfig
  } catch {
    return null
  }
}

export const writeProxyConfig = (config: ProxyConfig): void => {
  fs.mkdirSync(SANDBOX_DIR, { recursive: true })
  fs.writeFileSync(PROXY_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// --- Version Comparison ---

export const compareVersions = (a: string, b: string): number => {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  const maxLen = Math.max(partsA.length, partsB.length)

  return Array.from({ length: maxLen }).reduce<number>((result, _, i) => {
    if (result !== 0) return result
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    return diff
  }, 0)
}

// --- Display Helpers ---

export const statusIcon = (status: 'ok' | 'warn' | 'error'): string => {
  const icons: Record<string, string> = { ok: '✓', warn: '⚠', error: '✗' }
  return icons[status]
}
