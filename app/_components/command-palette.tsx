"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, ExternalLink, Copy, X } from "lucide-react";
import type { LinkView, Organization } from "@/lib/types";
import { ensureProtocol, shortUrl } from "@/lib/format";

type Props = {
  links: LinkView[];
  categories: string[];
  organizations: Organization[];
  onClose: () => void;
  onCopy: (url: string) => void;
};

export default function CommandPalette({
  links,
  categories,
  organizations,
  onClose,
  onCopy,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(links.filter((l) => l.status === "live"), {
        keys: [
          { name: "title", weight: 3 },
          { name: "url", weight: 2 },
          { name: "category", weight: 1.5 },
          { name: "subType", weight: 1 },
          { name: "note", weight: 1 },
          { name: "description", weight: 0.5 },
        ],
        threshold: 0.35,
        includeScore: true,
      }),
    [links],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query.trim(), { limit: 12 }).map((r) => r.item);
  }, [query, fuse]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        if (e.ctrlKey || e.metaKey) {
          onCopy(results[selectedIndex].url);
        } else {
          window.open(ensureProtocol(results[selectedIndex].url), "_blank", "noopener,noreferrer");
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selectedIndex, onClose, onCopy]);

  useEffect(() => {
    const selected = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const orgColor = (slug: string) =>
    organizations.find((o) => o.slug === slug)?.color || "var(--ink-faint)";

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-card" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <Search size={16} className="text-ink-faint shrink-0" />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search or jump..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="action-btn">
            <X size={14} />
          </button>
        </div>

        <div className="palette-results" ref={listRef}>
          {!query.trim() && (
            <div className="palette-hint">
              Type to search across all {links.filter((l) => l.status === "live").length} links
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="palette-hint">
              No links found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((link, i) => (
            <button
              key={link.id}
              data-index={i}
              className={`palette-result ${i === selectedIndex ? "palette-result-active" : ""}`}
              onClick={() => {
                window.open(ensureProtocol(link.url), "_blank", "noopener,noreferrer");
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div
                className="palette-result-border"
                style={{ background: orgColor(link.orgSlug) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="palette-result-title">{link.title}</span>
                  {link.subType && (
                    <span className="link-pill text-[9px]">{link.subType}</span>
                  )}
                  <span className="text-xs text-ink-faint">{link.category}</span>
                </div>
                <div className="text-xs text-ink-soft mt-0.5 truncate">
                  {shortUrl(link.url)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="action-btn"
                  title="Copy URL (Ctrl+Enter)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(link.url);
                  }}
                >
                  <Copy size={12} />
                </button>
                <ExternalLink size={12} className="text-ink-faint" />
              </div>
            </button>
          ))}

          {query.trim() && (
            <div className="palette-footer">
              <span className="text-ink-faint text-xs">
                ↑↓ navigate · Enter open · ⌘Enter copy · Esc close
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
