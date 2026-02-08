import { createSupabaseAdmin } from "@/lib/db/client";
import type { User, UserInsert, UserUpdate, PaginatedResult } from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function createUser(data: UserInsert): Promise<User> {
  const supabase = createSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .upsert(data, { onConflict: "clerk_user_id" })
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return user as User;
}

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  const supabase = createSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .select()
    .eq("clerk_user_id", clerkUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return user as User | null;
}

export async function getUserByClerkIdIncludeDeleted(clerkUserId: string): Promise<User | null> {
  const supabase = createSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .select()
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return user as User | null;
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = createSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .select()
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return user as User | null;
}

export async function updateUser(clerkUserId: string, data: UserUpdate): Promise<User> {
  const supabase = createSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("clerk_user_id", clerkUserId)
    .select()
    .single();

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return user as User;
}

export async function listUsers(params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<User>> {
  const supabase = createSupabaseAdmin();
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: users, error, count } = await supabase
    .from("users")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .range(from, to);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    items: (users ?? []) as User[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function softDeleteUser(clerkUserId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}
