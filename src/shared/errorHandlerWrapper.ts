
import {
  config, echo, exit
} from 'shelljs';
import { red, yellow } from './colors';

const errorHandlerWrapper = async( func: () => void, errorMessage: string ) => {
  config.fatal = true;

  try {
    await func();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch( { message }: any ) {
    if( message.includes( 'User force closed the prompt' ) ) {
      echo( yellow( 'canceled' ) );
      exit( 1 );
    }
    echo( red( errorMessage ) );
    echo( message );
    exit( 1 );
  }
};

export default errorHandlerWrapper;
