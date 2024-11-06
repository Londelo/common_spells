#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'

const errorMessage = 'you are not a true dragon born.'

const displayCommands = async () => {
  echo(chalk.yellow.underline.italic('fusrodah') + chalk.italic(' how to: "fusrodah"'))
    echo(chalk.italic('\t- this will run "git push --force --no-verify"'))

  echo(chalk.yellow.underline.italic('\nswitch') + chalk.italic(' how to: "switch" or "switch [branch name]"'))
    echo(chalk.italic('\t- if simply run "switch" and it will have you select from the available branches and run "git checkout", other wise it will use your given branch name'))

  echo(chalk.yellow.underline.italic('\nbranch') + chalk.italic(' how to: "branch [branch name]"'))
    echo(chalk.italic('\t- this will take you to the DEFAULT branch, fetch and pull recent updates and then run "git checkout -b [branch name]"'))

  echo(chalk.yellow.underline.italic('\ncommit') + chalk.italic(' how to: "commit" or "commit [message]"'))
    echo(chalk.italic('\t- this will run "git add .", "git commit -m [message]", then "git push"' ))

  echo(chalk.yellow.underline.italic('\nfeature') + chalk.italic(' how to: "feature" or "feature [feature tag]"'))
    echo(chalk.italic('\t- this will run "npx run features:tags [tag]" or "npx run features:tags [tag]" if the other does not work' ))
    echo(chalk.italic('\t- if no tag was given it will have you select from the available tags' ))
}

(async () => await errorHandlerWrapper(displayCommands, errorMessage))();
