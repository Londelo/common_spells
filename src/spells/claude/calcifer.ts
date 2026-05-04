#!/usr/bin/env node
import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'

const errorMessage = 'Failed to launch Calcifer'

const launchCalcifer = async () => {
  const extraArgs = process.argv.slice(2)
  const args = ['--dangerously-skip-permissions', '--model', 'calcifer', ...extraArgs]

  await new Promise<void>((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, CLAUDE_CONFIG_DIR: join(homedir(), '.claude-local') },
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
