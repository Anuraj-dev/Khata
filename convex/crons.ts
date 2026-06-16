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

// 9:00 PM IST = 3:30 PM UTC — end-of-day cash logging nudge (skips anyone who
// already logged a manual expense today).
crons.daily(
  "cash logging nudge",
  { hourUTC: 15, minuteUTC: 30 },
  internal.pushNotifications.sendCashNudges,
  {}
);

// 8:00 AM IST = 2:30 AM UTC — remind about recurring bills due in the next few days.
crons.daily(
  "recurring bill reminders",
  { hourUTC: 2, minuteUTC: 30 },
  internal.pushNotifications.sendRecurringReminders,
  {}
);

export default crons;
