import fs from 'fs'
import path from 'path'
import os from 'os'
import { echo } from 'shelljs'
import { execute } from '../../shell'
import { green, yellow, red, cyan } from '../../colors'
import { GT_DIR, PROXY_CONFIG_PATH } from '../types'
import { readBedrockConfig, compareVersions } from './helpers'
import proxyConfig from './proxy-config.json'

type CheckResult = {
  readonly label: string
  readonly status: 'ok' | 'warn' | 'error'
  readonly details: readonly string[]
}

type SetupReport = {
  readonly checks: readonly CheckResult[]
  readonly environment: Record<string, string>
}

const configureNetworkPolicy = async (): Promise<void> => {
  try {
    fs.mkdirSync(path.dirname(PROXY_CONFIG_PATH), { recursive: true })
    fs.writeFileSync(PROXY_CONFIG_PATH, JSON.stringify(proxyConfig, null, 2), 'utf-8')
    echo(green(`✓ Network policy configured at ${PROXY_CONFIG_PATH}\n`))
  } catch (error) {
    throw new Error(`Failed to configure network policy: ${error}`)
  }
}

const writeGastownDockerfile = (): void => {
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

const buildGastownTemplate = async (): Promise<void> => {
  writeGastownDockerfile()
  const bedrockConfig = readBedrockConfig()
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

const checkTechPass = async (): Promise<CheckResult> => {
  try {
    const whichCommand = 'which tech-pass'
    echo(yellow(whichCommand))
    await execute(whichCommand, 'TechPass lookup')
  } catch {
    return {
      label: 'TechPass',
      status: 'warn',
      details: [
        'TechPass not found in PATH',
        'Install from: https://confluence.livenation.com/spaces/TOP/pages/204166978/Tech+Pass',
      ],
    }
  }

  try {
    const versionCommand = 'tech-pass version'
    echo(yellow(versionCommand))
    const versionOutput = await execute(versionCommand, 'TechPass version')
    const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : null

    if (!version) {
      return {
        label: 'TechPass',
        status: 'warn',
        details: ['Could not determine TechPass version'],
      }
    }

    const meetsMinimum = compareVersions(version, '5.3.0') >= 0

    return meetsMinimum
      ? { label: 'TechPass', status: 'ok', details: [`Version: ${version}`] }
      : {
          label: 'TechPass',
          status: 'error',
          details: [
            `Version ${version} found — requires 5.3.0+`,
            'Update: https://confluence.livenation.com/spaces/TOP/pages/204166978/Tech+Pass',
          ],
        }
  } catch {
    return {
      label: 'TechPass',
      status: 'warn',
      details: ['Could not determine TechPass version'],
    }
  }
}

const checkClaudeSettings = (): CheckResult => {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')

  if (!fs.existsSync(settingsPath)) {
    return {
      label: 'Claude Settings',
      status: 'error',
      details: [
        `Not found: ${settingsPath}`,
        'This file is auto-generated by TechPass when you:',
        '  1. Have TechPass v5.3.0+',
        '  2. Are in the Claude Code AD group',
        '  3. Sign in via TechPass',
        'Request access: https://adaxes.techops.info/Adaxes/AdaxesSelfService#/',
      ],
    }
  }

  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    JSON.parse(raw)
    return {
      label: 'Claude Settings',
      status: 'ok',
      details: [`Found: ${settingsPath}`],
    }
  } catch {
    return {
      label: 'Claude Settings',
      status: 'warn',
      details: [`Found but invalid JSON: ${settingsPath}`],
    }
  }
}

const checkAwsCredentials = (): CheckResult => {
  const awsDir = path.join(os.homedir(), '.aws')

  if (!fs.existsSync(awsDir)) {
    return {
      label: 'AWS Credentials',
      status: 'warn',
      details: [
        `AWS config not found at ${awsDir}`,
        'This may be OK if TechPass handles authentication',
      ],
    }
  }

  const details: string[] = [`Found: ${awsDir}`]

  const credentialsFile = path.join(awsDir, 'credentials')
  if (fs.existsSync(credentialsFile)) {
    try {
      const raw = fs.readFileSync(credentialsFile, 'utf-8')
      const profiles = raw
        .split('\n')
        .filter((line: string) => line.match(/^\[.+\]$/))
        .map((line: string) => line.replace(/[[\]]/g, ''))
      details.push(`Profiles: ${profiles.join(', ') || 'default'}`)
    } catch {
      details.push('Could not read credentials file')
    }
  }

  const configFile = path.join(awsDir, 'config')
  if (fs.existsSync(configFile)) {
    try {
      const raw = fs.readFileSync(configFile, 'utf-8')
      const hasSso = raw.includes('sso_')
      details.push(`SSO configured: ${hasSso ? 'yes' : 'no'}`)
    } catch {}
  }

  return { label: 'AWS Credentials', status: 'ok', details }
}

const checkDocker = async (): Promise<CheckResult> => {
  try {
    const dockerVersionCommand = 'docker --version'
    echo(yellow(dockerVersionCommand))
    const versionOutput = await execute(dockerVersionCommand, 'Docker version')
    const versionMatch = versionOutput.match(/(\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : 'unknown'

    try {
      const sandboxHelpCommand = 'docker sandbox --help'
      echo(yellow(sandboxHelpCommand))
      await execute(sandboxHelpCommand, 'Docker sandbox check')
      return {
        label: 'Docker',
        status: 'ok',
        details: [`Version: ${version}`, 'Sandbox support: yes'],
      }
    } catch {
      return {
        label: 'Docker',
        status: 'warn',
        details: [
          `Version: ${version}`,
          'Sandbox support: no',
          'Update Docker Desktop to v29+ for sandbox support',
        ],
      }
    }
  } catch {
    return {
      label: 'Docker',
      status: 'error',
      details: [
        'Docker not found',
        'Install Docker Desktop: https://www.docker.com/products/docker-desktop',
      ],
    }
  }
}

const checkBedrockConfig = (): { readonly check: CheckResult; readonly env: Record<string, string> } => {
  const config = readBedrockConfig()
  const env: Record<string, string> = {}
  const details: string[] = []

  if (config.bedrockEnabled) {
    env['CLAUDE_CODE_USE_BEDROCK'] = config.bedrockEnabled
    details.push(`CLAUDE_CODE_USE_BEDROCK=${config.bedrockEnabled}`)
  }

  env['AWS_REGION'] = config.awsRegion
  details.push(`AWS_REGION=${config.awsRegion}`)

  if (config.awsProfile) {
    env['AWS_PROFILE'] = config.awsProfile
    details.push(`AWS_PROFILE=${config.awsProfile}`)
  }

  if (config.model) {
    env['ANTHROPIC_MODEL'] = config.model
    details.push(`ANTHROPIC_MODEL=${config.model}`)
  }

  env['GT_DIR'] = GT_DIR
  details.push(`GT_DIR=${GT_DIR}`)

  return {
    check: {
      label: 'Environment Variables',
      status: config.bedrockEnabled ? 'ok' : 'warn',
      details: details.length > 0 ? details : ['No Bedrock configuration detected'],
    },
    env,
  }
}

const statusIcon = (status: 'ok' | 'warn' | 'error'): string => {
  const icons: Record<string, string> = { ok: '✓', warn: '⚠', error: '✗' }
  return icons[status]
}

const statusColor = (status: 'ok' | 'warn' | 'error', text: string): string => {
  const colorFns: Record<string, (t: string) => string> = { ok: green, warn: yellow, error: red }
  return colorFns[status](text)
}

const printCheck = (result: CheckResult): void => {
  echo(statusColor(result.status, `${statusIcon(result.status)} ${result.label}`))
  result.details.forEach((detail: string) => echo(`  ${detail}`))
  echo('')
}

const printSummary = (report: SetupReport): void => {
  const errors = report.checks.filter((c: CheckResult) => c.status === 'error')
  const warns = report.checks.filter((c: CheckResult) => c.status === 'warn')

  if (errors.length === 0 && warns.length === 0) {
    echo(green('=== Environment Checks Complete ==='))
    echo('')
    echo('Your environment is ready.')
  } else if (errors.length === 0) {
    echo(yellow('=== Environment Checks Complete (with warnings) ==='))
    echo('')
    echo('Your environment may work, but some issues were detected.')
  } else {
    echo(red('=== Environment Checks Incomplete ==='))
    echo('')
    echo('Some required components are missing. Fix the errors above before proceeding.')
    return
  }
}

const setup = async (): Promise<SetupReport> => {
  echo(cyan('=== Docker Claude Code Setup ==='))
  echo('')

  const techPass = await checkTechPass()
  printCheck(techPass)

  const claudeSettings = checkClaudeSettings()
  printCheck(claudeSettings)

  const awsCreds = checkAwsCredentials()
  printCheck(awsCreds)

  const docker = await checkDocker()
  printCheck(docker)

  const { check: envCheck, env } = checkBedrockConfig()
  printCheck(envCheck)

  const report: SetupReport = {
    checks: [techPass, claudeSettings, awsCreds, docker, envCheck],
    environment: env,
  }

  await buildGastownTemplate()

  await configureNetworkPolicy()

  printSummary(report)

  return report
}

export default setup
