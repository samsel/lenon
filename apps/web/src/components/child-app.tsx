"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  Clock,
  Home,
  LogIn,
  MessageCircle,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy
} from "lucide-react";
import type { ChatMessage, Checkpoint, ChildProfile, HermesAgentMapping, Skill } from "@kidsafe/shared";
import { apiGet, apiSend } from "@/lib/api";
import { StatusPill } from "@/components/shell";

type ChildBundle = {
  child: ChildProfile;
  agent: HermesAgentMapping | null;
  installedSkills: Skill[];
  marketplaceSkills: Skill[];
  messages: ChatMessage[];
  policy: {
    sessionLimitMinutes: number;
    checkpointBonusEnabled: boolean;
    maxBonusMinutesPerDay: number;
  } | null;
};

const routes = [
  { href: "/child/home", label: "Home", icon: <Home /> },
  { href: "/child/chat", label: "Chat", icon: <MessageCircle /> },
  { href: "/child/skills", label: "Skills", icon: <Store /> },
  { href: "/child/rewards", label: "Rewards", icon: <Trophy /> }
];

function ChildFrame({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <main className="mobile-stage">
      <section className="phone-shell">
        <header className="child-topbar">
          <div>
            <strong>KidSafe Hermes</strong>
            <div style={{ color: "rgba(255,253,250,.72)", fontSize: 12 }}>child mobile web</div>
          </div>
          <StatusPill>
            <ShieldCheck size={14} /> safe
          </StatusPill>
        </header>
        <div className="child-content">{children}</div>
        <nav className="child-nav" aria-label="Child navigation">
          {routes.map((route) => (
            <Link className={active === route.href ? "active" : ""} href={route.href} key={route.href}>
              {route.icon}
              {route.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}

function useChild(childId = "child_ava") {
  const [bundle, setBundle] = useState<ChildBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setBundle(await apiGet<ChildBundle>(`/api/children/${childId}`));
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [childId]);

  return { bundle, loading, refresh };
}

export function ChildApp({ slug }: { slug: string[] }) {
  const section = slug[0] ?? "home";
  const active = `/child/${section}`;
  const child = useChild();

  return (
    <ChildFrame active={active}>
      {section === "login" ? (
        <ChildLogin />
      ) : section === "chat" ? (
        <ChildChat bundle={child.bundle} loading={child.loading} refresh={child.refresh} />
      ) : section === "skills" && slug[1] ? (
        <SkillDetail skillId={slug[1]} bundle={child.bundle} />
      ) : section === "skills" ? (
        <ChildSkills bundle={child.bundle} loading={child.loading} />
      ) : section === "rewards" ? (
        <ChildRewards bundle={child.bundle} loading={child.loading} />
      ) : section === "break" ? (
        <BreakScreen />
      ) : section === "ask-parent" ? (
        <AskParent />
      ) : (
        <ChildHome bundle={child.bundle} loading={child.loading} />
      )}
    </ChildFrame>
  );
}

function ChildLogin() {
  return (
    <div className="grid">
      <div className="quest-tile">
        <LogIn />
        <h2>Profile code</h2>
        <p className="muted">Use the parent-created profile code. Demo code: AVA-042.</p>
        <input aria-label="Profile code" defaultValue="AVA-042" />
      </div>
      <Link className="btn" href="/child/home">
        <Sparkles /> Continue
      </Link>
    </div>
  );
}

function ChildHome({ bundle, loading }: { bundle: ChildBundle | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Opening your safe space...</div>;
  return (
    <div className="grid">
      <div className="quest-tile" style={{ background: "#12343b", color: "#fffdfa" }}>
        <Sparkles />
        <h1 style={{ margin: "8px 0", fontFamily: "Georgia, serif" }}>Hi {bundle?.child.nickname}</h1>
        <p style={{ color: "rgba(255,253,250,.78)" }}>Choose a quest, continue chat, or ask your parent for help.</p>
      </div>
      <div className="grid two">
        <div className="metric">
          <strong>{bundle?.policy?.sessionLimitMinutes ?? 0}m</strong>
          <span>session limit</span>
        </div>
        <div className="metric">
          <strong>{bundle?.installedSkills.length ?? 0}</strong>
          <span>approved skills</span>
        </div>
      </div>
      <Link className="btn" href="/child/chat">
        <MessageCircle /> Continue chat
      </Link>
      <div className="grid">
        {bundle?.installedSkills.slice(0, 3).map((skill) => (
          <Link href={`/child/skills/${skill.id}`} className="quest-tile" key={skill.id}>
            <strong>{skill.name}</strong>
            <p className="muted">{skill.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ChildChat({
  bundle,
  loading,
  refresh
}: {
  bundle: ChildBundle | null;
  loading: boolean;
  refresh: () => Promise<void>;
}) {
  const [input, setInput] = useState("Can you help me with fractions?");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answer, setAnswer] = useState("1");

  useEffect(() => {
    setMessages(bundle?.messages ?? []);
    setTimeRemaining((bundle?.policy?.sessionLimitMinutes ?? 0) * 60);
  }, [bundle?.messages, bundle?.policy?.sessionLimitMinutes]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bundle || !input.trim()) return;
    setSending(true);
    const optimistic: ChatMessage = {
      id: `local_${Date.now()}`,
      role: "child",
      content: input,
      createdAt: new Date().toISOString()
    };
    setMessages((current) => [...current, optimistic]);
    const response = await apiSend<{
      assistantMessage: ChatMessage;
      checkpoint: Checkpoint | null;
      timeRemainingSeconds: number;
    }>("/api/child/chat", "POST", {
      child_profile_id: bundle.child.id,
      message: input,
      skill_id: selectedSkill(bundle, input)?.id,
      client_context: { screen: "chat", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    });
    setMessages((current) => [...current, response.assistantMessage]);
    setCheckpoint(response.checkpoint);
    setTimeRemaining(response.timeRemainingSeconds);
    setInput("");
    setSending(false);
    await refresh();
  };

  const submitCheckpoint = async () => {
    if (!bundle || !checkpoint) return;
    const result = await apiSend<{ status: string; timeRemainingSeconds: number }>("/api/child/checkpoints/" + checkpoint.id + "/submit", "POST", {
      child_profile_id: bundle.child.id,
      answer
    });
    setTimeRemaining(result.timeRemainingSeconds);
    setCheckpoint({ ...checkpoint, status: result.status === "passed" ? "passed" : "failed" });
  };

  if (loading) return <div className="empty-state">Starting Hermes chat...</div>;

  return (
    <div className="grid">
      <div className="row-between">
        <StatusPill>
          <Bot size={14} /> {bundle?.agent?.status ?? "no agent"}
        </StatusPill>
        <span className="chip">
          <Clock size={13} /> {Math.ceil(timeRemaining / 60)}m left
        </span>
      </div>
      <div className="chat-log">
        {messages.map((message) => (
          <div className={`bubble ${message.role === "child" ? "child" : "assistant"}`} key={message.id}>
            {message.content}
            {message.policyAction && message.policyAction !== "allow" ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "#5f6d66" }}>Hermes: {message.policyAction}</div>
            ) : null}
          </div>
        ))}
      </div>
      {checkpoint ? (
        <div className="checkpoint-box">
          <strong>{checkpoint.prompt}</strong>
          <select value={answer} onChange={(event) => setAnswer(event.target.value)}>
            {checkpoint.options?.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button className="btn secondary" onClick={submitCheckpoint}>
            <Trophy /> Submit checkpoint
          </button>
          <span className="muted">Status: {checkpoint.status}</span>
        </div>
      ) : null}
      <form className="chat-form" onSubmit={send}>
        <input value={input} onChange={(event) => setInput(event.target.value)} aria-label="Message Hermes" />
        <button className="btn" disabled={sending}>
          <Send />
        </button>
      </form>
      <div className="button-row">
        <Link className="btn ghost" href="/child/ask-parent">
          Ask parent
        </Link>
        <Link className="btn ghost" href="/child/break">
          I feel stuck
        </Link>
      </div>
    </div>
  );
}

function selectedSkill(bundle: ChildBundle, message: string) {
  const text = message.toLowerCase();
  if (/fraction|math|multiply|divide/.test(text)) return bundle.installedSkills.find((skill) => skill.id === "skill_math_quest");
  if (/story|character/.test(text)) return bundle.installedSkills.find((skill) => skill.id === "skill_story_builder");
  if (/science|space|moon/.test(text)) return bundle.installedSkills.find((skill) => skill.id === "skill_science_explainer");
  return undefined;
}

function ChildSkills({ bundle, loading }: { bundle: ChildBundle | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Loading your approved skills...</div>;
  return (
    <div className="grid">
      <h1 style={{ margin: 0, fontFamily: "Georgia, serif" }}>Skill shelf</h1>
      {bundle?.installedSkills.map((skill) => (
        <Link className="quest-tile" href={`/child/skills/${skill.id}`} key={skill.id}>
          <strong>{skill.name}</strong>
          <p className="muted">{skill.description}</p>
          <span className="chip">Runs inside Hermes</span>
        </Link>
      ))}
    </div>
  );
}

function SkillDetail({ skillId, bundle }: { skillId: string; bundle: ChildBundle | null }) {
  const skill = bundle?.installedSkills.find((item) => item.id === skillId);
  if (!skill) return <div className="empty-state">This skill needs parent approval first.</div>;
  return (
    <div className="grid">
      <div className="quest-tile">
        <BookOpen />
        <h1 style={{ margin: "8px 0", fontFamily: "Georgia, serif" }}>{skill.name}</h1>
        <p className="muted">{skill.manifest.long_description}</p>
      </div>
      <Link className="btn" href={`/child/chat?skill=${skill.id}`}>
        <MessageCircle /> Start with Hermes
      </Link>
      <div className="chip-list">
        {skill.manifest.permissions.slice(0, 4).map((permission) => (
          <span className="chip" key={permission}>
            {permission}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChildRewards({ bundle, loading }: { bundle: ChildBundle | null; loading: boolean }) {
  if (loading) return <div className="empty-state">Counting rewards...</div>;
  const badges = ["Kind explainer", "Fraction finder", "Space questioner"];
  return (
    <div className="grid">
      <div className="quest-tile" style={{ background: "#e1b84c" }}>
        <Trophy />
        <h1 style={{ margin: "8px 0", fontFamily: "Georgia, serif" }}>120 XP</h1>
        <p>Bonus minutes are capped at {bundle?.policy?.maxBonusMinutesPerDay ?? 0} each day.</p>
      </div>
      {badges.map((badge) => (
        <div className="quest-tile" key={badge}>
          <strong>{badge}</strong>
          <p className="muted">Unlocked through approved learning progress.</p>
        </div>
      ))}
    </div>
  );
}

function BreakScreen() {
  return (
    <div className="grid">
      <div className="quest-tile">
        <Moon />
        <h1 style={{ margin: "8px 0", fontFamily: "Georgia, serif" }}>Tiny reset</h1>
        <p className="muted">Look away from the screen, stretch your hands, and find one blue thing in the room.</p>
      </div>
      <Link className="btn" href="/child/chat">
        Return when ready
      </Link>
    </div>
  );
}

function AskParent() {
  return (
    <div className="grid">
      <div className="quest-tile">
        <MessageCircle />
        <h1 style={{ margin: "8px 0", fontFamily: "Georgia, serif" }}>Ask parent</h1>
        <p className="muted">Hermes can help you send a clear request without private details.</p>
      </div>
      <textarea defaultValue="Can I have help choosing my next learning activity?" />
      <Link className="btn" href="/child/home">
        Send request
      </Link>
    </div>
  );
}
