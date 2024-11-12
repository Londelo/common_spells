#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, exit } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import inquirer from 'inquirer'

const errorMessage = 'FAIL to run test'

const normalizeGrepData = (data: RegExpMatchArray|null) => data ? `@${data[1].trim()}` : '*unidentified tag*'

const beSilent = { silent: true }

const getAllTags = () => {
  const tagReg = /@(.+)/
  const greppedTags = exec(
    'grep -r -n --include="*.feature" --exclude-dir=node_modules -E "@" .',
    beSilent
  ).stdout
  .split('./')
  .slice(1)

  const tags = greppedTags.map(line => {
    const tag = line.match(tagReg)
    return normalizeGrepData(tag)
  })
  return tags
}

async function selectTag() {
  const tags = getAllTags()

  if(!tags.length) {
    echo(chalk.red.italic('I could not find any test tags for you.'))
    exit(1)
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tag',
      message: 'All tests are available for your selection.',
      choices: tags
    }
  ]);

  return answers.tag.replace('* ', '')
}

const runTest = (testCommand: string) => {
  try {
    echo(chalk.yellow.italic(testCommand))
    exec(testCommand)
    echo(chalk.green.italic('All tests are complete.'))
    exit(0)
  } catch(err: any) {
    if(err.message.includes('minimatch')) {
      echo(chalk.red.italic('You cant run tests here.'))
      exit(1)
    }

    if(testCommand.includes('features')) {
      runTest(testCommand.replace('features', 'tests'))
    }

    echo(chalk.yellow.italic(err.message))
    exit(1)
  }
}

const testFeature = async () => {

  let testParams = process.argv.slice(2).join(' ')
  if(testParams) {
    runTest(`npx run features:tags ${testParams}`)
  }

  const tag = await selectTag()
  runTest(`npx run features:tags ${tag}`)
}

(async () => await errorHandlerWrapper(testFeature, errorMessage))();
