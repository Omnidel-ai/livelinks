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
import { signOut } from "@/app/_actions/auth";

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
];

type View = "live" | "archive";

type Props = {
  categories: string[];
  links: LinkView[];
  userEmail: string | null;
};

export default function LLLBoard({ categories, links, userEmail }: Props) {
  const [view, setView] = useState<View>("live");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LinkView | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const justSavedRef = useRef(false);

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

  const categoriesToShow = useMemo(() => {
    if (view === "archive") {
      const present = new Set(
        links.filter((l) => l.status === "archive").map((l) => l.category),
      );
      return categories.filter((c) => present.has(c));
    }
    return categories;
  }, [view, categories, links]);

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

  return (
    <div className="lll-root min-h-screen pb-24">
      <header className="border-b paper-line">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase text-ink-soft mb-3 font-body tracking-paper">
                <span className="dot-saffron"></span>
                <span>The Gunakul · Living Library</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl text-ink leading-none">
                Living Library
                <br />
                <span className="italic text-ink-soft">of Links</span>
              </h1>
              <p className="mt-4 text-ink-soft font-body italic max-w-md">
                One place. Live links breathing on the board, old ones at rest
                in the archive — never deleted.
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
              <span>Live Board</span>
              <span className="tab-count">{liveCount}</span>
            </button>
            <button
              onClick={() => setView("archive")}
              className={`tab-btn ${view === "archive" ? "tab-active" : ""}`}
            >
              <span>Archive</span>
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
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10">
        {(view === "live" ? liveCount : archiveCount) === 0 ? (
          <EmptyState view={view} onAdd={openAdd} />
        ) : (
          <div className="space-y-12">
            {categoriesToShow.map((cat, idx) => {
              const items = linksByCategory[cat] || [];
              if (view === "archive" && items.length === 0) return null;
              const isCollapsed = collapsed[cat];
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
                        {items.length || ""}
                      </span>
                    </div>
                    {items.length === 0 && (
                      <span className="text-xs text-ink-faint italic font-body">
                        empty
                      </span>
                    )}
                  </button>
                  {!isCollapsed && items.length > 0 && (
                    <ul className="mt-3">
                      {items.map((link) => (
                        <LinkRow
                          key={link.id}
                          link={link}
                          onToggle={() => handleToggle(link.id)}
                          onEdit={() => openEdit(link)}
                          onRemove={() => handleRemove(link.id)}
                          view={view}
                        />
                      ))}
                    </ul>
                  )}
                  {!isCollapsed && items.length === 0 && view === "live" && (
                    <p className="mt-3 text-sm text-ink-faint italic font-body pl-7">
                      No live links here yet.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-24 pt-8 border-t paper-line text-center font-body italic text-ink-faint text-sm">
          <p>
            v1 · destination:{" "}
            <span className="text-ink-soft">vatika.live</span>
          </p>
          {userEmail && (
            <div className="mt-2 inline-flex items-center gap-2">
              <span>
                signed in as{" "}
                <span className="not-italic text-ink-soft">{userEmail}</span>
              </span>
              <span className="dot-sep">·</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="not-italic underline underline-offset-2 hover:text-ink"
                >
                  sign out
                </button>
              </form>
            </div>
          )}
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

function LinkRow({
  link,
  onToggle,
  onEdit,
  onRemove,
  view,
}: {
  link: LinkView;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  view: View;
}) {
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(ensureProtocol(link.url), "_blank", "noopener,noreferrer");
  };
  return (
    <li className="link-row">
      <a
        href={ensureProtocol(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="link-row-main"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="link-title font-body">{link.title}</span>
          {link.subType && <span className="link-pill">{link.subType}</span>}
        </div>
        <div className="link-meta">
          <span className="truncate">{shortUrl(link.url)}</span>
          <span className="dot-sep">·</span>
          <span className="shrink-0">{formatDate(link.updatedAt)}</span>
        </div>
        {link.note && <div className="link-note">{link.note}</div>}
      </a>
      <div className="link-actions">
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
          title={view === "live" ? "Move to Archive" : "Restore to Live"}
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

function EmptyState({ view, onAdd }: { view: View; onAdd: () => void }) {
  if (view === "archive") {
    return (
      <div className="text-center py-20 font-body text-ink-soft">
        <Library className="mx-auto mb-4 opacity-30" size={40} />
        <p className="italic">
          The archive is empty. Old versions will rest here when moved.
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
        Add the first link — say, the Rangamati final playbook.
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
    onSave({
      id: link?.id,
      title: title.trim(),
      url: ensureProtocol(url.trim()),
      category: cat,
      subType: subType.trim().toLowerCase(),
      note: note.trim(),
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
          <Field label="Note (optional)">
            <textarea
              className="lll-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One-line context for future-you"
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
            {link ? "Save changes" : "Add to Live Board"}
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
