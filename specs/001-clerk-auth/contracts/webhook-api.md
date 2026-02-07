# API Contract: Clerk Webhook

**Feature**: 001-clerk-auth
**Date**: 2026-02-07

## POST /api/auth/webhook

Receives user lifecycle events from Clerk via Svix. Verifies the webhook signature and acknowledges receipt. In this feature, events are logged but not persisted (database sync is F004).

### Headers (Required)

| Header | Type | Description |
|--------|------|-------------|
| `svix-id` | string | Unique event identifier |
| `svix-timestamp` | string | Unix timestamp of the event |
| `svix-signature` | string | HMAC signature for verification |
| `content-type` | string | Must be `application/json` |

### Request Body

Raw JSON payload from Clerk. Do not pre-parse — the raw body is needed for signature verification.

```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [
      {
        "email_address": "user@example.com",
        "id": "idn_2abc123"
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://img.clerk.com/...",
    "created_at": 1707307200000,
    "updated_at": 1707307200000
  },
  "object": "event"
}
```

### Event Types Handled

| Event Type | Description | Action (this feature) |
|------------|-------------|----------------------|
| `user.created` | New user signed up | Log event |
| `user.updated` | User profile changed | Log event |
| `user.deleted` | User account deleted | Log event |

### Responses

#### 200 OK — Event acknowledged

```json
{
  "data": {
    "success": true
  }
}
```

#### 400 Bad Request — Invalid signature or missing headers

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid webhook signature"
  }
}
```

#### 500 Internal Server Error — Unexpected processing failure

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Security

- Signature verification is mandatory. The handler MUST verify using `svix` before processing any event data.
- The webhook endpoint MUST be excluded from Clerk middleware auth protection (it is called by Clerk's servers, not by authenticated users).
- The `CLERK_WEBHOOK_SECRET` environment variable must be set. If missing, the handler should fail fast with a 500 error.

### Constitution Compliance

- Response format follows Principle II: `{ data: {...} }` for success, `{ error: { code, message } }` for errors.
- Error handling uses `AppError` with `ERROR_CODES.VALIDATION_FAILED` for signature failures.
- Error middleware wrapper (`withErrorHandler`) catches unhandled exceptions.
