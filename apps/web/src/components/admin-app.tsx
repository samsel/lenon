"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Bot, ClipboardCheck, FileText, Play, RefreshCw, Server, ShieldCheck, Store } from "lucide-react";
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

type RuntimeAudit = {
  childProfileId: string;
  hermesAgentId: string;
  profileName?: string;
  modelName?: string;
  modelProvider?: string;
  modelBackend?: string;
  baseUrl: string;
  containerName?: string;
  containerRunning: boolean | null;
  apiReachable: boolean;
  terminalBackend?: string;
  dockerSocket: "absent" | "present" | "unknown";
  apiServerToolsets: Array<{ name: string; enabled: boolean }>;
  disabledToolsets: string[];
  secrets: {
    apiKeyConfigured: boolean;
    apiKeyExposed: false;
    registrySource: string;
  };
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warn" | "fail" | "unknown";
    detail: string;
  }>;
  auditedAt: string;
};

type RuntimeProvisionResponse = {
  results: Array<{
    childProfileId: string;
    hermesAgentId?: string;
    status: "provisioned" | "skipped" | "failed";
    summary: string;
  }>;
  audits: RuntimeAudit[];
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

function useRuntimeAudit() {
  const [audits, setAudits] = useState<RuntimeAudit[]>([]);
  const [provisionResult, setProvisionResult] = useState<RuntimeProvisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setAudits(await apiGet<RuntimeAudit[]>("/api/admin/hermes/runtime-audit"));
    setLoading(false);
  };

  const provision = async () => {
    setWorking(true);
    const result = await apiSend<RuntimeProvisionResponse>("/api/admin/hermes/runtime-audit/provision", "POST", {});
    setProvisionResult(result);
    setAudits(result.audits);
    setWorking(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { audits, loading, working, provisionResult, refresh, provision };
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
      ) : section === "hermes" && detail === "runtime-audit" ? (
        <RuntimeAuditView />
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
      <RouteTitle title="Safety command center" subtitle="Inspect Lenon agents, policy gates, skills, evals, prompts, and audit signals." />
      <section className="grid four">
        <div className="metric">
          <strong>{data?.agents.length ?? (loading ? "..." : 0)}</strong>
          <span>active Lenon agents</span>
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
      <section className="grid four">
        <AdminTile href="/admin/hermes/agents" icon={<Bot />} title="Agent inspector" text="View prompt stack, policy pack, skills, health, and sync state." />
        <AdminTile href="/admin/hermes/runtime-audit" icon={<Server />} title="Runtime audit" text="Verify containers, provider route, tool lockdown, and redacted secret posture." />
        <AdminTile href="/admin/evals" icon={<ClipboardCheck />} title="Runtime evals" text="Run eval suites through the Hermes runtime path." />
        <AdminTile href="/admin/prompts" icon={<FileText />} title="Prompt registry" text="Review active prompt versions and eval requirements." />
      </section>
    </div>
  );
}

function RuntimeAuditView() {
  const runtime = useRuntimeAudit();
  const totals = runtime.audits.flatMap((audit) => audit.checks);
  const failed = totals.filter((check) => check.status === "fail").length;
  const warned = totals.filter((check) => check.status === "warn" || check.status === "unknown").length;

  if (runtime.loading) return <div className="empty-state">Auditing Hermes runtimes without exposing secrets...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Runtime audit" subtitle="Server-side checks for child Hermes containers, tool lockdown, model route, and secret redaction." />
      <section className="grid four">
        <div className="metric">
          <strong>{runtime.audits.length}</strong>
          <span>child runtimes</span>
        </div>
        <div className="metric">
          <strong>{totals.filter((check) => check.status === "pass").length}</strong>
          <span>passing checks</span>
        </div>
        <div className="metric">
          <strong>{warned}</strong>
          <span>warnings/unknowns</span>
        </div>
        <div className="metric">
          <strong>{failed}</strong>
          <span>failed checks</span>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Provisioning control</h2>
            <p className="muted">Runs only against configured local infrastructure. Secrets remain server-side.</p>
          </div>
          <div className="button-row">
            <button className="btn secondary" onClick={() => void runtime.refresh()} disabled={runtime.working}>
              <RefreshCw /> Refresh audit
            </button>
            <button className="btn" onClick={() => void runtime.provision()} disabled={runtime.working}>
              <Server /> Provision missing
            </button>
          </div>
        </div>
        {runtime.provisionResult ? (
          <div className="audit-result-list">
            {runtime.provisionResult.results.map((result) => (
              <div className="audit-result" key={`${result.childProfileId}-${result.status}`}>
                <StatusPill tone={result.status === "failed" ? "danger" : result.status === "provisioned" ? "ok" : "warn"}>
                  {result.status}
                </StatusPill>
                <strong>{result.childProfileId}</strong>
                <span>{result.summary}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {runtime.audits.map((audit) => (
        <section className="panel grid" key={audit.hermesAgentId}>
          <div className="panel-header">
            <div>
              <h2>{audit.profileName ?? audit.childProfileId}</h2>
              <p className="muted">{audit.hermesAgentId}</p>
            </div>
            <StatusPill tone={audit.apiReachable ? "ok" : "danger"}>{audit.apiReachable ? "reachable" : "offline"}</StatusPill>
          </div>
          <div className="runtime-facts">
            <span>Container: {audit.containerName ?? "not configured"}</span>
            <span>Model: {[audit.modelProvider, audit.modelName].filter(Boolean).join(" / ") || "unknown"}</span>
            <span>Backend: {audit.modelBackend ?? audit.baseUrl}</span>
            <span>Terminal: {audit.terminalBackend ?? "unknown"}</span>
            <span>Docker socket: {audit.dockerSocket}</span>
            <span>Registry: {audit.secrets.registrySource}</span>
            <span>API key configured: {audit.secrets.apiKeyConfigured ? "yes" : "no"}</span>
            <span>API key exposed: {audit.secrets.apiKeyExposed ? "yes" : "no"}</span>
          </div>
          <div className="audit-checks">
            {audit.checks.map((check) => (
              <div className="audit-check" key={check.id}>
                <StatusPill tone={check.status === "fail" ? "danger" : check.status === "pass" ? "ok" : "warn"}>
                  {check.status}
                </StatusPill>
                <div>
                  <strong>{check.label}</strong>
                  <p className="muted">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <details className="toolset-detail">
            <summary>API-server toolsets</summary>
            <div className="chip-list">
              {audit.apiServerToolsets.length ? (
                audit.apiServerToolsets.map((toolset) => (
                  <span className="chip" key={toolset.name}>
                    {toolset.enabled ? "on" : "off"}: {toolset.name}
                  </span>
                ))
              ) : (
                <span className="chip">not reported</span>
              )}
            </div>
          </details>
        </section>
      ))}
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
  if (loading) return <div className="empty-state">Loading Lenon agents...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Lenon agent inspector" subtitle="Every child profile maps to one active, vertically isolated Hermes-backed agent." />
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
      <RouteTitle title="Runtime eval runs" subtitle="Evals exercise the same Hermes child-agent path used by Lenon." />
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
