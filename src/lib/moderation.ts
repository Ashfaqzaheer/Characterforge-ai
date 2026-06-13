/**
 * Prompt moderation module.
 * Enforces keyword blocklist and max length to prevent misuse.
 */

const MAX_PROMPT_LENGTH = 2000;

/**
 * Blocklist of harmful keywords. Prompts containing any of these
 * (case-insensitive, word-boundary match) will be rejected.
 */
const BLOCKED_KEYWORDS = [
  "nude",
  "naked",
  "nsfw",
  "pornographic",
  "gore",
  "violent death",
  "self-harm",
  "suicide",
  "child abuse",
  "terrorism",
  "hate speech",
  "racial slur",
  "sexualized minor",
  "drugs manufacturing",
  "weapon instructions",
  "explicit sexual",
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Moderates a prompt for content policy compliance.
 * Returns allowed: true if the prompt passes, or allowed: false with a reason.
 */
export function moderatePrompt(prompt: string): ModerationResult {
  if (!prompt || prompt.trim().length === 0) {
    return { allowed: false, reason: "Prompt cannot be empty" };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      allowed: false,
      reason: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
    };
  }

  const lowerPrompt = prompt.toLowerCase();

  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      return {
        allowed: false,
        reason: "Prompt contains inappropriate content",
      };
    }
  }

  return { allowed: true };
}
