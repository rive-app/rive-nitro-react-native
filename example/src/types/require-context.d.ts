// Based on https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/webpack-env/index.d.ts
// Adds support for the runtime `require.context` method.
// https://github.com/facebook/metro/pull/822/

declare namespace __MetroModuleApi {
  interface RequireContext {
    keys(): string[];
    (id: string): any;
    <T>(id: string): T;
    resolve(id: string): string;
  }

  interface RequireFunction {
    (path: string): any;
    <T>(path: string): T;
    context(
      path: string,
      recursive?: boolean,
      filter?: RegExp,
      mode?: 'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
    ): RequireContext;
  }
}

declare namespace NodeJS {
  interface Require extends __MetroModuleApi.RequireFunction {}
}
