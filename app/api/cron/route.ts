import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectOrg(projectName: string): string {
  if (/vatika|goa|kaarigar|mgpc|karmyog|garden|planter|module.?pric/i.test(projectName)) return "karmyog";
  if (/omnidel|dpgp|aim|election|hr|payroll|maya|livelinks|booth/i.test(projectName)) return "omnidel";
  if (/rare|rangamati|hotel|booking|raag/i.test(projectName)) return "rare";
  return "uncategorised";
}

async function fetchVercelDeployments(token: string, since: number) {
  const url = `https://api.vercel.com/v6/deployments?since=${since}&state=READY&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Vercel API error: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data.deployments || [];
}

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  deployments: Array<{ project_name: string; project_url: string; org_slug: string }>,
) {
  if (deployments.length === 0) return;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lines = deployments.map((d) => {
    const orgLabel = d.org_slug === "karmyog" ? "vatika.ai"
      : d.org_slug === "omnidel" ? "omnidel.ai"
      : d.org_slug === "rare" ? "RARE India"
      : "uncategorised";
    return `• ${d.project_name} [${orgLabel}]\n  ${d.project_url}`;
  });

  const message = `🚀 Today's deployments (${today}):\n\n${lines.join("\n\n")}\n\nView all → https://livelinks-taupe.vercel.app`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const tokens: string[] = [];
  if (process.env.VERCEL_API_TOKEN) tokens.push(process.env.VERCEL_API_TOKEN);
  if (process.env.VERCEL_API_TOKEN_TEAM) tokens.push(process.env.VERCEL_API_TOKEN_TEAM);

  if (tokens.length === 0) {
    return NextResponse.json({ error: "No Vercel API tokens configured" }, { status: 500 });
  }

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const allDeployments: Array<Record<string, unknown>> = [];

  for (const token of tokens) {
    const deps = await fetchVercelDeployments(token, since);
    allDeployments.push(...deps);
  }

  const seen = new Set<string>();
  const unique = allDeployments.filter((d) => {
    const id = d.uid as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const toUpsert = unique.map((d) => {
    const projectName = (d.name as string) || "unknown";
    const url = d.url
      ? `https://${d.url}`
      : `https://${projectName}.vercel.app`;
    return {
      id: d.uid as string,
      project_name: projectName,
      project_url: url,
      branch: (d.meta as Record<string, unknown>)?.githubCommitRef as string || null,
      commit_message: (d.meta as Record<string, unknown>)?.githubCommitMessage as string || null,
      created_at: new Date((d.created as number) || Date.now()).toISOString(),
      status: (d.state as string) || "READY",
      org_slug: detectOrg(projectName),
      raw_meta: d,
    };
  });

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("vercel_deployments")
      .upsert(toUpsert, { onConflict: "id" });
    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat && toUpsert.length > 0) {
    const projectsSeen = new Set<string>();
    const dedupedByProject = toUpsert.filter((d) => {
      if (projectsSeen.has(d.project_name)) return false;
      projectsSeen.add(d.project_name);
      return true;
    });
    await sendTelegramNotification(telegramToken, telegramChat, dedupedByProject);
  }

  return NextResponse.json({
    synced: toUpsert.length,
    projects: [...new Set(toUpsert.map((d) => d.project_name))],
    timestamp: new Date().toISOString(),
  });
}
