// UPI SMS parser — single source of truth for both the background ingest path
// (convex/smsIngest.ts) and the foreground poller (apps/web/src/lib/smsPoller.ts,
// which imports this file directly). Pure string logic, no Convex APIs — safe to
// run inside a mutation and safe to bundle into the web app.
//
// All amounts in paise to avoid float issues. parseSms returns null if the SMS
// is not a UPI transaction.

export type Category = "food" | "travel" | "shopping" | "bills" | "health" | "other";

export type ParsedSms = {
  amount: number;
  direction: "debit" | "credit";
  party?: string; // best-effort display name; may be absent for phone-only handles
  handle?: string; // raw UPI handle (full VPA, lowercased) — the stable identity key
  upiRef?: string;
  date?: string; // ISO yyyy-mm-dd, when a date is present in the message body
};

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const AMOUNT_NEAR_KEYWORD_RE =
  /(?:debited|credited|debit|credit|deducted|sent|paid|received|spent)\s+(?:by|with|for|of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const UPI_REF_RE = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|number)?|ref\s*no\.?)\s*[:\-]?\s*([0-9]{10,})/i;
const DEBIT_KEYWORDS = /(?:debited|deducted|sent|paid|payment\s+of|transferred\s+to|spent)/i;
const CREDIT_KEYWORDS = /(?:credited|received|added|deposited|refund)/i;

const DEBIT_PREP = "to|trf\\s+to|paid\\s+to|at";
const CREDIT_PREP = "from";
const partyTerminator = "(?=\\s+(?:on|ref|upi|dated|via|a\\/c|account|info|not|rs|inr|\\d)|[.,;:\\n]|$)";
function vpaRe(prep: string) {
  return new RegExp(`(?:${prep})\\s+(?:vpa\\s+)?([a-z0-9._\\-]+@[a-z]{2,})`, "i");
}
function nameRe(prep: string) {
  // Cap raised to 60 so longer merchant names (e.g. "Isthara Parks Private
  // Limited") aren't truncated mid-word.
  return new RegExp(`(?:${prep})\\s+(?:vpa\\s+)?([A-Za-z][A-Za-z0-9 .&'\\-]{1,60}?)${partyTerminator}`, "i");
}

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

  const { handle, name } = extractCounterparty(text, direction);

  const date = parseSmsDate(text);

  return { amount, direction, party: name, handle, upiRef, date };
}

function parseAmount(match: RegExpMatchArray): number {
  const raw = match[1].replace(/,/g, "");
  return Math.round(parseFloat(raw) * 100);
}

// Pull both the raw UPI handle (the stable key) and a best-effort display name
// out of the message. The handle is only present when the SMS carries a VPA; a
// phone-number VPA (9706312331@ybl) yields a handle but no name (the display
// falls back to a formatted phone / "tap to name" on the client).
function extractCounterparty(
  text: string,
  direction: "debit" | "credit"
): { handle?: string; name?: string } {
  const prep = direction === "credit" ? CREDIT_PREP : DEBIT_PREP;
  const vpa = vpaRe(prep).exec(text);
  if (vpa) {
    const handle = vpa[1].toLowerCase();
    const local = handle.slice(0, handle.indexOf("@"));
    // Derive a name from the local part only when it's name-like (has letters),
    // never from a pure phone-number handle.
    const name = /[a-z]/.test(local) ? cleanPartyName(local) : undefined;
    return { handle, name };
  }
  const name = nameRe(prep).exec(text);
  if (name) return { name: cleanPartyName(name[1]) };
  return {};
}

export function cleanPartyName(raw: string): string | undefined {
  let s = raw.trim();
  const at = s.indexOf("@");
  if (at > 0) s = s.slice(0, at);
  // Reject UPI transaction-id / hex-ref blobs outright (e.g.
  // "F4959ebdcb2b4703976100b5a8f697a9") — these are never names.
  const compact = s.replace(/[\s._-]/g, "");
  if (/^[0-9a-f]{12,}$/i.test(compact)) return undefined;
  s = s.replace(/[._\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  // Strip digits glued to the end of a word ("Kumars96417" -> "Kumars",
  // "Vaibhav138" -> "Vaibhav") and drop standalone numeric ref tails ("138",
  // "1", "2"). Keep only tokens that still hold a letter.
  const words = s
    .split(" ")
    .map((w) => w.replace(/\d+$/, ""))
    .filter((w) => w.length > 0 && /[a-z]/i.test(w));
  if (words.length === 0) return undefined;
  const cleaned = words.join(" ");
  // Whatever's left is too short to be a real name (e.g. "Nd" from "Nd3879297").
  if (cleaned.length <= 2) return undefined;
  const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (words.length > 1 && cleaned === cleaned.toUpperCase()) {
    return words.map(titleCase).join(" ");
  }
  return words
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : titleCase(w)))
    .join(" ");
}

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
