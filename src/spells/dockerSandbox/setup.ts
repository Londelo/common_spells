#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import setup from '../../shared/dockerSandbox/setup'
import { getAvailablePlugins } from '../../shared/dockerSandbox/setup/helpers'
import inquirer from 'inquirer'
import colors from 'colors'

const errorMessage = 'Error in dockerSandbox setup'

const main = async (): Promise<void> => {
  const availablePlugins = getAvailablePlugins()

  const pluginChoices = [
    ...availablePlugins,
    'None (skip plugin installation)',
  ]

  const { selectedPlugin } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPlugin',
      message: 'Select a plugin to install:',
      choices: pluginChoices,
    },
  ])

  const plugin = selectedPlugin === 'None (skip plugin installation)' ? undefined : selectedPlugin

  if (plugin) {
    console.log(colors.cyan(`Installing plugin: ${plugin}`))
  } else {
    console.log(colors.cyan('No plugin selected'))
  }

  await setup(plugin)
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
