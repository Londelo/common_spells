#!/usr/bin/env node

import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { cwd } from 'process'
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'

const errorMessage = 'Failed to launch Londolo'

const findCastleLondelo = (): string => {
  const currentPath = cwd()

  // Check if we're already inside CastleLondelo
  if (currentPath.includes('CastleLondelo')) {
    return currentPath
  }

  // Fallback: check ~/CastleLondelo (handles cases like /tmp where upward walk can't reach home)
  const castleLondelo = join(homedir(), 'CastleLondelo')
  if (existsSync(castleLondelo)) {
    return castleLondelo
  }

  throw new Error(
    'CastleLondelo not found. Ensure CastleLondelo exists on your system and run londelo from within or below it.'
  )
}

const launchLondolo = async () => {
  const extraArgs = process.argv.slice(2)
  const castlePath = findCastleLondelo()
  const castleLondelo = join(homedir(), 'CastleLondelo')
  const configDir = join(castleLondelo, '.claudeRootDir')

  if (!existsSync(configDir)) {
    throw new Error(
      `.claudeRootDir not found in ${castlePath}. Ensure .claudeRootDir exists inside your CastleLondelo directory.`
    )
  }

  let args = ['--dangerously-skip-permissions', '--model', 'calcifer']

  // Load system prompt from fixed path if it exists
  const systemPromptPath = join(homedir(), 'CastleLondelo', '.claudeRootDir', 'systemprompt.md')
  console.log(existsSync(systemPromptPath), systemPromptPath)
  if (existsSync(systemPromptPath)) {
    const systemPrompt = readFileSync(systemPromptPath, 'utf-8')
    args = [...args, '--system-prompt', systemPrompt]
  }

  args = [...args, ...extraArgs]

  await new Promise<void>((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: false,
      cwd: castlePath,
      env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`claude exited with code ${code}`))
        return
      }
      resolve()
    })
  })
}

;(async () => await errorHandlerWrapper(launchLondolo, errorMessage))();
