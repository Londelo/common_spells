import { exec } from "shelljs"
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

export {
  execute
}
