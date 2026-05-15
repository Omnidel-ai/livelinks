"use client";

import { ExternalLink, Copy, RefreshCw, Zap } from "lucide-react";
import type { VercelDeployment } from "@/lib/types";
import { formatDate } from "@/lib/format";

type Props = {
  deployments: VercelDeployment[];
  linkUrls: Set<string>;
  onCopy: (url: string) => void;
};

export default function RecentlyDeployed({ deployments, linkUrls, onCopy }: Props) {
  if (deployments.length === 0) return null;

  const seenProjects = new Set<string>();
  const uniqueByProject = deployments.filter((d) => {
    if (seenProjects.has(d.project_name)) return false;
    seenProjects.add(d.project_name);
    return true;
  });

  const isInLibrary = (d: VercelDeployment) => {
    if (d.link_id) return true;
    try {
      const hostname = new URL(d.project_url).hostname;
      return linkUrls.has(hostname);
    } catch {
      return false;
    }
  };

  const statusColor = (status: string | null) => {
    if (!status) return "var(--ink-faint)";
    if (status === "READY") return "#2d6a4f";
    if (status === "ERROR") return "#c8651e";
    return "#b89c40";
  };

  const orgLabel = (slug: string | null) => {
    if (slug === "karmyog") return "VATIKA.AI";
    if (slug === "omnidel") return "OMNIDEL.AI";
    if (slug === "rare") return "RARE INDIA";
    return "";
  };

  const orgColor = (slug: string | null) => {
    if (slug === "karmyog") return "#2d6a4f";
    if (slug === "omnidel") return "#1d3557";
    if (slug === "rare") return "#7b2d42";
    return "var(--ink-faint)";
  };

  return (
    <section className="deploy-section">
      <div className="deploy-header">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-saffron" />
          <h2 className="font-display text-xs uppercase tracking-paper text-ink-soft">
            Recently Deployed
          </h2>
          <span className="text-xs text-ink-faint">
            {uniqueByProject.length} project{uniqueByProject.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={async () => {
            try {
              await fetch("/api/cron");
              window.location.reload();
            } catch {}
          }}
          className="action-btn text-ink-faint hover:text-saffron"
          title="Sync now"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="deploy-strip">
        {uniqueByProject.map((d) => (
          <div key={d.id} className="deploy-card">
            <div className="deploy-card-top">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: statusColor(d.status) }}
                />
                {d.org_slug && (
                  <span
                    className="deploy-org-pill"
                    style={{
                      color: orgColor(d.org_slug),
                      borderColor: orgColor(d.org_slug),
                    }}
                  >
                    {orgLabel(d.org_slug)}
                  </span>
                )}
              </div>
              {isInLibrary(d) && (
                <span className="text-[10px] text-green-700 font-medium">✓ In Library</span>
              )}
            </div>

            <div className="deploy-card-body">
              <div className="font-body text-sm font-semibold text-ink truncate">
                {d.project_name}
              </div>
              <div className="text-xs text-ink-soft truncate mt-0.5">
                {(() => {
                  try { return new URL(d.project_url).hostname; } catch { return d.project_url; }
                })()}
              </div>
              {d.branch && (
                <div className="text-[10px] text-ink-faint mt-1">
                  {d.branch} branch
                </div>
              )}
            </div>

            <div className="deploy-card-meta">
              <span className="text-[11px] text-ink-faint">
                {formatDate(d.created_at)}
              </span>
            </div>

            <div className="deploy-card-actions">
              <a
                href={d.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="deploy-action-btn"
              >
                <ExternalLink size={12} />
                <span>Open</span>
              </a>
              <button
                className="deploy-action-btn"
                onClick={() => onCopy(d.project_url)}
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
