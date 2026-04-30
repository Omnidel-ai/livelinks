"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Plus,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Library,
  Search,
  ChevronsUpDown,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Phone,
  Info,
} from "lucide-react";
import type { LinkView } from "@/lib/types";
import { ensureProtocol, formatDate, shortUrl } from "@/lib/format";
import {
  addCategory,
  deleteLink,
  toggleLinkStatus,
  upsertLink,
  type UpsertLinkInput,
} from "@/app/_actions/links";

const SUBTYPE_SUGGESTIONS = [
  "playbook",
  "pdf",
  "deck",
  "agreement",
  "app",
  "model",
  "doc",
  "fin model",
  "portfolio",
  "site",
  "drive folder",
  "video",
  "tool",
  "dashboard",
  "demo",
  "archive",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type View = "live" | "archive";
type CatSort = "alpha" | "age";

type Props = {
  categories: string[];
  links: LinkView[];
  userEmail: string | null;
};

export default function LLLBoard({ categories, links }: Props) {
  const [view, setView] = useState<View>("live");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LinkView | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of categories) init[c] = true;
    return init;
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const justSavedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchIncludeArchive, setSearchIncludeArchive] = useState(false);
  const [searchSubType, setSearchSubType] = useState("");
  const [categorySubTypeFilter, setCategorySubTypeFilter] = useState<Record<string, string>>({});
  const [catSort, setCatSort] = useState<CatSort>("alpha");

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!isPending && justSavedRef.current) {
      justSavedRef.current = false;
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1100);
      return () => clearTimeout(t);
    }
  }, [isPending]);

  const liveCount = links.filter((l) => l.status === "live").length;
  const archiveCount = links.filter((l) => l.status === "archive").length;

  const allSubTypes = useMemo(() => {
    const set = new Set<string>();
    for (const l of links) if (l.subType) set.add(l.subType);
    return Array.from(set).sort();
  }, [links]);

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const q = searchQuery.trim().toLowerCase();
    let pool = searchIncludeArchive
      ? links
      : links.filter((l) => l.status === "live");
    let results = pool.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        l.note.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
    if (searchSubType) {
      results = results.filter((l) => l.subType === searchSubType);
    }
    const live = results.filter((l) => l.status === "live");
    const archive = results.filter((l) => l.status === "archive");
    return { live, archive, total: results.length };
  }, [isSearching, searchQuery, searchIncludeArchive, searchSubType, links]);

  const categoriesToShow = useMemo(() => {
    const status = view === "live" ? "live" : "archive";
    const present = new Set(
      links.filter((l) => l.status === status).map((l) => l.category),
    );
    let cats = view === "archive"
      ? categories.filter((c) => present.has(c))
      : categories;

    if (catSort === "alpha") {
      cats = [...cats].sort((a, b) => a.localeCompare(b));
    } else {
      const earliest = new Map<string, string>();
      for (const l of links) {
        if (l.sourceDate) {
          const cur = earliest.get(l.category);
          if (!cur || l.sourceDate < cur) earliest.set(l.category, l.sourceDate);
        }
      }
      cats = [...cats].sort((a, b) => {
        const da = earliest.get(a) || "9999";
        const db = earliest.get(b) || "9999";
        return da.localeCompare(db);
      });
    }
    return cats;
  }, [view, categories, links, catSort]);

  const linksByCategory = useMemo(() => {
    const visible = links.filter((l) =>
      view === "live" ? l.status === "live" : l.status === "archive",
    );
    const map: Record<string, LinkView[]> = {};
    for (const c of categories) map[c] = [];
    for (const l of visible) {
      if (!map[l.category]) map[l.category] = [];
      map[l.category].push(l);
    }
    for (const c of Object.keys(map)) {
      map[c].sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      );
    }
    return map;
  }, [view, links, categories]);

  const allCollapsed = categoriesToShow.every((c) => collapsed[c]);
  const toggleAllCollapse = () => {
    const next: Record<string, boolean> = {};
    const shouldCollapse = !allCollapsed;
    for (const c of categories) next[c] = shouldCollapse;
    setCollapsed(next);
  };

  const runMutation = (fn: () => Promise<void>) => {
    justSavedRef.current = true;
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        justSavedRef.current = false;
        console.error(e);
        alert(
          e instanceof Error ? e.message : "Something went wrong saving that.",
        );
      }
    });
  };

  const handleSave = (data: UpsertLinkInput) => {
    runMutation(() => upsertLink(data));
    setModalOpen(false);
    setEditing(null);
  };

  const handleToggle = (id: string) => {
    runMutation(() => toggleLinkStatus(id));
  };

  const handleRemove = (id: string) => {
    if (
      !window.confirm(
        "Permanently remove this link?\n\nArchive is preferred. Use this only for accidental entries.",
      )
    )
      return;
    runMutation(() => deleteLink(id));
  };

  const handleAddCategory = (name: string) => {
    const n = name.trim();
    if (!n) return;
    if (categories.includes(n)) return;
    runMutation(() => addCategory(n));
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (link: LinkView) => {
    setEditing(link);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const getFilteredItems = (cat: string) => {
    const items = linksByCategory[cat] || [];
    const filter = categorySubTypeFilter[cat];
    if (!filter) return items;
    return items.filter((l) => l.subType === filter);
  };

  const getSubTypesForCategory = (cat: string) => {
    const items = linksByCategory[cat] || [];
    const set = new Set<string>();
    for (const l of items) if (l.subType) set.add(l.subType);
    return Array.from(set).sort();
  };

  return (
    <div className="lll-root min-h-screen pb-24">
      <header className="border-b paper-line">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase text-ink-soft mb-3 font-body tracking-paper">
                <span className="dot-saffron"></span>
                <span>KarmYog Link Library</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl text-ink leading-none">
                KarmYog
                <br />
                <span className="italic text-ink-soft">Link Library</span>
              </h1>
              <p className="mt-4 text-ink-soft font-body italic max-w-md">
                One place. Live links on the board, old ones at rest
                in the archives — never deleted.
              </p>
            </div>
            <button
              onClick={openAdd}
              className="lll-btn-primary inline-flex items-center gap-2 shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add link</span>
            </button>
          </div>

          <div className="mt-8 flex items-center gap-6 font-body flex-wrap">
            <button
              onClick={() => setView("live")}
              className={`tab-btn ${view === "live" ? "tab-active" : ""}`}
            >
              <span>Link Board</span>
              <span className="tab-count">{liveCount}</span>
            </button>
            <button
              onClick={() => setView("archive")}
              className={`tab-btn ${view === "archive" ? "tab-active" : ""}`}
            >
              <span>Link Archives</span>
              <span className="tab-count">{archiveCount}</span>
            </button>
            <div className="ml-auto text-xs text-ink-soft font-body italic">
              {isPending ? (
                <span>saving…</span>
              ) : savedFlash ? (
                <span className="inline-flex items-center gap-1 text-saffron">
                  <Check size={12} /> saved
                </span>
              ) : (
                <span>auto-saves</span>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="text"
                className="search-input"
                placeholder="Search links by title, URL, or note…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchSubType("");
                    setSearchIncludeArchive(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 action-btn"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {isSearching && (
              <div className="flex items-center gap-4 flex-wrap text-sm font-body">
                <label className="inline-flex items-center gap-2 text-ink-soft cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={searchIncludeArchive}
                    onChange={(e) => setSearchIncludeArchive(e.target.checked)}
                    className="accent-saffron"
                  />
                  Include archives
                </label>
                {allSubTypes.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ink-faint text-xs uppercase tracking-paper">Sub-type:</span>
                    <button
                      onClick={() => setSearchSubType("")}
                      className={`filter-pill ${!searchSubType ? "filter-pill-active" : ""}`}
                    >
                      All
                    </button>
                    {allSubTypes.map((st) => (
                      <button
                        key={st}
                        onClick={() => setSearchSubType(searchSubType === st ? "" : st)}
                        className={`filter-pill ${searchSubType === st ? "filter-pill-active" : ""}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        {isSearching && searchResults ? (
          <SearchResultsView
            results={searchResults}
            includeArchive={searchIncludeArchive}
            onToggle={handleToggle}
            onEdit={openEdit}
            onRemove={handleRemove}
            query={searchQuery}
          />
        ) : (view === "live" ? liveCount : archiveCount) === 0 ? (
          <EmptyState view={view} onAdd={openAdd} />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-8 font-body">
              <button
                onClick={toggleAllCollapse}
                className="lll-btn-secondary text-sm inline-flex items-center gap-2"
              >
                <ChevronsUpDown size={14} />
                {allCollapsed ? "Expand All" : "Collapse All"}
              </button>
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <span>Sort:</span>
                <button
                  onClick={() => setCatSort("alpha")}
                  className={`filter-pill ${catSort === "alpha" ? "filter-pill-active" : ""}`}
                >
                  A–Z
                </button>
                <button
                  onClick={() => setCatSort("age")}
                  className={`filter-pill ${catSort === "age" ? "filter-pill-active" : ""}`}
                >
                  Age
                </button>
              </div>
            </div>
            <div className="categories-grid">
              {categoriesToShow.map((cat, idx) => {
                const allItems = linksByCategory[cat] || [];
                const items = getFilteredItems(cat);
                const subTypes = getSubTypesForCategory(cat);
                if (view === "archive" && allItems.length === 0) return null;
                const isCollapsed = collapsed[cat];
                const activeFilter = categorySubTypeFilter[cat] || "";
                return (
                  <section
                    key={cat}
                    className="cat-section"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <button
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))
                      }
                      className="cat-header w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="cat-marker">
                          {isCollapsed ? (
                            <ChevronRight size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </span>
                        <h2 className="font-display text-2xl text-ink">{cat}</h2>
                        <span className="text-ink-faint font-body text-sm">
                          {allItems.length || ""}
                        </span>
                      </div>
                      {allItems.length === 0 && (
                        <span className="text-xs text-ink-faint italic font-body">
                          empty
                        </span>
                      )}
                    </button>
                    {!isCollapsed && allItems.length > 0 && (
                      <>
                        {subTypes.length > 1 && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap pl-7">
                            <button
                              onClick={() =>
                                setCategorySubTypeFilter((p) => ({ ...p, [cat]: "" }))
                              }
                              className={`filter-pill ${!activeFilter ? "filter-pill-active" : ""}`}
                            >
                              All
                            </button>
                            {subTypes.map((st) => (
                              <button
                                key={st}
                                onClick={() =>
                                  setCategorySubTypeFilter((p) => ({
                                    ...p,
                                    [cat]: activeFilter === st ? "" : st,
                                  }))
                                }
                                className={`filter-pill ${activeFilter === st ? "filter-pill-active" : ""}`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        )}
                        <ol className="mt-3">
                          {items.map((link, idx) => (
                            <LinkRow
                              key={link.id}
                              link={link}
                              index={idx + 1}
                              onToggle={() => handleToggle(link.id)}
                              onEdit={() => openEdit(link)}
                              onRemove={() => handleRemove(link.id)}
                              view={view}
                            />
                          ))}
                          {items.length === 0 && activeFilter && (
                            <li className="text-sm text-ink-faint italic font-body pl-7 py-3">
                              No {activeFilter} links in this category.
                            </li>
                          )}
                        </ol>
                      </>
                    )}
                    {!isCollapsed && allItems.length === 0 && view === "live" && (
                      <p className="mt-3 text-sm text-ink-faint italic font-body pl-7">
                        No live links here yet.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}

        <footer className="mt-24 pt-8 border-t paper-line text-center font-body italic text-ink-faint text-sm">
          <p>
            v2 · KarmYog Link Library
          </p>
        </footer>
      </main>

      {modalOpen && (
        <LinkModal
          link={editing}
          categories={categories}
          onClose={closeModal}
          onSave={handleSave}
          onAddCategory={handleAddCategory}
        />
      )}
    </div>
  );
}

/* ---------- Search Results ---------- */

function SearchResultsView({
  results,
  includeArchive,
  onToggle,
  onEdit,
  onRemove,
  query,
}: {
  results: { live: LinkView[]; archive: LinkView[]; total: number };
  includeArchive: boolean;
  onToggle: (id: string) => void;
  onEdit: (link: LinkView) => void;
  onRemove: (id: string) => void;
  query: string;
}) {
  if (results.total === 0) {
    return (
      <div className="text-center py-16 font-body text-ink-soft">
        <Search className="mx-auto mb-4 opacity-30" size={40} />
        <p className="italic">
          No links match &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {results.live.length > 0 && (
        <div>
          {includeArchive && (
            <h3 className="text-xs uppercase tracking-paper text-ink-soft font-body mb-4">
              Link Board results
              <span className="tab-count ml-2">{results.live.length}</span>
            </h3>
          )}
          <ol>
            {results.live.map((link, idx) => (
              <LinkRow
                key={link.id}
                link={link}
                index={idx + 1}
                onToggle={() => onToggle(link.id)}
                onEdit={() => onEdit(link)}
                onRemove={() => onRemove(link.id)}
                view="live"
                showCategory
              />
            ))}
          </ol>
        </div>
      )}
      {includeArchive && results.archive.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-paper text-ink-soft font-body mb-4">
            Link Archives results
            <span className="tab-count ml-2">{results.archive.length}</span>
          </h3>
          <ol>
            {results.archive.map((link, idx) => (
              <LinkRow
                key={link.id}
                link={link}
                index={idx + 1}
                onToggle={() => onToggle(link.id)}
                onEdit={() => onEdit(link)}
                onRemove={() => onRemove(link.id)}
                view="archive"
                showCategory
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------- Link Row ---------- */

function LinkRow({
  link,
  index,
  onToggle,
  onEdit,
  onRemove,
  view,
  showCategory,
}: {
  link: LinkView;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  view: View;
  showCategory?: boolean;
}) {
  const [showDesc, setShowDesc] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen]);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(ensureProtocol(link.url), "_blank", "noopener,noreferrer");
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: link.title, url: link.url }).catch(() => {});
    } else {
      setShareOpen(!shareOpen);
    }
  };

  const shareText = `${link.title} ${link.url}`;

  return (
    <li className="link-row">
      <span className="link-number">{index}.</span>
      <a
        href={ensureProtocol(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="link-row-main"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="link-title font-body">{link.title}</span>
          {link.subType && <span className="link-pill">{link.subType}</span>}
          {showCategory && (
            <span className="link-pill link-pill-cat">{link.category}</span>
          )}
        </div>
        <div className="link-meta">
          <span className="truncate">{shortUrl(link.url)}</span>
          <span className="dot-sep">·</span>
          <span className="shrink-0">{formatDate(link.updatedAt)}</span>
          {link.sourceDate && (
            <>
              <span className="dot-sep">·</span>
              <span className="shrink-0">src {formatSourceDate(link.sourceDate)}</span>
            </>
          )}
        </div>
        {link.note && <div className="link-note">{link.note}</div>}
        {link.description && (
          <div className="mt-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDesc(!showDesc);
              }}
              className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink-soft transition-colors"
            >
              <Info size={11} />
              {showDesc ? "less" : "more"}
            </button>
            {showDesc && (
              <div className="link-description">{link.description}</div>
            )}
          </div>
        )}
      </a>
      <div className="link-actions" ref={shareRef}>
        <button
          onClick={handleShare}
          className="action-btn"
          title="Share"
        >
          <Share2 size={14} />
        </button>
        {shareOpen && (
          <div className="share-popover">
            <a
              href={`mailto:?subject=${encodeURIComponent(link.title)}&body=${encodeURIComponent(link.url)}`}
              className="share-option"
              title="Email"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={14} />
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-option"
              title="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle size={14} />
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(link.url)}&text=${encodeURIComponent(link.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-option"
              title="Telegram"
              onClick={(e) => e.stopPropagation()}
            >
              <Send size={14} />
            </a>
            <a
              href={`sms:?body=${encodeURIComponent(shareText)}`}
              className="share-option"
              title="SMS"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={14} />
            </a>
          </div>
        )}
        <button
          onClick={handleOpen}
          className="action-btn"
          title="Open in new tab"
        >
          <ExternalLink size={14} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="action-btn"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          className="action-btn"
          title={view === "live" ? "Move to Archives" : "Restore to Board"}
        >
          {view === "live" ? (
            <Archive size={14} />
          ) : (
            <ArchiveRestore size={14} />
          )}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="action-btn action-danger"
          title="Permanently remove"
        >
          <X size={14} />
        </button>
      </div>
    </li>
  );
}

/* ---------- Empty State ---------- */

function EmptyState({ view, onAdd }: { view: View; onAdd: () => void }) {
  if (view === "archive") {
    return (
      <div className="text-center py-20 font-body text-ink-soft">
        <Library className="mx-auto mb-4 opacity-30" size={40} />
        <p className="italic">
          The archives are empty. Old versions will rest here when moved.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-20 font-body">
      <Library
        className="mx-auto mb-4 text-ink-soft opacity-40"
        size={48}
      />
      <p className="text-ink italic font-display text-2xl mb-2">
        Your library is empty.
      </p>
      <p className="text-ink-soft mb-6">
        Add the first link to get started.
      </p>
      <button
        onClick={onAdd}
        className="lll-btn-primary inline-flex items-center gap-2"
      >
        <Plus size={16} /> Add first link
      </button>
    </div>
  );
}

/* ---------- Modal ---------- */

function LinkModal({
  link,
  categories,
  onClose,
  onSave,
  onAddCategory,
}: {
  link: LinkView | null;
  categories: string[];
  onClose: () => void;
  onSave: (data: UpsertLinkInput) => void;
  onAddCategory: (name: string) => void;
}) {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const [category, setCategory] = useState(
    link?.category || categories[0] || "",
  );
  const [subType, setSubType] = useState(link?.subType || "");
  const [note, setNote] = useState(link?.note || "");
  const [description, setDescription] = useState(link?.description || "");
  const [sourceMonth, setSourceMonth] = useState(() => {
    if (link?.sourceDate) return new Date(link.sourceDate).getMonth() + 1;
    return 0;
  });
  const [sourceYear, setSourceYear] = useState(() => {
    if (link?.sourceDate) return new Date(link.sourceDate).getFullYear();
    return 0;
  });
  const [newCategory, setNewCategory] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const submit = () => {
    if (!title.trim()) {
      setError("Title is needed.");
      return;
    }
    if (!url.trim()) {
      setError("URL is needed.");
      return;
    }
    let cat = category;
    if (showNewCat && newCategory.trim()) {
      cat = newCategory.trim();
      onAddCategory(cat);
    }
    if (!cat) {
      setError("Pick or add a category.");
      return;
    }

    let sourceDate: string | undefined;
    if (sourceMonth && sourceYear) {
      const mm = String(sourceMonth).padStart(2, "0");
      sourceDate = `${sourceYear}-${mm}-15`;
    }

    onSave({
      id: link?.id,
      title: title.trim(),
      url: ensureProtocol(url.trim()),
      category: cat,
      subType: subType.trim().toLowerCase(),
      note: note.trim(),
      description: description.trim(),
      sourceDate,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-2xl text-ink">
            {link ? "Edit link" : "Add a link"}
          </h3>
          <button onClick={onClose} className="action-btn">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 font-body">
          <Field label="Title">
            <input
              ref={titleRef}
              className="lll-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rangamati Final Playbook"
            />
          </Field>
          <Field label="URL">
            <input
              className="lll-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Category">
            {!showNewCat ? (
              <div className="flex gap-2">
                <select
                  className="lll-input flex-1"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCat(true)}
                  className="lll-btn-secondary text-sm shrink-0"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="lll-input flex-1"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCat(false);
                    setNewCategory("");
                  }}
                  className="lll-btn-secondary text-sm shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </Field>
          <Field label="Sub-type">
            <input
              className="lll-input"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              placeholder="playbook · pdf · deck · agreement · app · model …"
              list="subtype-suggestions"
            />
            <datalist id="subtype-suggestions">
              {SUBTYPE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Source Date (optional)">
            <div className="flex gap-2">
              <select
                className="lll-input flex-1"
                value={sourceMonth}
                onChange={(e) => setSourceMonth(Number(e.target.value))}
              >
                <option value={0}>Month…</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="lll-input flex-1"
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
              >
                <option value={0}>Year…</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Note (optional)">
            <textarea
              className="lll-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One-line context for future-you"
            />
          </Field>
          <Field label="Description (optional — expandable detail)">
            <textarea
              className="lll-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Longer description, hidden by default, shown on demand"
            />
          </Field>
          {error && (
            <div className="text-sm text-saffron-deep italic font-body">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="lll-btn-secondary">
            Cancel
          </button>
          <button onClick={submit} className="lll-btn-primary">
            {link ? "Save changes" : "Add to Link Board"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase text-ink-soft mb-1.5 font-body tracking-quill">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatSourceDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${MONTHS[d.getMonth()]?.slice(0, 3)} ${d.getFullYear()}`;
}
