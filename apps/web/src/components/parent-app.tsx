"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  Clock,
  Eye,
  FileText,
  Pause,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Store,
  Trophy,
  Unlock,
  Users
} from "lucide-react";
import type { ChildProfile, HermesAgentMapping, ParentPolicyCache, PolicyEvent, Skill } from "@kidsafe/shared";
import { apiGet, apiSend } from "@/lib/api";
import { AppShell, RouteTitle, RuntimeMap, StatusPill } from "@/components/shell";

type FamilyChild = ChildProfile & {
  agent: HermesAgentMapping | null;
  policy: ParentPolicyCache | null;
  installedSkills: Skill[];
  activity: {
    topics: string[];
    skillsUsed: string[];
    learningHighlights: string[];
    safetyRedirects: number;
    suggestedConversationStarters: string[];
    timeUsedMinutes: number;
  } | null;
  safetyEvents: PolicyEvent[];
};

type FamilyOverview = {
  family: { id: string; name: string };
  user: { displayName: string } | null;
  children: FamilyChild[];
  hermes: { status: string; mode: string; guarantees: string[] };
};

const fallbackChildId = "child_ava";

function useFamily() {
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<FamilyOverview>("/api/families/current"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load family.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { data, loading, error, refresh };
}

function firstChild(data: FamilyOverview | null, childId?: string) {
  return data?.children.find((child) => child.id === childId) ?? data?.children[0] ?? null;
}

export function ParentApp({ slug }: { slug: string[] }) {
  const activePath = `/parent/${slug.join("/") || "home"}`;
  const route = slug[0] ?? "home";
  const childId = route === "children" ? slug[1] : fallbackChildId;
  const detail = route === "children" ? slug[2] : undefined;
  const family = useFamily();
  const child = firstChild(family.data, childId);

  return (
    <AppShell activePath={activePath}>
      {family.error ? <div className="empty-state">{family.error}</div> : null}
      {route === "onboarding" ? (
        <OnboardingView onDone={family.refresh} />
      ) : route === "alerts" ? (
        <AlertsView data={family.data} loading={family.loading} />
      ) : route === "settings" ? (
        <PrivacyView />
      ) : route === "children" && detail === "hermes-agent" ? (
        <HermesAgentView child={child} loading={family.loading} refresh={family.refresh} />
      ) : route === "children" && detail === "policy" ? (
        <PolicyView child={child} loading={family.loading} refresh={family.refresh} />
      ) : route === "children" && detail === "skills" ? (
        <SkillsView child={child} loading={family.loading} refresh={family.refresh} />
      ) : route === "children" && detail === "activity" ? (
        <ActivityView child={child} loading={family.loading} />
      ) : route === "children" && detail === "conversations" ? (
        <ConversationView child={child} loading={family.loading} />
      ) : route === "children" && detail === "rewards" ? (
        <RewardsView child={child} loading={family.loading} />
      ) : route === "children" ? (
        <ChildSettingsView child={child} loading={family.loading} />
      ) : (
        <HomeView data={family.data} loading={family.loading} refresh={family.refresh} />
      )}
    </AppShell>
  );
}

function HomeView({ data, loading, refresh }: { data: FamilyOverview | null; loading: boolean; refresh: () => Promise<void> }) {
  const child = firstChild(data);
  return (
    <div className="grid">
      <section className="hero-band">
        <div>
          <StatusPill>
            <Bot size={14} /> Hermes {data?.hermes.status ?? "checking"}
          </StatusPill>
          <h1>{data?.family.name ?? "Family Control Panel"}</h1>
          <p>
            Configure child profiles, policies, skills, checkpoints, visibility, and safety reporting while Hermes remains the
            runtime source of truth.
          </p>
          <div className="button-row">
            <Link className="btn" href="/parent/onboarding">
              <Plus /> Add child
            </Link>
            <button className="btn secondary" onClick={() => void refresh()}>
              <RefreshCcw /> Refresh Hermes
            </button>
          </div>
        </div>
        <RuntimeMap />
      </section>

      <section className="grid four">
        <div className="metric">
          <strong>{data?.children.length ?? (loading ? "..." : 0)}</strong>
          <span>child profiles</span>
        </div>
        <div className="metric">
          <strong>{child?.agent?.status ?? "none"}</strong>
          <span>active agent state</span>
        </div>
        <div className="metric">
          <strong>{child?.activity?.timeUsedMinutes ?? 0}m</strong>
          <span>today's usage</span>
        </div>
        <div className="metric">
          <strong>{child?.safetyEvents.length ?? 0}</strong>
          <span>Hermes policy events</span>
        </div>
      </section>

      <section className="grid two">
        {data?.children.map((item) => (
          <article className="panel" key={item.id}>
            <div className="panel-header">
              <div>
                <h2>{item.nickname}</h2>
                <p className="muted">
                  {item.ageBand} | {item.readingLevel} | code {item.loginCode}
                </p>
              </div>
              <StatusPill>{item.agent?.status ?? "unprovisioned"}</StatusPill>
            </div>
            <div className="chip-list">
              {item.interests.map((interest) => (
                <span className="chip" key={interest}>
                  {interest}
                </span>
              ))}
            </div>
            <div className="button-row">
              <Link className="btn secondary" href={`/parent/children/${item.id}/hermes-agent`}>
                <Bot /> Agent
              </Link>
              <Link className="btn secondary" href={`/parent/children/${item.id}/policy`}>
                <ShieldCheck /> Policy
              </Link>
              <Link className="btn secondary" href={`/parent/children/${item.id}/skills`}>
                <Store /> Skills
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function OnboardingView({ onDone }: { onDone: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ child: ChildProfile; mapping: HermesAgentMapping } | null>(null);
  const [form, setForm] = useState({
    nickname: "Milo",
    ageBand: "9-12",
    readingLevel: "grade_4",
    interests: "space, drawing, puzzles",
    learningGoals: "Fractions confidence, daily reading",
    parentPolicyPreset: "balanced",
    familyValues: "Encourage patience, kindness, curiosity, and hints-first homework help."
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await apiSend<{ child: ChildProfile; mapping: HermesAgentMapping }>("/api/children", "POST", {
      ...form,
      interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean),
      learningGoals: form.learningGoals.split(",").map((item) => item.trim()).filter(Boolean)
    });
    setCreated(result);
    setSaving(false);
    await onDone();
  };

  return (
    <div className="grid">
      <RouteTitle
        title="Parent onboarding"
        subtitle="Create a child profile and provision one vertically isolated Hermes child agent."
      />
      <section className="panel">
        <form className="grid" onSubmit={submit}>
          <div className="field-grid">
            <label className="field">
              <span>Child nickname</span>
              <input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
            </label>
            <label className="field">
              <span>Age band</span>
              <select value={form.ageBand} onChange={(event) => setForm({ ...form, ageBand: event.target.value })}>
                <option>6-8</option>
                <option>9-12</option>
                <option>13-15</option>
                <option>16-17</option>
              </select>
            </label>
            <label className="field">
              <span>Reading level</span>
              <input value={form.readingLevel} onChange={(event) => setForm({ ...form, readingLevel: event.target.value })} />
            </label>
            <label className="field">
              <span>Starter policy</span>
              <select
                value={form.parentPolicyPreset}
                onChange={(event) => setForm({ ...form, parentPolicyPreset: event.target.value })}
              >
                <option>strict</option>
                <option>balanced</option>
                <option>explorer</option>
                <option>custom</option>
              </select>
            </label>
            <label className="field">
              <span>Interests</span>
              <input value={form.interests} onChange={(event) => setForm({ ...form, interests: event.target.value })} />
            </label>
            <label className="field">
              <span>Learning goals</span>
              <input value={form.learningGoals} onChange={(event) => setForm({ ...form, learningGoals: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Family values overlay</span>
            <textarea value={form.familyValues} onChange={(event) => setForm({ ...form, familyValues: event.target.value })} />
          </label>
          <button className="btn" disabled={saving}>
            <Plus /> {saving ? "Provisioning Hermes agent..." : "Create profile and provision Hermes agent"}
          </button>
        </form>
      </section>
      {created ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{created.child.nickname} is ready</h2>
              <p className="muted">Hermes agent {created.mapping.hermesAgentId} is active and isolated to this child.</p>
            </div>
            <StatusPill>
              <Check size={14} /> active
            </StatusPill>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HermesAgentView({
  child,
  loading,
  refresh
}: {
  child: FamilyChild | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const pauseOrResume = async () => {
    if (!child?.agent) return;
    await apiSend(`/api/hermes/agents/${child.agent.hermesAgentId}/${child.agent.status === "paused" ? "resume" : "pause"}`, "POST", {});
    await refresh();
  };

  if (!child && loading) return <div className="empty-state">Loading Hermes agent...</div>;
  if (!child?.agent) return <div className="empty-state">No Hermes agent mapping found.</div>;

  return (
    <div className="grid">
      <RouteTitle title={`${child.nickname}'s Hermes agent`} subtitle="Runtime state is read from Hermes, not reconstructed in the app." />
      <section className="grid three">
        <div className="metric">
          <strong>{child.agent.status}</strong>
          <span>agent status</span>
        </div>
        <div className="metric">
          <strong>{child.agent.runtimeHealth}</strong>
          <span>runtime health</span>
        </div>
        <div className="metric">
          <strong>{child.agent.installedSkillIds.length}</strong>
          <span>Hermes-attached skills</span>
        </div>
      </section>
      <section className="panel grid">
        <div className="panel-header">
          <h2>{child.agent.hermesAgentId}</h2>
          <button className="btn secondary" onClick={pauseOrResume}>
            <Pause /> {child.agent.status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="table-like">
          {[
            ["Agent type", child.agent.hermesAgentType],
            ["Prompt stack", child.agent.activePromptStackVersion],
            ["Policy pack", child.agent.activePolicyPackVersion],
            ["Model route", child.agent.activeModelRoute],
            ["Memory mode", child.agent.memoryMode],
            ["Last sync", new Date(child.agent.lastSyncedAt).toLocaleString()]
          ].map(([label, value]) => (
            <div className="table-row" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PolicyView({
  child,
  loading,
  refresh
}: {
  child: FamilyChild | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<ParentPolicyCache | null>(null);

  useEffect(() => {
    setPolicy(child?.policy ?? null);
  }, [child?.policy]);

  if (!child && loading) return <div className="empty-state">Loading policy...</div>;
  if (!child || !policy) return <div className="empty-state">No policy cache found.</div>;

  const save = async () => {
    setSaving(true);
    await apiSend(`/api/children/${child.id}/policy`, "PATCH", policy);
    setSaving(false);
    await refresh();
  };

  return (
    <div className="grid">
      <RouteTitle title={`${child.nickname}'s policy controls`} subtitle="Edits are pushed to Hermes as parent policy overlay updates." />
      <section className="panel grid">
        <div className="field-grid">
          <label className="field">
            <span>Daily time limit</span>
            <input
              type="number"
              value={policy.dailyTimeLimitMinutes}
              onChange={(event) => setPolicy({ ...policy, dailyTimeLimitMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Session length</span>
            <input
              type="number"
              value={policy.sessionLimitMinutes}
              onChange={(event) => setPolicy({ ...policy, sessionLimitMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Blocked topics</span>
            <input
              value={policy.blockedTopics.join(", ")}
              onChange={(event) =>
                setPolicy({ ...policy, blockedTopics: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })
              }
            />
          </label>
          <label className="field">
            <span>Parent-review topics</span>
            <input
              value={policy.parentApprovalTopics.join(", ")}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  parentApprovalTopics: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                })
              }
            />
          </label>
          <label className="field">
            <span>Checkpoint bonus enabled</span>
            <select
              value={String(policy.checkpointBonusEnabled)}
              onChange={(event) => setPolicy({ ...policy, checkpointBonusEnabled: event.target.value === "true" })}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label className="field">
            <span>Max bonus minutes</span>
            <input
              type="number"
              value={policy.maxBonusMinutesPerDay}
              onChange={(event) => setPolicy({ ...policy, maxBonusMinutesPerDay: Number(event.target.value) })}
            />
          </label>
        </div>
        <label className="field">
          <span>Family values</span>
          <textarea value={policy.familyValues} onChange={(event) => setPolicy({ ...policy, familyValues: event.target.value })} />
        </label>
        <button className="btn" onClick={save} disabled={saving}>
          <Send /> {saving ? "Pushing to Hermes..." : "Push policy overlay to Hermes"}
        </button>
      </section>
    </div>
  );
}

function SkillsView({
  child,
  loading,
  refresh
}: {
  child: FamilyChild | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    void apiGet<Skill[]>("/api/marketplace/skills").then(setSkills);
  }, []);

  const installed = useMemo(() => new Set(child?.installedSkills.map((skill) => skill.id)), [child?.installedSkills]);

  const toggle = async (skill: Skill) => {
    if (!child) return;
    const action = installed.has(skill.id) ? "uninstall" : "install";
    await apiSend(`/api/children/${child.id}/skills/${skill.id}/${action}`, "POST", {});
    await refresh();
  };

  if (!child && loading) return <div className="empty-state">Loading marketplace...</div>;

  return (
    <div className="grid">
      <RouteTitle title="Skill marketplace approvals" subtitle="Skills attach to the child's Hermes agent and inherit Hermes gates." />
      <section className="grid three">
        {skills.map((skill) => (
          <article className="panel grid" key={skill.id}>
            <div className="panel-header">
              <h3>{skill.name}</h3>
              <StatusPill>{skill.status}</StatusPill>
            </div>
            <p className="muted">{skill.description}</p>
            <div className="chip-list">
              <span className="chip">{skill.category}</span>
              <span className="chip">
                ages {skill.ageMin}-{skill.ageMax}
              </span>
              <span className="chip">{skill.riskLevel} risk</span>
            </div>
            <button className="btn secondary" onClick={() => void toggle(skill)}>
              <Store /> {installed.has(skill.id) ? "Uninstall from Hermes" : "Install through Hermes"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function ActivityView({ child, loading }: { child: FamilyChild | null; loading: boolean }) {
  if (!child && loading) return <div className="empty-state">Loading activity...</div>;
  if (!child?.activity) return <div className="empty-state">No activity summary yet.</div>;
  return (
    <div className="grid">
      <RouteTitle title={`${child.nickname}'s activity summary`} subtitle="Parent-friendly summaries come from Hermes logs and events." />
      <section className="grid three">
        <div className="metric">
          <strong>{child.activity.timeUsedMinutes}m</strong>
          <span>time used today</span>
        </div>
        <div className="metric">
          <strong>{child.activity.skillsUsed.length}</strong>
          <span>skills used</span>
        </div>
        <div className="metric">
          <strong>{child.activity.safetyRedirects}</strong>
          <span>safety redirects</span>
        </div>
      </section>
      <section className="grid two">
        <div className="panel">
          <h2>Learning highlights</h2>
          {child.activity.learningHighlights.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="panel">
          <h2>Conversation starters</h2>
          {child.activity.suggestedConversationStarters.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function ConversationView({ child, loading }: { child: FamilyChild | null; loading: boolean }) {
  if (!child && loading) return <div className="empty-state">Loading conversations...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Conversation review" subtitle="Transcript visibility honors the parent-selected mode." />
      <section className="panel grid">
        <div className="button-row">
          <StatusPill>
            <Eye size={14} /> {child?.policy?.transcriptVisibility ?? "balanced"}
          </StatusPill>
          <span className="chip">summary-only</span>
          <span className="chip">safety-events-only</span>
          <span className="chip">full transcript</span>
        </div>
        {child?.safetyEvents.map((event) => (
          <div className="quest-tile" key={event.id}>
            <strong>{event.category}</strong>
            <p className="muted">{event.summary}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function RewardsView({ child, loading }: { child: FamilyChild | null; loading: boolean }) {
  if (!child && loading) return <div className="empty-state">Loading rewards...</div>;
  return (
    <div className="grid">
      <RouteTitle title="Rewards and checkpoints" subtitle="Bonus time is granted only through Hermes and parent caps." />
      <section className="grid three">
        <div className="panel">
          <Trophy />
          <h2>120 XP</h2>
          <p className="muted">Earned from approved skill progress.</p>
        </div>
        <div className="panel">
          <Unlock />
          <h2>{child?.policy?.maxBonusMinutesPerDay ?? 0}m cap</h2>
          <p className="muted">Daily parent-approved checkpoint bonus cap.</p>
        </div>
        <div className="panel">
          <Clock />
          <h2>{child?.policy?.checkpointBonusEnabled ? "Enabled" : "Off"}</h2>
          <p className="muted">Checkpoint bonus-time rule.</p>
        </div>
      </section>
    </div>
  );
}

function ChildSettingsView({ child, loading }: { child: FamilyChild | null; loading: boolean }) {
  if (!child && loading) return <div className="empty-state">Loading child settings...</div>;
  if (!child) return <div className="empty-state">No child profile found.</div>;
  return (
    <div className="grid">
      <RouteTitle title={`${child.nickname}'s profile`} subtitle="Product metadata stays separate from Hermes runtime behavior." />
      <section className="panel grid">
        <div className="field-grid">
          <div className="metric">
            <strong>{child.ageBand}</strong>
            <span>age band</span>
          </div>
          <div className="metric">
            <strong>{child.transcriptVisibility}</strong>
            <span>visibility</span>
          </div>
        </div>
        <div className="chip-list">
          {child.learningGoals.map((goal) => (
            <span className="chip" key={goal}>
              {goal}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function AlertsView({ data, loading }: { data: FamilyOverview | null; loading: boolean }) {
  const events = data?.children.flatMap((child) => child.safetyEvents.map((event) => ({ ...event, childName: child.nickname }))) ?? [];
  return (
    <div className="grid">
      <RouteTitle title="Parent alerts" subtitle="Immediate alerts are reserved for high-signal Hermes policy events." />
      <section className="panel grid">
        {loading ? <div className="empty-state">Loading alerts...</div> : null}
        {events.map((event) => (
          <div className="quest-tile" key={event.id}>
            <div className="row-between">
              <strong>
                <AlertTriangle size={16} /> {event.childName}: {event.category}
              </strong>
              <StatusPill tone={event.severity === "critical" ? "danger" : event.severity === "medium" ? "warn" : "ok"}>
                {event.severity}
              </StatusPill>
            </div>
            <p className="muted">{event.summary}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function PrivacyView() {
  return (
    <div className="grid">
      <RouteTitle title="Privacy settings" subtitle="MVP controls for consent, retention, export, and delete workflows." />
      <section className="grid two">
        <div className="panel">
          <h2>Data minimization</h2>
          <p className="muted">Collect parent account data, child nickname, age band, policy settings, Hermes mapping, and safety events.</p>
        </div>
        <div className="panel">
          <h2>Training policy</h2>
          <p className="muted">Child conversations are not used to train external models. Provider configuration belongs inside Hermes.</p>
        </div>
        <div className="panel">
          <h2>Retention</h2>
          <p className="muted">Conversation mirroring is minimized and follows parent-selected visibility and retention settings.</p>
        </div>
        <div className="panel">
          <h2>Admin access</h2>
          <p className="muted">Admin access is role-gated and represented in audit logs for review.</p>
        </div>
      </section>
    </div>
  );
}
