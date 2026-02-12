import { createSupabaseAdmin } from "@/lib/db/client";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

/**
 * Idempotency guard: records a Stripe webhook event.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING so duplicate events are silently
 * ignored. Returns `true` if the event was newly inserted (should process),
 * `false` if it already existed (already processed — skip).
 */
export async function recordWebhookEvent(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert({ id: eventId, type: eventType });

  if (error) {
    // Unique violation (23505) means the event was already processed — treat as duplicate
    if (error.code === "23505") {
      return false;
    }
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  // No error means the row was successfully inserted (new event)
  return true;
}

/**
 * Checks if a Stripe webhook event has already been processed.
 */
export async function hasProcessedEvent(eventId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return data !== null;
}
