import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Webhook } from "svix";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type WebhookEventPayload = {
  type: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
  object: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      "CLERK_WEBHOOK_SECRET is not configured"
    );
  }

  // Read raw body for signature verification
  const body = await request.text();

  // Extract Svix headers
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Missing required Svix headers"
    );
  }

  // Verify webhook signature
  const webhook = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: WebhookEventPayload;

  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEventPayload;
  } catch {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      "Invalid webhook signature"
    );
  }

  // Log event (placeholder — database sync deferred to F004)
  console.log(
    `[webhook] Received event: type=${event.type}, userId=${event.data.id}`
  );

  return NextResponse.json({ data: { success: true } });
});
