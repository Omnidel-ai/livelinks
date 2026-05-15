import { createAdminClient } from "@/lib/supabase/admin";
import LiveLinksApp from "@/app/_components/livelinks-app";
import type { Category, LinkRow, LinkView, Organization, VercelDeployment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createAdminClient();

  const [
    { data: orgsData },
    { data: categoriesData },
    { data: linksData },
    { data: deploymentsData },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, color, description, position")
      .order("position", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, position, org_id")
      .order("position", { ascending: true }),
    supabase
      .from("links")
      .select(
        "id, title, url, category_id, sub_type, note, description, source_date, status, created_at, updated_at, created_by",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("vercel_deployments")
      .select("id, project_name, project_url, branch, commit_message, created_at, status, org_slug, link_id")
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const organizations = (orgsData ?? []) as Organization[];
  const categories = (categoriesData ?? []) as Category[];
  const links = (linksData ?? []) as LinkRow[];
  const deployments = (deploymentsData ?? []) as VercelDeployment[];

  const idToName = new Map(categories.map((c) => [c.id, c.name]));
  const catToOrg = new Map<string, Organization>();
  for (const cat of categories) {
    if (cat.org_id) {
      const org = organizations.find((o) => o.id === cat.org_id);
      if (org) catToOrg.set(cat.name, org);
    }
  }

  const linkViews: LinkView[] = links.map((l) => {
    const catName = l.category_id ? (idToName.get(l.category_id) ?? "") : "";
    const org = catToOrg.get(catName);
    return {
      id: l.id,
      title: l.title,
      url: l.url,
      category: catName,
      orgSlug: org?.slug ?? "",
      orgColor: org?.color ?? "#c8651e",
      subType: l.sub_type ?? "",
      note: l.note ?? "",
      description: l.description ?? "",
      sourceDate: l.source_date ?? "",
      status: l.status,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  });

  const categoryNames = categories.map((c) => c.name);

  return (
    <LiveLinksApp
      organizations={organizations}
      categories={categoryNames}
      categoryOrgs={Object.fromEntries(
        categories
          .filter((c) => c.org_id)
          .map((c) => {
            const org = organizations.find((o) => o.id === c.org_id);
            return [c.name, org?.slug ?? ""];
          }),
      )}
      links={linkViews}
      deployments={deployments}
    />
  );
}
