# Code Constitution
## ReelZero - AI-Powered Reel/Shorts Creator

**Version:** 1.0  
**Date:** January 31, 2026

---

## 1. Import/Export Rules

### 1.1 No Re-exports
Import directly from the source file. Never re-export from index files.

```typescript
// ❌ Bad
// src/lib/errors/index.ts
export { AppError } from './AppError';
export { ERROR_CODES } from './codes';

// Then importing from index
import { AppError, ERROR_CODES } from '@/lib/errors';

// ✅ Good
import { AppError } from '@/lib/errors/AppError';
import { ERROR_CODES } from '@/lib/errors/codes';
```

### 1.2 No Barrel Files
Do not create `index.ts` files that aggregate exports from a folder.

```typescript
// ❌ Bad - barrel file
// src/components/ui/index.ts
export * from './button';
export * from './input';
export * from './card';

// ✅ Good - import directly
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
```

### 1.3 One Primary Export Per File
Each file should have one primary purpose.

```typescript
// ❌ Bad - multiple unrelated exports
// utils.ts
export function formatDate() {}
export function calculateCredits() {}
export function validateEmail() {}

// ✅ Good - single purpose files
// date.ts
export function formatDate() {}

// credits.ts
export function calculateCredits() {}
```

### 1.4 Import Order
Maintain consistent import ordering with blank lines between groups:

```typescript
// 1. Node built-ins
import { readFile } from 'fs';

// 2. External packages
import { NextRequest } from 'next/server';
import { z } from 'zod';

// 3. Internal aliases (@/)
import { AppError } from '@/lib/errors/AppError';
import { generateText } from '@/lib/ai/text-generation';

// 4. Relative imports
import { validateInput } from './validation';
import type { SceneData } from './types';
```

---

## 2. Naming Conventions

### 2.1 Files
| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `video-player.tsx` |
| Hooks | camelCase with `use` prefix | `useVideoGeneration.ts` |
| Utilities | kebab-case | `date-utils.ts` |
| Types | kebab-case | `video-types.ts` |
| Constants | kebab-case | `error-codes.ts` |
| API Routes | kebab-case folders | `api/video/generate/route.ts` |

### 2.2 Interfaces and Types

**Interfaces:** Use `I` prefix for service/contract interfaces only.

```typescript
// ✅ Service interfaces - use I prefix
interface ITextProvider {
  generate(prompt: string): Promise<string>;
}

interface IStorageService {
  upload(file: File): Promise<string>;
}

// ✅ Data shapes - no prefix
interface User {
  id: string;
  email: string;
}

interface VideoMetadata {
  duration: number;
  scenes: Scene[];
}
```

**Types:** Use for unions, primitives, and mapped types.

```typescript
// ✅ Types for unions
type VideoStatus = 'processing' | 'completed' | 'failed';
type CaptionStyle = 'word_by_word' | 'full_sentence' | 'none';

// ✅ Types for primitives
type UserId = string;
type Credits = number;

// ✅ Types for function signatures
type GenerateHandler = (input: GenerateInput) => Promise<GenerateOutput>;
```

### 2.3 Functions and Variables
| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase, verb prefix | `generateScript()`, `validateInput()` |
| Variables | camelCase | `videoData`, `userCredits` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_SCENES`, `API_TIMEOUT` |
| Boolean | is/has/can prefix | `isLoading`, `hasCredits`, `canGenerate` |

---

## 3. Error Handling

### 3.1 Error Codes
All errors must use predefined error codes from `src/lib/errors/codes.ts`.

```typescript
// ✅ Good - using error codes
import { ERROR_CODES } from '@/lib/errors/codes';
import { AppError } from '@/lib/errors/AppError';

throw new AppError(ERROR_CODES.INSUFFICIENT_CREDITS);

// ❌ Bad - arbitrary error messages
throw new Error('You have no credits remaining');
```

### 3.2 Error Structure
All API errors follow this structure:

```typescript
interface ApiErrorResponse {
  error: {
    code: string;        // ERROR_CODES value
    message: string;     // Human-readable message
    details?: unknown;   // Optional additional context
  };
}
```

### 3.3 Error Middleware
All API routes must use the error middleware. Never catch and swallow errors.

```typescript
// ✅ Good - let middleware handle
export async function POST(req: NextRequest) {
  const data = await validateRequest(req);  // Throws AppError if invalid
  const result = await generateVideo(data); // Throws AppError on failure
  return Response.json(result);
}

// ❌ Bad - swallowing errors
export async function POST(req: NextRequest) {
  try {
    const data = await validateRequest(req);
    const result = await generateVideo(data);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

### 3.4 Error Categories
| Code Range | Category | Example |
|------------|----------|---------|
| AUTH_* | Authentication | `AUTH_REQUIRED`, `AUTH_EXPIRED` |
| VALIDATION_* | Input validation | `VALIDATION_PROMPT_TOO_SHORT` |
| CREDIT_* | Credit/billing | `CREDIT_INSUFFICIENT`, `CREDIT_DEDUCTION_FAILED` |
| GENERATION_* | AI generation | `GENERATION_SCRIPT_FAILED`, `GENERATION_IMAGE_FAILED` |
| STORAGE_* | File storage | `STORAGE_UPLOAD_FAILED`, `STORAGE_FILE_TOO_LARGE` |
| RENDER_* | Video rendering | `RENDER_FAILED`, `RENDER_TIMEOUT` |
| EXTERNAL_* | Third-party APIs | `EXTERNAL_GEMINI_ERROR`, `EXTERNAL_ELEVENLABS_ERROR` |

---

## 4. API Routes

### 4.1 Response Format
All successful responses:

```typescript
// Single resource
{
  data: { ... }
}

// Collection
{
  data: [...],
  pagination?: {
    page: number;
    limit: number;
    total: number;
  }
}
```

### 4.2 HTTP Status Codes
| Status | Usage |
|--------|-------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (no credits, wrong tier) |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Internal server error |

### 4.3 Route Handler Structure

```typescript
import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/errors/middleware';
import { withAuth } from '@/lib/auth/middleware';

async function handler(req: NextRequest) {
  // 1. Validate input
  // 2. Check permissions
  // 3. Execute business logic
  // 4. Return response
}

export const POST = withErrorHandler(withAuth(handler));
```

---

## 5. Component Rules

### 5.1 File Structure
Each component file follows this order:

```typescript
// 1. Imports

// 2. Types/Interfaces (component-specific only)

// 3. Component
export function VideoPlayer({ src, onEnd }: VideoPlayerProps) {
  // 3a. Hooks
  // 3b. Derived state
  // 3c. Handlers
  // 3d. Effects
  // 3e. Render
}

// 4. Sub-components (if small and tightly coupled)
```

### 5.2 Props Interface
Define props interface in the same file, above the component.

```typescript
interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnd?: () => void;
}

export function VideoPlayer({ src, autoPlay = false, onEnd }: VideoPlayerProps) {
  // ...
}
```

### 5.3 No Default Exports for Utilities
Use named exports for non-component files.

```typescript
// ❌ Bad
export default function formatDate() {}

// ✅ Good
export function formatDate() {}
```

Components use named exports as well for consistency.

```typescript
// ✅ Good
export function VideoPlayer() {}
```

---

## 6. Database Rules

### 6.1 Query Files
Each table has its own query file in `src/lib/db/queries/`.

```typescript
// src/lib/db/queries/videos.ts
export async function getVideoById(id: string): Promise<Video | null> {}
export async function getVideosByUserId(userId: string): Promise<Video[]> {}
export async function createVideo(data: CreateVideoInput): Promise<Video> {}
export async function updateVideo(id: string, data: UpdateVideoInput): Promise<Video> {}
export async function deleteVideo(id: string): Promise<void> {}
```

### 6.2 No Raw SQL in Route Handlers
All database access goes through query functions.

```typescript
// ❌ Bad - SQL in route handler
export async function GET(req: NextRequest) {
  const { data } = await supabase.from('videos').select('*').eq('id', id);
  return Response.json(data);
}

// ✅ Good - using query function
import { getVideoById } from '@/lib/db/queries/videos';

export async function GET(req: NextRequest) {
  const video = await getVideoById(id);
  return Response.json({ data: video });
}
```

---

## 7. AI Service Rules

### 7.1 Provider Abstraction
All AI calls go through abstraction functions in `src/lib/ai/`.

```typescript
// ✅ Good
import { generateText } from '@/lib/ai/text-generation';

const script = await generateText({
  prompt: scriptPrompt,
  provider: 'gemini'
});

// ❌ Bad - direct API call in route handler
const response = await fetch('https://generativelanguage.googleapis.com/...');
```

### 7.2 Prompts Folder
All prompts live in `src/lib/prompts/`. No inline prompt strings.

```typescript
// ❌ Bad - inline prompt
const prompt = `Generate a 60-second video script about ${topic}...`;

// ✅ Good - imported prompt
import { buildScriptPrompt } from '@/lib/prompts/script-generation';

const prompt = buildScriptPrompt({ topic, theme, sceneCount: 5 });
```

---

## 8. Testing Rules

### 8.1 Test File Location
Tests live next to source files with `.test.ts` suffix.

```
src/lib/ai/
├── text-generation.ts
├── text-generation.test.ts
├── image-generation.ts
└── image-generation.test.ts
```

### 8.2 Test Naming
Describe what the function does, not implementation details.

```typescript
// ✅ Good
describe('generateText', () => {
  it('returns script with 5 scenes for valid prompt', async () => {});
  it('throws VALIDATION error for empty prompt', async () => {});
  it('throws EXTERNAL error when Gemini API fails', async () => {});
});

// ❌ Bad
describe('generateText', () => {
  it('should work', async () => {});
  it('calls Gemini API', async () => {});
});
```

---

## 9. Forbidden Patterns

### 9.1 No `any` Type
Use `unknown` and narrow with type guards.

```typescript
// ❌ Bad
function process(data: any) {}

// ✅ Good
function process(data: unknown) {
  if (isVideoData(data)) {
    // data is now typed as VideoData
  }
}
```

### 9.2 No Nested Ternaries

```typescript
// ❌ Bad
const status = isLoading ? 'loading' : hasError ? 'error' : 'success';

// ✅ Good
function getStatus() {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  return 'success';
}
```

### 9.3 No Magic Numbers/Strings

```typescript
// ❌ Bad
if (scenes.length > 5) {}
if (status === 'completed') {}

// ✅ Good
import { MAX_SCENES } from '@/lib/constants/video';
import { VideoStatus } from '@/types/video';

if (scenes.length > MAX_SCENES) {}
if (status === VideoStatus.COMPLETED) {}
```

### 9.4 No Backward Compatibility Code
When changing APIs, update all consumers. No shims or adapters for old patterns.

```typescript
// ❌ Bad - keeping old function for compatibility
/** @deprecated Use generateScript instead */
export function createScript() {
  return generateScript();
}

// ✅ Good - update all usages, remove old function
export function generateScript() {}
```

---

## 10. Git Commit Rules

### 10.1 Pre-Commit Checks
Before committing, always run:

```bash
# 1. Lint check
npm run lint

# 2. Type check
npm run type-check

# 3. Build check
npm run build
```

All three must pass before committing. No exceptions.

Add to `package.json` scripts:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "build": "next build",
    "pre-commit": "npm run lint && npm run type-check && npm run build"
  }
}
```

Optional: Set up husky for automated pre-commit hooks:
```bash
npx husky install
npx husky add .husky/pre-commit "npm run pre-commit"
```

### 10.2 Commit Message Format
```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```
feat(video): add crossfade transition
fix(auth): handle expired session redirect
refactor(ai): extract prompt building to separate module
docs(readme): add setup instructions
test(credits): add deduction edge cases
chore(deps): update remotion to 4.1
```

### 10.3 One Change Per Commit
Each commit should be atomic and revertible.

---

## Summary Checklist

Before submitting code:

- [ ] No re-exports or barrel files
- [ ] Imports ordered correctly
- [ ] Files named correctly (kebab-case)
- [ ] Interfaces use `I` prefix only for service contracts
- [ ] Errors use `AppError` with `ERROR_CODES`
- [ ] No raw SQL in route handlers
- [ ] AI calls go through `src/lib/ai/`
- [ ] Prompts defined in `src/lib/prompts/`
- [ ] No `any` types
- [ ] No magic numbers/strings
- [ ] Tests follow naming convention
