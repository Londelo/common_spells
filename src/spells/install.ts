#!/usr/bin/env node
import { exec, echo } from 'shelljs';
import errorHandlerWrapper from '../shared/errorHandlerWrapper';
import { green, yellow } from '../shared/colors';
import { selectAllArgs } from '../shared/selectors';

const errorMessage = 'FAILED to install';
const findNpmLockFile = 'find . -path ./package-lock.json';
const findYarnLockFile = 'find . -path ./yarn.lock';

const install = async() => {
  const npmLockFile = exec( findNpmLockFile, {silent: true} ).stdout;
  const yarnLockFile = exec( findYarnLockFile, {silent: true} ).stdout;
  const installParams = selectAllArgs() || '';
  let installCommand = '';

  if( npmLockFile ) {
    installCommand = `npm install ${installParams}`;
  } else if( yarnLockFile ) {
    if( installParams ) {
      installCommand = `yarn add ${installParams}`;
    } else {
      installCommand = 'yarn';
    }
  }

  echo( yellow( installCommand ) );
  exec( installCommand );
  echo( green( 'Install Complete!' ) );
};

( async() => errorHandlerWrapper( install, errorMessage ) )();
