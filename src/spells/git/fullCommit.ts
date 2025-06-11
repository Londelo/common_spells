#!/usr/bin/env node
import { exec, echo } from 'shelljs';
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { selectAllArgs, selectCurrentBranch } from '../../shared/selectors';
import { green, yellow } from '../../shared/colors';

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)';
const errorMessage = 'FAILED to commit message';
const skipAddArg = '-sa';
const skipAddArgFull = '--skip-add';

const fullCommit = async() => {
  const currentBranch = ( await selectCurrentBranch() ).toUpperCase();

  let message = selectAllArgs();
  if( !message ) {
    message = DEFAULT_MESSAGE;
  }

  const skipGitAdd = message.includes( skipAddArg ) || message.includes( skipAddArgFull );
  if( !skipGitAdd ) {
    echo( yellow( 'git add .' ) );
    await exec( 'git add .' );
  } else {
    message = message
      .replace( skipAddArg, '' )
      .replace( skipAddArgFull, '' )
      .trim();
  }

  const commitMessage = `${currentBranch}: ${message}`;
  echo( yellow( `git commit -m "${commitMessage}"` ) );
  await exec( `git commit -m "${commitMessage}"` );
  echo( yellow( 'git push' ) );
  await exec( 'git push' );

  echo( green( 'Commit Complete.' ) );
};

( async() => errorHandlerWrapper( fullCommit, errorMessage ) )();
