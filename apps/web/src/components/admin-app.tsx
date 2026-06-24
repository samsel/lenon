"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Bot, ClipboardCheck, FileText, Play, ShieldCheck, Store } from "lucide-react";
import type { EvalRun, HermesAgentMapping, PolicyEvent, PromptVersion } from "@kidsafe/shared";
import { apiGet, apiSend } from "@/lib/api";
import { AppShell, RouteTitle, StatusPill } from "@/components/shell";

type AdminOverview = {
  agents: HermesAgentMapping[];
  events: PolicyEvent[];
  evalRuns: EvalRun[];
  prompts: PromptVersion[];
  health: {
    status: string;
    mode: string;
    guarantees: string[];
  };
};

function useAdmin() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setData(await apiGet<AdminOverview>("/api/admin/overview"));
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { data, loading, refresh };
}

export function AdminApp({ slug }: { slug: string[] }) {
  const section = slug[0] ?? "home";
  const detail = slug[1];
  const activePath = `/admin/${slug.join("/") || "home"}`;
  const admin = useAdmin();

  return (
    <AppShell activePath={activePath}>
      {section === "hermes" && detail === "agents" ? (
        <AgentsView data={admin.data} loading={admin.loading} />
      ) : section === "prompts" ? (
        <PromptsView data={admin.data} loading={admin.loading} refresh={admin.refresh} />
      ) : section === "skills" ? (
        <SkillReviewView />
      ) : section === "conversations" ? (
        <FlaggedView data={admin.data} loading={admin.loading} />
      ) : section === "evals" ? (
        <EvalsView data={admin.data} loading={admin.loading} refresh={admin.refresh} />
      ) : section === "audit-logs" ? (
        <AuditView data={admin.data} loading={admin.loading} />
      ) : (
        <AdminHome data={admin.data} loading={admin.loading} />
      )}
    </AppShell>
  );
}

function AdminHome({ data, loading }: { data: AdminOverview | null; loading: boolean }) {
  return (
    <div className="grid">
      <RouteTitle title="Admin command center" subtitle="Inspect Hermes agents, policy gates, skills, evals, prompts, and audit signals." />
      <section className="grid four">
        <div className="metric">
          <strong>{data?.agents.length ?? (loading ? "..." : 0)}</strong>
          <span>active Hermes agents</span>
        </div>
        <div className="metric">
          <strong>{data?.events.length ?? 0}</strong>
          <span>policy events</span>
        </div>
        <div className="metric">
          <strong>{data?.evalRuns.filter((run) => run.status === "passed").length ?? 0}</strong>
          <span>passed evals</span>
        </div>
        <div className="metric">
          <strong>{data?.prompts.filter((prompt) => prompt.status === "active").length ?? 0}</strong>
          <span>active prompts</span>
        </div>
      </section>
      <section className="grid three">
        <AdminTile href="/admin/hermes/agents" icon={<Bot />} title="Agent inspector" text="View prompt stack, policy pack, skills, health, and sync state." />
        <AdminTile href="/admin/evals" icon={<ClipboardCheck />} title="Hermes evals" text="Run eval suites through the Hermes runtime path." />
        <AdminTile href="/admin/prompts" icon={<FileText />} title="Prompt registry" text="Review active prompt versions and eval requirements." />
      </section>
    </div>
  );
}

function AdminTile({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link className="panel" href={href}>
      {icon}
      <h2>{title}</h2>
      <p className="muted">{text}</p>
    </Link>
  );
}

function AgentsView({ data, loading }: { data: AdminOverview | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Loading Hermes agents...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Hermes agent inspector" subtitle="Every child profile maps to one active, vertically isolated agent." />
      <section className="table-like">
        <div className="table-row header">
          <span>Agent</span>
          <span>Status</span>
          <span>Profile</span>
          <span>Isolation</span>
        </div>
        {data?.agents.map((agent) => (
          <div className="table-row" key={agent.hermesAgentId}>
            <strong>{agent.hermesAgentId}</strong>
            <StatusPill>{agent.status}</StatusPill>
            <span>{agent.hermesProfileName ?? "unknown"}</span>
            <span>{agent.isolationMode ?? "unknown"}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function PromptsView({
  data,
  loading,
  refresh
}: {
  data: AdminOverview | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const runEval = async () => {
    await apiSend("/api/admin/hermes/evals/run", "POST", {
      suiteId: "general_child_safety_core",
      target: "prompt_stack",
      hermesAgentId: data?.agents[0]?.hermesAgentId
    });
    await refresh();
  };

  if (loading) return <div className="empty-state">Loading prompt registry...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Prompt management" subtitle="Prompt activation requires Hermes eval pass, admin approval, diff, and rollback path." />
      <button className="btn" onClick={() => void runEval()}>
        <Play /> Run prompt-stack eval
      </button>
      <section className="grid two">
        {data?.prompts.map((prompt) => (
          <article className="panel grid" key={prompt.id}>
            <div className="panel-header">
              <h2>{prompt.name}</h2>
              <StatusPill>{prompt.status}</StatusPill>
            </div>
            <p className="muted">{prompt.content}</p>
            <div className="chip-list">
              <span className="chip">v{prompt.version}</span>
              <span className="chip">{prompt.scope}</span>
              <span className="chip">{prompt.hermesTarget}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function EvalsView({
  data,
  loading,
  refresh
}: {
  data: AdminOverview | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const [suiteId, setSuiteId] = useState("general_child_safety_core");
  const runEval = async () => {
    await apiSend("/api/admin/hermes/evals/run", "POST", {
      suiteId,
      target: "child_agent",
      hermesAgentId: data?.agents[0]?.hermesAgentId
    });
    await refresh();
  };

  if (loading) return <div className="empty-state">Loading evals...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Hermes eval runs" subtitle="Evals exercise the same Hermes child-agent path used by the product." />
      <section className="panel">
        <div className="field-grid">
          <label className="field">
            <span>Eval suite</span>
            <select value={suiteId} onChange={(event) => setSuiteId(event.target.value)}>
              <option>general_child_safety_core</option>
              <option>age_appropriate_tone</option>
              <option>parent_policy_adherence</option>
              <option>skill_permission_sandbox</option>
              <option>checkpoint_bonus_abuse_prevention</option>
            </select>
          </label>
          <button className="btn" onClick={() => void runEval()}>
            <Play /> Run through Hermes
          </button>
        </div>
      </section>
      <section className="table-like">
        <div className="table-row header">
          <span>Suite</span>
          <span>Status</span>
          <span>Pass rate</span>
          <span>Target</span>
        </div>
        {data?.evalRuns.map((run) => (
          <div className="table-row" key={run.id}>
            <strong>{run.suiteId}</strong>
            <StatusPill>{run.status}</StatusPill>
            <span>{Math.round(run.passRate * 100)}%</span>
            <span>{run.target}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function FlaggedView({ data, loading }: { data: AdminOverview | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Loading flagged conversations...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Flagged conversation review" subtitle="Review redacted context and convert recurring issues into eval cases." />
      <section className="grid">
        {data?.events.map((event) => (
          <article className="panel" key={event.id}>
            <div className="panel-header">
              <h2>{event.category}</h2>
              <StatusPill tone={event.severity === "critical" ? "danger" : event.severity === "medium" ? "warn" : "ok"}>
                {event.severity}
              </StatusPill>
            </div>
            <p className="muted">{event.summary}</p>
            <div className="button-row">
              <button className="btn secondary">
                <ShieldCheck /> True positive
              </button>
              <button className="btn ghost">
                <ClipboardCheck /> Create eval case
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function SkillReviewView() {
  return (
    <div className="grid">
      <RouteTitle title="Skill review queue" subtitle="Admins approve, reject, suspend, or require creator changes after Hermes evals." />
      <section className="grid three">
        {["Math Quest", "Story Builder", "Code Playground"].map((name) => (
          <article className="panel grid" key={name}>
            <div className="panel-header">
              <h2>{name}</h2>
              <StatusPill>approved</StatusPill>
            </div>
            <p className="muted">Manifest declares prompt layer, permissions, age range, safety blocklist, and eval suite IDs.</p>
            <div className="button-row">
              <button className="btn secondary">
                <Store /> Inspect
              </button>
              <button className="btn ghost">
                <Play /> Run eval
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function AuditView({ data, loading }: { data: AdminOverview | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Loading audit log mirrors...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Audit logs" subtitle="Product audit mirrors record Hermes-facing configuration and review actions." />
      <section className="table-like">
        <div className="table-row header">
          <span>Event</span>
          <span>Agent</span>
          <span>Action</span>
          <span>Time</span>
        </div>
        {data?.events.map((event) => (
          <div className="table-row" key={event.id}>
            <strong>{event.category}</strong>
            <span>{event.hermesAgentId}</span>
            <span>{event.action}</span>
            <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
