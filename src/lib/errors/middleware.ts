import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), {
          status: error.statusCode,
        });
      }

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
