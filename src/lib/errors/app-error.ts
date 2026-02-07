import type { ErrorCode } from "@/lib/errors/codes";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown | undefined;

  constructor(code: ErrorCode, details?: unknown) {
    const meta = ERROR_MESSAGES[code];
    super(meta.message);

    this.name = "AppError";
    this.code = code;
    this.statusCode = meta.statusCode;
    this.details = details;
  }

  toJSON(): {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } {
    const response: {
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    } = {
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details !== undefined) {
      response.error.details = this.details;
    }

    return response;
  }
}
