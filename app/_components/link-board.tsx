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
  Copy,
  MoreHorizontal,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Phone,
  Info,
} from "lucide-react";
import type { LinkView, Organization } from "@/lib/types";
import { ensureProtocol, formatDate, shortUrl } from "@/lib/format";
import { toast } from "sonner";
import {
  addCategory,
  deleteLink,
  toggleLinkStatus,
  upsertLink,
  type UpsertLinkInput,
} from "@/app/_actions/links";

const SUBTYPE_SUGGESTIONS = [
  "playbook", "pdf", "deck", "agreement", "app", "model",
  "doc", "fin model", "portfolio", "site", "drive folder",
  "video", "tool", "dashboard", "demo", "archive",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  organizations: Organization[];
  categories: string[];
  categoryOrgs: Record<string, string>;
  links: LinkView[];
  activeCategory: string | null;
  activeOrg: string | null;
  onCopy: (url: string) => void;
};

export default function LinkBoard({
  organizations,
  categories,
  categoryOrgs,
  links,
  activeCategory,
  activeOrg,
  onCopy,
}: Props) {
  const [view, setView] = useState<"live" | "archive">("live");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LinkView | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [collapsedOrgs, setCollapsedOrgs] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const justSavedRef = useRef(false);

  useEffect(() => {
    const handler = () => {
      setEditing(null);
      setModalOpen(true);
    };
    window.addEventListener("lll:open-add-modal", handler);
    return () => window.removeEventListener("lll:open-add-modal", handler);
  }, []);

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
    return map;
  }, [view, links, categories]);

  const runMutation = (fn: () => Promise<void>) => {
    justSavedRef.current = true;
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        justSavedRef.current = false;
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const handleSave = (data: UpsertLinkInput) => {
    runMutation(() => upsertLink(data));
    setModalOpen(false);
    setEditing(null);
  };

  const handleToggle = (id: string) => runMutation(() => toggleLinkStatus(id));
  const handleRemove = (id: string) => {
    if (!window.confirm("Permanently remove this link?")) return;
    runMutation(() => deleteLink(id));
  };
  const handleAddCategory = (name: string) => {
    if (!name.trim() || categories.includes(name.trim())) return;
    runMutation(() => addCategory(name.trim()));
  };

  const openEdit = (link: LinkView) => {
    setEditing(link);
    setModalOpen(true);
  };

  const orgForCategory = (cat: string) => categoryOrgs[cat] || "";

  const renderOrgSection = (org: Organization) => {
    const orgCats = categories.filter((c) => orgForCategory(c) === org.slug);
    const visibleCats = orgCats.filter((c) => {
      if (activeCategory) return c === activeCategory;
      const items = linksByCategory[c] || [];
      return view === "live" || items.length > 0;
    });

    if (visibleCats.length === 0) return null;
    if (activeOrg && activeOrg !== org.slug) return null;

    const isOrgCollapsed = collapsedOrgs[org.slug];

    return (
      <div key={org.slug} id={`org-${org.slug}`} className="org-section">
        <button
          className="org-header"
          onClick={() =>
            setCollapsedOrgs((prev) => ({ ...prev, [org.slug]: !prev[org.slug] }))
          }
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: org.color }}
            />
            <span className="org-header-name">{org.name.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-faint font-body">
              {links.filter((l) => l.status === view && l.orgSlug === org.slug).length} link{links.filter((l) => l.status === view && l.orgSlug === org.slug).length !== 1 ? "s" : ""}
            </span>
            {isOrgCollapsed ? (
              <ChevronRight size={14} className="text-ink-faint" />
            ) : (
              <ChevronDown size={14} className="text-ink-faint" />
            )}
          </div>
        </button>

        {!isOrgCollapsed && (
          <div className="org-categories">
            {visibleCats.map((cat) => renderCategory(cat, org))}
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (cat: string, org?: Organization) => {
    const items = linksByCategory[cat] || [];
    const isCollapsed = collapsed[cat];
    const color = org?.color || "var(--ink-faint)";

    return (
      <section
        key={cat}
        id={`cat-${cat.replace(/\s+/g, "-")}`}
        className="cat-section-v2"
      >
        <button
          onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
          className="cat-header-v2"
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight size={13} className="text-ink-faint" />
            ) : (
              <ChevronDown size={13} className="text-ink-faint" />
            )}
            <h3 className="font-display text-xl text-ink font-semibold">{cat}</h3>
            <span className="text-xs text-ink-faint font-body">
              {items.length} link{items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </button>

        {!isCollapsed && items.length > 0 && (
          <ol className="link-list-v2">
            {items.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                orgColor={color}
                view={view}
                onToggle={() => handleToggle(link.id)}
                onEdit={() => openEdit(link)}
                onRemove={() => handleRemove(link.id)}
                onCopy={onCopy}
              />
            ))}
          </ol>
        )}
        {!isCollapsed && items.length === 0 && (
          <p className="text-sm text-ink-faint italic font-body pl-6 py-2">
            No {view} links here.
          </p>
        )}
      </section>
    );
  };

  const uncategorizedCats = categories.filter((c) => !orgForCategory(c));
  const visibleUncategorized = uncategorizedCats.filter((c) => {
    if (activeCategory) return c === activeCategory;
    const items = linksByCategory[c] || [];
    return view === "live" || items.length > 0;
  });

  return (
    <>
      {/* Tabs + status */}
      <div className="flex items-center gap-6 mb-6 font-body flex-wrap">
        <button
          onClick={() => setView("live")}
          className={`tab-btn ${view === "live" ? "tab-active" : ""}`}
        >
          Link Board
          <span className="tab-count">{liveCount}</span>
        </button>
        <button
          onClick={() => setView("archive")}
          className={`tab-btn ${view === "archive" ? "tab-active" : ""}`}
        >
          Archives
          <span className="tab-count">{archiveCount}</span>
        </button>
        <div className="ml-auto text-xs text-ink-soft font-body italic">
          {isPending ? (
            "saving…"
          ) : savedFlash ? (
            <span className="inline-flex items-center gap-1 text-saffron">
              <Check size={12} /> saved
            </span>
          ) : (
            "auto-saves"
          )}
        </div>
      </div>

      {/* Org sections */}
      <div className="space-y-8">
        {organizations.map(renderOrgSection)}

        {/* Uncategorized */}
        {visibleUncategorized.length > 0 && !activeOrg && (
          <div className="org-section">
            <div className="org-header" style={{ cursor: "default" }}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ background: "var(--ink-faint)" }}
                />
                <span className="org-header-name">UNCATEGORISED</span>
              </div>
            </div>
            <div className="org-categories">
              {visibleUncategorized.map((cat) => renderCategory(cat))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {view === "live" && liveCount === 0 && (
        <div className="text-center py-20 font-body">
          <p className="text-ink italic font-display text-2xl mb-2">
            Your library is empty.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="lll-btn-primary inline-flex items-center gap-2 mt-4"
          >
            <Plus size={16} /> Add first link
          </button>
        </div>
      )}

      {modalOpen && (
        <LinkModal
          link={editing}
          categories={categories}
          organizations={organizations}
          categoryOrgs={categoryOrgs}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          onAddCategory={handleAddCategory}
        />
      )}
    </>
  );
}

/* ── Link Row ── */

function LinkRow({
  link,
  orgColor,
  view,
  onToggle,
  onEdit,
  onRemove,
  onCopy,
}: {
  link: LinkView;
  orgColor: string;
  view: "live" | "archive";
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onCopy: (url: string) => void;
}) {
  const [showDesc, setShowDesc] = useState(false);
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
    <li className="link-row-v2" style={{ borderLeftColor: orgColor }}>
      <a
        href={ensureProtocol(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="link-row-main-v2"
      >
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="link-title-v2">{link.title}</span>
          {link.subType && <span className="link-pill">{link.subType}</span>}
        </div>
        <div className="link-meta-v2">
          <span className="truncate">{shortUrl(link.url)}</span>
          <span className="text-ink-faint">·</span>
          <span className="shrink-0">{formatDate(link.updatedAt)}</span>
        </div>
        {link.note && <div className="link-note-v2">{link.note}</div>}
        {link.description && (
          <div className="mt-0.5">
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
              <div className="text-xs text-ink-soft leading-relaxed mt-1 opacity-90">
                {link.description}
              </div>
            )}
          </div>
        )}
      </a>

      {/* Always-visible actions */}
      <div className="link-actions-v2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(ensureProtocol(link.url), "_blank", "noopener,noreferrer");
          }}
          className="action-btn"
          title="Open"
        >
          <ExternalLink size={14} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy(link.url);
          }}
          className="action-btn"
          title="Copy URL"
        >
          <Copy size={14} />
        </button>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="action-btn link-more-btn"
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="link-menu">
              <button
                className="link-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  setMenuOpen(false);
                }}
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                className="link-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                  setMenuOpen(false);
                }}
              >
                {view === "live" ? <Archive size={12} /> : <ArchiveRestore size={12} />}
                {view === "live" ? "Archive" : "Restore"}
              </button>
              <button
                className="link-menu-item link-menu-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                  setMenuOpen(false);
                }}
              >
                <X size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ── Modal ── */

function LinkModal({
  link,
  categories,
  organizations,
  categoryOrgs,
  onClose,
  onSave,
  onAddCategory,
}: {
  link: LinkView | null;
  categories: string[];
  organizations: Organization[];
  categoryOrgs: Record<string, string>;
  onClose: () => void;
  onSave: (data: UpsertLinkInput) => void;
  onAddCategory: (name: string) => void;
}) {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const [selectedOrg, setSelectedOrg] = useState(link?.orgSlug || organizations[0]?.slug || "");
  const [category, setCategory] = useState(link?.category || "");
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

  const orgFilteredCats = useMemo(() => {
    if (!selectedOrg) return categories;
    return categories.filter((c) => categoryOrgs[c] === selectedOrg || !categoryOrgs[c]);
  }, [selectedOrg, categories, categoryOrgs]);

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

  useEffect(() => {
    if (orgFilteredCats.length > 0 && !orgFilteredCats.includes(category)) {
      setCategory(orgFilteredCats[0]);
    }
  }, [selectedOrg]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const submit = () => {
    if (!title.trim()) { setError("Title is needed."); return; }
    if (!url.trim()) { setError("URL is needed."); return; }
    let cat = category;
    if (showNewCat && newCategory.trim()) {
      cat = newCategory.trim();
      onAddCategory(cat);
    }
    if (!cat) { setError("Pick or add a category."); return; }

    let sourceDate: string | undefined;
    if (sourceMonth && sourceYear) {
      sourceDate = `${sourceYear}-${String(sourceMonth).padStart(2, "0")}-15`;
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
          <button onClick={onClose} className="action-btn"><X size={16} /></button>
        </div>

        <div className="space-y-4 font-body">
          <Field label="Title">
            <input ref={titleRef} className="lll-input" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rangamati Final Playbook" />
          </Field>
          <Field label="URL">
            <input className="lll-input" value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..." />
          </Field>
          <Field label="Organization">
            <div className="flex gap-2 flex-wrap">
              {organizations.map((org) => (
                <button
                  key={org.slug}
                  type="button"
                  onClick={() => setSelectedOrg(org.slug)}
                  className={`filter-pill ${selectedOrg === org.slug ? "filter-pill-active" : ""}`}
                  style={
                    selectedOrg === org.slug
                      ? { borderColor: org.color, color: org.color, background: `${org.color}12` }
                      : undefined
                  }
                >
                  {org.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Category">
            {!showNewCat ? (
              <div className="flex gap-2">
                <select className="lll-input flex-1" value={category}
                  onChange={(e) => setCategory(e.target.value)}>
                  {orgFilteredCats.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowNewCat(true)}
                  className="lll-btn-secondary text-sm shrink-0">+ New</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="lll-input flex-1" value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name" autoFocus />
                <button type="button"
                  onClick={() => { setShowNewCat(false); setNewCategory(""); }}
                  className="lll-btn-secondary text-sm shrink-0">Cancel</button>
              </div>
            )}
          </Field>
          <Field label="Sub-type">
            <input className="lll-input" value={subType}
              onChange={(e) => setSubType(e.target.value)}
              placeholder="app · deck · playbook · site · tool …"
              list="subtype-suggestions" />
            <datalist id="subtype-suggestions">
              {SUBTYPE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
          <Field label="Source Date (optional)">
            <div className="flex gap-2">
              <select className="lll-input flex-1" value={sourceMonth}
                onChange={(e) => setSourceMonth(Number(e.target.value))}>
                <option value={0}>Month…</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="lll-input flex-1" value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}>
                <option value={0}>Year…</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Note (optional)">
            <textarea className="lll-input" rows={2} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One-line context for future-you" />
          </Field>
          <Field label="Description (optional)">
            <textarea className="lll-input" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Longer description, hidden by default" />
          </Field>
          {error && (
            <div className="text-sm text-saffron-deep italic">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="lll-btn-secondary">Cancel</button>
          <button onClick={submit} className="lll-btn-primary">
            {link ? "Save changes" : "Add to Link Board"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
