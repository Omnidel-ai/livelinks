"use client";

import { useRef, useState, useEffect } from "react";
import { ExternalLink, Copy, Sparkles, Star, Archive, Edit2, MoreHorizontal, X } from "lucide-react";
import type { LinkView } from "@/lib/types";
import { ensureProtocol, shortUrl } from "@/lib/format";

type Props = {
  links: LinkView[];
  onCopy: (url: string) => void;
  onToggleFeatured: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (link: LinkView) => void;
  onRemove: (id: string) => void;
};

export default function RecentlyFeatured({ links, onCopy, onToggleFeatured, onArchive, onEdit, onRemove }: Props) {
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
          <FeaturedCard
            key={link.id}
            link={link}
            orgColor={orgColor(link.orgSlug)}
            orgLabel={orgLabel(link.orgSlug)}
            onCopy={onCopy}
            onToggleFeatured={onToggleFeatured}
            onArchive={onArchive}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({
  link,
  orgColor,
  orgLabel,
  onCopy,
  onToggleFeatured,
  onArchive,
  onEdit,
  onRemove,
}: {
  link: LinkView;
  orgColor: string;
  orgLabel: string;
  onCopy: (url: string) => void;
  onToggleFeatured: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (link: LinkView) => void;
  onRemove: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      className="featured-card"
      style={{
        display: "flex",
        flexDirection: "column" as const,
        padding: "16px 18px",
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderTopWidth: "4px",
        borderTopStyle: "solid",
        borderTopColor: orgColor,
        borderRadius: "8px",
        textDecoration: "none",
        color: "inherit",
        boxShadow: "0 2px 8px rgba(31,26,20,0.06)",
        position: "relative",
      }}
    >
      <div className="featured-card-top">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {orgLabel && (
            <span
              className="featured-org-pill"
              style={{ color: orgColor, borderColor: orgColor }}
            >
              {orgLabel}
            </span>
          )}
          {link.subType && <span className="link-pill">{link.subType}</span>}
        </div>
        {/* Star — always visible on card */}
        <button
          className="action-btn"
          title={link.featured ? "Unfeature" : "Feature"}
          style={link.featured ? { color: "var(--saffron)" } : undefined}
          onClick={() => onToggleFeatured(link.id)}
        >
          <Star size={15} fill={link.featured ? "var(--saffron)" : "none"} />
        </button>
      </div>

      <a
        href={ensureProtocol(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ flex: 1, marginBottom: 12, textDecoration: "none", color: "inherit" }}
      >
        <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25, marginBottom: 4 }}>
          {link.title}
        </h3>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shortUrl(link.url)}
        </div>
        {link.note && (
          <p className="featured-card-note">{link.note}</p>
        )}
      </a>

      <div className="featured-card-footer">
        <span style={{ fontSize: 13, color: "var(--saffron)", fontWeight: 600, fontFamily: "var(--font-newsreader), serif" }}>
          {new Date(link.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <div className="featured-card-actions">
          <button className="featured-action" title="Open" onClick={() => window.open(ensureProtocol(link.url), "_blank", "noopener,noreferrer")}>
            <ExternalLink size={14} />
          </button>
          <button className="featured-action" title="Copy URL" onClick={() => onCopy(link.url)}>
            <Copy size={14} />
          </button>
          <div className="relative" ref={menuRef}>
            <button className="featured-action" title="More" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="link-menu" style={{ bottom: "100%", top: "auto", marginBottom: 4 }}>
                <button className="link-menu-item" onClick={() => { onEdit(link); setMenuOpen(false); }}>
                  <Edit2 size={12} /> Edit
                </button>
                <button className="link-menu-item" onClick={() => { onArchive(link.id); setMenuOpen(false); }}>
                  <Archive size={12} /> Archive
                </button>
                <button className="link-menu-item link-menu-danger" onClick={() => { onRemove(link.id); setMenuOpen(false); }}>
                  <X size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
