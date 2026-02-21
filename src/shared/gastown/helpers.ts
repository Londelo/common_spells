import fs from 'fs'
import path from 'path'
import os from 'os'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, yellow } from '../colors'
import { BedrockConfig, GT_DIR } from './types'

const readSettingsFile = (): any => {
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

export const writeGastownDockerfile = (): void => {
  const dockerfilePath = path.join(GT_DIR, 'Dockerfile.gastown')

  const dockerfileContent = `FROM docker/sandbox-templates:claude-code

ARG CLAUDE_CODE_USE_BEDROCK=""
ARG AWS_REGION="us-east-1"
ARG AWS_PROFILE=""
ARG ANTHROPIC_MODEL=""
ARG GT_DIR=""

ENV CLAUDE_CODE_USE_BEDROCK=\${CLAUDE_CODE_USE_BEDROCK}
ENV AWS_REGION=\${AWS_REGION}
ENV AWS_PROFILE=\${AWS_PROFILE}
ENV ANTHROPIC_MODEL=\${ANTHROPIC_MODEL}
ENV GT_DIR=\${GT_DIR}

COPY --chown=agent:agent .aws /home/agent/.aws
RUN chmod 555 /home/agent/.aws && chmod 444 /home/agent/.aws/*

WORKDIR /workspace
`

  fs.mkdirSync(GT_DIR, { recursive: true })
  fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf-8')
  echo(green(`✓ Dockerfile written to ${dockerfilePath}`))
}

const copyAwsCredentials = (): void => {
  const sourceDir = path.join(os.homedir(), '.aws')
  const targetDir = path.join(GT_DIR, '.aws')

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`AWS credentials not found at ${sourceDir}. Run 'aws configure' or set up SSO first.`)
  }

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true })
  }

  fs.cpSync(sourceDir, targetDir, { recursive: true })
  echo(green(`✓ AWS credentials copied to build context`))
}

export const buildGastownTemplate = async (bedrockConfig: BedrockConfig): Promise<void> => {
  const templateName = 'gastown:latest'
  const dockerfilePath = path.join(GT_DIR, 'Dockerfile.gastown')

  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found at ${dockerfilePath}. Run gt-setup to create it.`)
  }

  copyAwsCredentials()

  const buildArgs = [
    `--build-arg CLAUDE_CODE_USE_BEDROCK="${bedrockConfig.bedrockEnabled || ''}"`,
    `--build-arg AWS_REGION="${bedrockConfig.awsRegion}"`,
    `--build-arg AWS_PROFILE="${bedrockConfig.awsProfile || ''}"`,
    `--build-arg ANTHROPIC_MODEL="${bedrockConfig.model || ''}"`,
    `--build-arg GT_DIR="${GT_DIR}"`
  ].join(' ')

  const buildCommand = `docker build ${buildArgs} -f "${dockerfilePath}" -t ${templateName} "${GT_DIR}"`

  echo(yellow('\nBuilding gastown Docker template...'))
  echo(yellow(buildCommand))
  echo('')

  await execute(buildCommand, 'Failed to build Docker template')

  echo(green(`✓ Template built: ${templateName}`))
  echo('')
}

export const escapePrompt = (prompt: string): string => prompt.replace(/'/g, "'\\''")

export const sandboxExists = async (sandboxName: string): Promise<boolean> => {
  try {
    const command = 'docker sandbox ls'
    const output = await execute(command, 'Failed to list sandboxes')
    return output.includes(sandboxName)
  } catch {
    return false
  }
}

export const removeSandbox = async (sandboxName: string): Promise<boolean> => {
  const exists = await sandboxExists(sandboxName)
  if (!exists) return false

  try {
    const command = `docker sandbox rm "${sandboxName}"`
    echo(yellow(command))
    await execute(command, `Failed to remove sandbox ${sandboxName}`)
    echo(`  Removed ${sandboxName}`)
    return true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    echo(yellow(`  ⚠ Could not remove sandbox '${sandboxName}': ${errorMsg}`))
    return false
  }
}

export const listSandboxNames = async (): Promise<readonly string[]> => {
  try {
    const command = 'docker sandbox ls'
    echo(yellow(command))
    const output = await execute(command, 'Failed to list sandboxes')

    const lines = output.split('\n').filter((line: string) => line.trim().length > 0)

    const names = lines
      .slice(1)
      .map((line: string) => line.trim().split(/\s+/)[0])
      .filter((name: string) => name.length > 0)

    return names
  } catch (error) {
    echo(yellow(`  Failed to list sandboxes: ${error instanceof Error ? error.message : String(error)}`))
    return []
  }
}

export const resolveWorkspace = (workspace: string): string => {
  const resolved = path.resolve(workspace)

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Workspace directory does not exist: ${resolved}`)
  }

  return fs.realpathSync(resolved)
}

export const validateDockerEnvironment = async (): Promise<void> => {
  try {
    const dockerVersionCommand = 'docker --version'
    echo(yellow(dockerVersionCommand))
    await execute(dockerVersionCommand, 'Docker check')
  } catch {
    throw new Error('Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop')
  }

  try {
    const sandboxHelpCommand = 'docker sandbox --help'
    echo(yellow(sandboxHelpCommand))
    await execute(sandboxHelpCommand, 'Docker sandbox check')
  } catch {
    throw new Error('Docker sandbox support not found. Update Docker Desktop to v29+ for sandbox feature.')
  }

  echo(green('✓ Docker environment validated'))
}

