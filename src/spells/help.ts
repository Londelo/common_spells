#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { yellow } from '../shared/colors'

const errorMessage = 'you are not a true dragon born.'

const displayCommands = async () => {
  echo(yellow('fusrodah').underline + ' how to: "fusrodah"')
    echo('\t- this will run "git push --force --no-verify"')

  echo(yellow('\nswitch').underline + ' how to: "switch" or "switch [branch name]"')
    echo('\t- if simply run "switch" and it will have you select from the available branches and run "git checkout", other wise it will use your given branch name')

  echo(yellow('\nbranch').underline + ' how to: "branch [branch name]"')
    echo('\t- this will take you to the DEFAULT branch, fetch and pull recent updates and then run "git checkout -b [branch name]"')

  echo(yellow('\ncommit').underline + ' how to: "commit" or "commit [message]"')
    echo('\t- this will run "git add .", "git commit -m [message]", then "git push"' )

  echo(yellow('\pull').underline + ' how to: "pull" or "pull [branch name]"')
    echo('\t- this will run "git checkout" (if given a branch), "git fetch", then "git pull"' )

  echo(yellow('\nfeature').underline + ' how to: "feature" or "feature [feature tag]"')
    echo('\t- this will run "npx run features:tags [tag]" or "npx run features:tags [tag]" if the other does not work' )
    echo('\t- if no tag was given it will have you select from the available tags' )
}

(async () => await errorHandlerWrapper(displayCommands, errorMessage))();
