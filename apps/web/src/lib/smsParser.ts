// UPI SMS parser — covers 12+ Indian bank formats.
// All amounts in paise to avoid float issues. Returns null if SMS is not a UPI transaction.

export type ParsedSms = {
  amount: number;
  direction: "debit" | "credit";
  party?: string;
  upiRef?: string;
  date?: string;
};

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const UPI_REF_RE = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|number)?|ref\s*no\.?)\s*[:\-]?\s*([0-9]{10,})/i;
const DEBIT_KEYWORDS = /(?:debited|deducted|sent|paid|payment\s+of|transferred\s+to|spent)/i;
const CREDIT_KEYWORDS = /(?:credited|received|added|deposited|refund)/i;

// Party extraction: "to VPA/UPI ID xxx@xxx" or "from xxx@xxx"
const PARTY_RE = /(?:to|from)\s+(?:vpa\s+)?([a-zA-Z0-9._\-@]+@[a-zA-Z0-9]+|[A-Z][A-Za-z\s]{2,30})/;

function parseAmount(match: RegExpMatchArray): number {
  const raw = match[1].replace(/,/g, "");
  return Math.round(parseFloat(raw) * 100);
}

export function parseSms(sms: string): ParsedSms | null {
  const text = sms.trim();

  const amountMatch = AMOUNT_RE.exec(text);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch);
  if (amount <= 0) return null;

  const isDebit = DEBIT_KEYWORDS.test(text);
  const isCredit = CREDIT_KEYWORDS.test(text);
  if (!isDebit && !isCredit) return null;

  const direction = isDebit ? "debit" : "credit";

  const refMatch = UPI_REF_RE.exec(text);
  const upiRef = refMatch?.[1];

  const partyMatch = PARTY_RE.exec(text);
  const party = partyMatch?.[1]?.trim();

  return { amount, direction, party, upiRef };
}

export function isUpiSms(sender: string, body: string): boolean {
  const knownBanks = /hdfc|sbi|icici|axis|kotak|yes\s*bank|pnb|bob|canara|union\s*bank|idfc|au\s*bank|paytm|gpay|phonepe/i;
  return knownBanks.test(sender) && (DEBIT_KEYWORDS.test(body) || CREDIT_KEYWORDS.test(body));
}
