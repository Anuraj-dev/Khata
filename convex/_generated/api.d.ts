/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as budget from "../budget.js";
import type * as categories from "../categories.js";
import type * as contactMatch from "../contactMatch.js";
import type * as crons from "../crons.js";
import type * as expenses from "../expenses.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushTokens from "../pushTokens.js";
import type * as settlements from "../settlements.js";
import type * as smsIngest from "../smsIngest.js";
import type * as smsParser from "../smsParser.js";
import type * as smsQueue from "../smsQueue.js";
import type * as tripAccess from "../tripAccess.js";
import type * as tripShares from "../tripShares.js";
import type * as trips from "../trips.js";
import type * as udhaar from "../udhaar.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  budget: typeof budget;
  categories: typeof categories;
  contactMatch: typeof contactMatch;
  crons: typeof crons;
  expenses: typeof expenses;
  http: typeof http;
  index: typeof index;
  pushNotifications: typeof pushNotifications;
  pushTokens: typeof pushTokens;
  settlements: typeof settlements;
  smsIngest: typeof smsIngest;
  smsParser: typeof smsParser;
  smsQueue: typeof smsQueue;
  tripAccess: typeof tripAccess;
  tripShares: typeof tripShares;
  trips: typeof trips;
  udhaar: typeof udhaar;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
