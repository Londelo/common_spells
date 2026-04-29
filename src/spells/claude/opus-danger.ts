#!/usr/bin/env node
import { spawn } from 'child_process'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'

const errorMessage = 'Failed to launch Klaude'

const launchKlaude = async () => {
  const extraArgs = process.argv.slice(2)
  const args = ['--dangerously-skip-permissions', '--model', 'opus', ...extraArgs]

  await new Promise<void>((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: false,
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

(async () => await errorHandlerWrapper(launchKlaude, errorMessage))();
