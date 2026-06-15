import { describe, it, expect } from "vitest";
import { normalizeHandle, normalizeName, resolveByHandle, suggestByName } from "./contactMatch";

describe("normalizeHandle", () => {
  it("reduces a phone-number VPA to bare 10 digits", () => {
    expect(normalizeHandle("9706312331@ybl")).toEqual({ value: "9706312331", kind: "phone" });
  });
  it("strips country code and spacing from a phone", () => {
    expect(normalizeHandle("+91 97063 12331")).toEqual({ value: "9706312331", kind: "phone" });
  });
  it("lowercases a name VPA and keeps the domain", () => {
    expect(normalizeHandle("Nitin.Das@OKSBI")).toEqual({ value: "nitin.das@oksbi", kind: "vpa" });
  });
  it("returns null for a non-handle", () => {
    expect(normalizeHandle("Usha Cafe")).toBeNull();
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle(undefined)).toBeNull();
  });
});

describe("normalizeName", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeName("  Nitin   Das ")).toBe("nitin das");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("resolveByHandle", () => {
  const aliases = [
    { value: "9706312331", contactId: "c1" },
    { value: "nitin.das@oksbi", contactId: "c1" },
    { value: "amit@okhdfc", contactId: "c2" },
  ];

  it("matches a phone-VPA to the right contact regardless of UPI app", () => {
    // The ₹500-then-₹1500 scenario: same person, two different handles, one contact.
    expect(resolveByHandle("9706312331@ybl", aliases)).toBe("c1");
    expect(resolveByHandle("nitin.das@oksbi", aliases)).toBe("c1");
  });
  it("returns null for an unknown handle", () => {
    expect(resolveByHandle("stranger@okicici", aliases)).toBeNull();
    expect(resolveByHandle(undefined, aliases)).toBeNull();
  });
});

describe("suggestByName", () => {
  const contacts = [
    { name: "Nitin Das", contactId: "c1" },
    { name: "Vaibhav", contactId: "c2" },
  ];

  it("returns a confident match on an exact name", () => {
    expect(suggestByName("nitin das", contacts)).toEqual({ contactId: "c1", confident: true });
    expect(suggestByName("Vaibhav", contacts)).toEqual({ contactId: "c2", confident: true });
  });
  it("returns a non-confident suggestion on a shared first name", () => {
    expect(suggestByName("Nitin", contacts)).toEqual({ contactId: "c1", confident: false });
  });
  it("returns null when nothing matches", () => {
    expect(suggestByName("Suresh", contacts)).toBeNull();
    expect(suggestByName(undefined, contacts)).toBeNull();
  });
});
