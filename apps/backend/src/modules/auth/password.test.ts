import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces a hash different from the original password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toBe("correct-horse-battery-staple");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("produces a different hash each time, even for the same password", async () => {
    const hash1 = await hashPassword("same-password-123");
    const hash2 = await hashPassword("same-password-123");
    expect(hash1).not.toBe(hash2);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("my-real-password");
    const result = await verifyPassword("my-real-password", hash);
    expect(result).toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("my-real-password");
    const result = await verifyPassword("wrong-guess", hash);
    expect(result).toBe(false);
  });

  it("rejects an empty string against a real hash", async () => {
    const hash = await hashPassword("my-real-password");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });
});