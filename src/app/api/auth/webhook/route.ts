import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Webhook } from "svix";

import { createFreeSubscription, revertToFreeTier } from "@/lib/db/queries/subscriptions";
import { createUser, getUserByClerkIdIncludeDeleted, updateUser, softDeleteUser } from "@/lib/db/queries/users";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type ClerkEmailAddress = {
  email_address: string;
  id: string;
};

type ClerkUserData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
};

type WebhookEventPayload = {
  type: string;
  data: ClerkUserData;
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

  // Verify webhook signature (preserved from F003)
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

  const { type, data } = event;
  const clerkUserId = data.id;
  const email = data.email_addresses?.[0]?.email_address ?? "";
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

  if (type === "user.created") {
    const user = await createUser({ clerk_user_id: clerkUserId, email, name });
    await createFreeSubscription(user.id);
  } else if (type === "user.updated") {
    await updateUser(clerkUserId, { email, name });
  } else if (type === "user.deleted") {
    // Fetch user before soft-deleting so we can cancel their subscription
    const user = await getUserByClerkIdIncludeDeleted(clerkUserId);
    await softDeleteUser(clerkUserId);
    if (user) {
      // Revert to free tier — same behaviour as Stripe subscription cancellation
      await revertToFreeTier(user.id);
    }
  }

  return NextResponse.json({ data: { success: true } });
});
