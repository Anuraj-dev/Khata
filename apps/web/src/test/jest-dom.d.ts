// Registers @testing-library/jest-dom's custom matchers (toBeInTheDocument,
// toBeEnabled, …) on vitest's Assertion type for the whole project, so test
// files typecheck. The runtime side is wired in apps/web/vitest.setup.ts.
import "@testing-library/jest-dom/vitest";
