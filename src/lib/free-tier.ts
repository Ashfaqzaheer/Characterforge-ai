export const FREE_TIER = {
  INITIAL_CREDITS: 10,
  MAX_CHARACTERS: 3,        // max characters a free user can create
  MAX_IMAGES_PER_GEN: 1,    // already enforced (num_outputs: 1)
  GENERATIONS_PER_HOUR: 10, // already enforced by rate limiter
} as const;
