"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProtocol } from "@/lib/format";

export type UpsertLinkInput = {
  id?: string;
  title: string;
  url: string;
  category: string;
  subType?: string;
  note?: string;
  description?: string;
  sourceDate?: string;
};

async function getOrCreateCategoryId(
  supabase: ReturnType<typeof createAdminClient>,
  name: string,
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const existing = await supabase
    .from("categories")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing.data) return existing.data.id as string;

  const positionRow = await supabase
    .from("categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = ((positionRow.data?.position as number | undefined) ?? 0) + 10;

  const inserted = await supabase
    .from("categories")
    .insert({ name: trimmed, position: nextPosition })
    .select("id")
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data.id as string;
}

export async function upsertLink(input: UpsertLinkInput) {
  const supabase = createAdminClient();

  const title = input.title.trim();
  const url = ensureProtocol(input.url.trim());
  if (!title) throw new Error("Title is required");
  if (!url) throw new Error("URL is required");

  const categoryId = await getOrCreateCategoryId(supabase, input.category);

  const subType = input.subType?.trim().toLowerCase() || null;
  const note = input.note?.trim() || null;
  const description = input.description?.trim() || null;
  const sourceDate = input.sourceDate || null;

  if (input.id) {
    const { error } = await supabase
      .from("links")
      .update({
        title,
        url,
        category_id: categoryId,
        sub_type: subType,
        note,
        description,
        source_date: sourceDate,
      })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("links").insert({
      title,
      url,
      category_id: categoryId,
      sub_type: subType,
      note,
      description,
      source_date: sourceDate,
      status: "live",
      created_by: null,
    });
    if (error) throw error;
  }

  revalidatePath("/");
}

export async function toggleLinkStatus(id: string) {
  const supabase = createAdminClient();
  const current = await supabase
    .from("links")
    .select("status")
    .eq("id", id)
    .single();
  if (current.error) throw current.error;
  const next = current.data.status === "live" ? "archive" : "live";

  const { error } = await supabase
    .from("links")
    .update({ status: next })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteLink(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function addCategory(name: string) {
  const supabase = createAdminClient();
  await getOrCreateCategoryId(supabase, name);
  revalidatePath("/");
}
