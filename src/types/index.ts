// Shared TypeScript types for CharacterForge AI

// --- Error Types ---

export interface ApiError {
  error: {
    code: string; // Machine-readable error code
    message: string; // User-friendly message
  };
}

// --- Enums ---

export enum GenerationStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum TransactionType {
  DEDUCTION = "DEDUCTION",
  REFUND = "REFUND",
  INITIAL_GRANT = "INITIAL_GRANT",
}

// --- Domain Types ---

export interface User {
  id: string;
  supabaseId: string;
  email: string;
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferenceImage {
  id: string;
  characterId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedAt: Date;
}

export interface Generation {
  id: string;
  userId: string;
  characterId: string;
  prompt: string;
  status: GenerationStatus;
  imageKey: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  generationId: string | null;
  amount: number;
  type: TransactionType;
  createdAt: Date;
}
