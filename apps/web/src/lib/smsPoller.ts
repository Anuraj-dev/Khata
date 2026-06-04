import { Capacitor, registerPlugin } from "@capacitor/core";
import { parseSms, isUpiSms, categorizeSms, smsClientId, type Category } from "./smsParser";
import { toIsoDate } from "./dates";

// Custom native plugin interface — implemented in android/app/.../SmsPlugin.java
// Web stub returns empty arrays (no-op).
export interface SmsReaderPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  getRecentSms(options: {
    limit: number;
    afterTimestamp: number;
  }): Promise<{ messages: Array<{ sender: string; body: string; timestamp: number }> }>;
}

const SmsReader = registerPlugin<SmsReaderPlugin>("SmsReader", {
  // Web stub — always returns no messages
  web: {
    requestPermission: async () => ({ granted: false }),
    getRecentSms: async () => ({ messages: [] }),
  },
});

export type ParsedSmsMessage = {
  rawSms: string;
  parsedAmount?: number;
  parsedParty?: string;
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
  return direction === "credit" ? "UPI received" : "UPI payment";
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
