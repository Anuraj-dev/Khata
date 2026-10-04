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

describe("parseSms — Indian bank and UPI templates", () => {
  it("reads an SBI debit that also says the payee was credited", () => {
    const r = parseSms(
      "Your a/c no. XXXXXX1234 is debited for Rs.250.00 on 05-10-26 and credited to VPA zomato@hdfcbank (UPI Ref No 412345678901). Avl Bal Rs 10,000.00 -SBI"
    );
    expect(r).toMatchObject({
      amount: 25000,
      direction: "debit",
      handle: "zomato@hdfcbank",
      party: "Zomato",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("keeps an SBI credit when the sender side is described as debited", () => {
    const r = parseSms(
      "Rs.500.00 credited to your A/c XX1234 on 05-10-26. Sender a/c was debited. UPI Ref No 512345678901 -SBI"
    );
    expect(r).toMatchObject({ amount: 50000, direction: "credit", upiRef: "512345678901", date: "2026-10-05" });
  });

  it("reads an SBI debit that omits the Rs mark", () => {
    const r = parseSms(
      "Dear Customer, your A/C X1234 has a debit by transfer of 1,500.00 on 05Oct26 trf to RAHUL SHARMA Refno 612345678901 -SBI"
    );
    expect(r).toMatchObject({
      amount: 150000,
      direction: "debit",
      party: "Rahul Sharma",
      upiRef: "612345678901",
      date: "2026-10-05",
    });
  });

  it("reads an HDFC debit to a VPA and ignores the available balance", () => {
    const r = parseSms(
      "Rs.1,250.00 debited from a/c **1234 on 05-OCT-26 to VPA swiggy@okaxis (UPI Ref No. 412345678901). Avl bal: Rs 12,000.00 -HDFC"
    );
    expect(r).toMatchObject({
      amount: 125000,
      direction: "debit",
      handle: "swiggy@okaxis",
      party: "Swiggy",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads an ICICI info line", () => {
    const r = parseSms(
      "ICICI Bank Acct XX123 is debited for Rs 499.00 on 05-Oct-26; Info: UPI/zomato. UPI Ref No 412345678901."
    );
    expect(r).toMatchObject({
      amount: 49900,
      direction: "debit",
      party: "Zomato",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads an Axis info slash merchant and not the balance", () => {
    const r = parseSms(
      "INR 350.00 debited from A/c no. XX1234 on 05-10-26 at 10:30:00 IST. Info- UPI/P2A/412345678901/Swiggy. Avl Bal- INR 8,000.00 -Axis"
    );
    expect(r).toMatchObject({
      amount: 35000,
      direction: "debit",
      party: "Swiggy",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a PhonePe paid alert", () => {
    const r = parseSms(
      "Paid Rs.120 to SWIGGY INSTAMART on 05 Oct 2026. UPI Ref: 412345678901. -PhonePe"
    );
    expect(r).toMatchObject({
      amount: 12000,
      direction: "debit",
      party: "Swiggy Instamart",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a Google Pay paid-to alert and stops before 'using'", () => {
    const r = parseSms(
      "You have paid Rs.75 to Ramesh Kumar using Google Pay. UPI Ref No 412345678901."
    );
    expect(r).toMatchObject({
      amount: 7500,
      direction: "debit",
      party: "Ramesh Kumar",
      upiRef: "412345678901",
    });
  });

  it("reads a Paytm credit from a VPA", () => {
    const r = parseSms(
      "Your Paytm Payments Bank a/c XX1234 is credited with Rs.200.00 on 05-10-2026 from ramesh@paytm. UPI Ref No 412345678901"
    );
    expect(r).toMatchObject({
      amount: 20000,
      direction: "credit",
      handle: "ramesh@paytm",
      party: "Ramesh",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a CRED card payment", () => {
    const r = parseSms(
      "Payment of Rs.1,499 to CRED Club successful. UPI Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 149900,
      direction: "debit",
      party: "CRED Club",
      upiRef: "412345678901",
    });
  });
});

describe("parseSms — false positives", () => {
  it("ignores a future debit mandate", () => {
    expect(
      parseSms("Rs.1,499.00 will be debited from your a/c on 10-10-26 towards CRED. -HDFC")
    ).toBeNull();
  });

  it("ignores a failed UPI payment", () => {
    expect(parseSms("UPI payment failed for Rs.200 to shop@oksbi. -Axis")).toBeNull();
  });

  it("ignores a collect request", () => {
    expect(parseSms("Ramesh Kumar has requested Rs.100 via UPI. Pay on PhonePe.")).toBeNull();
  });

  it("ignores an OTP that mentions an amount", () => {
    expect(parseSms("OTP 482193 for debit of Rs.500. Do not share. -SBI")).toBeNull();
  });
});

describe("categorizeSms — more merchants", () => {
  it("buckets common Indian merchants", () => {
    expect(categorizeSms("Instamart", "")).toBe("shopping");
    expect(categorizeSms("Starbucks", "")).toBe("food");
    expect(categorizeSms("Namma Yatri", "")).toBe("travel");
    expect(categorizeSms("CRED", "card payment")).toBe("bills");
    expect(categorizeSms("Fortis Hospital", "")).toBe("health");
  });
});

describe("isUpiSms — more senders and non-transactions", () => {
  it("recognizes Equitas, BHIM and Freecharge", () => {
    expect(isUpiSms("VM-EQUITAS", "Rs 100 debited via UPI")).toBe(true);
    expect(isUpiSms("AD-BHIM", "Rs 50 paid to tea stall")).toBe(true);
    expect(isUpiSms("VM-FREECHARGE", "Rs 80 credited to your wallet")).toBe(true);
  });

  it("does not treat a failed or future bank SMS as a transaction", () => {
    expect(isUpiSms("VM-HDFCBK", "Rs.500 will be debited tomorrow")).toBe(false);
    expect(isUpiSms("VM-ICICI", "UPI payment failed for Rs.20")).toBe(false);
  });
});

describe("parseSms — more posted Indian templates", () => {
  it("reads a Kotak sent-to VPA", () => {
    const r = parseSms(
      "Sent Rs.85.00 from Kotak Bank AC X1234 to swiggy@okaxis on 05-10-26. UPI Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 8500,
      direction: "debit",
      handle: "swiggy@okaxis",
      party: "Swiggy",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a Yes Bank slash merchant and ignores the account number", () => {
    const r = parseSms(
      "INR 640.00 has been debited from your a/c no. XX1234 on 05-10-26 towards UPI/P2M/412345678901/BigBasket"
    );
    expect(r).toMatchObject({
      amount: 64000,
      direction: "debit",
      party: "BigBasket",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads an IDFC debit and keeps the transaction amount, not the balance", () => {
    const r = parseSms(
      "Your A/c XX1234 is debited with INR 220.00 on 05-Oct-26. Info: UPI/rapido. Avl Bal INR 4,000.00. UPI Ref No 412345678901"
    );
    expect(r).toMatchObject({
      amount: 22000,
      direction: "debit",
      party: "Rapido",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a Bank of Baroda debit to another person's account", () => {
    const r = parseSms(
      "Rs.1,000.00 debited from A/c XX1234 on 05-10-26 and credited to A/c of RAHUL SHARMA. Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 100000,
      direction: "debit",
      party: "Rahul Sharma",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a Canara credit from a person", () => {
    const r = parseSms(
      "A/c XX1234 credited for Rs.2,500.00 on 05-10-26 from NEHA GUPTA. UPI Ref No 512345678901"
    );
    expect(r).toMatchObject({
      amount: 250000,
      direction: "credit",
      party: "Neha Gupta",
      upiRef: "512345678901",
      date: "2026-10-05",
    });
  });

  it("reads a BHIM sent alert", () => {
    const r = parseSms("You have sent Rs 30 to Tea Stall on 05-10-2026. UPI Ref 412345678901");
    expect(r).toMatchObject({
      amount: 3000,
      direction: "debit",
      party: "Tea Stall",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a Google Pay received alert", () => {
    const r = parseSms("You received Rs.50 from Amit Shah. UPI transaction ID 412345678901");
    expect(r).toMatchObject({
      amount: 5000,
      direction: "credit",
      party: "Amit Shah",
      upiRef: "412345678901",
    });
  });

  it("stops a PhonePe received name before 'in your bank'", () => {
    const r = parseSms(
      "Received Rs.180 from Priya Nair in your bank a/c. UPI Ref: 412345678901"
    );
    expect(r).toMatchObject({
      amount: 18000,
      direction: "credit",
      party: "Priya Nair",
      upiRef: "412345678901",
    });
  });

  it("reads an IMPS credit", () => {
    const r = parseSms(
      "IMPS of Rs.3,000.00 credited to your A/c XX1234 on 05-10-26 from SURESH KUMAR. Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 300000,
      direction: "credit",
      party: "Suresh Kumar",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a posted reversal as a credit", () => {
    const r = parseSms(
      "Txn of Rs.99.00 has been reversed and credited to your a/c XX1234 on 05-10-26. UPI Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 9900,
      direction: "credit",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads an Amazon Pay debit", () => {
    const r = parseSms("Rs.249 paid to Amazon using Amazon Pay on 05 Oct 2026. UPI Ref 412345678901");
    expect(r).toMatchObject({
      amount: 24900,
      direction: "debit",
      party: "Amazon",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });

  it("reads a rupee-sign spend at a merchant", () => {
    const r = parseSms("₹420 spent at Decathlon on 05-10-26");
    expect(r).toMatchObject({
      amount: 42000,
      direction: "debit",
      party: "Decathlon",
      date: "2026-10-05",
    });
  });

  it("reads UPI-CR, a PhonePe money-sent VPA, an ATM withdrawal, and a payee line", () => {
    expect(
      parseSms("UPI-CR of Rs.75.00 from 9876543210@ybl on 05-10-26. Ref no 412345678901 -PNB")
    ).toMatchObject({
      amount: 7500,
      direction: "credit",
      handle: "9876543210@ybl",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
    expect(
      parseSms("Money sent: Rs 45 to 9988776655@ybl. UPI Ref No 412345678901 -PhonePe")
    ).toMatchObject({
      amount: 4500,
      direction: "debit",
      handle: "9988776655@ybl",
      upiRef: "412345678901",
    });
    expect(
      parseSms("ATM withdrawal of Rs.2000 from A/c XX1234 on 05-10-26. Avl Bal Rs.8000 -SBI")
    ).toMatchObject({ amount: 200000, direction: "debit", date: "2026-10-05" });
    expect(
      parseSms(
        "Rs.15.00 is debited from Kotak Bank a/c XXXX1234 on 05-10-26 for UPI txn. Payee: CHAOS TEA. UPI Ref 412345678901"
      )?.party
    ).toBe("Chaos Tea");
  });

  it("reads a card spend whose amount is not glued to the verb", () => {
    const r = parseSms(
      "Spent Card no. XX1234 for INR 899.00 at NYKAA on 05-10-26. Avl limit INR 50,000 -IndusInd"
    );
    expect(r).toMatchObject({
      amount: 89900,
      direction: "debit",
      party: "Nykaa",
      date: "2026-10-05",
    });
  });

  it("title-cases a one-word all-caps merchant", () => {
    const r = parseSms(
      "INR 88.00 spent on ICICI Bank Credit Card XX1234 at STARBUCKS on 05-Oct-26. Avl Lmt INR 90,000.00"
    );
    expect(r).toMatchObject({ amount: 8800, direction: "debit", party: "Starbucks", date: "2026-10-05" });
  });
  it("stays a debit when the payee account is named after 'debited with'", () => {
    const r = parseSms(
      "Your A/c XX1234 is debited with Rs.500.00 on 05-10-26 and credited to A/c of MEENA IYER. Ref 412345678901"
    );
    expect(r).toMatchObject({
      amount: 50000,
      direction: "debit",
      party: "Meena Iyer",
      upiRef: "412345678901",
      date: "2026-10-05",
    });
  });
});


describe("parseSms — more non-transactions", () => {
  it("ignores a payment that is still pending", () => {
    expect(parseSms("Payment of Rs.200 to Zomato is pending. Complete it on GPay")).toBeNull();
  });

  it("ignores a mini statement that lists several movements", () => {
    expect(
      parseSms("Mini statement: 05-10-26 Rs.200 debited to SWIGGY; 04-10-26 Rs.50 credited from AMIT")
    ).toBeNull();
  });

  it("ignores a UPI PIN notice", () => {
    expect(parseSms("Your UPI PIN has been set. Do not share Rs.500. -SBI")).toBeNull();
    expect(isUpiSms("VM-SBI", "Your UPI PIN has been set. Do not share.")).toBe(false);
  });

  it("ignores an e-mandate registration and an autopay reminder", () => {
    expect(parseSms("E-mandate for Rs.499 registered successfully -ICICI")).toBeNull();
    expect(
      parseSms("AutoPay of Rs.199 is due on 10-10-26 and will be deducted -HDFC")
    ).toBeNull();
  });
});


describe("parseSms — verbs Codex flagged", () => {
  it("reads transferred-to and deposited amounts", () => {
    expect(parseSms("INR 500 transferred to RAHUL SHARMA on 05-10-26")).toMatchObject({
      amount: 50000,
      direction: "debit",
      party: "Rahul Sharma",
      date: "2026-10-05",
    });
    expect(parseSms("Rs.500 deposited in your account on 05-10-26")).toMatchObject({
      amount: 50000,
      direction: "credit",
      date: "2026-10-05",
    });
  });

  it("prefers the from-party over a leading by-UPI rail", () => {
    expect(
      parseSms("Rs.500 credited to your A/c XX1234 by UPI from RAHUL SHARMA on 05-10-26")?.party
    ).toBe("Rahul Sharma");
    expect(parseSms("Rs.500 credited by Rs.500 from RAHUL SHARMA on 05-10-26")?.party).toBe(
      "Rahul Sharma"
    );
  });
});
