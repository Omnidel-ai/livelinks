"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createCategory(name: string, orgId: string | null) {
  const supabase = createAdminClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const posRow = await supabase
    .from("categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((posRow.data?.position as number) ?? 0) + 10;

  const { error } = await supabase.from("categories").insert({
    name: trimmed,
    position: nextPos,
    org_id: orgId || null,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function renameCategory(id: string, newName: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: newName.trim() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function updateCategoryOrg(categoryId: string, orgId: string | null) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ org_id: orgId || null })
    .eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} links still use this category. Reassign them first.`);
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function reassignLink(linkId: string, categoryId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("links")
    .update({ category_id: categoryId })
    .eq("id", linkId);
  if (error) throw error;
  revalidatePath("/");
}

export async function bulkReassignLinks(linkIds: string[], categoryId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("links")
    .update({ category_id: categoryId })
    .in("id", linkIds);
  if (error) throw error;
  revalidatePath("/");
}

export async function toggleFeatured(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("links")
    .select("featured")
    .eq("id", id)
    .single();
  if (!data) throw new Error("Link not found");
  const { error } = await supabase
    .from("links")
    .update({ featured: !data.featured })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function updateLinkDetails(
  id: string,
  updates: { title?: string; url?: string; sub_type?: string; note?: string; description?: string },
) {
  const supabase = createAdminClient();
  const clean: Record<string, string | null> = {};
  if (updates.title !== undefined) clean.title = updates.title.trim();
  if (updates.url !== undefined) clean.url = updates.url.trim();
  if (updates.sub_type !== undefined) clean.sub_type = updates.sub_type.trim().toLowerCase() || null;
  if (updates.note !== undefined) clean.note = updates.note.trim() || null;
  if (updates.description !== undefined) clean.description = updates.description.trim() || null;

  const { error } = await supabase.from("links").update(clean).eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}
