import { describe, it, expect } from "vitest";
import { parseSms, cleanPartyName, categorizeSms, isUpiSms } from "./smsParser";

// Each case below mirrors a real failure observed in the dev data (phone-VPA
// credits logged as digits, hashes logged as names, "Vaibhav 138" tails,
// truncated merchants). We assert the new contract: a stable `handle` is
// captured, and `party` is a clean name or absent (never a ref/hash).

describe("parseSms — handle capture", () => {
  it("captures a phone-number VPA as the handle and leaves the name blank", () => {
    const r = parseSms(
      "Rs.40.00 credited to your A/c XX1234 on 12-06-26 by UPI from 9706312331@ybl ref no 412345678901 -SBI"
    );
    expect(r).toMatchObject({ amount: 4000, direction: "credit", handle: "9706312331@ybl" });
    expect(r?.party).toBeUndefined();
  });

  it("captures a name VPA as the handle AND derives a clean name from it", () => {
    const r = parseSms(
      "Rs 150 debited from a/c and paid to Nitin.Das@oksbi on 10-06-2026. UPI Ref 123456789012"
    );
    expect(r).toMatchObject({
      amount: 15000,
      direction: "debit",
      handle: "nitin.das@oksbi",
      party: "Nitin Das",
    });
  });
});

describe("parseSms — display name cleanup", () => {
  it("rejects a hex transaction-id as a name", () => {
    const r = parseSms(
      "INR 72.00 credited via UPI from F4959ebdcb2b4703976100b5a8f697a9 on 11-06-26 -HDFC"
    );
    expect(r).toMatchObject({ amount: 7200, direction: "credit" });
    expect(r?.party).toBeUndefined();
    expect(r?.handle).toBeUndefined();
  });

  it("strips a trailing ref tail (Vaibhav 138 -> Vaibhav)", () => {
    const r = parseSms("Rs.500.00 credited from Vaibhav 138 on 09-06-26 -Axis");
    expect(r?.party).toBe("Vaibhav");
  });

  it("rejects a short letter+digits ref (Nd3879297)", () => {
    const r = parseSms("Rs 500 credited from Nd3879297 on 07-06-26 -SBI");
    expect(r?.party).toBeUndefined();
  });

  it("does not truncate a long merchant name", () => {
    const r = parseSms(
      "Rs 56.70 debited at Isthara Parks Private Limited on 08-06-2026 via UPI"
    );
    expect(r?.party).toBe("Isthara Parks Private Limited");
  });

  it("title-cases an ALL-CAPS person name", () => {
    const r = parseSms(
      "Rs 1500 debited and paid to NITIN DAS on 05-06-26 UPI Ref 999988887777"
    );
    expect(r?.party).toBe("Nitin Das");
  });
});

describe("parseSms — non-transactions", () => {
  it("returns null when there is no amount", () => {
    expect(parseSms("Your OTP is 123456")).toBeNull();
  });

  it("returns null when there is no debit/credit keyword", () => {
    expect(parseSms("Rs 500 is your available balance")).toBeNull();
  });
});

describe("parseSms — amount precision", () => {
  it("prefers the verb-anchored amount over a leading available balance", () => {
    const r = parseSms(
      "Avbl Bal Rs.9,999.00. A/C XX1234 debited by Rs.250.00 via UPI to shop@oksbi on 18-06-26 -HDFC"
    );
    expect(r?.amount).toBe(25000); // ₹250, not the ₹9,999 balance
    expect(r?.direction).toBe("debit");
  });

  it("still reads the common amount-before-verb order", () => {
    const r = parseSms("Rs.250 debited via UPI to shop@oksbi on 18-06-26 -SBI");
    expect(r?.amount).toBe(25000);
  });
});

describe("parseSms — UPI ref fallback", () => {
  it("captures a bare 12-digit RRN printed without the word 'no'", () => {
    const r = parseSms("Rs 150 debited to chai@oksbi on 18-06-26 UPI:412345678901 -Axis");
    expect(r?.upiRef).toBe("412345678901");
  });

  it("captures a 'Ref <12 digits>' tail", () => {
    const r = parseSms("Rs 150 debited to chai@oksbi on 18-06-26 Ref 412345678901 -Axis");
    expect(r?.upiRef).toBe("412345678901");
  });
});

describe("categorizeSms", () => {
  it("maps newly-added merchants to the right bucket", () => {
    expect(categorizeSms("redbus", "")).toBe("travel");
    expect(categorizeSms("nykaa", "")).toBe("shopping");
    expect(categorizeSms(undefined, "paid to Dominos Pizza")).toBe("food");
    expect(categorizeSms("medplus pharmacy", "")).toBe("health");
  });

  it("falls back to other for an unknown merchant", () => {
    expect(categorizeSms("random shop", "")).toBe("other");
  });
});

describe("isUpiSms", () => {
  it("recognizes newer banks/PSPs as UPI senders", () => {
    expect(isUpiSms("VM-INDUSIND", "Rs 100 debited via UPI")).toBe(true);
    expect(isUpiSms("AD-JUPITER", "Rs 100 credited via UPI")).toBe(true);
  });

  it("rejects a non-bank sender", () => {
    expect(isUpiSms("AMZNIN", "Your order shipped")).toBe(false);
  });
});

describe("cleanPartyName", () => {
  it("drops standalone numeric tokens", () => {
    expect(cleanPartyName("Kumars96417 1")).toBe("Kumars");
  });
  it("returns undefined for a pure hex blob", () => {
    expect(cleanPartyName("0427bfe3db92436bb68271151ef56390")).toBeUndefined();
  });
  it("keeps multi-word names with single-letter initials", () => {
    expect(cleanPartyName("S Surendiran")).toBe("S Surendiran");
  });
});
