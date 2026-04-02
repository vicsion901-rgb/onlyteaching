import type { ProofreadValidationResult } from './proofread.types';

const PLACEHOLDER_PATTERN = /\{\{[^}]+\}\}|\{[^}]+\}|%s|%d/g;
const NUMBER_PATTERN = /\d+(?:[.,]\d+)?/g;
const URL_PATTERN = /https?:\/\/[^\s]+/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractMatches(pattern: RegExp, value: string): string[] {
  const matches = value.match(pattern) ?? [];
  return matches.map((item) => item.trim()).filter(Boolean).sort();
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function validateProofreadText(
  originalText: string,
  revisedText: string,
  protectedTokens: string[] = [],
): ProofreadValidationResult {
  const original = normalize(originalText);
  const revised = normalize(revisedText);

  if (!revised) {
    return { valid: false, reason: 'empty-proofread-result' };
  }

  for (const token of protectedTokens) {
    const normalizedToken = normalize(token);

    if (!normalizedToken) {
      continue;
    }

    if (original.includes(normalizedToken) && !revised.includes(normalizedToken)) {
      return {
        valid: false,
        reason: `protected-token-changed:${normalizedToken}`,
      };
    }
  }

  const originalNumbers = extractMatches(NUMBER_PATTERN, original);
  const revisedNumbers = extractMatches(NUMBER_PATTERN, revised);

  if (!arraysEqual(originalNumbers, revisedNumbers)) {
    return { valid: false, reason: 'numbers-changed' };
  }

  const originalPlaceholders = extractMatches(PLACEHOLDER_PATTERN, original);
  const revisedPlaceholders = extractMatches(PLACEHOLDER_PATTERN, revised);

  if (!arraysEqual(originalPlaceholders, revisedPlaceholders)) {
    return { valid: false, reason: 'placeholders-changed' };
  }

  const originalUrls = extractMatches(URL_PATTERN, original);
  const revisedUrls = extractMatches(URL_PATTERN, revised);

  if (!arraysEqual(originalUrls, revisedUrls)) {
    return { valid: false, reason: 'urls-changed' };
  }

  const originalEmails = extractMatches(EMAIL_PATTERN, original);
  const revisedEmails = extractMatches(EMAIL_PATTERN, revised);

  if (!arraysEqual(originalEmails, revisedEmails)) {
    return { valid: false, reason: 'emails-changed' };
  }

  if (original.length >= 20) {
    const diffRatio = Math.abs(revised.length - original.length) / original.length;

    if (diffRatio > 0.35) {
      return { valid: false, reason: 'length-drift-too-large' };
    }
  }

  return { valid: true };
}
