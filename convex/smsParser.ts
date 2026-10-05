// UPI SMS parser — single source of truth for both the background ingest path
// (convex/smsIngest.ts) and the foreground poller (apps/web/src/lib/smsPoller.ts,
// which imports this file directly). Pure string logic, no Convex APIs — safe to
// run inside a mutation and safe to bundle into the web app.
//
// All amounts in paise to avoid float issues. parseSms returns null if the SMS
// is not a posted bank/UPI transaction.

export type Category = "food" | "travel" | "shopping" | "bills" | "health" | "other";

export type ParsedSms = {
  amount: number;
  direction: "debit" | "credit";
  party?: string; // best-effort display name; may be absent for phone-only handles
  handle?: string; // raw UPI handle (full VPA, lowercased) — the stable identity key
  upiRef?: string;
  date?: string; // ISO yyyy-mm-dd, when a date is present in the message body
};

// Verb, then up to a few words, then the amount. Covers "debited by Rs.250",
// "debit by transfer of Rs 500", and "debited by 500.0" (some SBI alerts omit Rs).
// Skip words may include short rails ("transfer") but not bare destination
// account digits — those are rejected later when they lack a currency mark.
const AMOUNT_AFTER_VERB_RE =
  /(?:debited|credited|debit|credit|deducted|sent|paid|received|spent|withdrawn|withdrawal|transferred|deposited|payment)\s*[:\-]?\s+(?:by|with|for|of|via)?(?:\s+[a-z]{2,14}){0,3}?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
// Amount immediately before the verb: "Rs.250 debited", "Rs 500.00 has been credited",
// "Rs.99.00 has been reversed and credited". Kept tight so a leading available
// balance cannot win.
const AMOUNT_BEFORE_VERB_RE =
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:has been |is |was |been )?(?:reversed and )?(?:debited|credited|deducted|paid|sent|received|spent|withdrawn|transferred|deposited|reversed)\b/i;
// "debited on 05-10-26 for Rs.500" — a date sits between the verb and the amount.
const AMOUNT_VERB_ON_DATE_FOR_RE =
  /(?:debited|credited|deducted)\s+on\s+[\dA-Za-z./\-]+\s+for\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
// "… for Rs.500" / "… of INR 500" after a movement verb somewhere earlier.
const AMOUNT_FOR_OF_CURRENCY_RE =
  /\b(?:for|of)\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
// "Spent ... for INR 899" and "UPI-CR of Rs.75" — the verb and the amount are
// not adjacent, but both are still the posted transaction.
const AMOUNT_SPENT_FOR_RE =
  /\bspent\b[\s\S]{0,48}?(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
const AMOUNT_UPI_CRDR_RE =
  /\bupi[\s-]*(?:cr|dr)\b[\s\S]{0,24}?(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
// ₹1 crore in paise — same ceiling as validators.MAX_AMOUNT_PAISE. Kept local so
// this pure module stays free of Convex imports for the web bundler.
const MAX_PARSED_AMOUNT_PAISE = 1_000_000_000;
const UPI_REF_RE = /(?:upi\s*ref(?:erence)?\s*(?:no\.?|number)?|ref\s*no\.?)\s*[:\-]?\s*([0-9]{10,})/i;
// Fallback for the many banks that print a bare 12-digit UPI RRN without the
// word "no" — "UPI:4123...", "Ref 4123...", "RRN 4123...". The exact 12-digit
// length keeps it from matching masked account numbers or amounts.
const UPI_REF_FALLBACK_RE = /\b(?:upi|rrn|ref)[\s:./no-]*([0-9]{12})\b/i;
// "UPI/P2A/412345678901/Swiggy" — letters sit between the word UPI and the RRN.
const UPI_REF_NEAR_RE = /\bupi\b[\s\S]{0,48}?(\d{12})\b/i;
const DEBIT_KEYWORDS = /(?:debited|deducted|\bdebit of\b|\bsent\b|\bpaid\b|payment\s+of|transferred\s+to|spent|withdrawn|withdrawal|has a debit|\bupi[\s-]*dr\b)/i;
const CREDIT_KEYWORDS = /(?:credited|received|added|deposited|refund|reversed|has a credit|\bupi[\s-]*cr\b)/i;
// Completed movement into / out of the account holder's own account. "debited
// ... and credited to VPA" is a debit; "credited to your a/c" that later mentions
// the sender's account being debited is a credit. Whichever self-account phrase
// comes first wins.
const CREDIT_TO_SELF_RE = /credited\s+to\s+(?:your|(?:a\/c|ac\b|acct|account)(?!\s+of\b))\b/i;
const DEBIT_FROM_SELF_RE = /(?:debited|deducted)\s+(?:from|by|for|with)\b/i;
// Not a posted / settled transaction. Pending and processing alerts must not
// auto-log; OTP/PIN *notices* are handled separately so a completed debit that
// only appends a "never share PIN" footer still parses.
const NOT_A_TRANSACTION_RE =
  /(?:\bwill be\b|\bshall be\b|\byet to be\b)\s+(?:debited|credited|deducted)|(?:payment|transaction|transfer|upi(?:\s+payment)?)\s+(?:failed|declined|unsuccessful)|could not be (?:processed|completed)|insufficient (?:balance|funds)|\bhas requested\b|\brequesting\b|\bis pending\b|\bpending approval\b|\bpending\b|\bis processing\b|\bunder process\b|\bmini\s*statement\b|\be-?mandate\b|\bautopay\b|\bauto\s*pay\b/i;
// Authentication / PIN lifecycle notices — not payments. Reminder footers like
// "Never share your UPI PIN" after a posted debit do NOT match this.
const AUTH_NOTICE_RE =
  /(?:\botp\s*[:\-]?\s*\d{4,8}\b|\byour\s+otp\s+is\b|\byour\s+otp\s+for\b|\bis\s+your\s+(?:one[\s-]?time\s+password|otp)\b|\bone[\s-]?time\s+password\b|\botp\s+for\s+(?:debit|credit|txn|transaction|payment)\b|\byour\s+(?:upi\s+)?pin\s+has\s+been\b|\b(?:set|reset|changed|updated?)\s+(?:your\s+)?(?:upi\s+)?pin\b|\benter\s+(?:your\s+)?(?:upi\s+)?pin\b|\bupi\s+pin\s+has\s+been\b)/i;

const DEBIT_PREP = "to|trf\\s+to|paid\\s+to|towards|at";
const CREDIT_PREP = "from|by";
const partyTerminator =
  "(?=\\s+(?:on|ref|upi|dated|via|using|towards|for|successful|avail|avl|bal|info|a\\/c|account|not|if|call|rs|inr|in your|on your|\\d)|[.,;:\\n]|$)";
function vpaRe(prep: string) {
  return new RegExp(`(?:${prep})\\s+(?:vpa\\s+)?([a-z0-9._\\-]+@[a-z]{2,})`, "i");
}
function nameRe(prep: string) {
  // Cap raised to 60 so longer merchant names (e.g. "Isthara Parks Private
  // Limited") aren't truncated mid-word.
  return new RegExp(
    `(?:${prep})\\s+(?:vpa\\s+)?([A-Za-z][A-Za-z0-9 .&'\\-]{1,60}?)${partyTerminator}`,
    "i",
  );
}
// Axis / ICICI: "Info- UPI/P2A/412345678901/Swiggy"
const INFO_MERCHANT_RE =
  /(?:info|remarks?)[\s:.\-]*upi(?:\/[a-z0-9*]+){0,4}\/([a-z][a-z0-9 &'-]{1,40})/i;
// "towards UPI/P2M/412345678901/BigBasket" — no "Info" prefix.
const SLASH_MERCHANT_RE =
  /\bupi\/p2[a-z0-9]*\/\d{6,}\/([a-z][a-z0-9 .&'-]{1,40})/i;
const PAYEE_RE =
  /\bpayee\s*[:\-]\s*([A-Za-z][A-Za-z0-9 .&'-]{1,40}?)(?=\s+(?:on|ref|upi|avl|bal|info)|[.,;:\n]|$)/i;
const CREDITED_TO_ACCOUNT_OF_RE =
  /credited to\s+(?:a\/c|ac\b|acct|account)\s+of\s+([A-Za-z][A-Za-z .'-]{1,40}?)(?=\s+(?:on|ref|upi|dated|via|using)|[.,;:\n]|$)/i;

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
  ["food", /zomato|swiggy|restaurant|cafe|\bfood\b|dominos|domino'?s|mcdonald|kfc|bakery|dhaba|eatery|biryani|pizza|burger|faasos|eatsure|juice|starbucks|chaayos|barbeque|behrouz|ovenstory|box8|eatclub|freshmenu|wow\s*momo|pizza\s*hut|burger\s*king|subway|haldiram/i],
  ["travel", /uber|ola|rapido|irctc|petrol|fuel|hpcl|iocl|bpcl|metro|railway|indigo|airlines|toll|fastag|redbus|makemytrip|goibibo|ixigo|yatra|bmtc|dmrc|namma\s*yatri|blusmart|zoomcar|\byulu\b|bounce|nayara|indian\s*oil|\bshell\b|abhibus|confirmtkt/i],
  ["shopping", /amazon|flipkart|myntra|ajio|meesho|\bstore\b|\bmart\b|bigbasket|blinkit|zepto|instamart|dmart|reliance|nykaa|tatacliq|croma|lenskart|firstcry|snapdeal|jiomart|decathlon|ikea|purplle|vijay\s*sales|\bspar\b/i],
  ["bills", /electricity|recharge|airtel|\bjio\b|vodafone|\bvi\b|broadband|\bdth\b|\bgas\b|water\s*bill|bill\s*pay|postpaid|insurance|\blic\b|tata\s*power|adani|bescom|hathway|fiber|tata\s*play|dishtv|bsnl|act\s*fibernet|\bcred\b/i],
  ["health", /pharmacy|hospital|medical|apollo|clinic|chemist|diagnostic|pharmeasy|netmeds|1mg|medplus|practo|fortis|manipal|thyrocare|lal\s*path|dr\.?\s*lal|max\s*healthcare|cult\.?fit/i],
];

export function categorizeSms(party: string | undefined, body: string): Category {
  const haystack = `${party ?? ""} ${body}`;
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(haystack)) return category;
  }
  return "other";
}

function resolveDirection(text: string): "debit" | "credit" | null {
  // A reversal into the customer's own account is money coming back.
  if (/reversed\s+(?:and\s+credited\s+)?to\s+(?:your|a\/c|ac\b|acct|account)\b/i.test(text)) {
    return "credit";
  }
  const creditToSelf = CREDIT_TO_SELF_RE.exec(text);
  const debitFromSelf = DEBIT_FROM_SELF_RE.exec(text);
  if (creditToSelf && debitFromSelf) {
    return creditToSelf.index < debitFromSelf.index ? "credit" : "debit";
  }
  if (creditToSelf) return "credit";
  if (debitFromSelf) return "debit";
  if (/\bupi[\s-]*dr\b/i.test(text) && !/\bupi[\s-]*cr\b/i.test(text)) return "debit";
  if (/\bupi[\s-]*cr\b/i.test(text) && !DEBIT_KEYWORDS.test(text)) return "credit";
  if (DEBIT_KEYWORDS.test(text)) return "debit";
  if (CREDIT_KEYWORDS.test(text)) return "credit";
  return null;
}

function looksLikeAccountNumber(match: RegExpMatchArray): boolean {
  // Destination a/c digits often sit where a bare amount would: 8+ integer digits,
  // no decimal paise. Real SMS amounts almost never look like that without Rs/INR.
  const raw = match[1].replace(/,/g, "");
  if (raw.includes(".")) return false;
  return /^\d{8,}$/.test(raw);
}

function extractAmount(text: string): number | null {
  const after = AMOUNT_AFTER_VERB_RE.exec(text);
  const before = AMOUNT_BEFORE_VERB_RE.exec(text);
  const onDateFor = AMOUNT_VERB_ON_DATE_FOR_RE.exec(text);
  const forOf = AMOUNT_FOR_OF_CURRENCY_RE.exec(text);
  const spent = AMOUNT_SPENT_FOR_RE.exec(text);
  const crdr = AMOUNT_UPI_CRDR_RE.exec(text);
  // Verb-anchored candidates first. Generic "for/of Rs" is only a fallback so a
  // footer like "Charges of Rs.5" cannot override "debited by Rs.500".
  const verbAnchored = [onDateFor, before, spent, crdr, after].flatMap((m) =>
    m ? [m] : [],
  );
  const hasCurrency = (m: RegExpMatchArray) => /rs\.?|inr|₹/i.test(m[0]);
  const verbWithCurrency = verbAnchored.filter(hasCurrency);
  const forOfCurrency = forOf && hasCurrency(forOf) ? [forOf] : [];
  const saneBare = verbAnchored.filter((m) => !hasCurrency(m) && !looksLikeAccountNumber(m));
  const chosen = verbWithCurrency[0] ?? forOfCurrency[0] ?? saneBare[0];
  if (!chosen) return null;
  const amount = parseAmount(chosen);
  if (!(amount > 0) || amount > MAX_PARSED_AMOUNT_PAISE) return null;
  return amount;
}

function extractUpiRef(text: string): string | undefined {
  return (UPI_REF_RE.exec(text) ?? UPI_REF_FALLBACK_RE.exec(text) ?? UPI_REF_NEAR_RE.exec(text))?.[1];
}

export function parseSms(sms: string): ParsedSms | null {
  const text = sms.trim();
  if (AUTH_NOTICE_RE.test(text) || NOT_A_TRANSACTION_RE.test(text)) return null;

  // Prefer an amount glued to a transaction verb over the first "Rs." in the
  // message — a leading "Avbl Bal Rs.9,999" must not beat "debited by Rs.250",
  // and "Rs.250 debited" (amount before the verb) still counts.
  const amount = extractAmount(text);
  if (amount === null) return null;

  const direction = resolveDirection(text);
  if (!direction) return null;

  const upiRef = extractUpiRef(text);
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
function partyFromPrep(text: string, prep: string): { handle?: string; name?: string } {
  const vpa = vpaRe(prep).exec(text);
  if (vpa) {
    const handle = vpa[1].toLowerCase();
    const local = handle.slice(0, handle.indexOf("@"));
    const name = /[a-z]/.test(local) ? usableParty(cleanPartyName(local)) : undefined;
    return { handle, name };
  }
  const named = nameRe(prep).exec(text);
  const name = named ? usableParty(cleanPartyName(named[1])) : undefined;
  return name ? { name } : {};
}

function extractCounterparty(
  text: string,
  direction: "debit" | "credit"
): { handle?: string; name?: string } {
  // "credited ... by UPI from RAHUL" — `by` is the rail. Take `from` first.
  if (direction === "credit") {
    const fromParty = partyFromPrep(text, "from");
    if (fromParty.handle || fromParty.name) return fromParty;
  }
  const prep = direction === "credit" ? CREDIT_PREP : DEBIT_PREP;
  const vpa = vpaRe(prep).exec(text);
  if (vpa) {
    const handle = vpa[1].toLowerCase();
    const local = handle.slice(0, handle.indexOf("@"));
    // Derive a name from the local part only when it's name-like (has letters),
    // never from a pure phone-number handle.
    const name = /[a-z]/.test(local) ? usableParty(cleanPartyName(local)) : undefined;
    return { handle, name };
  }
  const named = nameRe(prep).exec(text);
  const name = named ? usableParty(cleanPartyName(named[1])) : undefined;
  if (name) return { name };
  const info = INFO_MERCHANT_RE.exec(text) ?? SLASH_MERCHANT_RE.exec(text);
  if (info) {
    const merchant = usableParty(cleanPartyName(info[1]));
    if (merchant) return { name: merchant };
  }
  const payee = PAYEE_RE.exec(text);
  if (payee) {
    const merchant = usableParty(cleanPartyName(payee[1]));
    if (merchant) return { name: merchant };
  }
  if (direction === "debit") {
    const ofAccount = CREDITED_TO_ACCOUNT_OF_RE.exec(text);
    if (ofAccount) {
      const merchant = usableParty(cleanPartyName(ofAccount[1]));
      if (merchant) return { name: merchant };
    }
  }
  return {};
}

// "by UPI" / "via NEFT" is a rail, not a person.
function usableParty(name: string | undefined): string | undefined {
  if (!name) return undefined;
  let s = name.trim();
  // "by UPI from Rahul" used to stick as one party. Drop a leading rail.
  for (let i = 0; i < 2; i++) {
    s = s.replace(/^(?:upi|imps|neft|rtgs|vpa|atm|nach|inb|from|by|via|to)\s+/i, "").trim();
  }
  if (!s || /^(upi|imps|neft|rtgs|vpa|atm|nach|inb)$/i.test(s)) return undefined;
  if (s.length <= 2) return undefined;
  return s;
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
  return words.map(shapeWord).join(" ");
}

function shapeWord(w: string): string {
  const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  if (w.length > 1 && w === w.toUpperCase()) {
    // Keep short rails and brands (LIC, CRED, UPI). Title-case STARBUCKS.
    return w.length >= 5 ? titleCase(w) : w;
  }
  if (w === w.toLowerCase()) return titleCase(w);
  return w;
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
  if (AUTH_NOTICE_RE.test(body) || NOT_A_TRANSACTION_RE.test(body)) return false;
  const knownBanks =
    /hdfc|sbi|icici|axis|kotak|yes\s*bank|pnb|bob|canara|union\s*bank|idfc|au\s*bank|paytm|gpay|phonepe|google\s*pay|indusind|federal|rbl|bandhan|idbi|indian\s*bank|central\s*bank|uco|amazonpay|amazon\s*pay|cred|slice|fi\s*money|jupiter|navi|sbm|equitas|karnataka\s*bank|dbs|hsbc|citibank|\bciti\b|fino|ippb|bhim|freecharge|mobikwik|niyo|scapia/i;
  return knownBanks.test(sender) && (DEBIT_KEYWORDS.test(body) || CREDIT_KEYWORDS.test(body));
}
