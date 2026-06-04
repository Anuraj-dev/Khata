import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { pollForUpiSms } from "../lib/smsPoller";
import { Capacitor } from "@capacitor/core";

const POLL_INTERVAL_MS = 30_000;

// Polls for new UPI SMS every 30 s on native Android. No-op on web.
export function useSmsPoller() {
  const enqueue = useMutation(api.smsQueue.enqueue);
  const lastPollRef = useRef<number>(Date.now() - 60 * 60 * 1000); // start 1h back on first poll

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function poll() {
      const since = lastPollRef.current;
      const messages = await pollForUpiSms(since);
      lastPollRef.current = Date.now();

      for (const msg of messages) {
        try {
          await enqueue({
            rawSms: msg.rawSms,
            parsedAmount: msg.parsedAmount,
            parsedParty: msg.parsedParty,
            parsedDirection: msg.parsedDirection,
            parsedUpiRef: msg.parsedUpiRef,
            parsedDate: msg.parsedDate,
          });
        } catch {
          // Ignore duplicate enqueue errors
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enqueue]);
}
