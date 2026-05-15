"use client";

import { useState, useEffect, useCallback } from "react";
import type { Category, LinkView, Organization, VercelDeployment } from "@/lib/types";
import Sidebar from "./sidebar";
import CommandPalette from "./command-palette";
import RecentlyDeployed from "./recently-deployed";
import RecentlyFeatured from "./recently-featured";
import LinkBoard from "./link-board";
import SayaniChat from "./sayani-chat";
import AdminPanel from "./admin-panel";
import { Toaster, toast } from "sonner";
import {
  Plus,
  Search,
  Check,
  Menu,
  X,
  Settings,
} from "lucide-react";

type Props = {
  organizations: Organization[];
  categories: string[];
  rawCategories: Category[];
  categoryOrgs: Record<string, string>;
  links: LinkView[];
  deployments: VercelDeployment[];
};

export default function LiveLinksApp({
  organizations,
  categories,
  rawCategories,
  categoryOrgs,
  links,
  deployments,
}: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Copied!", { duration: 2000 });
    });
  }, []);

  const handleCategoryClick = useCallback((cat: string) => {
    setActiveCategory(cat);
    setActiveOrg(null);
    setSidebarOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`cat-${cat.replace(/\s+/g, "-")}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, []);

  const handleOrgClick = useCallback((slug: string) => {
    setActiveOrg(slug);
    setActiveCategory(null);
    setSidebarOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`org-${slug}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, []);

  const handleShowAll = useCallback(() => {
    setActiveCategory(null);
    setActiveOrg(null);
  }, []);

  const orgForCategory = (cat: string) => categoryOrgs[cat] || "";

  const orgGroups = organizations.map((org) => {
    const orgCats = categories.filter((c) => orgForCategory(c) === org.slug);
    const orgLinks = links.filter((l) => l.status === "live" && l.orgSlug === org.slug);
    return {
      org,
      categories: orgCats.map((name) => ({
        name,
        count: links.filter((l) => l.status === "live" && l.category === name).length,
      })),
      totalLinks: orgLinks.length,
    };
  });

  const uncategorizedCats = categories.filter((c) => !orgForCategory(c));
  const liveCount = links.filter((l) => l.status === "live").length;
  const archiveCount = links.filter((l) => l.status === "archive").length;

  return (
    <div className="lll-root min-h-screen flex flex-col">
      {/* ── HEADER ── */}
      <header className="lll-header">
        <div className="lll-header-inner">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="action-btn lg:hidden"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <span className="dot-saffron" />
              <span className="font-display text-sm tracking-paper uppercase text-ink-soft hidden sm:inline">
                KarmYog Link Library
              </span>
            </div>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="lll-search-trigger"
          >
            <Search size={14} className="text-ink-faint" />
            <span className="text-ink-faint">Search links...</span>
            <kbd className="lll-kbd">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdminOpen(true)}
              className="action-btn"
              title="Admin"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent("lll:open-add-modal");
                window.dispatchEvent(event);
              }}
              className="lll-btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Add link</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[52px]">
        {/* ── SIDEBAR ── */}
        <Sidebar
          orgGroups={orgGroups}
          uncategorizedCats={uncategorizedCats.map((name) => ({
            name,
            count: links.filter((l) => l.status === "live" && l.category === name).length,
          }))}
          liveCount={liveCount}
          archiveCount={archiveCount}
          activeCategory={activeCategory}
          activeOrg={activeOrg}
          isOpen={sidebarOpen}
          onCategoryClick={handleCategoryClick}
          onOrgClick={handleOrgClick}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:ml-[220px]">
          {(activeCategory || activeOrg) && (
            <button
              onClick={handleShowAll}
              className="lll-btn-secondary text-xs mb-4 inline-flex items-center gap-1"
            >
              ← Show all
            </button>
          )}

          {/* Recently Featured */}
          {!activeCategory && !activeOrg && (
            <RecentlyFeatured
              links={links
                .filter((l) => l.status === "live")
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)}
              onCopy={handleCopyUrl}
            />
          )}

          {/* Recently Deployed */}
          {deployments.length > 0 && !activeCategory && !activeOrg && (
            <RecentlyDeployed
              deployments={deployments}
              linkUrls={new Set(links.map((l) => {
                try { return new URL(l.url).hostname; } catch { return l.url; }
              }))}
              onCopy={handleCopyUrl}
            />
          )}

          {/* Link Board */}
          <LinkBoard
            organizations={organizations}
            categories={categories}
            categoryOrgs={categoryOrgs}
            links={links}
            activeCategory={activeCategory}
            activeOrg={activeOrg}
            onCopy={handleCopyUrl}
          />
        </main>
      </div>

      <SayaniChat />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--ink)",
            color: "var(--paper)",
            fontFamily: "var(--font-newsreader), serif",
            border: "none",
          },
        }}
      />
      {adminOpen && (
        <AdminPanel
          organizations={organizations}
          categories={rawCategories}
          links={links}
          onClose={() => setAdminOpen(false)}
        />
      )}
      {paletteOpen && (
        <CommandPalette
          links={links}
          categories={categories}
          organizations={organizations}
          onClose={() => setPaletteOpen(false)}
          onCopy={handleCopyUrl}
        />
      )}
    </div>
  );
}
