import { NitroModules } from 'react-native-nitro-modules';
import type { RiveLogger as RiveLoggerSpec } from '../specs/RiveLogger.nitro';

export type RiveLogLevel = 'debug' | 'info' | 'warn' | 'error';

const _logger = NitroModules.createHybridObject<RiveLoggerSpec>('RiveLogger');

function defaultHandler(level: string, tag: string, message: string) {
  const prefix = `[Rive/${tag}]`;
  if (level === 'error') {
    console.error(prefix, message);
  } else if (level === 'warn') {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

_logger.setHandler(defaultHandler);

export namespace RiveLog {
  export function setHandler(
    handler: (level: string, tag: string, message: string) => void
  ) {
    _logger.setHandler(handler);
  }

  export function resetHandler() {
    _logger.setHandler(defaultHandler);
  }

  export function setLogLevel(level: RiveLogLevel) {
    _logger.setLogLevel(level);
  }
}
