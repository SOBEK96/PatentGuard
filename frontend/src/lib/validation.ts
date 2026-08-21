import type { PatentDraft, ValidationErrors, ValidationResult } from "../types/patent";

export const MAX_TITLE_LENGTH = 160;
export const MAX_SPECIFICATION_LENGTH = 4000;

function isAllowedAscii(value: string, allowLineBreaks: boolean): boolean {
  for (const character of value) {
    const codePoint = character.charCodeAt(0);
    if (codePoint >= 32 && codePoint <= 126) {
      continue;
    }
    if (allowLineBreaks && (codePoint === 9 || codePoint === 10 || codePoint === 13)) {
      continue;
    }
    return false;
  }
  return true;
}

export function validatePatentDraft(draft: PatentDraft): ValidationResult {
  const normalized = {
    title: draft.title.trim(),
    specification: draft.specification.trim(),
  };
  const errors: ValidationErrors = {};

  if (!normalized.title) {
    errors.title = "Enter a patent title.";
  } else if (normalized.title.length > MAX_TITLE_LENGTH) {
    errors.title = "Keep the title within 160 characters.";
  } else if (!isAllowedAscii(normalized.title, false)) {
    const hasLineBreak = /[\t\r\n]/.test(normalized.title);
    errors.title = hasLineBreak
      ? "Keep the title on a single line."
      : "Use printable English ASCII characters only.";
  }

  if (!normalized.specification) {
    errors.specification = "Describe the protected logic.";
  } else if (normalized.specification.length > MAX_SPECIFICATION_LENGTH) {
    errors.specification = "Keep the specification within 4,000 characters.";
  } else if (!isAllowedAscii(normalized.specification, true)) {
    errors.specification = "Use English ASCII text and standard line breaks only.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized,
    titleRemaining: MAX_TITLE_LENGTH - normalized.title.length,
    specificationRemaining:
      MAX_SPECIFICATION_LENGTH - normalized.specification.length,
  };
}
