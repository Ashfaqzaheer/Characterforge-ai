/**
 * Replicate API client for AI image generation.
 * Server-only — never import this module on the client side.
 *
 * Mock mode: If REPLICATE_API_TOKEN is missing or MOCK_AI=true,
 * returns a placeholder image after a simulated delay.
 */

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "stability-ai/sdxl";
const MOCK_AI = process.env.MOCK_AI === "true" || !REPLICATE_API_TOKEN;

interface ReplicateInput {
  prompt: string;
  inputImages: string[]; // Signed URLs to reference images
  negativePrompt?: string;
}

export interface ReplicateResult {
  success: true;
  imageUrl: string;
}

export interface ReplicateError {
  success: false;
  message: string;
}

export type ReplicateResponse = ReplicateResult | ReplicateError;

/**
 * Generates a placeholder PNG image as a data URL for mock mode.
 */
function generatePlaceholderImage(prompt: string): string {
  // Return a publicly available placeholder image
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 40));
  return `https://placehold.co/1024x1024/1a1a2e/ffffff?text=${encodedPrompt}`;
}

/**
 * Mock implementation that simulates generation with a 2-3 second delay.
 */
async function generateImageMock(input: ReplicateInput): Promise<ReplicateResponse> {
  // Simulate 2-3 second generation time
  const delay = 2000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  console.log("[MOCK AI] Generated placeholder image for prompt:", input.prompt.slice(0, 80));

  return {
    success: true,
    imageUrl: generatePlaceholderImage(input.prompt),
  };
}

/**
 * Calls the Replicate API to generate an image.
 * In mock mode (no token or MOCK_AI=true), returns a placeholder after a delay.
 */
export async function generateImage(
  input: ReplicateInput
): Promise<ReplicateResponse> {
  // Use mock mode if no API token or explicitly enabled
  if (MOCK_AI) {
    return generateImageMock(input);
  }

  const url = "https://api.replicate.com/v1/predictions";

  // Resolve version: if REPLICATE_MODEL contains ":", use the part after it as version
  // Otherwise, use a known SDXL version hash
  const version = REPLICATE_MODEL.includes(":")
    ? REPLICATE_MODEL.split(":")[1]
    : "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version,
        input: {
          prompt: input.prompt,
          num_outputs: 1,
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `Replicate API error: ${response.status} ${errorBody.slice(0, 200)}`
      );
      return {
        success: false,
        message: "Image generation failed. Please try again later.",
      };
    }

    const data = await response.json();

    const output = data.output;
    if (!output || (Array.isArray(output) && output.length === 0)) {
      return {
        success: false,
        message: "Image generation produced no output. Please try again.",
      };
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (typeof imageUrl !== "string") {
      return {
        success: false,
        message: "Image generation returned unexpected format.",
      };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error("Replicate API call failed:", error);
    return {
      success: false,
      message: "Image generation service is unavailable. Please try again later.",
    };
  }
}
