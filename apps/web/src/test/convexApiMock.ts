// Stand-in for the generated `@convex/_generated/api` module.
//
// The real `anyApi` proxy returns a *fresh* reference on every property access
// (`api.x.y !== api.x.y`) and can't be stringified, so it's useless as a stable
// key for matching a component's `useMutation(api.x.y)` against a test's
// assertion. This caching proxy instead returns the SAME object for a given
// path, so `api.smsQueue.approve === api.smsQueue.approve` and the object can be
// used as a Map key by the convex/react mock.

function makeApiProxy(path: string[] = []): unknown {
  const cache = new Map<string, unknown>();
  const target = Object.assign(() => {}, { __path: path.join(".") });
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "__path") return path.join(".");
      if (typeof prop !== "string") return undefined;
      if (!cache.has(prop)) cache.set(prop, makeApiProxy([...path, prop]));
      return cache.get(prop);
    },
  });
}

export const apiModuleMock = {
  api: makeApiProxy(["api"]),
  internal: makeApiProxy(["internal"]),
};
