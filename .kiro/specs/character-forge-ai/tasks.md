# Implementation Plan: CharacterForge AI

## Overview

Implement CharacterForge AI as a Next.js 15 application with TypeScript following the 9-step MVP order defined in the design: Database & Auth → Character CRUD → Image Upload → Credit System → AI Generation → Generation History → Rate Limiting → Frontend Pages → Security Hardening. Each step builds incrementally on the previous, with no orphaned code.

## Tasks

- [x] 1. Database & Auth setup
  - [x] 1.1 Initialize Next.js 15 project with TypeScript, install dependencies (Prisma, @supabase/supabase-js, sharp, zod, @aws-sdk/client-s3)
    - Create project with `create-next-app`, configure `tsconfig.json`
    - Install all required dependencies
    - Create `src/types/index.ts` with shared TypeScript types and `ApiError` interface
    - _Requirements: 10.2_

  - [x] 1.2 Create Prisma schema and run initial migration
    - Create `prisma/schema.prisma` with User, Character, ReferenceImage, Generation, CreditTransaction models and enums
    - Create `src/lib/db.ts` Prisma client singleton
    - Run `prisma migrate dev` to create database tables
    - _Requirements: 4.1, 7.1_

  - [x] 1.3 Implement Supabase Auth integration and auth middleware
    - Create `src/lib/auth.ts` with Supabase client helpers and token verification
    - Create `src/middleware.ts` that validates JWT on protected routes, loads user from DB by supabaseId
    - Return 401 for missing/invalid tokens on protected routes
    - _Requirements: 1.1, 1.2, 1.5, 10.1, 10.5_

  - [x] 1.4 Implement auth API routes (register, login, logout)
    - Create `src/app/api/auth/register/route.ts` — create Supabase user + DB User record with 10 credits
    - Create `src/app/api/auth/login/route.ts` — authenticate via Supabase, return session
    - Create `src/app/api/auth/logout/route.ts` — invalidate session
    - Return uniform error messages that don't reveal email existence
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1_

  - [x] 1.5 Write property tests for auth (Properties 1, 2, 3)
    - **Property 1: Registration produces authenticated user with credits**
    - **Property 2: Login/logout round trip invalidates session**
    - **Property 3: Invalid credentials produce uniform error**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 7.1**

- [x] 2. Character CRUD
  - [x] 2.1 Create Zod validation schemas for character input
    - Create `src/lib/validation.ts` with character name (1-100 chars) and description (1-1000 chars) schemas
    - Export reusable validation helpers
    - _Requirements: 2.2, 2.3, 10.4_

  - [x] 2.2 Implement Character service
    - Create `src/services/character.service.ts` with create, list, getById, delete methods
    - Enforce ownership checks (userId match) on get and delete
    - On delete: cascade remove reference images from R2, remove generation records
    - _Requirements: 2.1, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.3 Implement Character API routes
    - Create `src/app/api/characters/route.ts` — GET (list user's characters), POST (create character)
    - Create `src/app/api/characters/[id]/route.ts` — GET (character + images), DELETE (cascade delete)
    - Wire auth middleware, validate input with Zod, return proper error codes (401, 403, 404)
    - _Requirements: 2.1, 2.4, 4.2, 4.3, 4.4_

  - [x] 2.4 Write property tests for character service (Properties 4, 5, 12, 13)
    - **Property 4: Character name and description length validation**
    - **Property 5: Character ownership association**
    - **Property 12: Data isolation between users**
    - **Property 13: Character deletion cascades**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 4.2, 4.4, 4.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Image Upload
  - [x] 4.1 Implement R2 client and signed URL generation
    - Create `src/lib/r2.ts` with S3-compatible client configured for Cloudflare R2
    - Implement `uploadFile`, `deleteFile`, and `getSignedUrl` (1hr expiry) methods
    - _Requirements: 3.6, 8.3, 8.6_

  - [x] 4.2 Implement Upload service with validation pipeline
    - Create `src/services/upload.service.ts`
    - Validate file type (PNG, JPEG, WebP), MIME content detection, size (<=5MB), dimensions (<=4096x4096)
    - Use Sharp to strip EXIF metadata, verify content matches declared MIME type
    - Generate unique filenames (UUID-based), enforce max 3 images per character
    - Upload processed image to R2, save ReferenceImage record in DB
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.4, 8.5_

  - [x] 4.3 Implement image upload and access API routes
    - Create `src/app/api/characters/[id]/images/route.ts` — POST (upload reference image)
    - Create `src/app/api/characters/[id]/images/[imageId]/route.ts` — DELETE (remove image)
    - Create `src/app/api/images/[key]/route.ts` — GET (return signed URL, verify ownership)
    - Validate auth, ownership, and image count constraints
    - _Requirements: 3.3, 3.4, 4.4, 8.3, 8.6_

  - [x] 4.4 Write property tests for upload service (Properties 6, 7, 8, 9, 10, 11, 23)
    - **Property 6: Upload file type validation**
    - **Property 7: Upload file size validation**
    - **Property 8: Upload image dimension validation**
    - **Property 9: Reference image count bounds**
    - **Property 10: Upload storage round trip**
    - **Property 11: Unique storage keys**
    - **Property 23: Signed URL expiry**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 8.1, 8.2, 8.3, 8.4**

- [x] 5. Credit System
  - [x] 5.1 Implement Credit service with atomic operations
    - Create `src/services/credit.service.ts`
    - Implement `getBalance`, `deduct` (SELECT FOR UPDATE + decrement in transaction), `refund` (increment in transaction), `getTransactions`
    - Record CreditTransaction for every operation with amount, type, timestamp, generationId
    - Reject deduction if balance < 1 with InsufficientCreditsError
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.2 Implement Credits API route
    - Create `src/app/api/credits/route.ts` — GET (return balance + recent transactions)
    - Wire auth middleware
    - _Requirements: 7.6_

  - [x] 5.3 Write property tests for credit service (Properties 18, 19, 20, 21, 22)
    - **Property 18: Credit deduction before generation**
    - **Property 19: Insufficient credits rejection**
    - **Property 20: Credit refund on failure**
    - **Property 21: Credit transaction integrity**
    - **Property 22: Atomicity under concurrent deductions**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

- [x] 6. AI Generation
  - [x] 6.1 Implement prompt moderation
    - Create `src/lib/moderation.ts` with keyword blocklist and max length (500 chars) enforcement
    - Return rejection reason for blocked prompts
    - _Requirements: 5.1, 10.4_

  - [x] 6.2 Implement Replicate API client
    - Create `src/lib/replicate.ts` with server-only generation call
    - Accept reference image signed URLs + prompt, return generated image URL
    - Handle API errors gracefully, never expose API keys
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [x] 6.3 Implement Generation service
    - Create `src/services/generation.service.ts`
    - Full flow: validate ownership → moderate prompt → deduct credit → create Generation record (PROCESSING) → call Replicate → store result in R2 → update record (COMPLETED)
    - On failure: refund credit → update record (FAILED) → return user-friendly error
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 7.2, 7.4_

  - [x] 6.4 Implement Generate API route
    - Create `src/app/api/generate/route.ts` — POST (trigger generation)
    - Validate auth, input (characterId, prompt), orchestrate generation service
    - Return generation result or appropriate error codes (400, 401, 402, 500)
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 10.3_

  - [x] 6.5 Write property tests for generation service (Properties 14, 15)
    - **Property 14: Successful generation produces complete record**
    - **Property 15: Failed generation returns safe error**
    - **Validates: Requirements 5.3, 5.4, 5.7, 10.3**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Generation History
  - [x] 8.1 Implement History service
    - Create `src/services/history.service.ts`
    - Return user's generations ordered by createdAt DESC with pagination (default 20)
    - Include prompt, imageKey, character name, and timestamp per record
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 8.2 Implement Generations API route
    - Create `src/app/api/generations/route.ts` — GET (paginated history)
    - Accept `page` and `pageSize` query params, enforce auth and ownership
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 8.3 Write property tests for history service (Properties 16, 17)
    - **Property 16: Generation history ordering and completeness**
    - **Property 17: Generation history pagination**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 9. Rate Limiting
  - [x] 9.1 Implement sliding window rate limiter
    - Create `src/lib/rate-limiter.ts` with in-memory sliding window counter
    - Implement `checkLimit` for generation (10/hr) and general (60/min) endpoints
    - Return `allowed` boolean and `retryAfter` seconds when limited
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 9.2 Integrate rate limiter into middleware
    - Update `src/middleware.ts` to call rate limiter after auth validation
    - Return 429 with Retry-After header when limited
    - Ensure rate-limited requests do NOT deduct credits
    - _Requirements: 9.3, 9.4, 9.6_

  - [x] 9.3 Write property tests for rate limiter (Properties 24, 25, 26, 27)
    - **Property 24: Generation rate limit enforcement**
    - **Property 25: General API rate limit enforcement**
    - **Property 26: Sliding window expiry frees capacity**
    - **Property 27: Rate-limited requests do not deduct credits**
    - **Validates: Requirements 9.1, 9.2, 9.5, 9.6**

- [x] 10. Frontend Pages
  - [x] 10.1 Create layout, landing page, and auth pages
    - Create `src/app/layout.tsx` with global styles (Tailwind CSS) and Supabase auth provider
    - Create `src/app/page.tsx` landing page with sign-up CTA
    - Create `src/app/login/page.tsx` and `src/app/register/page.tsx` with email/password forms
    - Handle session expiry redirect to login
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [x] 10.2 Create dashboard and character creation pages
    - Create `src/app/dashboard/page.tsx` — display character list and credit balance
    - Create `src/app/characters/new/page.tsx` — form for name, description, image upload (1-3 files)
    - Wire to API routes, show validation errors inline
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.6_

  - [x] 10.3 Create character detail and generation UI
    - Create `src/app/characters/[id]/page.tsx` — show character info, reference images, generation form
    - Implement generation trigger with prompt input and loading state
    - Display generated images and handle errors (insufficient credits, rate limited)
    - _Requirements: 4.3, 5.1, 7.3, 9.3_

  - [x] 10.4 Create generation history page
    - Create `src/app/history/page.tsx` — paginated list of past generations
    - Show prompt, character name, generated image thumbnail, and timestamp
    - Implement pagination controls
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Security Hardening
  - [x] 11.1 Configure CORS and security headers
    - Add CORS policy in `next.config.ts` restricting API access to application domain
    - Add security headers (X-Content-Type-Options, X-Frame-Options, etc.)
    - _Requirements: 10.6_

  - [x] 11.2 Audit input sanitization and error responses
    - Ensure all API routes use Zod validation before processing
    - Audit all error responses to confirm no internal details, stack traces, or API keys are leaked
    - Verify all environment variables are server-side only (no `NEXT_PUBLIC_` prefix for secrets)
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 11.3 Write property tests for security (Properties 28, 29)
    - **Property 28: Authentication required on protected routes**
    - **Property 29: Input validation rejects malformed data**
    - **Validates: Requirements 10.1, 10.4, 10.5**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation uses TypeScript throughout with Next.js 15 App Router conventions
