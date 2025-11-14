#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { green, yellow } from '../../shared/colors'
import { execute } from '../../shared/shell'
import checkForGlab from '../../shared/glab/checkForGlab'

const errorMessage = 'FAILED to get variables'

type Variable = {
  key: string
  value: string
}

const selectVariables = (result: string): Variable[] => {
  // Extract only the JSON array by finding the first '[' and last ']'
  const jsonStart = result.indexOf('[')
  const jsonEnd = result.lastIndexOf(']')
  const jsonString = result.slice(jsonStart, jsonEnd + 1)

  return JSON.parse(jsonString).map((v: any) => ({
    key: v.key,
    value: v.value
  }))
}

const getVariables = async () => {
  await checkForGlab()

  const command = 'glab variable list -F json'
  echo(yellow(command))
  const result = await execute(command, 'Failed to get variables')

  const variables = selectVariables(result)

  if(!variables.length) {
    echo(yellow('No variables to share.'))
  }

  variables.forEach((variable) => {
    echo(`${green(variable.key)}:\n\t${variable.value}\n`)
  })
}

(async () => await errorHandlerWrapper(getVariables, errorMessage))()
