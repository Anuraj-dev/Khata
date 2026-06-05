import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "purge old rejected sms queue items",
  { hours: 1 },
  internal.smsQueue.purgeOldRejected,
  {}
);

// 9:00 AM IST = 3:30 AM UTC
crons.daily(
  "settlement reminders",
  { hourUTC: 3, minuteUTC: 30 },
  internal.pushNotifications.sendSettlementReminders,
  {}
);

export default crons;
