"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Star, Clock, Archive } from "lucide-react";
import type { OrgGroup } from "@/lib/types";

type Props = {
  orgGroups: OrgGroup[];
  uncategorizedCats: { name: string; count: number }[];
  liveCount: number;
  archiveCount: number;
  activeCategory: string | null;
  activeOrg: string | null;
  isOpen: boolean;
  onCategoryClick: (cat: string) => void;
  onOrgClick: (slug: string) => void;
  onClose: () => void;
};

export default function Sidebar({
  orgGroups,
  uncategorizedCats,
  liveCount,
  archiveCount,
  activeCategory,
  activeOrg,
  isOpen,
  onCategoryClick,
  onOrgClick,
  onClose,
}: Props) {
  const [collapsedOrgs, setCollapsedOrgs] = useState<Record<string, boolean>>({});

  const toggleOrg = (slug: string) => {
    setCollapsedOrgs((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const content = (
    <nav className="sidebar-nav">
      <div className="sidebar-section">
        <div className="sidebar-total">
          <span className="text-ink-soft text-xs uppercase tracking-paper">All Links</span>
          <span className="sidebar-count">{liveCount}</span>
        </div>
      </div>

      {orgGroups.map(({ org, categories, totalLinks }) => (
        <div key={org.slug} className="sidebar-section">
          <button
            className="sidebar-org-header"
            onClick={() => toggleOrg(org.slug)}
          >
            <div className="flex items-center gap-2">
              <span
                className="sidebar-org-dot"
                style={{ background: org.color }}
              />
              <span className="sidebar-org-name">{org.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="sidebar-count">{totalLinks}</span>
              {collapsedOrgs[org.slug] ? (
                <ChevronRight size={12} className="text-ink-faint" />
              ) : (
                <ChevronDown size={12} className="text-ink-faint" />
              )}
            </div>
          </button>
          {!collapsedOrgs[org.slug] && (
            <div className="sidebar-cat-list">
              {categories.map(({ name, count }) => (
                <button
                  key={name}
                  className={`sidebar-cat-item ${activeCategory === name ? "sidebar-cat-active" : ""}`}
                  onClick={() => onCategoryClick(name)}
                  style={
                    count === 0
                      ? { opacity: 0.4 }
                      : undefined
                  }
                >
                  <span className="truncate">{name}</span>
                  <span className="sidebar-count">{count || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {uncategorizedCats.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-org-header" style={{ cursor: "default" }}>
            <div className="flex items-center gap-2">
              <span
                className="sidebar-org-dot"
                style={{ background: "var(--ink-faint)" }}
              />
              <span className="sidebar-org-name">Other</span>
            </div>
          </div>
          <div className="sidebar-cat-list">
            {uncategorizedCats.map(({ name, count }) => (
              <button
                key={name}
                className={`sidebar-cat-item ${activeCategory === name ? "sidebar-cat-active" : ""}`}
                onClick={() => onCategoryClick(name)}
              >
                <span className="truncate">{name}</span>
                <span className="sidebar-count">{count || ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop">
        {content}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-mobile-overlay" onClick={onClose}>
          <aside
            className="sidebar-mobile"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
