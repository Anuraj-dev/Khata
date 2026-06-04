// UPI SMS parser — covers 12+ Indian bank formats.
// All amounts in paise to avoid float issues. Returns null if SMS is not a UPI transaction.

export type Category = "food" | "travel" | "shopping" | "bills" | "health" | "other";

export type ParsedSms = {
  amount: number;
  direction: "debit" | "credit";
  party?: string;
  upiRef?: string;
  date?: string; // ISO yyyy-mm-dd, when a date is present in the message body
};

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const UPI_REF_RE = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|number)?|ref\s*no\.?)\s*[:\-]?\s*([0-9]{10,})/i;
const DEBIT_KEYWORDS = /(?:debited|deducted|sent|paid|payment\s+of|transferred\s+to|spent)/i;
const CREDIT_KEYWORDS = /(?:credited|received|added|deposited|refund)/i;

// Party extraction: "to VPA/UPI ID xxx@xxx" or "from xxx@xxx"
const PARTY_RE = /(?:to|from)\s+(?:vpa\s+)?([a-zA-Z0-9._\-@]+@[a-zA-Z0-9]+|[A-Z][A-Za-z\s]{2,30})/;

// Date formats common to Indian bank/UPI SMS:
//   04-06-26, 04/06/2026, 04.06.26   (DD-MM-YY[YY])
//   04-Jun-26, 04 Jun 2026           (DD-Mon-YY[YY])
const NUMERIC_DATE_RE = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
const MONTH_NAME_DATE_RE = /\b(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{2,4})\b/;
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fullYear(yy: number): number {
  return yy < 100 ? 2000 + yy : yy;
}

function toIso(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Extracts a transaction date from the SMS body. Returns undefined when no
// recognizable date is present (caller should fall back to the receive time).
export function parseSmsDate(text: string): string | undefined {
  const named = MONTH_NAME_DATE_RE.exec(text);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month) return toIso(fullYear(Number(named[3])), month, Number(named[1]));
  }
  const numeric = NUMERIC_DATE_RE.exec(text);
  if (numeric) {
    return toIso(fullYear(Number(numeric[3])), Number(numeric[2]), Number(numeric[1]));
  }
  return undefined;
}

const CATEGORY_KEYWORDS: Array<[Category, RegExp]> = [
  ["food", /zomato|swiggy|restaurant|cafe|food|dominos|mcdonald|kfc|bakery|dhaba|eatery/i],
  ["travel", /uber|ola|rapido|irctc|petrol|fuel|hpcl|iocl|bpcl|metro|railway|indigo|airlines|toll|fastag/i],
  ["shopping", /amazon|flipkart|myntra|ajio|meesho|store|mart|bigbasket|blinkit|zepto|dmart|reliance/i],
  ["bills", /electricity|recharge|airtel|jio|vodafone|vi\b|broadband|dth|gas|water\s*bill|bill\s*pay|postpaid|insurance|lic\b/i],
  ["health", /pharmacy|hospital|medical|apollo|clinic|chemist|diagnostic|pharmeasy|netmeds|1mg/i],
];

// Best-effort category from the party name + raw body. Defaults to "other".
export function categorizeSms(party: string | undefined, body: string): Category {
  const haystack = `${party ?? ""} ${body}`;
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(haystack)) return category;
  }
  return "other";
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

  const date = parseSmsDate(text);

  return { amount, direction, party, upiRef, date };
}

function parseAmount(match: RegExpMatchArray): number {
  const raw = match[1].replace(/,/g, "");
  return Math.round(parseFloat(raw) * 100);
}

// Deterministic id so the same transaction is never logged twice, even when the
// poller re-reads the inbox after an app restart. UPI ref is globally unique when
// present; otherwise fall back to a hash of amount + date + message body.
export function smsClientId(parsed: ParsedSms, body: string): string {
  if (parsed.upiRef) return `sms-${parsed.upiRef}`;
  return `sms-${parsed.amount}-${parsed.date ?? ""}-${hash(body)}`;
}

function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export function isUpiSms(sender: string, body: string): boolean {
  const knownBanks = /hdfc|sbi|icici|axis|kotak|yes\s*bank|pnb|bob|canara|union\s*bank|idfc|au\s*bank|paytm|gpay|phonepe/i;
  return knownBanks.test(sender) && (DEBIT_KEYWORDS.test(body) || CREDIT_KEYWORDS.test(body));
}
