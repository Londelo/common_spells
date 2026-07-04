#!/usr/bin/env node

import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { cwd } from 'process'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'

const errorMessage = 'Failed to launch Calcifer'

const getSessionSpawnDir = (): string => {
  const currentPath = cwd()

  // Check if we're already inside CastleLondelo
  if (currentPath.includes('CastleLondelo')) {
    return currentPath
  }

  // Try ~/CastleLondelo
  const castlePath = join(homedir(), 'CastleLondelo')
  if (existsSync(castlePath)) {
    return castlePath
  }

  // Fall back to ~/.claude-local
  return join(homedir(), '.claude-local')
}

const launchCalcifer = async () => {
  const extraArgs = process.argv.slice(2)
  const spawnDir = getSessionSpawnDir()
  const args = ['--dangerously-skip-permissions', '--model', 'calcifer', ...extraArgs]

  await new Promise<void>((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: false,
      cwd: spawnDir,
      env: { ...process.env, CLAUDE_CONFIG_DIR: join(homedir(), '.claude-local')  },
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

(async () => await errorHandlerWrapper(launchCalcifer, errorMessage))();
