import { describe, expect, it } from "vitest";

import {
  MAX_SPECIFICATION_LENGTH,
  MAX_TITLE_LENGTH,
  validatePatentDraft,
} from "./validation";

describe("validatePatentDraft", () => {
  it("accepts contract boundary values and trims outer whitespace", () => {
    const result = validatePatentDraft({
      title: `  ${"T".repeat(MAX_TITLE_LENGTH)}  `,
      specification: `\n${"S".repeat(MAX_SPECIFICATION_LENGTH)}\n`,
    });

    expect(result.isValid).toBe(true);
    expect(result.normalized.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(result.normalized.specification).toHaveLength(
      MAX_SPECIFICATION_LENGTH,
    );
  });

  it("rejects empty normalized values", () => {
    const result = validatePatentDraft({
      title: "   ",
      specification: "\n\t ",
    });

    expect(result.errors.title).toBe("Enter a patent title.");
    expect(result.errors.specification).toBe("Describe the protected logic.");
    expect(result.isValid).toBe(false);
  });

  it("rejects values over the contract limits", () => {
    const result = validatePatentDraft({
      title: "T".repeat(MAX_TITLE_LENGTH + 1),
      specification: "S".repeat(MAX_SPECIFICATION_LENGTH + 1),
    });

    expect(result.errors.title).toContain("160");
    expect(result.errors.specification).toContain("4,000");
  });

  it("rejects non-ASCII characters in either field", () => {
    const result = validatePatentDraft({
      title: `Neural ${String.fromCharCode(233)}ngine`,
      specification: `Protected ${String.fromCharCode(8212)} routing`,
    });

    expect(result.errors.title).toContain("ASCII");
    expect(result.errors.specification).toContain("ASCII");
  });

  it("allows line breaks in specifications but not titles", () => {
    const result = validatePatentDraft({
      title: "Invalid\nTitle",
      specification: "Stage one\nStage two\tverified",
    });

    expect(result.errors.title).toContain("single line");
    expect(result.errors.specification).toBeUndefined();
  });

  it("rejects forbidden control characters in specifications", () => {
    const result = validatePatentDraft({
      title: "Valid title",
      specification: `Invalid${String.fromCharCode(0)}specification`,
    });

    expect(result.errors.specification).toContain("ASCII");
  });
});
