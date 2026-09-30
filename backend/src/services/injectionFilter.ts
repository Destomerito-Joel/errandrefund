export interface InjectionScan {
  flagged: boolean;
  reasonCodes: string[];
}

const INJECTION_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['IGNORE_INSTRUCTIONS', /\b(ignore|disregard|forget)\b.{0,50}\b(previous|above|all|prior)\b.{0,30}\b(instructions?|rules?|prompts?)\b/i],
  ['SYSTEM_PROMPT', /\b(system|developer)\s+prompt\b/i],
  ['OVERRIDE_POLICY', /\b(override|bypass|disable)\b.{0,40}\b(policy|rules?|safeguards?|instructions?)\b/i],
  ['FORCE_APPROVAL', /\b(approve|grant|issue)\b.{0,40}\b(this|my|the)?\s*refund\b/i],
  ['PROMPT_EXTRACTION', /\b(reveal|show|print|repeat|expose)\b.{0,40}\b(prompt|instructions?|secret|api key)\b/i],
  ['ROLE_MANIPULATION', /\b(you are now|act as|pretend to be)\b.{0,50}\b(admin|developer|system|unrestricted|policy engine)\b/i],
];

/** Flag common instruction-manipulation attempts before any customer text reaches the LLM. */
export function scanForPromptInjection(message: string): InjectionScan {
  const reasonCodes = INJECTION_PATTERNS
    .filter(([, pattern]) => pattern.test(message))
    .map(([reasonCode]) => reasonCode);

  return { flagged: reasonCodes.length > 0, reasonCodes };
}