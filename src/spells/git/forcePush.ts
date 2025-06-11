#!/usr/bin/env node
import { exec, echo } from 'shelljs';
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { green } from '../../shared/colors';

const errorMessage = 'you are not a true dragon born.';

const forcePush = async() => {
  echo( green( 'FUS-RO-DAAAAAHHH!' ) );
  exec( 'git push --force-with-lease --no-verify' );
};

( async() => errorHandlerWrapper( forcePush, errorMessage ) )();
