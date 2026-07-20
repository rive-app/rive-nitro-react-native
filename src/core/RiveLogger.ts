import { NitroModules } from 'react-native-nitro-modules';
import type { RiveLogger as RiveLoggerSpec } from '../specs/RiveLogger.nitro';

export type RiveLogLevel = 'debug' | 'info' | 'warn' | 'error';

const _logger = NitroModules.createHybridObject<RiveLoggerSpec>('RiveLogger');

function consoleHandler(level: string, tag: string, message: string) {
  const prefix = `[Rive/${tag}]`;
  if (level === 'error') {
    // console.error would raise a dev RedBox for conditions apps usually
    // can't act on (render-loop hiccups etc.) — errors that matter reach the
    // app via onError / rejected promises.
    console.warn(prefix, message);
  } else if (level === 'warn') {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

export namespace RiveLog {
  /**
   * Route native Rive logs through a JS handler. Until a handler is set,
   * logs go to the platform's native sink (Logcat / OSLog) only — no JSI
   * round-trip per log line.
   */
  export function setHandler(
    handler: (level: string, tag: string, message: string) => void
  ) {
    _logger.setHandler(handler);
  }

  /**
   * Forward native Rive logs to the JS console (errors and warnings via
   * console.warn, the rest via console.log). Opt-in.
   */
  export function forwardToConsole() {
    _logger.setHandler(consoleHandler);
  }

  /** Detach any JS handler and return to native-side logging. */
  export function resetHandler() {
    _logger.resetHandler();
  }

  export function setLogLevel(level: RiveLogLevel) {
    _logger.setLogLevel(level);
  }
}
