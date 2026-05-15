"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowRight,
  Save,
} from "lucide-react";
import type { Organization, LinkView, Category } from "@/lib/types";
import { toast } from "sonner";
import {
  createCategory,
  renameCategory,
  updateCategoryOrg,
  deleteCategory,
  reassignLink,
  updateLinkDetails,
} from "@/app/_actions/admin";

type Props = {
  organizations: Organization[];
  categories: Category[];
  links: LinkView[];
  onClose: () => void;
};

type AdminTab = "categories" | "links";

export default function AdminPanel({
  organizations,
  categories,
  links,
  onClose,
}: Props) {
  const [tab, setTab] = useState<AdminTab>("categories");

  return (
    <div className="admin-backdrop" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-header">
          <h2 className="font-display text-2xl text-ink">Admin</h2>
          <div className="flex items-center gap-2">
            <button
              className={`admin-tab ${tab === "categories" ? "admin-tab-active" : ""}`}
              onClick={() => setTab("categories")}
            >
              Categories
            </button>
            <button
              className={`admin-tab ${tab === "links" ? "admin-tab-active" : ""}`}
              onClick={() => setTab("links")}
            >
              Links ({links.filter((l) => l.status === "live").length})
            </button>
          </div>
          <button onClick={onClose} className="action-btn">
            <X size={18} />
          </button>
        </div>

        <div className="admin-body">
          {tab === "categories" && (
            <CategoriesAdmin
              organizations={organizations}
              categories={categories}
              links={links}
            />
          )}
          {tab === "links" && (
            <LinksAdmin
              organizations={organizations}
              categories={categories}
              links={links}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Categories Tab ── */

function CategoriesAdmin({
  organizations,
  categories,
  links,
}: {
  organizations: Organization[];
  categories: Category[];
  links: LinkView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [newCatName, setNewCatName] = useState("");
  const [newCatOrg, setNewCatOrg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const orgMap = new Map(organizations.map((o) => [o.id, o]));

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    startTransition(async () => {
      try {
        await createCategory(newCatName, newCatOrg || null);
        setNewCatName("");
        setNewCatOrg("");
        toast.success(`Category "${newCatName}" created`);
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      try {
        await renameCategory(id, editName);
        setEditingId(null);
        toast.success("Renamed");
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const handleOrgChange = (catId: string, orgId: string) => {
    startTransition(async () => {
      try {
        await updateCategoryOrg(catId, orgId || null);
        toast.success("Org updated");
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Links must be reassigned first.`)) return;
    startTransition(async () => {
      try {
        await deleteCategory(id);
        toast.success(`"${name}" deleted`);
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const linkCount = (catId: string) =>
    links.filter((l) => {
      const cat = categories.find((c) => c.name === l.category);
      return cat?.id === catId && l.status === "live";
    }).length;

  return (
    <div>
      {/* Add new category */}
      <div className="admin-add-row">
        <input
          className="lll-input flex-1"
          placeholder="New category name..."
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <select
          className="lll-input"
          style={{ width: 180 }}
          value={newCatOrg}
          onChange={(e) => setNewCatOrg(e.target.value)}
        >
          <option value="">No org</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          className="lll-btn-primary inline-flex items-center gap-1"
          onClick={handleCreate}
          disabled={isPending || !newCatName.trim()}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Category list */}
      <div className="admin-list">
        {categories.map((cat) => {
          const org = cat.org_id ? orgMap.get(cat.org_id) : null;
          const count = linkCount(cat.id);
          const isEditing = editingId === cat.id;

          return (
            <div key={cat.id} className="admin-list-item">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="lll-input flex-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(cat.id)}
                    autoFocus
                  />
                  <button
                    className="action-btn"
                    onClick={() => handleRename(cat.id)}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {org && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: org.color }}
                      />
                    )}
                    <span className="font-body text-[15px] font-semibold text-ink truncate">
                      {cat.name}
                    </span>
                    <span className="text-xs text-ink-faint shrink-0">
                      {count} link{count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="lll-input text-xs"
                      style={{ width: 160, padding: "4px 8px" }}
                      value={cat.org_id || ""}
                      onChange={(e) => handleOrgChange(cat.id, e.target.value)}
                    >
                      <option value="">No org</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="action-btn"
                      title="Rename"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="action-btn"
                      title="Delete"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      style={{ color: count > 0 ? "var(--ink-faint)" : undefined }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Links Tab ── */

function LinksAdmin({
  organizations,
  categories,
  links,
}: {
  organizations: Organization[];
  categories: Category[];
  links: LinkView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubType, setEditSubType] = useState("");
  const [editNote, setEditNote] = useState("");

  const catIdByName = new Map(categories.map((c) => [c.name, c.id]));

  const filtered = links
    .filter((l) => l.status === "live")
    .filter((l) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleReassign = (linkId: string, newCatId: string) => {
    startTransition(async () => {
      try {
        await reassignLink(linkId, newCatId);
        toast.success("Moved");
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const handleSaveDetails = (id: string) => {
    startTransition(async () => {
      try {
        await updateLinkDetails(id, {
          title: editTitle,
          sub_type: editSubType,
          note: editNote,
        });
        setEditingId(null);
        toast.success("Saved");
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  return (
    <div>
      <div className="admin-add-row">
        <input
          className="lll-input flex-1"
          placeholder="Filter links by title, category, or URL..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="text-sm text-ink-faint font-body shrink-0">
          {filtered.length} shown
        </span>
      </div>

      <div className="admin-list">
        {filtered.slice(0, 50).map((link) => {
          const isEditing = editingId === link.id;
          const currentCatId = catIdByName.get(link.category) || "";

          return (
            <div key={link.id} className="admin-list-item admin-list-item-link">
              {isEditing ? (
                <div className="space-y-2 w-full">
                  <input
                    className="lll-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                  />
                  <div className="flex gap-2">
                    <input
                      className="lll-input flex-1"
                      value={editSubType}
                      onChange={(e) => setEditSubType(e.target.value)}
                      placeholder="Sub-type (app, deck, site...)"
                    />
                    <input
                      className="lll-input flex-[2]"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Note"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      className="lll-btn-secondary text-sm inline-flex items-center gap-1"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="lll-btn-primary text-sm inline-flex items-center gap-1"
                      onClick={() => handleSaveDetails(link.id)}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: link.orgColor }}
                      />
                      <span className="font-body text-[15px] font-semibold text-ink truncate">
                        {link.title}
                      </span>
                      {link.subType && (
                        <span className="link-pill text-[9px]">{link.subType}</span>
                      )}
                      <span className="text-xs text-saffron font-semibold shrink-0">
                        {new Date(link.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {link.note && (
                      <div className="text-xs text-ink-faint mt-0.5 truncate">
                        {link.note}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="lll-input text-xs"
                      style={{ width: 150, padding: "4px 8px" }}
                      value={currentCatId}
                      onChange={(e) => handleReassign(link.id, e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="action-btn"
                      title="Edit details"
                      onClick={() => {
                        setEditingId(link.id);
                        setEditTitle(link.title);
                        setEditSubType(link.subType);
                        setEditNote(link.note);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
