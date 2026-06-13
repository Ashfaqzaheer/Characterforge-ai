# Requirements Document

## Introduction

CharacterForge AI is a production-ready MVP that enables users to create consistent AI-generated characters using reference images and generate new scene images while maintaining character appearance consistency. The system uses a credit-based model to manage AI generation costs, enforces strict security practices, and provides a clean user experience built on Next.js 15, TypeScript, Supabase Auth, PostgreSQL, Prisma, Cloudflare R2 for storage, and Replicate API for AI generation.

## Glossary

- **System**: The CharacterForge AI application as a whole
- **Auth_Service**: The authentication subsystem powered by Supabase Auth
- **Character_Service**: The subsystem responsible for creating, storing, and managing character profiles
- **Upload_Service**: The subsystem responsible for validating and storing reference images in Cloudflare R2
- **Generation_Service**: The subsystem responsible for orchestrating AI image generation via Replicate API
- **Credit_Service**: The subsystem responsible for managing user credit balances and transactions
- **Rate_Limiter**: The subsystem responsible for throttling API requests per user
- **History_Service**: The subsystem responsible for retrieving and displaying past generation records
- **Character_Profile**: A saved entity containing character metadata and associated reference images
- **Reference_Image**: An uploaded image (1-3 per character) used to maintain character appearance consistency
- **Scene_Image**: An AI-generated image depicting a character in a specific scene or context
- **Credit**: A unit of currency within the system that is consumed when generating images
- **Generation_Request**: A user-initiated request to generate a scene image for a specific character

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to sign up and log in securely, so that my characters and generations are private and persistent.

#### Acceptance Criteria

1. WHEN a user submits valid registration credentials, THE Auth_Service SHALL create a new user account and return an authenticated session
2. WHEN a user submits valid login credentials, THE Auth_Service SHALL authenticate the user and return a session token
3. IF a user submits invalid credentials, THEN THE Auth_Service SHALL return a descriptive error message without revealing whether the email exists
4. WHEN a user requests logout, THE Auth_Service SHALL invalidate the current session
5. THE Auth_Service SHALL support email/password authentication via Supabase Auth
6. WHILE a user session is expired, THE System SHALL redirect the user to the login page

### Requirement 2: Character Creation

**User Story:** As a user, I want to create a character profile with a name and description, so that I can generate consistent images of that character.

#### Acceptance Criteria

1. WHEN a user submits a character name and description, THE Character_Service SHALL create a new Character_Profile associated with the authenticated user
2. THE Character_Service SHALL require a character name between 1 and 100 characters
3. THE Character_Service SHALL require a character description between 1 and 1000 characters
4. IF a user attempts to create a character without authentication, THEN THE System SHALL return a 401 unauthorized error
5. WHEN a Character_Profile is created, THE Character_Service SHALL store the creation timestamp and owner user ID

### Requirement 3: Reference Image Upload

**User Story:** As a user, I want to upload 1-3 reference images for each character, so that the AI can maintain consistent character appearance.

#### Acceptance Criteria

1. WHEN a user uploads a reference image, THE Upload_Service SHALL validate the file type is PNG, JPEG, or WebP
2. WHEN a user uploads a reference image, THE Upload_Service SHALL validate the file size is no larger than 5MB
3. THE Upload_Service SHALL allow a minimum of 1 and a maximum of 3 reference images per Character_Profile
4. IF a user attempts to upload more than 3 reference images for a single character, THEN THE Upload_Service SHALL reject the upload with a descriptive error
5. IF a user uploads a file with an invalid type or size, THEN THE Upload_Service SHALL reject the upload and return a specific validation error
6. WHEN a valid reference image is uploaded, THE Upload_Service SHALL store the image in Cloudflare R2 and associate the storage URL with the Character_Profile
7. THE Upload_Service SHALL generate a unique filename for each uploaded image to prevent collisions
8. THE Upload_Service SHALL scan uploaded files to verify the file content matches the declared MIME type

### Requirement 4: Character Profile Persistence

**User Story:** As a user, I want my character profiles to be saved persistently, so that I can return to them later and generate new scenes.

#### Acceptance Criteria

1. THE Character_Service SHALL persist all Character_Profile data in PostgreSQL via Prisma
2. WHEN a user requests their character list, THE Character_Service SHALL return only Character_Profiles owned by the authenticated user
3. WHEN a user requests a specific Character_Profile, THE Character_Service SHALL return the profile with all associated Reference_Images
4. IF a user requests a Character_Profile they do not own, THEN THE Character_Service SHALL return a 403 forbidden error
5. WHEN a user deletes a Character_Profile, THE Character_Service SHALL remove the profile, associated Reference_Images from R2, and all related Generation_Requests

### Requirement 5: Scene Image Generation

**User Story:** As a user, I want to generate scene images of my character in different contexts, so that I can create consistent visual content.

#### Acceptance Criteria

1. WHEN a user submits a Generation_Request with a valid Character_Profile ID and scene description, THE Generation_Service SHALL send the reference images and prompt to the Replicate API
2. THE Generation_Service SHALL include all Reference_Images from the Character_Profile in the generation request to maintain appearance consistency
3. WHEN the Replicate API returns a successful result, THE Generation_Service SHALL store the generated Scene_Image in Cloudflare R2
4. WHEN the Replicate API returns a successful result, THE Generation_Service SHALL create a generation record with the prompt, Character_Profile reference, and Scene_Image URL
5. THE Generation_Service SHALL execute all Replicate API calls exclusively on the backend server
6. THE Generation_Service SHALL never expose API keys to the client
7. IF the Replicate API returns an error, THEN THE Generation_Service SHALL log the error and return a user-friendly error message

### Requirement 6: Generation History

**User Story:** As a user, I want to view my past generations, so that I can revisit and reuse generated scene images.

#### Acceptance Criteria

1. WHEN a user requests their generation history, THE History_Service SHALL return all Generation_Requests belonging to the authenticated user, ordered by creation date descending
2. THE History_Service SHALL return the scene prompt, generated Scene_Image URL, Character_Profile name, and creation timestamp for each record
3. THE History_Service SHALL support pagination with a default page size of 20 records
4. IF a user requests generation history without authentication, THEN THE System SHALL return a 401 unauthorized error
5. WHEN a user requests generation history, THE History_Service SHALL return only records owned by the authenticated user

### Requirement 7: Credit System

**User Story:** As a user, I want a credit-based system to manage generation costs, so that usage is tracked and limited fairly.

#### Acceptance Criteria

1. WHEN a new user account is created, THE Credit_Service SHALL assign an initial credit balance of 10 credits
2. WHEN a user submits a Generation_Request, THE Credit_Service SHALL deduct the generation cost from the user balance before initiating the AI generation
3. IF a user has insufficient credits to cover a Generation_Request, THEN THE Credit_Service SHALL reject the request with a descriptive error indicating insufficient balance
4. IF the Replicate API returns a generation failure, THEN THE Credit_Service SHALL refund the deducted credits to the user balance
5. THE Credit_Service SHALL record every credit transaction with amount, type (deduction or refund), timestamp, and associated Generation_Request ID
6. WHEN a user requests their credit balance, THE Credit_Service SHALL return the current balance and recent transaction history
7. THE Credit_Service SHALL use database transactions to ensure atomicity of credit deductions and refunds

### Requirement 8: Secure Image Uploads

**User Story:** As a user, I want my uploads to be handled securely, so that malicious files cannot compromise the system.

#### Acceptance Criteria

1. THE Upload_Service SHALL validate image dimensions do not exceed 4096x4096 pixels
2. THE Upload_Service SHALL strip EXIF metadata from uploaded images before storage
3. THE Upload_Service SHALL generate signed URLs with a maximum expiry of 1 hour for image access
4. THE Upload_Service SHALL reject files where the detected content type does not match the file extension
5. IF an upload request exceeds the maximum file size, THEN THE Upload_Service SHALL terminate the upload stream before the full file is received
6. THE System SHALL serve all stored images through signed Cloudflare R2 URLs rather than public bucket access

### Requirement 9: Rate Limiting

**User Story:** As the system operator, I want rate limiting on API endpoints, so that the system is protected from abuse and excessive costs.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a maximum of 10 Generation_Requests per user per hour
2. THE Rate_Limiter SHALL enforce a maximum of 60 API requests per user per minute across all endpoints
3. IF a user exceeds the generation rate limit, THEN THE Rate_Limiter SHALL return a 429 status code with a Retry-After header
4. IF a user exceeds the general API rate limit, THEN THE Rate_Limiter SHALL return a 429 status code with a Retry-After header
5. THE Rate_Limiter SHALL use a sliding window algorithm for rate limit calculations
6. WHILE a user is rate-limited, THE System SHALL not deduct credits for rejected requests

### Requirement 10: API Security

**User Story:** As the system operator, I want all API routes secured, so that sensitive operations and data are protected.

#### Acceptance Criteria

1. THE System SHALL validate authentication tokens on every protected API route before processing the request
2. THE System SHALL store all third-party API keys (Replicate, Supabase service role, R2 credentials) exclusively in server-side environment variables
3. THE System SHALL never include API keys, service credentials, or internal error details in client-facing responses
4. THE System SHALL validate and sanitize all user input on API routes before processing
5. IF an API route receives a request with an invalid or missing authentication token, THEN THE System SHALL return a 401 unauthorized error
6. THE System SHALL implement CORS policies that restrict API access to the application domain
