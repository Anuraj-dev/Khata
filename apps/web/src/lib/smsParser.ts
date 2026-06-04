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

// Currency-prefixed amount ("Rs.250", "INR 1,200.50", "₹49") is the reliable one.
const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
// Fallback for banks (e.g. SBI) that write "debited by 250.0" with no symbol.
const AMOUNT_NEAR_KEYWORD_RE =
  /(?:debited|credited|debit|credit|deducted|sent|paid|received|spent)\s+(?:by|with|for|of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const UPI_REF_RE = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|number)?|ref\s*no\.?)\s*[:\-]?\s*([0-9]{10,})/i;
const DEBIT_KEYWORDS = /(?:debited|deducted|sent|paid|payment\s+of|transferred\s+to|spent)/i;
const CREDIT_KEYWORDS = /(?:credited|received|added|deposited|refund)/i;

// Party extraction is direction-aware: a debit's counterparty follows
// "to/trf to/paid to/at" (the bank's own name often follows "From" on debits),
// while a credit's counterparty follows "from". A name token runs until a
// trailing keyword (on, ref, …), punctuation, or a number. VPA handles
// (name@bank) are matched first since they're unambiguous.
const DEBIT_PREP = "to|trf\\s+to|paid\\s+to|at";
const CREDIT_PREP = "from";
const partyTerminator = "(?=\\s+(?:on|ref|upi|dated|via|a\\/c|account|info|not|rs|inr|\\d)|[.,;:\\n]|$)";
function vpaRe(prep: string) {
  return new RegExp(`(?:${prep})\\s+(?:vpa\\s+)?([a-z0-9._\\-]+@[a-z]{2,})`, "i");
}
function nameRe(prep: string) {
  return new RegExp(`(?:${prep})\\s+(?:vpa\\s+)?([A-Za-z][A-Za-z0-9 .&'\\-]{1,40}?)${partyTerminator}`, "i");
}

// Date formats common to Indian bank/UPI SMS:
//   04-06-26, 04/06/2026, 04.06.26   (DD-MM-YY[YY])
//   04-Jun-26, 04 Jun 2026, 02Jun26  (DD-Mon-YY[YY], separators optional)
const NUMERIC_DATE_RE = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
const MONTH_NAME_DATE_RE = /\b(\d{1,2})[-/ ]?([A-Za-z]{3})[A-Za-z]*[-/ ]?(\d{2,4})\b/;
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

  const amountMatch = AMOUNT_RE.exec(text) ?? AMOUNT_NEAR_KEYWORD_RE.exec(text);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch);
  if (amount <= 0) return null;

  const isDebit = DEBIT_KEYWORDS.test(text);
  const isCredit = CREDIT_KEYWORDS.test(text);
  if (!isDebit && !isCredit) return null;

  const direction = isDebit ? "debit" : "credit";

  const refMatch = UPI_REF_RE.exec(text);
  const upiRef = refMatch?.[1];

  const party = extractParty(text, direction);

  const date = parseSmsDate(text);

  return { amount, direction, party, upiRef, date };
}

function parseAmount(match: RegExpMatchArray): number {
  const raw = match[1].replace(/,/g, "");
  return Math.round(parseFloat(raw) * 100);
}

function extractParty(text: string, direction: "debit" | "credit"): string | undefined {
  const prep = direction === "credit" ? CREDIT_PREP : DEBIT_PREP;
  const vpa = vpaRe(prep).exec(text);
  if (vpa) return cleanPartyName(vpa[1]);
  const name = nameRe(prep).exec(text);
  if (name) return cleanPartyName(name[1]);
  return undefined;
}

// Turns a raw party token into a human label: drops the @bank from a VPA, splits
// separators into words, and title-cases. "swiggy.stores@icici" -> "Swiggy Stores".
export function cleanPartyName(raw: string): string | undefined {
  let s = raw.trim();
  const at = s.indexOf("@");
  if (at > 0) s = s.slice(0, at);
  s = s.replace(/[._\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  const words = s.split(" ");
  const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  // A multi-word all-caps string is almost always a person's name ("ANURAJ
  // SAIKIA" -> "Anuraj Saikia"). Single tokens stay as-is so brand/acronyms
  // ("HDFC", "SWIGGY") aren't mangled.
  if (words.length > 1 && s === s.toUpperCase()) {
    return words.map(titleCase).join(" ");
  }
  return words
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : titleCase(w)))
    .join(" ");
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
