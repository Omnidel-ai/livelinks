import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProtocol } from "@/lib/format";
import type { LinkStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportLink = {
  title: string;
  url: string;
  category: string;
  subType?: string | null;
  note?: string | null;
  status?: LinkStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ImportPayload = {
  categories?: string[];
  links: ImportLink[];
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || provided !== expected) {
    return unauthorized();
  }

  let payload: ImportPayload;
  try {
    payload = (await request.json()) as ImportPayload;
  } catch {
    return badRequest("Body must be JSON");
  }
  if (!payload || !Array.isArray(payload.links)) {
    return badRequest("Body must include a `links` array");
  }

  const supabase = createAdminClient();

  // 1. Make sure every needed category exists. Build name -> id map.
  const explicitCategories = (payload.categories ?? []).filter(Boolean);
  const linkCategories = payload.links.map((l) => l.category).filter(Boolean);
  const allNames = Array.from(
    new Set([...explicitCategories, ...linkCategories].map((s) => s.trim())),
  ).filter(Boolean);

  const existing = await supabase
    .from("categories")
    .select("id, name, position");
  if (existing.error) {
    return NextResponse.json(
      { error: existing.error.message },
      { status: 500 },
    );
  }
  const nameToId = new Map<string, string>();
  let maxPosition = 0;
  for (const row of existing.data ?? []) {
    nameToId.set(row.name as string, row.id as string);
    if ((row.position as number) > maxPosition)
      maxPosition = row.position as number;
  }

  const toInsertCategories = allNames
    .filter((n) => !nameToId.has(n))
    .map((name, i) => ({ name, position: maxPosition + (i + 1) * 10 }));

  if (toInsertCategories.length > 0) {
    const inserted = await supabase
      .from("categories")
      .insert(toInsertCategories)
      .select("id, name");
    if (inserted.error) {
      return NextResponse.json(
        { error: inserted.error.message },
        { status: 500 },
      );
    }
    for (const row of inserted.data ?? []) {
      nameToId.set(row.name as string, row.id as string);
    }
  }

  // 2. Build link rows.
  const linkRows: Array<Record<string, unknown>> = [];
  for (const l of payload.links) {
    const title = l.title?.trim();
    const url = l.url ? ensureProtocol(l.url.trim()) : "";
    const categoryName = l.category?.trim();
    if (!title || !url || !categoryName) continue;
    const categoryId = nameToId.get(categoryName);
    if (!categoryId) continue;
    const status: LinkStatus = l.status === "archive" ? "archive" : "live";
    linkRows.push({
      title,
      url,
      category_id: categoryId,
      sub_type: l.subType?.trim().toLowerCase() || null,
      note: l.note?.trim() || null,
      status,
      created_at: l.createdAt || undefined,
      updated_at: l.updatedAt || undefined,
    });
  }

  if (linkRows.length === 0) {
    return NextResponse.json({
      ok: true,
      imported: { categories: toInsertCategories.length, links: 0 },
      message: "No valid links found in payload",
    });
  }

  const insertedLinks = await supabase.from("links").insert(linkRows);
  if (insertedLinks.error) {
    return NextResponse.json(
      { error: insertedLinks.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    imported: {
      categories: toInsertCategories.length,
      links: linkRows.length,
    },
  });
}
