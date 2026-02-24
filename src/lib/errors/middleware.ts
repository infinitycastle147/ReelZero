import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { RetryableError } from "@/lib/ai/retry";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

type RouteHandler = (
  request: NextRequest,
  context?: unknown
) => Promise<NextResponse> | NextResponse;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error: unknown) {
      // Known AppError — return structured error response
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), {
          status: error.statusCode,
        });
      }

      // RetryableError — Gemini/external API failed after all retries
      if (error instanceof RetryableError) {
        const code =
          error.statusCode === 429
            ? ERROR_CODES.EXTERNAL_RATE_LIMITED
            : ERROR_CODES.EXTERNAL_API_ERROR;
        const meta = ERROR_MESSAGES[code];
        // Log internal message server-side only — never expose raw API errors to client
        console.error(
          `[withErrorHandler] External API failed (${error.statusCode}): ${error.message}`,
        );
        return NextResponse.json(
          { error: { code, message: meta.message } },
          { status: meta.statusCode },
        );
      }

      // Truly unexpected error — log full details server-side
      console.error("[withErrorHandler] Unhandled error:", error);
      const fallback = ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR];
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: fallback.message,
          },
        },
        { status: fallback.statusCode }
      );
    }
  };
}
