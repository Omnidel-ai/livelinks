import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic();

type Message = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT_PREFIX = `You are Sayani, the librarian of the KarmYog Link Library. You are warm, knowledgeable, and helpful — like a real librarian who knows every book on every shelf.

Your personality:
- You speak with gentle confidence, like someone who genuinely loves organizing knowledge
- You're concise but thorough — never rambling, but never leaving someone without what they need
- You occasionally use library metaphors naturally (not forced)
- You address people warmly but professionally
- When you find a great match for someone's query, you show genuine enthusiasm
- You know Bengali culture and KarmYog's mission (sustainable living, urban gardening, biophilic design)

Your capabilities:
- You know every link in the library (provided below as context)
- You can help people find links by topic, category, sub-type, or keyword
- You can explain what a link is about based on its title, note, and category
- You can suggest related links when someone asks about a topic
- You can compare links or summarize what's available in a category
- When sharing a link, always include the full URL so it's clickable

When someone asks for a link, format it clearly:
**Title** — description/note
URL

If multiple results match, present them as a numbered list.

If you genuinely don't know or the link library doesn't have what they need, say so honestly and suggest what category might be worth exploring.

Here is the complete library you manage:

`;

async function buildSystemPrompt(): Promise<string> {
  const supabase = createAdminClient();

  const [{ data: categories }, { data: links }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, position")
      .order("position", { ascending: true }),
    supabase
      .from("links")
      .select("id, title, url, category_id, sub_type, note, description, status")
      .order("updated_at", { ascending: false }),
  ]);

  const catMap = new Map<string, string>();
  for (const c of categories ?? []) {
    catMap.set(c.id as string, c.name as string);
  }

  let context = "";
  const catNames = (categories ?? []).map((c) => c.name as string);

  for (const catName of catNames) {
    const catLinks = (links ?? []).filter(
      (l) => catMap.get(l.category_id as string) === catName,
    );
    if (catLinks.length === 0) continue;

    context += `\n## ${catName} (${catLinks.length} links)\n`;
    for (const l of catLinks) {
      const status = l.status === "archive" ? " [ARCHIVED]" : "";
      const subType = l.sub_type ? ` [${l.sub_type}]` : "";
      const note = l.note ? ` — ${l.note}` : "";
      const desc = l.description ? `\n  Description: ${l.description}` : "";
      context += `- ${l.title}${subType}${status}${note}\n  ${l.url}${desc}\n`;
    }
  }

  return SYSTEM_PROMPT_PREFIX + context;
}

export async function POST(request: NextRequest) {
  let body: { messages: Message[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const systemPrompt = await buildSystemPrompt();

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
