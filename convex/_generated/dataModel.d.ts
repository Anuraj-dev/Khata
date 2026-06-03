/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { GenericId } from "convex/values";
import type { SystemTableNames } from "convex/server";

export type TableNames =
  | "users"
  | "expenses"
  | "trips"
  | "tripExpenses"
  | "settlements"
  | "smsReviewQueue";

export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;

export type Doc<TableName extends TableNames> = TableName extends "expenses"
  ? {
      _id: Id<"expenses">;
      _creationTime: number;
      clientId: string;
      amount: number;
      note: string;
      category: "food" | "travel" | "shopping" | "bills" | "health" | "other";
      source: "manual" | "sms";
      direction: "debit" | "credit";
      upiRef?: string;
      party?: string;
      date: string;
      ownerTokenIdentifier: string;
      createdAt: number;
      updatedAt: number;
    }
  : TableName extends "trips"
  ? {
      _id: Id<"trips">;
      _creationTime: number;
      clientId: string;
      name: string;
      members: string[];
      startDate?: string;
      endDate?: string;
      status: "active" | "settled";
      ownerTokenIdentifier: string;
      createdAt: number;
      updatedAt: number;
    }
  : TableName extends "tripExpenses"
  ? {
      _id: Id<"tripExpenses">;
      _creationTime: number;
      clientId: string;
      tripId: Id<"trips">;
      paidBy: string;
      amount: number;
      note: string;
      splitAmong: string[];
      date: string;
      ownerTokenIdentifier: string;
      createdAt: number;
    }
  : TableName extends "settlements"
  ? {
      _id: Id<"settlements">;
      _creationTime: number;
      tripId: Id<"trips">;
      fromMember: string;
      toMember: string;
      amount: number;
      settledAt?: number;
      ownerTokenIdentifier: string;
      createdAt: number;
    }
  : TableName extends "smsReviewQueue"
  ? {
      _id: Id<"smsReviewQueue">;
      _creationTime: number;
      rawSms: string;
      parsedAmount?: number;
      parsedParty?: string;
      parsedDirection?: "debit" | "credit";
      parsedDate?: string;
      parsedUpiRef?: string;
      status: "pending" | "approved" | "rejected";
      ownerTokenIdentifier: string;
      createdAt: number;
      reviewedAt?: number;
    }
  : TableName extends "users"
  ? {
      _id: Id<"users">;
      _creationTime: number;
      name?: string;
      email?: string;
      image?: string;
      tokenIdentifier: string;
    }
  : never;

export type DataModel = {
  users: { document: Doc<"users">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
  expenses: { document: Doc<"expenses">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
  trips: { document: Doc<"trips">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
  tripExpenses: { document: Doc<"tripExpenses">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
  settlements: { document: Doc<"settlements">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
  smsReviewQueue: { document: Doc<"smsReviewQueue">; fieldPaths: string; indexes: {}; searchIndexes: {}; vectorIndexes: {} };
};
