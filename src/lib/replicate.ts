/**
 * AI Image Generation — Provider-agnostic module.
 * Server-only — never import this module on the client side.
 *
 * Providers:
 *   - "huggingface" (default for demo, free tier)
 *   - "replicate" (paid, production)
 *   - "mock" (placeholder, no API calls)
 *
 * Controlled by env:
 *   IMAGE_PROVIDER=huggingface|replicate|mock
 *   HUGGINGFACE_API_KEY=hf_...
 *   REPLICATE_API_TOKEN=r8_...
 *   MOCK_AI=true (legacy, forces mock)
 */

const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || "huggingface";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL || "stability-ai/sdxl";
const MOCK_AI = process.env.MOCK_AI === "true";

export interface GenerationInput {
  prompt: string;
  inputImages: string[];
  negativePrompt?: string;
}

export interface GenerationResult {
  success: true;
  imageUrl: string;
}

export interface GenerationError {
  success: false;
  message: string;
}

export type GenerationResponse = GenerationResult | GenerationError;

// Keep backward-compatible exports
export type ReplicateResponse = GenerationResponse;
export type ReplicateResult = GenerationResult;
export type ReplicateError = GenerationError;

/**
 * Main entry point — routes to the configured provider.
 */
export async function generateImage(input: GenerationInput): Promise<GenerationResponse> {
  // Legacy MOCK_AI flag takes priority
  if (MOCK_AI) {
    return generateMock(input);
  }

  switch (IMAGE_PROVIDER) {
    case "huggingface":
      return generateHuggingFace(input);
    case "replicate":
      return generateReplicate(input);
    case "mock":
      return generateMock(input);
    default:
      // If no valid provider and no tokens, fall back to mock
      if (!HUGGINGFACE_API_KEY && !REPLICATE_API_TOKEN) {
        return generateMock(input);
      }
      return generateHuggingFace(input);
  }
}

// ─── Hugging Face Provider ──────────────────────────────────────────────────

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_BASE_URL = "https://router.huggingface.co/hf-inference/models";

async function generateHuggingFace(input: GenerationInput): Promise<GenerationResponse> {
  if (!HUGGINGFACE_API_KEY) {
    console.warn("[HuggingFace] No API key set, falling back to mock");
    return generateMock(input);
  }

  const url = `${HF_BASE_URL}/${HF_MODEL}`;

  try {
    console.log("[HuggingFace] Generating image for:", input.prompt.slice(0, 60));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: input.prompt,
        parameters: {
          negative_prompt: input.negativePrompt || "blurry, low quality, distorted",
        },
      }),
    });

    if (response.status === 503) {
      return {
        success: false,
        message: "Demo image generation is busy. Please try again in 30 seconds.",
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        message: "Demo image generation is busy. Please try again.",
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[HuggingFace] Error ${response.status}:`, errText.slice(0, 200));
      return {
        success: false,
        message: "Demo image generation is busy. Please try again.",
      };
    }

    // HF returns raw image bytes (JPEG)
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    const base64 = buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64}`;

    return { success: true, imageUrl };
  } catch (error) {
    console.error("[HuggingFace] Request failed:", error);
    return {
      success: false,
      message: "Demo image generation is busy. Please try again.",
    };
  }
}

// ─── Replicate Provider ─────────────────────────────────────────────────────

async function generateReplicate(input: GenerationInput): Promise<GenerationResponse> {
  if (!REPLICATE_API_TOKEN) {
    console.warn("[Replicate] No API token set, falling back to mock");
    return generateMock(input);
  }

  const url = "https://api.replicate.com/v1/predictions";
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
      console.error(`[Replicate] Error ${response.status}:`, errorBody.slice(0, 200));
      return { success: false, message: "Image generation failed. Please try again later." };
    }

    const data = await response.json();
    const output = data.output;
    if (!output || (Array.isArray(output) && output.length === 0)) {
      return { success: false, message: "Image generation produced no output." };
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (typeof imageUrl !== "string") {
      return { success: false, message: "Image generation returned unexpected format." };
    }

    return { success: true, imageUrl };
  } catch (error) {
    console.error("[Replicate] Request failed:", error);
    return { success: false, message: "Image generation service is unavailable." };
  }
}

// ─── Mock Provider ──────────────────────────────────────────────────────────

async function generateMock(input: GenerationInput): Promise<GenerationResponse> {
  const delay = 2000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));
  console.log("[MOCK AI] Generated placeholder for:", input.prompt.slice(0, 60));

  const encodedPrompt = encodeURIComponent(input.prompt.slice(0, 40));
  return {
    success: true,
    imageUrl: `https://placehold.co/1024x1024/1a1a2e/ffffff?text=${encodedPrompt}`,
  };
}
