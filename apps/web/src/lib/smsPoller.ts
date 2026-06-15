import { Capacitor, registerPlugin } from "@capacitor/core";
// Single source of truth lives in convex/ so the background ingest path
// (convex/smsIngest.ts) and this foreground poller share identical parsing.
// Pure string logic, no Convex APIs — safe to import into the web bundle.
import { parseSms, isUpiSms, categorizeSms, smsClientId, type Category } from "../../../../convex/smsParser";
import { toIsoDate } from "./dates";

// Custom native plugin interface — implemented in android/app/.../SmsPlugin.java
// Web stub returns empty arrays (no-op).
export interface SmsReaderPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  getRecentSms(options: {
    limit: number;
    afterTimestamp: number;
  }): Promise<{ messages: Array<{ sender: string; body: string; timestamp: number }> }>;
  // Persists the device secret + ingest URL where the background SMS receiver can
  // read them, so it can post incoming SMS to Convex while the app is closed.
  configureIngest(options: { deviceSecret: string; ingestUrl: string }): Promise<void>;
  // Clears the persisted secret + URL on sign-out so the receiver stops posting.
  clearIngest(): Promise<void>;
}

const SmsReader = registerPlugin<SmsReaderPlugin>("SmsReader", {
  // Web stub — always returns no messages
  web: {
    requestPermission: async () => ({ granted: false }),
    getRecentSms: async () => ({ messages: [] }),
    configureIngest: async () => {},
    clearIngest: async () => {},
  },
});

export type ParsedSmsMessage = {
  rawSms: string;
  parsedAmount?: number;
  parsedParty?: string;
  parsedHandle?: string;
  parsedDirection?: "debit" | "credit";
  parsedUpiRef?: string;
  parsedDate?: string;
  // Present only for confident parses (amount + direction); enable direct auto-log.
  clientId?: string;
  note?: string;
  category?: Category;
};

function buildNote(party: string | undefined, direction: "debit" | "credit"): string {
  if (party) return party;
  // No counterparty parsed — keep it honest rather than mislabeling as "UPI payment".
  return direction === "credit" ? "Money received" : "Bank transaction";
}

// Polls the native SMS inbox for new UPI messages since `afterTimestamp`.
// Returns parsed messages ready for auto-logging / enqueueing, or empty array on
// web / no permission.
export async function pollForUpiSms(afterTimestamp: number): Promise<ParsedSmsMessage[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const { granted } = await SmsReader.requestPermission();
  if (!granted) return [];

  const { messages } = await SmsReader.getRecentSms({ limit: 50, afterTimestamp });

  return messages
    .filter((m) => isUpiSms(m.sender, m.body))
    .map((m) => {
      const parsed = parseSms(m.body);
      // Fall back to the SMS receive time when the body has no parseable date.
      const date = parsed?.date ?? toIsoDate(new Date(m.timestamp));
      const base: ParsedSmsMessage = {
        rawSms: m.body,
        parsedAmount: parsed?.amount,
        parsedParty: parsed?.party,
        parsedHandle: parsed?.handle,
        parsedDirection: parsed?.direction,
        parsedUpiRef: parsed?.upiRef,
        parsedDate: date,
      };

      if (parsed && parsed.amount && parsed.direction) {
        return {
          ...base,
          clientId: smsClientId({ ...parsed, date }, m.body),
          note: buildNote(parsed.party, parsed.direction),
          category: categorizeSms(parsed.party, m.body),
        };
      }
      return base;
    });
}

export { SmsReader };
