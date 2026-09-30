declare global {
  interface ImportMeta {
    // Vite/vitest inject this at transform time. Convex's tsconfig does not
    // include the vite client types, so the signature lives next to the call.
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
}

// Shared module map for every convex-test file. From this directory the
// pattern is `convex/**/*.*s`: `.ts` sources and `_generated/*.js`. A
// `.ts`-only glob never includes `_generated`, and convex-test then throws
// "Could not find the `_generated` directory".
//
// The call stays inside a function so the Convex bundler can load this module
// without executing a Vite-only glob (this file is otherwise a deploy entry).
export function convexTestModules(): Record<string, () => Promise<unknown>> {
  return import.meta.glob("./**/*.*s");
}
