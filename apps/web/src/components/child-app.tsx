"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Home,
  LogIn,
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
  Volume2,
  VolumeX,
  Wand2
} from "lucide-react";
import type { ChatMessage, Checkpoint, ChildProfile, HermesAgentMapping, ParentPolicyCache, Skill } from "@kidsafe/shared";
import { apiGet, apiSend } from "@/lib/api";
import { StatusPill } from "@/components/shell";
import { LenonAudio, type Sfx } from "@/lib/lenon-audio";
import { AGE_CONFIG, type BlockedTopics, type LenonAgeBand, safetyGate } from "@/lib/lenon-safety";
import {
  LENON_SKILLS,
  STORY_OPTIONS,
  buildContinuePrompt,
  buildStoryPrompt,
  cleanStory,
  genMathProblem,
  skillMeta,
  type MathProblem
} from "@/lib/lenon-skills";

type ChildBundle = {
  child: ChildProfile;
  agent: HermesAgentMapping | null;
  installedSkills: Skill[];
  marketplaceSkills: Skill[];
  messages: ChatMessage[];
  policy: ParentPolicyCache | null;
};

type AudioControls = {
  soundOn: boolean;
  play: (name: Sfx) => void;
  toggle: () => void;
};

type CatchState = {
  category: string;
  reply: string;
};

const routes = [
  { href: "/child/home", label: "Home", icon: <Home /> },
  { href: "/child/chat", label: "Chat", icon: <MessageCircle /> },
  { href: "/child/skills", label: "Skills", icon: <Store /> },
  { href: "/child/rewards", label: "Rewards", icon: <Trophy /> }
];

function useLenonAudio(): AudioControls {
  const audio = useRef<LenonAudio | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  if (!audio.current && typeof window !== "undefined") audio.current = new LenonAudio();

  return {
    soundOn,
    play: (name) => audio.current?.sfx(name),
    toggle: () => {
      const enabled = audio.current?.toggle() ?? !soundOn;
      setSoundOn(enabled);
    }
  };
}

function LenonFace({
  size = 112,
  thinking,
  happy,
  dark
}: {
  size?: number;
  thinking?: boolean;
  happy?: boolean;
  dark?: boolean;
}) {
  const style = { "--lenon-size": `${size}px` } as CSSProperties;
  return (
    <div
      className={`lenon-face ${thinking ? "thinking" : ""} ${happy ? "happy" : ""} ${dark ? "dark" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <span className="lenon-antenna" />
      <span className="lenon-ear left" />
      <span className="lenon-ear right" />
      <span className="lenon-head">
        <span className="lenon-eye" />
        <span className="lenon-mouth" />
      </span>
    </div>
  );
}

function LenonMark() {
  return (
    <span className="lenon-mark" aria-hidden="true">
      <span className="lenon-antenna" />
      <span className="lenon-ear left" />
      <span className="lenon-ear right" />
      <span className="lenon-head">
        <span className="lenon-eye" />
        <span className="lenon-mouth" />
      </span>
    </span>
  );
}

function ChildFrame({
  active,
  audio,
  children
}: {
  active: string;
  audio: AudioControls;
  children: ReactNode;
}) {
  return (
    <main className="mobile-stage">
      <section className="phone-shell" aria-label="Lenon child app">
        <header className="child-topbar">
          <Link className="child-brand" href="/child/home" onClick={() => audio.play("tap")}>
            <LenonMark />
            <span>
              <strong>Lenon</strong>
              <span>Safe learning space</span>
            </span>
          </Link>
          <div className="child-actions">
            <button className="icon-btn" onClick={audio.toggle} aria-label={audio.soundOn ? "Turn sound off" : "Turn sound on"}>
              {audio.soundOn ? <Volume2 /> : <VolumeX />}
            </button>
            <StatusPill>
              <ShieldCheck size={14} /> safe
            </StatusPill>
          </div>
        </header>
        <div className="child-content">{children}</div>
        <nav className="child-nav" aria-label="Child navigation">
          {routes.map((route) => (
            <Link
              className={active === route.href ? "active" : ""}
              href={route.href}
              key={route.href}
              onClick={() => audio.play("tap")}
            >
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
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setBundle(await apiGet<ChildBundle>(`/api/children/${childId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Lenon.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [childId]);

  return { bundle, loading, error, refresh };
}

function normalizeAgeBand(ageBand?: ChildProfile["ageBand"]): LenonAgeBand {
  if (ageBand === "6-8" || ageBand === "9-12") return ageBand;
  return "13-15";
}

function blockedFromPolicy(policy: ParentPolicyCache | null): BlockedTopics {
  const blocked = (policy?.blockedTopics ?? []).join(" ").toLowerCase();
  return {
    violence: /weapon|gun|scary|violence|fight|blood/.test(blocked) || !policy,
    dating: /dating|crush|relationship/.test(blocked) || !policy,
    politics: /politic|election|news/.test(blocked)
  };
}

function installedSkill(bundle: ChildBundle | null, skillId?: string) {
  if (!skillId) return undefined;
  return bundle?.installedSkills.find((skill) => skill.id === skillId);
}

function selectedSkill(bundle: ChildBundle, message: string, activeSkillId?: string | null) {
  const active = installedSkill(bundle, activeSkillId ?? undefined);
  if (active) return active;
  const text = message.toLowerCase();
  if (/fraction|math|multiply|divide|number/.test(text)) return installedSkill(bundle, "skill_math_quest");
  if (/story|character|dragon|robot/.test(text)) return installedSkill(bundle, "skill_story_builder");
  if (/science|space|moon|planet|experiment/.test(text)) return installedSkill(bundle, "skill_science_explainer");
  if (/read|book|word|vocab/.test(text)) return installedSkill(bundle, "skill_reading_buddy");
  if (/code|debug|python|scratch/.test(text)) return installedSkill(bundle, "skill_code_playground");
  return undefined;
}

function policyCategory(category: string) {
  if (category === "personal data") return "privacy_pii_protection";
  if (category === "self-harm") return "self_harm";
  if (category === "violence") return "dangerous_instructions";
  return `client_${category.replace(/\s+/g, "_")}`;
}

export function ChildApp({ slug }: { slug: string[] }) {
  const section = slug[0] ?? "home";
  const active =
    section === "skills" || section === "math-quest" || section === "story-builder"
      ? "/child/skills"
      : section === "break" || section === "ask-parent"
        ? "/child/chat"
        : `/child/${section}`;
  const child = useChild();
  const audio = useLenonAudio();

  return (
    <ChildFrame active={active} audio={audio}>
      {child.error ? <div className="empty-state">{child.error}</div> : null}
      {section === "login" ? (
        <ChildLogin audio={audio} />
      ) : section === "chat" ? (
        <ChildChat bundle={child.bundle} loading={child.loading} refresh={child.refresh} audio={audio} />
      ) : section === "skills" && slug[1] ? (
        <SkillWorld skillId={slug[1]} bundle={child.bundle} audio={audio} />
      ) : section === "skills" ? (
        <ChildSkills bundle={child.bundle} loading={child.loading} audio={audio} />
      ) : section === "math-quest" ? (
        <MathQuest audio={audio} />
      ) : section === "story-builder" ? (
        <StoryBuilder bundle={child.bundle} loading={child.loading} audio={audio} />
      ) : section === "rewards" ? (
        <ChildRewards bundle={child.bundle} loading={child.loading} audio={audio} />
      ) : section === "break" ? (
        <BreakScreen audio={audio} />
      ) : section === "ask-parent" ? (
        <AskParent audio={audio} />
      ) : (
        <ChildHome bundle={child.bundle} loading={child.loading} audio={audio} />
      )}
    </ChildFrame>
  );
}

function ChildLogin({ audio }: { audio: AudioControls }) {
  return (
    <div className="grid">
      <div className="child-hero">
        <LenonFace happy dark />
        <span className="child-kicker">Profile code</span>
        <h1 className="kid-title">Step into Lenon</h1>
        <p>Use the profile code your grown-up made for you.</p>
      </div>
      <label className="field">
        <span>Code</span>
        <input aria-label="Profile code" defaultValue="AVA-042" />
      </label>
      <Link className="btn" href="/child/home" onClick={() => audio.play("enter")}>
        <LogIn /> Continue
      </Link>
    </div>
  );
}

function ChildHome({ bundle, loading, audio }: { bundle: ChildBundle | null; loading: boolean; audio: AudioControls }) {
  const age = normalizeAgeBand(bundle?.child.ageBand);
  const cfg = AGE_CONFIG[age];
  if (loading) return <div className="empty-state">Opening Lenon...</div>;

  return (
    <div className="grid">
      <section className="child-hero">
        <LenonFace happy dark />
        <span className="child-kicker">{bundle?.child.nickname}'s space</span>
        <h1>{age === "9-12" ? `Hi ${bundle?.child.nickname}!` : cfg.greet}</h1>
        <p>{cfg.sub}</p>
      </section>

      <div className="metric-strip">
        <div>
          <strong>{bundle?.policy?.sessionLimitMinutes ?? 0}m</strong>
          <span>session</span>
        </div>
        <div>
          <strong>120</strong>
          <span>XP</span>
        </div>
        <div>
          <strong>{bundle?.installedSkills.length ?? 0}</strong>
          <span>skills</span>
        </div>
      </div>

      <Link className="quest-row" href="/child/chat" onClick={() => audio.play("tap")}>
        <span className="skill-glyph">?</span>
        <span>
          <strong>Ask Lenon anything</strong>
          <span>Homework hints, ideas, stories, and curious questions.</span>
        </span>
        <MessageCircle />
      </Link>

      <div className="grid">
        {bundle?.installedSkills.slice(0, 4).map((skill) => {
          const meta = skillMeta(skill.id);
          return (
            <Link className="quest-row" href={`/child/skills/${skill.id}`} key={skill.id} onClick={() => audio.play("tap")}>
              <span className="skill-glyph" style={{ background: meta?.bg }}>
                {meta?.glyph ?? "•"}
              </span>
              <span>
                <strong>{meta?.name ?? skill.name}</strong>
                <span>{meta?.tag ?? skill.description}</span>
              </span>
              <Sparkles />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ChildChat({
  bundle,
  loading,
  refresh,
  audio
}: {
  bundle: ChildBundle | null;
  loading: boolean;
  refresh: () => Promise<void>;
  audio: AudioControls;
}) {
  const [input, setInput] = useState("Can you help me with fractions?");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answer, setAnswer] = useState("1");
  const [catchState, setCatchState] = useState<CatchState | null>(null);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

  const activeMeta = useMemo(() => skillMeta(activeSkillId ?? undefined), [activeSkillId]);

  useEffect(() => {
    setMessages(bundle?.messages ?? []);
    setTimeRemaining((bundle?.policy?.sessionLimitMinutes ?? 0) * 60);
  }, [bundle?.messages, bundle?.policy?.sessionLimitMinutes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSkill = params.get("skill") ?? window.sessionStorage.getItem("lenon-active-skill");
    if (requestedSkill && skillMeta(requestedSkill)) {
      setActiveSkillId(requestedSkill);
      window.sessionStorage.removeItem("lenon-active-skill");
    }
  }, []);

  useEffect(() => {
    if (!bundle || sessionId) return;
    let cancelled = false;
    const start = async () => {
      const response = await apiSend<{ sessionId: string; timeRemainingSeconds: number }>("/api/child/session/start", "POST", {
        child_profile_id: bundle.child.id,
        reset: false
      });
      if (!cancelled) {
        setSessionId(response.sessionId);
        setTimeRemaining(response.timeRemainingSeconds);
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [bundle, sessionId]);

  const newChat = async () => {
    if (!bundle) return;
    setStarting(true);
    audio.play("tap");
    const response = await apiSend<{ sessionId: string; intro: string; timeRemainingSeconds: number }>(
      "/api/child/session/start",
      "POST",
      {
        child_profile_id: bundle.child.id,
        reset: true
      }
    );
    setSessionId(response.sessionId);
    setMessages([
      {
        id: `session_${Date.now()}`,
        role: "assistant",
        content: response.intro,
        policyAction: "allow",
        createdAt: new Date().toISOString()
      }
    ]);
    setCheckpoint(null);
    setTimeRemaining(response.timeRemainingSeconds);
    setStarting(false);
    await refresh();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!bundle || !input.trim() || sending) return;

    const text = input.trim();
    const gateHit = safetyGate(text, blockedFromPolicy(bundle.policy));
    if (gateHit) {
      setSending(true);
      setInput("");
      setCatchState({ category: gateHit.category, reply: gateHit.reply });
      audio.play("gentle");
      void apiSend("/api/child/safety-event", "POST", {
        child_profile_id: bundle.child.id,
        category: policyCategory(gateHit.category),
        action: gateHit.action,
        severity: gateHit.category === "self-harm" ? "critical" : gateHit.category === "violence" ? "medium" : "low",
        summary: `Lenon caught a ${gateHit.category} request in the child UI before calling Hermes.`
      }).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 2300));
      setMessages((current) => [
        ...current,
        {
          id: `client_gate_${Date.now()}`,
          role: "assistant",
          content: gateHit.reply,
          policyAction: gateHit.action,
          createdAt: new Date().toISOString()
        }
      ]);
      setCatchState(null);
      setSending(false);
      return;
    }

    setSending(true);
    audio.play("send");
    const optimistic: ChatMessage = {
      id: `local_${Date.now()}`,
      role: "child",
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages((current) => [...current, optimistic]);
    setInput("");

    try {
      const skill = selectedSkill(bundle, text, activeSkillId);
      const response = await apiSend<{
        assistantMessage: ChatMessage;
        checkpoint: Checkpoint | null;
        timeRemainingSeconds: number;
      }>("/api/child/chat", "POST", {
        child_profile_id: bundle.child.id,
        message: text,
        skill_id: skill?.id,
        session_id: sessionId,
        client_context: {
          screen: "chat",
          activeSkill: activeSkillId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
      setMessages((current) => [...current, response.assistantMessage]);
      setCheckpoint(response.checkpoint);
      setTimeRemaining(response.timeRemainingSeconds);
      audio.play(response.checkpoint ? "star" : "receive");
      await refresh();
    } finally {
      setSending(false);
    }
  };

  const submitCheckpoint = async () => {
    if (!bundle || !checkpoint) return;
    audio.play("tap");
    const result = await apiSend<{ status: string; timeRemainingSeconds: number }>("/api/child/checkpoints/" + checkpoint.id + "/submit", "POST", {
      child_profile_id: bundle.child.id,
      answer
    });
    setTimeRemaining(result.timeRemainingSeconds);
    setCheckpoint({ ...checkpoint, status: result.status === "passed" ? "passed" : "failed" });
    audio.play(result.status === "passed" ? "success" : "gentle");
  };

  if (loading) return <div className="empty-state">Starting Lenon chat...</div>;

  return (
    <div className="grid">
      {catchState ? <CatchOverlay catchState={catchState} /> : null}
      <div className="row-between">
        <StatusPill>
          <ShieldCheck size={14} /> {bundle?.agent?.status ?? "no agent"}
        </StatusPill>
        <span className="chip">
          <Clock size={13} /> {Math.max(0, Math.ceil(timeRemaining / 60))}m left
        </span>
      </div>

      {activeMeta ? (
        <div className="quest-row">
          <span className="skill-glyph" style={{ background: activeMeta.bg }}>
            {activeMeta.glyph}
          </span>
          <span>
            <strong>{activeMeta.name}</strong>
            <span>{activeMeta.short}</span>
          </span>
          <button className="icon-btn dark" onClick={() => setActiveSkillId(null)} aria-label="Leave skill mode">
            <ArrowLeft />
          </button>
        </div>
      ) : null}

      <div className="chat-log" aria-live="polite">
        {messages.map((message) => (
          <div className={`bubble ${message.role === "child" ? "child" : "assistant"}`} key={message.id}>
            {message.content}
            {message.policyAction && message.policyAction !== "allow" ? (
              <span className="bubble-meta">Lenon safety: {message.policyAction.replace(/_/g, " ")}</span>
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

      <div className="quick-grid" aria-label="Quick prompts">
        {["Help with fractions", "Tell me a space fact", "Start a kind story", "Can I chat longer?"].map((prompt) => (
          <button key={prompt} onClick={() => setInput(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-form" onSubmit={send}>
        <input value={input} onChange={(event) => setInput(event.target.value)} aria-label="Message Lenon" />
        <button className="btn" disabled={sending}>
          <Send />
        </button>
      </form>
      <div className="button-row">
        <button className="btn ghost" onClick={() => void newChat()} disabled={starting || sending}>
          <RefreshCw /> New chat
        </button>
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

function CatchOverlay({ catchState }: { catchState: CatchState }) {
  return (
    <div className="catch-overlay" role="status" aria-live="assertive">
      <div className="catch-card">
        <div className="catch-rings">
          <LenonFace size={86} thinking happy />
        </div>
        <h2>Let's keep that safe</h2>
        <p>{catchState.reply}</p>
      </div>
    </div>
  );
}

function ChildSkills({ bundle, loading, audio }: { bundle: ChildBundle | null; loading: boolean; audio: AudioControls }) {
  if (loading) return <div className="empty-state">Loading your approved skills...</div>;
  const installedIds = new Set(bundle?.installedSkills.map((skill) => skill.id));

  return (
    <div className="grid">
      <div className="child-hero">
        <LenonFace dark happy />
        <span className="child-kicker">Skill worlds</span>
        <h1>Choose a world</h1>
        <p>Every world runs through Ava's parent-approved Lenon settings and Hermes safety path.</p>
      </div>
      <div className="world-grid">
        {LENON_SKILLS.map((meta) => {
          const approved = installedIds.has(meta.id);
          return (
            <Link
              className="quest-row"
              href={approved ? `/child/skills/${meta.id}` : "/child/ask-parent"}
              key={meta.id}
              onClick={() => audio.play(approved ? "tap" : "gentle")}
            >
              <span className="skill-glyph" style={{ background: meta.bg }}>
                {meta.glyph}
              </span>
              <span>
                <strong>{meta.name}</strong>
                <span>{approved ? meta.tag : "Ask your grown-up to approve this skill."}</span>
              </span>
              <span className="chip">{approved ? "Ready" : "Locked"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SkillWorld({ skillId, bundle, audio }: { skillId: string; bundle: ChildBundle | null; audio: AudioControls }) {
  const skill = installedSkill(bundle, skillId);
  const meta = skillMeta(skill?.id ?? skillId);
  if (!meta || !skill) {
    return (
      <div className="grid">
        <div className="empty-state">This skill needs parent approval first.</div>
        <Link className="btn" href="/child/ask-parent" onClick={() => audio.play("tap")}>
          Ask parent
        </Link>
      </div>
    );
  }

  const worldStyle = { "--world-bg": meta.bg, "--world-accent": meta.accent } as CSSProperties;
  const startHref =
    meta.id === "skill_math_quest" ? "/child/math-quest" : meta.id === "skill_story_builder" ? "/child/story-builder" : "/child/chat";

  const startGuidedChat = () => {
    audio.play("enter");
    if (meta.id !== "skill_math_quest" && meta.id !== "skill_story_builder") {
      window.sessionStorage.setItem("lenon-active-skill", meta.id);
    }
  };

  return (
    <div className="grid">
      <section className="skill-world" style={worldStyle}>
        <div className="skill-world-head">
          <span className="world-symbol">{meta.glyph}</span>
          <LenonFace size={96} dark happy />
          <span className="child-kicker">Lenon world</span>
          <h1>{meta.name}</h1>
          <p>{meta.tag}</p>
        </div>
        <div className="world-actions">
          <Link className="btn" href={startHref} onClick={startGuidedChat}>
            <Sparkles /> Enter
          </Link>
          <Link className="btn ghost" href="/child/skills" onClick={() => audio.play("tap")}>
            <ArrowLeft /> Shelf
          </Link>
        </div>
      </section>
      <div className="kid-card">
        <strong>Why this is safe</strong>
        <p className="muted">{skill.manifest.long_description}</p>
        <div className="chip-list">
          {skill.manifest.permissions.slice(0, 4).map((permission) => (
            <span className="chip" key={permission}>
              {permission.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MathQuest({ audio }: { audio: AudioControls }) {
  const [level, setLevel] = useState(0);
  const [stars, setStars] = useState(0);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [feedback, setFeedback] = useState("Pick an answer to light the next star.");
  const complete = level >= 6;

  useEffect(() => {
    setProblem(genMathProblem(0));
  }, []);

  const choose = (choice: number) => {
    if (complete || !problem) return;
    if (choice === problem.ans) {
      const nextLevel = level + 1;
      setStars((current) => current + 1);
      setLevel(nextLevel);
      setFeedback(nextLevel >= 6 ? "Quest complete. Beautiful work." : "Correct. Onward to the next puzzle.");
      audio.play(nextLevel >= 6 ? "success" : "star");
      if (nextLevel < 6) setProblem(genMathProblem(nextLevel));
    } else {
      setFeedback("Try again. Look for the operation sign first.");
      audio.play("gentle");
    }
  };

  const reset = () => {
    audio.play("tap");
    setLevel(0);
    setStars(0);
    setProblem(genMathProblem(0));
    setFeedback("Pick an answer to light the next star.");
  };

  return (
    <div className="grid">
      <div className="row-between">
        <Link className="btn ghost" href="/child/skills/skill_math_quest" onClick={() => audio.play("tap")}>
          <ArrowLeft /> Math world
        </Link>
        <span className="chip">Stars: {stars}/6</span>
      </div>
      <div className="math-trail" aria-label="Math Quest progress">
        {Array.from({ length: 6 }).map((_, index) => (
          <span className={`math-node ${index < level ? "done" : index === level ? "active" : ""}`} key={index}>
            {index < level ? <Check size={18} /> : index + 1}
          </span>
        ))}
      </div>
      <section className="math-panel">
        <LenonFace happy={complete} thinking={!complete} />
        <h1 className="kid-title">{complete ? "Quest complete!" : "Number trail"}</h1>
        <p className="muted">{feedback}</p>
        {!problem ? (
          <div className="empty-state">Drawing a fresh number trail...</div>
        ) : complete ? (
          <button className="btn" onClick={reset}>
            <RefreshCw /> Play again
          </button>
        ) : (
          <>
            <div className="math-problem">{problem.text}</div>
            <div className="math-choices">
              {problem.choices.map((choice) => (
                <button className="math-choice" key={choice} onClick={() => choose(choice)}>
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StoryBuilder({
  bundle,
  loading,
  audio
}: {
  bundle: ChildBundle | null;
  loading: boolean;
  audio: AudioControls;
}) {
  const [hero, setHero] = useState(0);
  const [place, setPlace] = useState(0);
  const [problem, setProblem] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingStory, setLoadingStory] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const ensureSession = async () => {
    if (sessionId || !bundle) return sessionId;
    const response = await apiSend<{ sessionId: string }>("/api/child/session/start", "POST", {
      child_profile_id: bundle.child.id,
      reset: false
    });
    setSessionId(response.sessionId);
    return response.sessionId;
  };

  const askStory = async (message: string) => {
    if (!bundle) return;
    setLoadingStory(true);
    audio.play("send");
    try {
      const activeSession = await ensureSession();
      const response = await Promise.race([
        apiSend<{ assistantMessage: ChatMessage }>("/api/child/chat", "POST", {
          child_profile_id: bundle.child.id,
          session_id: activeSession,
          skill_id: "skill_story_builder",
          message,
          client_context: { screen: "story-builder" }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Story request timed out.")), 12000))
      ]);
      setPages((current) => [...current, cleanStory(response.assistantMessage.content)]);
      audio.play("receive");
    } catch {
      setPages((current) => [
        ...current,
        "The friendly robot opened a tiny map that shimmered with starlight. It pointed toward a safe path where every brave step helped a new friend."
      ]);
      audio.play("gentle");
    } finally {
      setLoadingStory(false);
    }
  };

  const startStory = () => {
    const h = STORY_OPTIONS.heroes[hero].label;
    const p = STORY_OPTIONS.places[place].label;
    const pr = STORY_OPTIONS.problems[problem].label;
    void askStory(buildStoryPrompt(h, p, pr));
  };

  const continueStory = (flavor: string) => {
    void askStory(buildContinuePrompt(pages.join("\n\n"), flavor));
  };

  if (loading) return <div className="empty-state">Opening Story Builder...</div>;

  return (
    <div className="grid">
      <div className="row-between">
        <Link className="btn ghost" href="/child/skills/skill_story_builder" onClick={() => audio.play("tap")}>
          <ArrowLeft /> Story world
        </Link>
        <span className="chip">{pages.length ? `${pages.length} pages` : "New story"}</span>
      </div>
      <section className="kid-card">
        <LenonFace happy />
        <h1 className="kid-title">Build a story</h1>
        <p className="muted">Choose three ingredients, then Lenon will write a safe storybook page through Hermes.</p>
      </section>
      <div className="story-picker">
        <StoryOptionRow title="Hero" options={STORY_OPTIONS.heroes} value={hero} onChange={setHero} />
        <StoryOptionRow title="Place" options={STORY_OPTIONS.places} value={place} onChange={setPlace} />
        <StoryOptionRow title="Adventure" options={STORY_OPTIONS.problems} value={problem} onChange={setProblem} />
      </div>
      <button className="btn" onClick={startStory} disabled={loadingStory}>
        <Wand2 /> {pages.length ? "Start a new page" : "Write the first page"}
      </button>
      {pages.length ? (
        <section className="story-book">
          {pages.map((page, index) => (
            <article className="story-page" key={`${index}-${page.slice(0, 12)}`}>
              <strong>Page {index + 1}</strong>
              <p>{page}</p>
            </article>
          ))}
          <div className="quick-grid">
            {["braver", "funnier", "kinder", "more mysterious"].map((flavor) => (
              <button key={flavor} onClick={() => continueStory(flavor)} disabled={loadingStory}>
                Make it {flavor}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StoryOptionRow({
  title,
  options,
  value,
  onChange
}: {
  title: string;
  options: Array<{ short: string; label: string; emoji: string }>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="story-row">
      <strong>{title}</strong>
      <div className="story-options">
        {options.map((option, index) => (
          <button className={`story-option ${value === index ? "active" : ""}`} key={option.short} onClick={() => onChange(index)}>
            <span>{option.emoji}</span>
            {option.short}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChildRewards({ bundle, loading, audio }: { bundle: ChildBundle | null; loading: boolean; audio: AudioControls }) {
  const [claimed, setClaimed] = useState(false);
  if (loading) return <div className="empty-state">Counting rewards...</div>;
  const badges = [
    ["∑", "Fraction finder"],
    ["✦", "Kind storyteller"],
    ["◎", "Space questioner"]
  ];

  return (
    <div className="grid">
      {claimed ? (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 16 }).map((_, index) => (
            <i key={index} style={{ left: `${8 + index * 6}%`, animationDelay: `${(index % 5) * 0.08}s` }} />
          ))}
        </div>
      ) : null}
      <div className="child-hero">
        <LenonFace happy dark />
        <span className="child-kicker">Reward board</span>
        <h1>{claimed ? "140 XP" : "120 XP"}</h1>
        <p>Bonus minutes stay capped at {bundle?.policy?.maxBonusMinutesPerDay ?? 0} each day.</p>
      </div>
      <button
        className="btn"
        onClick={() => {
          setClaimed(true);
          audio.play("success");
        }}
      >
        <Trophy /> Claim today's sparkle
      </button>
      <div className="reward-grid">
        {badges.map(([glyph, label]) => (
          <div className="reward-badge" key={label}>
            <span>{glyph}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakScreen({ audio }: { audio: AudioControls }) {
  return (
    <div className="grid">
      <section className="kid-card">
        <Moon />
        <h1 className="kid-title">Tiny reset</h1>
        <p className="muted">Look away from the screen, stretch your hands, and find one blue thing in the room.</p>
      </section>
      <Link className="btn" href="/child/chat" onClick={() => audio.play("enter")}>
        Return when ready
      </Link>
    </div>
  );
}

function AskParent({ audio }: { audio: AudioControls }) {
  return (
    <div className="grid">
      <section className="kid-card">
        <BookOpen />
        <h1 className="kid-title">Ask a grown-up</h1>
        <p className="muted">Lenon can help you send a clear request without private details.</p>
      </section>
      <textarea defaultValue="Can I have help choosing my next learning activity?" />
      <Link className="btn" href="/child/home" onClick={() => audio.play("success")}>
        Send request
      </Link>
    </div>
  );
}
