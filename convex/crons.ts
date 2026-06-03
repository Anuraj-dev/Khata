import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "purge old rejected sms queue items",
  { hours: 1 },
  internal.smsQueue.purgeOldRejected,
  {}
);

export default crons;
