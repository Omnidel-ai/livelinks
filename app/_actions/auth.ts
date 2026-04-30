"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_DOMAIN = "ky21c.org";

export type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendMagicLink(
  email: string,
  origin: string,
): Promise<SendMagicLinkResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Enter your email." };
  if (!trimmed.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return {
      ok: false,
      error: `Sign-in is restricted to @${ALLOWED_DOMAIN} addresses.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/auth");
}
