import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { pollForUpiSms } from "../lib/smsPoller";
import { configureSmsBackground } from "../lib/smsBackground";
import { Capacitor } from "@capacitor/core";

const POLL_INTERVAL_MS = 30_000;

// Polls for new UPI SMS every 30 s on native Android. No-op on web.
// Confidently parsed transactions (amount + direction) are auto-logged straight
// to the expense list; anything that looks like a bank SMS but can't be parsed
// falls back to the manual review queue so it isn't silently lost.
export function useSmsPoller() {
  const autoLog = useMutation(api.smsQueue.autoLog);
  const enqueue = useMutation(api.smsQueue.enqueue);
  const registerDevice = useMutation(api.smsIngest.registerDevice);
  const lastPollRef = useRef<number>(Date.now() - 60 * 60 * 1000); // start 1h back on first poll

  // Register this device for background SMS ingest (native only). The native
  // receiver posts incoming SMS to Convex while the app is closed; this maps the
  // device secret to the signed-in user so the server knows whose expense it is.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      const deviceSecret = await configureSmsBackground();
      if (!deviceSecret || cancelled) return;
      try {
        await registerDevice({ deviceSecret, platform: Capacitor.getPlatform() });
      } catch {
        // Not signed in yet / transient — retried on next mount.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [registerDevice]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function poll() {
      const since = lastPollRef.current;
      const messages = await pollForUpiSms(since);
      lastPollRef.current = Date.now();

      for (const msg of messages) {
        try {
          if (
            msg.clientId &&
            msg.parsedAmount &&
            msg.parsedDirection &&
            msg.parsedDate &&
            msg.note &&
            msg.category
          ) {
            // Confident parse → log directly (deduped by clientId in the mutation).
            await autoLog({
              clientId: msg.clientId,
              amount: msg.parsedAmount,
              note: msg.note,
              category: msg.category,
              direction: msg.parsedDirection,
              date: msg.parsedDate,
              party: msg.parsedParty,
              upiRef: msg.parsedUpiRef,
            });
          } else {
            // Ambiguous / unparseable → queue for manual review.
            await enqueue({
              rawSms: msg.rawSms,
              parsedAmount: msg.parsedAmount,
              parsedParty: msg.parsedParty,
              parsedDirection: msg.parsedDirection,
              parsedUpiRef: msg.parsedUpiRef,
              parsedDate: msg.parsedDate,
            });
          }
        } catch {
          // Ignore duplicate / transient errors
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoLog, enqueue]);
}
