import { vi } from "vitest";

// A lightweight stand-in for `convex/react` so component/hook tests can drive
// query results and assert mutation calls without a live Convex client. Mutations
// expose `.withOptimisticUpdate` (returning the same spy) so code that wires
// optimistic updates type-checks and runs unchanged under test.
//
// Usage in a test file:
//   vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);
//   import { setQuery, mutationOf, resetConvexMock } from "../test/convexMock";
// Key queries/mutations by their `api.*` function reference.

type Ref = unknown;

const queryResults = new Map<Ref, unknown>();
const mutationMocks = new Map<Ref, ReturnType<typeof makeMutation>>();
let authState = { isAuthenticated: true, isLoading: false };

function makeMutation() {
  const fn = vi.fn().mockResolvedValue(undefined) as ReturnType<typeof vi.fn> & {
    withOptimisticUpdate: (..._args: unknown[]) => typeof fn;
  };
  fn.withOptimisticUpdate = () => fn;
  return fn;
}

/** Seed the value a `useQuery(ref, ...)` call should return. */
export function setQuery(ref: Ref, value: unknown): void {
  queryResults.set(ref, value);
}

/** Get (lazily creating) the spy returned by `useMutation(ref)`. */
export function mutationOf(ref: Ref): ReturnType<typeof makeMutation> {
  let m = mutationMocks.get(ref);
  if (!m) {
    m = makeMutation();
    mutationMocks.set(ref, m);
  }
  return m;
}

/** Override the `useConvexAuth()` result. */
export function setAuth(state: { isAuthenticated: boolean; isLoading: boolean }): void {
  authState = state;
}

/** Clear all seeded queries/mutations/auth — call in beforeEach. */
export function resetConvexMock(): void {
  queryResults.clear();
  mutationMocks.clear();
  authState = { isAuthenticated: true, isLoading: false };
}

export const convexReactMock = {
  useQuery: (ref: Ref, args?: unknown) =>
    args === "skip" ? undefined : queryResults.get(ref),
  useMutation: (ref: Ref) => mutationOf(ref),
  useConvexAuth: () => authState,
};
