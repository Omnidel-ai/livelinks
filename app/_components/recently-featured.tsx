"use client";

import { ExternalLink, Copy, Sparkles, Star } from "lucide-react";
import type { LinkView } from "@/lib/types";
import { ensureProtocol, formatDate, shortUrl } from "@/lib/format";

type Props = {
  links: LinkView[];
  onCopy: (url: string) => void;
};

export default function RecentlyFeatured({ links, onCopy }: Props) {
  if (links.length === 0) return null;

  const orgColor = (slug: string) => {
    if (slug === "karmyog") return "#2d6a4f";
    if (slug === "omnidel") return "#1d3557";
    if (slug === "rare") return "#7b2d42";
    return "var(--ink-faint)";
  };

  const orgLabel = (slug: string) => {
    if (slug === "karmyog") return "VATIKA.AI";
    if (slug === "omnidel") return "OMNIDEL.AI";
    if (slug === "rare") return "RARE INDIA";
    return "";
  };

  return (
    <section className="featured-section">
      <div className="featured-header">
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-saffron" />
          <h2 className="font-display text-xl text-ink tracking-wide">
            Recently Featured
          </h2>
          <span className="text-sm text-ink-faint font-body">
            {links.length} latest
          </span>
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {links.map((link) => (
          <a
            key={link.id}
            href={ensureProtocol(link.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="featured-card"
            style={{
              borderTop: `4px solid ${orgColor(link.orgSlug)}`,
              display: "flex",
              flexDirection: "column" as const,
              padding: "16px 18px",
              background: "var(--paper)",
              border: "1px solid var(--paper-line)",
              borderTopWidth: "4px",
              borderTopStyle: "solid",
              borderTopColor: orgColor(link.orgSlug),
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              boxShadow: "0 2px 8px rgba(31,26,20,0.06)",
            }}
          >
            <div className="featured-card-top">
              {link.orgSlug && (
                <span
                  className="featured-org-pill"
                  style={{
                    color: orgColor(link.orgSlug),
                    borderColor: orgColor(link.orgSlug),
                  }}
                >
                  {orgLabel(link.orgSlug)}
                </span>
              )}
              {link.subType && (
                <span className="link-pill">{link.subType}</span>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: 12 }}>
              <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {link.featured && <Star size={16} fill="var(--saffron)" color="var(--saffron)" style={{ flexShrink: 0 }} />}
                {link.title}
              </h3>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {shortUrl(link.url)}
              </div>
              {link.note && (
                <p className="featured-card-note">{link.note}</p>
              )}
            </div>

            <div className="featured-card-footer">
              <span style={{ fontSize: 13, color: "var(--saffron)", fontWeight: 600, fontFamily: "var(--font-newsreader), serif" }}>
                {new Date(link.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <div className="featured-card-actions">
                <button
                  className="featured-action"
                  title="Copy URL"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopy(link.url);
                  }}
                >
                  <Copy size={14} />
                </button>
                <span className="featured-action">
                  <ExternalLink size={14} />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
