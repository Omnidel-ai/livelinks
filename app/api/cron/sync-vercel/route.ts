import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  createdAt: number;
  updatedAt: number;
  targets?: Record<
    string,
    { alias?: string[]; url?: string } | undefined
  > | null;
  link?: { type: string; repo: string } | null;
};

type Categorisation = {
  title: string;
  url: string;
  category: string;
  subType: string;
  note: string;
};

async function fetchAllVercelProjects(token: string): Promise<VercelProject[]> {
  const teamId = process.env.VERCEL_TEAM_ID ?? "";
  const teamParam = teamId ? `&teamId=${teamId}` : "";
  const all: VercelProject[] = [];
  let url = `https://api.vercel.com/v9/projects?limit=100${teamParam}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    all.push(...(data.projects ?? []));

    const next = data.pagination?.next;
    url = next
      ? `https://api.vercel.com/v9/projects?limit=100${teamParam}&until=${next}`
      : "";
  }
  return all;
}

function projectUrl(p: VercelProject): string {
  const prod = p.targets?.production;
  if (prod?.alias?.length) return `https://${prod.alias[0]}`;
  if (prod?.url) return `https://${prod.url}`;
  return `https://${p.name}.vercel.app`;
}

async function categoriseWithClaude(
  newProjects: { name: string; url: string; framework: string | null }[],
  existingCategories: string[],
  sampleLinks: { title: string; category: string }[],
): Promise<Categorisation[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: "https://api.anthropic.com",
  });

  const prompt = `You are a librarian categorising new web projects into an existing link library.

Existing categories: ${JSON.stringify(existingCategories)}

Here are some example links already in the library to understand what goes where:
${sampleLinks
  .slice(0, 30)
  .map((l) => `- "${l.title}" → ${l.category}`)
  .join("\n")}

Now categorise these NEW projects. For each, pick the best existing category. If none fit well, use "Uncategorised".
Also assign a subType (one word: app, dashboard, site, docs, api, tool, demo, deck, model) and write a brief note (under 15 words).

Return ONLY valid JSON — an array of objects with keys: title, url, category, subType, note.

New projects to categorise:
${newProjects.map((p) => `- name: "${p.name}", url: "${p.url}", framework: ${p.framework ?? "unknown"}`).join("\n")}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as Categorisation[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  if (!vercelToken) {
    return NextResponse.json(
      { error: "VERCEL_TOKEN not configured" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();

  // 1. Fetch all Vercel projects
  const projects = await fetchAllVercelProjects(vercelToken);

  // 2. Fetch all existing link URLs from Supabase
  const { data: existingLinks } = await supabase
    .from("links")
    .select("url");
  const existingUrls = new Set(
    (existingLinks ?? []).map((l) => {
      const u = (l.url as string).toLowerCase().replace(/\/+$/, "");
      return u;
    }),
  );

  // 3. Diff — find projects not already in the DB
  const newProjects = projects.filter((p) => {
    const url = projectUrl(p).toLowerCase().replace(/\/+$/, "");
    return !existingUrls.has(url);
  });

  if (newProjects.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No new projects found",
      total: projects.length,
      existing: existingUrls.size,
      added: 0,
    });
  }

  // 4. Fetch existing categories + sample links for AI context
  const [{ data: categories }, { data: sampleLinksData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, position")
      .order("position", { ascending: true }),
    supabase
      .from("links")
      .select("title, category_id")
      .limit(50),
  ]);

  const catList = (categories ?? []) as { id: string; name: string; position: number }[];
  const catNames = catList.map((c) => c.name);
  const catMap = new Map(catList.map((c) => [c.id, c.name]));

  const sampleLinks = (sampleLinksData ?? []).map((l) => ({
    title: l.title as string,
    category: catMap.get(l.category_id as string) ?? "Uncategorised",
  }));

  // 5. AI categorisation
  const categorised = await categoriseWithClaude(
    newProjects.map((p) => ({
      name: p.name,
      url: projectUrl(p),
      framework: p.framework,
    })),
    catNames,
    sampleLinks,
  );

  if (categorised.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "AI categorisation returned no results",
      newProjects: newProjects.length,
    });
  }

  // 6. Ensure all categories exist (including "Uncategorised" if AI used it)
  const nameToId = new Map(catList.map((c) => [c.name, c.id]));
  let maxPos = Math.max(...catList.map((c) => c.position), 0);

  const newCatNames = [
    ...new Set(
      categorised
        .map((c) => c.category)
        .filter((name) => !nameToId.has(name)),
    ),
  ];

  if (newCatNames.length > 0) {
    const toInsert = newCatNames.map((name) => ({
      name,
      position: (maxPos += 10),
    }));
    const { data: inserted } = await supabase
      .from("categories")
      .insert(toInsert)
      .select("id, name");
    for (const row of inserted ?? []) {
      nameToId.set(row.name as string, row.id as string);
    }
  }

  // 7. Insert new links
  const linkRows = categorised
    .map((c) => {
      const categoryId = nameToId.get(c.category);
      if (!categoryId) return null;
      return {
        title: c.title,
        url: c.url,
        category_id: categoryId,
        sub_type: c.subType?.toLowerCase() || null,
        note: c.note || null,
        status: "live" as const,
      };
    })
    .filter(Boolean);

  const { error: insertErr } = await supabase.from("links").insert(linkRows);
  if (insertErr) {
    return NextResponse.json(
      { ok: false, error: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    total: projects.length,
    existing: existingUrls.size,
    added: linkRows.length,
    newCategories: newCatNames,
    links: categorised.map((c) => `${c.title} → ${c.category}`),
  });
}
