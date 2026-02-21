import { exec } from "shelljs"
import { spawn } from "child_process"
import { red } from "./colors"

export type ExecOptions = {
  silent?: boolean,
  fatal?: boolean
}

const execute = (command: string, errorMsgContext: string, options: ExecOptions = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, { async: true, silent: true, ...options },
      function(code, stdout, stderr) {
        if (code !== 0) {
          const error = stderr.replace('ERROR', '').trim()
          reject(new Error(`${red(errorMsgContext)}: ${error}`))
        } else {
          resolve(stdout)
        }
      }
    )
  })
}

const executeInteractive = (command: string, errorMsgContext: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
    })

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${red(errorMsgContext)}: exit code ${code}`))
      } else {
        resolve()
      }
    })

    child.on('error', (error) => {
      reject(new Error(`${red(errorMsgContext)}: ${error.message}`))
    })
  })
}

export {
  execute,
  executeInteractive
}
