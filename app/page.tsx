import { createClient } from "@/lib/supabase/server";
import LLLBoard from "@/app/_components/lll-board";
import type { Category, LinkRow, LinkView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categoriesData }, { data: linksData }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, position")
      .order("position", { ascending: true }),
    supabase
      .from("links")
      .select(
        "id, title, url, category_id, sub_type, note, status, created_at, updated_at, created_by",
      )
      .order("updated_at", { ascending: false }),
  ]);

  const categories = (categoriesData ?? []) as Category[];
  const links = (linksData ?? []) as LinkRow[];

  const idToName = new Map(categories.map((c) => [c.id, c.name]));
  const categoryNames = categories.map((c) => c.name);

  const linkViews: LinkView[] = links.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.url,
    category: l.category_id ? (idToName.get(l.category_id) ?? "") : "",
    subType: l.sub_type ?? "",
    note: l.note ?? "",
    status: l.status,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  }));

  return (
    <LLLBoard
      categories={categoryNames}
      links={linkViews}
      userEmail={user?.email ?? null}
    />
  );
}
