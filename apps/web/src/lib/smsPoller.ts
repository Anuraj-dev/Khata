import { Capacitor, registerPlugin } from "@capacitor/core";
import { parseSms, isUpiSms } from "./smsParser";

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
};

// Polls the native SMS inbox for new UPI messages since `afterTimestamp`.
// Returns parsed messages ready for enqueueing, or empty array on web/no permission.
export async function pollForUpiSms(afterTimestamp: number): Promise<ParsedSmsMessage[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const { granted } = await SmsReader.requestPermission();
  if (!granted) return [];

  const { messages } = await SmsReader.getRecentSms({ limit: 50, afterTimestamp });

  return messages
    .filter((m) => isUpiSms(m.sender, m.body))
    .map((m) => {
      const parsed = parseSms(m.body);
      return {
        rawSms: m.body,
        parsedAmount: parsed?.amount,
        parsedParty: parsed?.party,
        parsedDirection: parsed?.direction,
        parsedUpiRef: parsed?.upiRef,
        parsedDate: parsed?.date,
      };
    });
}

export { SmsReader };
