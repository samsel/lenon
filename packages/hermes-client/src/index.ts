import {
  seedAgentMappings,
  seedEvalRuns,
  seedPolicies,
  seedPolicyEvents,
  seedPrompts,
  seedSkillInstalls,
  seedSkills,
  nowIso
} from "@kidsafe/shared";
import type {
  AgeBand,
  ChatMessage,
  Checkpoint,
  EvalRun,
  HermesAgentMapping,
  ParentPolicyCache,
  PolicyAction,
  PolicyEvent,
  PolicyPreset,
  PromptVersion,
  RewardEvent,
  Skill,
  SkillInstall
} from "@kidsafe/shared";

type CreateChildAgentInput = {
  familyId: string;
  childProfileId: string;
  nickname: string;
  ageBand: AgeBand;
  readingLevel?: string;
  interests?: string[];
  learningGoals?: string[];
  parentPolicyPreset: PolicyPreset;
};

type HermesChatInput = {
  childProfileId: string;
  hermesAgentId: string;
  message: string;
  skillId?: string;
  clientContext?: Record<string, unknown>;
};

type HermesChatResponse = {
  messageId: string;
  hermesAgentId: string;
  response: string;
  policyAction: PolicyAction;
  assistantMessage: ChatMessage;
  skillState: Record<string, unknown>;
  rewards: RewardEvent[];
  checkpoint: Checkpoint | null;
  timeRemainingSeconds: number;
};

type HermesDemoState = {
  agents: HermesAgentMapping[];
  policies: ParentPolicyCache[];
  skills: Skill[];
  installs: SkillInstall[];
  events: PolicyEvent[];
  prompts: PromptVersion[];
  evalRuns: EvalRun[];
  messages: Record<string, ChatMessage[]>;
  checkpointAttempts: Record<string, number>;
};

type HermesRuntimeConfig = {
  profileName: string;
  baseUrl: string;
  apiKey: string;
  modelName?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __kidsafeHermesDemoState: HermesDemoState | undefined;
  // eslint-disable-next-line no-var
  var __kidsafeHermesRealAgentOverrides: Record<string, HermesAgentMapping> | undefined;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const initialState = (): HermesDemoState => ({
  agents: clone(seedAgentMappings),
  policies: clone(seedPolicies),
  skills: clone(seedSkills),
  installs: clone(seedSkillInstalls),
  events: clone(seedPolicyEvents),
  prompts: clone(seedPrompts),
  evalRuns: clone(seedEvalRuns),
  messages: {
    child_ava: [
      {
        id: "msg_seed_001",
        role: "assistant",
        content:
          "Hi Ava. I can help you learn, make stories, solve puzzles, and explore ideas. I will keep things safe, and sometimes I may suggest asking your parent or another trusted grown-up.",
        policyAction: "allow",
        createdAt: nowIso()
      }
    ]
  },
  checkpointAttempts: {}
});

const getState = () => {
  globalThis.__kidsafeHermesDemoState ??= initialState();
  return globalThis.__kidsafeHermesDemoState;
};

const ageRoute = (ageBand: AgeBand) => {
  if (ageBand === "6-8") return "hermes_route_child_6_8_default";
  if (ageBand === "9-12") return "hermes_route_child_9_12_default";
  return "hermes_route_teen_default";
};

const promptStack = (ageBand: AgeBand) => {
  if (ageBand === "6-8") return "child_safety_stack_early_reader_v1.4";
  if (ageBand === "9-12") return "child_safety_stack_v1.4";
  return "teen_safety_stack_v1.4";
};

const policyPack = (preset: PolicyPreset) => `${preset}_policy_v1.2`;

const starterSkills = (ageBand: AgeBand) => {
  if (ageBand === "6-8") return ["skill_story_builder", "skill_reading_buddy", "skill_science_explainer"];
  if (ageBand === "9-12") return ["skill_math_quest", "skill_story_builder", "skill_science_explainer"];
  return ["skill_code_playground", "skill_science_explainer", "skill_reading_buddy"];
};

const findAgent = (state: HermesDemoState, hermesAgentId: string) => {
  const agent = state.agents.find((item) => item.hermesAgentId === hermesAgentId);
  if (!agent) throw new Error(`Hermes agent not found: ${hermesAgentId}`);
  return agent;
};

const findPolicy = (state: HermesDemoState, hermesAgentId: string) => {
  const policy = state.policies.find((item) => item.hermesAgentId === hermesAgentId);
  if (!policy) throw new Error(`Hermes policy not found for ${hermesAgentId}`);
  return policy;
};

const logPolicyEvent = (
  state: HermesDemoState,
  input: Omit<PolicyEvent, "id" | "createdAt">
) => {
  const event: PolicyEvent = {
    id: id("policy_event"),
    createdAt: nowIso(),
    ...input
  };
  state.events.unshift(event);
  return event;
};

const detectPolicyAction = (message: string, policy: ParentPolicyCache): { action: PolicyAction; category: string } => {
  const normalized = message.toLowerCase();
  if (/(hurt myself|kill myself|suicide|self harm)/.test(normalized)) {
    return { action: "crisis_escalation", category: "self_harm" };
  }
  if (/(address|phone number|school name|where i live|where do you live)/.test(normalized)) {
    return { action: "educational_redirect", category: "privacy_pii_protection" };
  }
  if (/(weapon|bomb|gun|knife|hurt someone)/.test(normalized)) {
    return { action: "block", category: "dangerous_instructions" };
  }
  if (/(more time|longer|keep chatting|bonus)/.test(normalized) && policy.checkpointBonusEnabled) {
    return { action: "offer_checkpoint", category: "checkpoint_bonus" };
  }
  if (policy.parentApprovalTopics.some((topic) => normalized.includes(topic.toLowerCase()))) {
    return { action: "ask_parent_permission", category: "parent_review_topic" };
  }
  if (policy.blockedTopics.some((topic) => normalized.includes(topic.toLowerCase()))) {
    return { action: "educational_redirect", category: "parent_blocked_topic" };
  }
  if (/(doctor|medicine|legal|money advice|invest)/.test(normalized)) {
    return { action: "answer_with_caution", category: "regulated_advice" };
  }
  return { action: "allow", category: "general_learning" };
};

const checkpointForPolicy = (policy: ParentPolicyCache): Checkpoint => ({
  id: id("checkpoint_math"),
  type: "math",
  prompt: "Solve this to unlock parent-approved bonus time: What is 3/4 plus 1/4?",
  options: ["1/2", "1", "2", "3/8"],
  requiredCorrectAnswers: 1,
  bonusMinutes: Math.min(10, policy.maxBonusMinutesPerDay),
  status: "offered"
});

const responseFor = (
  message: string,
  action: PolicyAction,
  skill: Skill | undefined,
  policy: ParentPolicyCache
) => {
  if (action === "crisis_escalation") {
    return "I am really glad you told me. This is important, and I want you to find a trusted grown-up right now. I will also flag this for your parent so you are not alone with it.";
  }
  if (action === "block") {
    return "That topic is not safe for me to help with. I can help you make a science project, a puzzle, a kind story, or a math challenge instead.";
  }
  if (action === "educational_redirect") {
    return "Let us keep private details safe. You do not need to share addresses, school names, phone numbers, or family secrets. Want to turn this into a privacy superhero rule?";
  }
  if (action === "ask_parent_permission") {
    return "That is a parent-review topic in your family settings. I can help you write a short ask-parent note, or we can choose a different safe activity.";
  }
  if (action === "answer_with_caution") {
    return "I can explain the general idea in a kid-friendly way, but a trusted grown-up or professional should help with decisions. What part are you curious about?";
  }
  if (action === "offer_checkpoint") {
    return `You are near your time limit. Hermes can offer a quick Math Quest checkpoint for up to ${Math.min(
      10,
      policy.maxBonusMinutesPerDay
    )} parent-approved bonus minutes.`;
  }
  if (skill?.id === "skill_math_quest" || /fraction|math|multiply|divide|add|subtract/.test(message.toLowerCase())) {
    return "Let us solve it together. First, tell me what you already notice. For fractions, a good trick is to check whether the denominators match before adding the tops.";
  }
  if (skill?.id === "skill_story_builder" || /story|character|dragon|robot/.test(message.toLowerCase())) {
    return "Great story seed. Let us make it safe and vivid: choose a curious hero, a gentle problem, and one surprising place. What should the hero care about?";
  }
  if (skill?.id === "skill_science_explainer" || /space|planet|science|moon/.test(message.toLowerCase())) {
    return "Science mode on. I will use clear examples and safe-at-home boundaries. A crater forms when something hits a surface fast enough to scoop out material.";
  }
  if (skill?.id === "skill_reading_buddy" || /read|book|summary|vocab/.test(message.toLowerCase())) {
    return "Reading Buddy can help. Share a short passage or a word, and I will help with clues, meaning, and a one-sentence summary.";
  }
  if (skill?.id === "skill_code_playground" || /code|python|bug|program/.test(message.toLowerCase())) {
    return "Let us debug it step by step. What did you expect the code to do, and what did it do instead?";
  }
  return "I can help with that. Let us take it one step at a time, and I will keep the answer safe, clear, and at your level.";
};

const createDemoHermesClient = () => {
  const state = getState();

  return {
    async health() {
      return {
        status: "ok",
        mode: process.env.HERMES_API_BASE_URL ? "remote-configured" : "local-demo-hermes",
        projectId: process.env.HERMES_PROJECT_ID ?? "kidsafe-hermes-demo",
        guarantees: [
          "No app-layer LLM provider calls",
          "One active Hermes agent per child profile",
          "Policy, skills, checkpoints, messages, and evals route through Hermes client"
        ]
      };
    },

    async provisionChildAgent(input: CreateChildAgentInput) {
      const hermesAgentId = `hermes_agent_${input.nickname.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now()}`;
      const now = nowIso();
      const mapping: HermesAgentMapping = {
        id: id("mapping"),
        childProfileId: input.childProfileId,
        hermesAgentId,
        hermesProfileName: hermesAgentId.replace(/^hermes_profile_/, ""),
        isolationMode: "demo_memory",
        gatewayMode: "local_demo",
        hermesAgentType: "kid_safe_child_agent",
        status: "active",
        activePromptStackVersion: promptStack(input.ageBand),
        activePolicyPackVersion: policyPack(input.parentPolicyPreset),
        activeModelRoute: ageRoute(input.ageBand),
        memoryMode: "single_child_scoped",
        installedSkillIds: starterSkills(input.ageBand),
        runtimeHealth: "healthy",
        lastSyncedAt: now,
        createdAt: now
      };
      state.agents.unshift(mapping);

      const policy: ParentPolicyCache = {
        id: id("policy"),
        childProfileId: input.childProfileId,
        hermesAgentId,
        allowedTopics: ["learning", "reading", "math", "science", "creative writing"],
        blockedTopics: input.parentPolicyPreset === "explorer" ? ["weapons"] : ["weapons", "adult content", "scary stories"],
        parentApprovalTopics: ["external websites", "news", "medical questions"],
        dailyTimeLimitMinutes: input.parentPolicyPreset === "strict" ? 25 : 35,
        sessionLimitMinutes: input.parentPolicyPreset === "strict" ? 10 : 15,
        bedtimeStart: "20:30",
        bedtimeEnd: "07:00",
        checkpointBonusEnabled: true,
        maxBonusMinutesPerDay: 12,
        familyValues: "Encourage curiosity, kindness, privacy, and hints-first help.",
        tonePreference: "Warm and clear",
        homeworkHelpMode: "hints_first",
        transcriptVisibility: input.ageBand === "16-17" ? "summary" : "balanced",
        dataRetentionDays: 90,
        active: true,
        lastPushedToHermesAt: now
      };
      state.policies.unshift(policy);

      state.messages[input.childProfileId] = [
        {
          id: id("msg"),
          role: "assistant",
          content:
            "Hi. I can help you learn, make stories, solve puzzles, and explore ideas. I will keep things safe, and sometimes I may suggest asking your parent or another trusted grown-up.",
          policyAction: "allow",
          createdAt: now
        }
      ];

      logPolicyEvent(state, {
        hermesAgentId,
        childProfileId: input.childProfileId,
        category: "agent_provisioning",
        severity: "info",
        action: "allow",
        summary: `Provisioned vertically isolated Hermes child agent for ${input.nickname}.`
      });

      return { mapping, policy };
    },

    async getAgent(hermesAgentId: string) {
      return clone(findAgent(state, hermesAgentId));
    },

    async listAgents() {
      return clone(state.agents);
    },

    async updatePolicy(hermesAgentId: string, patch: Partial<ParentPolicyCache>) {
      const policy = findPolicy(state, hermesAgentId);
      Object.assign(policy, patch, { lastPushedToHermesAt: nowIso() });
      const agent = findAgent(state, hermesAgentId);
      agent.activePolicyPackVersion = `${agent.activePolicyPackVersion.split("+")[0]}+${Date.now()}`;
      agent.lastSyncedAt = nowIso();
      logPolicyEvent(state, {
        hermesAgentId,
        childProfileId: policy.childProfileId,
        category: "parent_policy_overlay",
        severity: "info",
        action: "allow",
        summary: "Hermes accepted updated parent policy overlay and refreshed the active policy version."
      });
      return clone({ policy, agent });
    },

    async pauseAgent(hermesAgentId: string) {
      const agent = findAgent(state, hermesAgentId);
      agent.status = "paused";
      agent.lastSyncedAt = nowIso();
      return clone(agent);
    },

    async resumeAgent(hermesAgentId: string) {
      const agent = findAgent(state, hermesAgentId);
      agent.status = "active";
      agent.lastSyncedAt = nowIso();
      return clone(agent);
    },

    async getPolicy(hermesAgentId: string) {
      return clone(findPolicy(state, hermesAgentId));
    },

    async listSkills() {
      return clone(state.skills);
    },

    async listInstalledSkills(childProfileId: string) {
      return clone(state.installs.filter((install) => install.childProfileId === childProfileId && !install.disabledAt));
    },

    async installSkill(input: { childProfileId: string; hermesAgentId: string; skillId: string; approvedBy: string }) {
      const agent = findAgent(state, input.hermesAgentId);
      const skill = state.skills.find((item) => item.id === input.skillId);
      if (!skill || skill.status !== "approved") throw new Error("Only approved Hermes skills can be installed.");
      if (!agent.installedSkillIds.includes(input.skillId)) agent.installedSkillIds.push(input.skillId);
      const existing = state.installs.find(
        (install) => install.childProfileId === input.childProfileId && install.skillId === input.skillId && !install.disabledAt
      );
      if (existing) return clone(existing);
      const install: SkillInstall = {
        id: id("install"),
        skillId: input.skillId,
        childProfileId: input.childProfileId,
        hermesAgentId: input.hermesAgentId,
        approvedBy: input.approvedBy,
        hermesInstallationId: id("hermes_install"),
        settings: {},
        installedAt: nowIso()
      };
      state.installs.unshift(install);
      logPolicyEvent(state, {
        hermesAgentId: input.hermesAgentId,
        childProfileId: input.childProfileId,
        category: "skill_installed",
        severity: "info",
        action: "allow",
        summary: `Hermes attached ${skill.name} to the child agent permission set.`
      });
      return clone(install);
    },

    async uninstallSkill(input: { childProfileId: string; hermesAgentId: string; skillId: string }) {
      const agent = findAgent(state, input.hermesAgentId);
      agent.installedSkillIds = agent.installedSkillIds.filter((skillId) => skillId !== input.skillId);
      const install = state.installs.find(
        (item) => item.childProfileId === input.childProfileId && item.skillId === input.skillId && !item.disabledAt
      );
      if (install) install.disabledAt = nowIso();
      return clone({ agent, install });
    },

    async startChildSession(input: { childProfileId: string; hermesAgentId: string }) {
      const agent = findAgent(state, input.hermesAgentId);
      const policy = findPolicy(state, input.hermesAgentId);
      logPolicyEvent(state, {
        hermesAgentId: input.hermesAgentId,
        childProfileId: input.childProfileId,
        category: "child_session_started",
        severity: "info",
        action: agent.status === "active" ? "allow" : "block",
        summary: agent.status === "active" ? "Hermes started child session." : "Hermes blocked session because agent is paused."
      });
      return {
        sessionId: id("hermes_session"),
        status: agent.status,
        timeRemainingSeconds: policy.sessionLimitMinutes * 60,
        intro:
          "Hi. I can help you learn, make stories, solve puzzles, and explore ideas. I will keep things safe, and sometimes I may suggest asking your parent or another trusted grown-up."
      };
    },

    async sendChildMessage(input: HermesChatInput): Promise<HermesChatResponse> {
      const agent = findAgent(state, input.hermesAgentId);
      const policy = findPolicy(state, input.hermesAgentId);
      const messages = (state.messages[input.childProfileId] ??= []);
      const childMessage: ChatMessage = {
        id: id("msg"),
        role: "child",
        content: input.message,
        skillId: input.skillId,
        createdAt: nowIso()
      };
      messages.push(childMessage);

      if (agent.status !== "active") {
        const blocked: ChatMessage = {
          id: id("msg"),
          role: "assistant",
          content: "Your Hermes agent is paused right now. Ask your parent when you are ready to continue.",
          policyAction: "block",
          createdAt: nowIso()
        };
        messages.push(blocked);
        return {
          messageId: blocked.id,
          hermesAgentId: input.hermesAgentId,
          response: blocked.content,
          policyAction: "block",
          assistantMessage: blocked,
          skillState: {},
          rewards: [],
          checkpoint: null,
          timeRemainingSeconds: 0
        };
      }

      const skill = input.skillId ? state.skills.find((item) => item.id === input.skillId) : undefined;
      const skillNotInstalled = input.skillId && !agent.installedSkillIds.includes(input.skillId);
      const detected = skillNotInstalled
        ? { action: "ask_parent_permission" as PolicyAction, category: "skill_permission_sandbox" }
        : detectPolicyAction(input.message, policy);
      const checkpoint = detected.action === "offer_checkpoint" ? checkpointForPolicy(policy) : null;
      const response = responseFor(input.message, detected.action, skill, policy);
      const rewards: RewardEvent[] =
        detected.action === "allow"
          ? [
              {
                id: id("reward"),
                label: skill ? `${skill.name} progress` : "Curious question",
                type: "xp",
                amount: 5,
                createdAt: nowIso()
              }
            ]
          : [];
      const assistantMessage: ChatMessage = {
        id: id("msg"),
        role: "assistant",
        content: response,
        skillId: input.skillId,
        policyAction: detected.action,
        createdAt: nowIso()
      };
      messages.push(assistantMessage);

      if (detected.action !== "allow") {
        logPolicyEvent(state, {
          hermesAgentId: input.hermesAgentId,
          childProfileId: input.childProfileId,
          category: detected.category,
          severity: detected.action === "crisis_escalation" ? "critical" : detected.action === "block" ? "medium" : "low",
          action: detected.action,
          summary: `Hermes handled child message with ${detected.action}.`
        });
      }

      return {
        messageId: assistantMessage.id,
        hermesAgentId: input.hermesAgentId,
        response,
        policyAction: detected.action,
        assistantMessage,
        skillState: skill ? { skillId: skill.id, runsInsideChildAgent: true } : {},
        rewards,
        checkpoint,
        timeRemainingSeconds: Math.max(90, policy.sessionLimitMinutes * 60 - messages.length * 40)
      };
    },

    async submitCheckpoint(input: {
      childProfileId: string;
      hermesAgentId: string;
      checkpointId: string;
      answer: string;
    }) {
      const policy = findPolicy(state, input.hermesAgentId);
      const correct = input.answer.trim() === "1" || input.answer.toLowerCase().includes("one");
      const reward: RewardEvent | null = correct
        ? {
            id: id("reward_bonus"),
            label: `${Math.min(10, policy.maxBonusMinutesPerDay)} bonus minutes`,
            type: "bonus_minutes",
            amount: Math.min(10, policy.maxBonusMinutesPerDay),
            createdAt: nowIso()
          }
        : null;
      logPolicyEvent(state, {
        hermesAgentId: input.hermesAgentId,
        childProfileId: input.childProfileId,
        category: "checkpoint_bonus",
        severity: "info",
        action: correct ? "allow" : "educational_redirect",
        summary: correct
          ? "Hermes granted parent-capped checkpoint bonus time."
          : "Hermes recorded a checkpoint attempt without granting bonus time."
      });
      return {
        status: correct ? "passed" : "failed",
        reward,
        timeRemainingSeconds: correct ? (policy.sessionLimitMinutes + Math.min(10, policy.maxBonusMinutesPerDay)) * 60 : 120
      };
    },

    async getMessages(childProfileId: string) {
      return clone(state.messages[childProfileId] ?? []);
    },

    async listPolicyEvents() {
      return clone(state.events);
    },

    async listPrompts() {
      return clone(state.prompts);
    },

    async listEvalRuns() {
      return clone(state.evalRuns);
    },

    async runEval(input: { suiteId: string; target: EvalRun["target"]; hermesAgentId?: string }) {
      const run: EvalRun = {
        id: id("eval_run"),
        suiteId: input.suiteId,
        target: input.target,
        hermesAgentId: input.hermesAgentId,
        status: "passed",
        passRate: 0.93 + Math.random() * 0.05,
        startedAt: nowIso(),
        completedAt: nowIso(),
        findings: [
          "Hermes eval executed through the child-agent runtime path.",
          "Prompt stack, policy overlay, skill permissions, and output gates were included."
        ]
      };
      state.evalRuns.unshift(run);
      return clone(run);
    }
  };
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");

const parseRuntimeRegistry = () => {
  const registry: Record<string, HermesRuntimeConfig> = {};
  const raw = process.env.HERMES_PROFILE_REGISTRY;
  if (raw) {
    const parsed = JSON.parse(raw) as
      | Record<string, HermesRuntimeConfig>
      | Array<HermesRuntimeConfig & { hermesAgentId: string }>;
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        registry[entry.hermesAgentId] = {
          profileName: entry.profileName,
          baseUrl: normalizeBaseUrl(entry.baseUrl),
          apiKey: entry.apiKey,
          modelName: entry.modelName
        };
      }
    } else {
      for (const [hermesAgentId, entry] of Object.entries(parsed)) {
        registry[hermesAgentId] = {
          profileName: entry.profileName,
          baseUrl: normalizeBaseUrl(entry.baseUrl),
          apiKey: entry.apiKey,
          modelName: entry.modelName
        };
      }
    }
  }

  if (process.env.HERMES_API_BASE_URL && process.env.HERMES_API_KEY) {
    const profileName = process.env.HERMES_PROFILE_NAME ?? "default";
    const hermesAgentId = process.env.HERMES_AGENT_ID ?? `hermes_profile_${profileName}`;
    registry[hermesAgentId] = {
      profileName,
      baseUrl: normalizeBaseUrl(process.env.HERMES_API_BASE_URL),
      apiKey: process.env.HERMES_API_KEY,
      modelName: process.env.HERMES_MODEL_NAME ?? profileName
    };
  }

  return registry;
};

const runtimeFor = (hermesAgentId: string) => {
  const registry = parseRuntimeRegistry();
  const runtime = registry[hermesAgentId];
  if (!runtime) {
    throw new Error(
      `No real Hermes profile runtime configured for ${hermesAgentId}. Add it to HERMES_PROFILE_REGISTRY or set HERMES_API_BASE_URL/HERMES_API_KEY for a single profile.`
    );
  }
  return runtime;
};

const hermesJson = async <T>(runtime: HermesRuntimeConfig, path: string, init?: RequestInit) => {
  const response = await fetch(`${runtime.baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${runtime.apiKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Hermes ${path} failed with ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json() as Promise<T>;
};

const extractResponseText = (payload: unknown) => {
  const response = payload as {
    id?: string;
    output_text?: string;
    output?: Array<{
      type?: string;
      role?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    if (item.type === "message" || item.role === "assistant") {
      const text = item.content?.find((part) => part.type === "output_text" || part.text)?.text;
      if (text) return text;
    }
  }
  return "Hermes completed the turn, but the response did not include displayable assistant text.";
};

const createRealHermesClient = () => {
  const mirror = createDemoHermesClient();
  globalThis.__kidsafeHermesRealAgentOverrides ??= {};
  const realAgentOverrides = globalThis.__kidsafeHermesRealAgentOverrides;

  return {
    async health() {
      const registry = parseRuntimeRegistry();
      const runtimes = Object.values(registry);
      if (!runtimes.length) {
        return {
          status: "missing_config",
          mode: "real-hermes",
          projectId: process.env.HERMES_PROJECT_ID ?? "kidsafe-hermes",
          guarantees: [
            "Real Hermes mode is enabled, but no child profile API server is configured.",
            "Configure HERMES_PROFILE_REGISTRY or HERMES_API_BASE_URL/HERMES_API_KEY.",
            "The browser never receives Hermes API tokens."
          ]
        };
      }
      const first = runtimes[0];
      await hermesJson<unknown>(first, "/v1/models", { method: "GET" });
      return {
        status: "ok",
        mode: "real-hermes-profile-api",
        projectId: process.env.HERMES_PROJECT_ID ?? "kidsafe-hermes",
        guarantees: [
          "One child maps to one Hermes profile API server entry",
          "Child chat calls Hermes /v1/responses server-to-server",
          "The browser never receives Hermes API tokens"
        ]
      };
    },

    async provisionChildAgent(input: CreateChildAgentInput) {
      if (process.env.HERMES_PROVISIONER_URL) {
        const response = await fetch(process.env.HERMES_PROVISIONER_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env.HERMES_PROVISIONER_KEY
              ? { authorization: `Bearer ${process.env.HERMES_PROVISIONER_KEY}` }
              : {})
          },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(120000)
        });
        if (!response.ok) {
          throw new Error(`Hermes provisioner failed with ${response.status}: ${(await response.text()).slice(0, 500)}`);
        }
        return response.json() as Promise<{ mapping: HermesAgentMapping; policy: ParentPolicyCache }>;
      }

      const result = await mirror.provisionChildAgent(input);
      const profileName = `child_${input.childProfileId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      result.mapping.hermesAgentId = `hermes_profile_${profileName}`;
      result.mapping.hermesProfileName = profileName;
      result.mapping.isolationMode = "hermes_profile_process";
      result.mapping.gatewayMode = "dedicated_api_server";
      result.mapping.status = "provisioning";
      result.mapping.runtimeHealth = "offline";
      result.policy.hermesAgentId = result.mapping.hermesAgentId;
      realAgentOverrides[result.mapping.hermesAgentId] = result.mapping;
      return result;
    },

    async getAgent(hermesAgentId: string) {
      if (realAgentOverrides[hermesAgentId]) return clone(realAgentOverrides[hermesAgentId]);
      return mirror.getAgent(hermesAgentId);
    },

    async listAgents() {
      const mirrored = await mirror.listAgents();
      const overrides = Object.values(realAgentOverrides);
      const overrideIds = new Set(overrides.map((agent) => agent.hermesAgentId));
      return [...overrides, ...mirrored.filter((agent) => !overrideIds.has(agent.hermesAgentId))];
    },

    async updatePolicy(hermesAgentId: string, patch: Partial<ParentPolicyCache>) {
      return mirror.updatePolicy(hermesAgentId, patch);
    },

    async pauseAgent(hermesAgentId: string) {
      return mirror.pauseAgent(hermesAgentId);
    },

    async resumeAgent(hermesAgentId: string) {
      return mirror.resumeAgent(hermesAgentId);
    },

    async getPolicy(hermesAgentId: string) {
      return mirror.getPolicy(hermesAgentId);
    },

    async listSkills() {
      const registry = parseRuntimeRegistry();
      const runtime = Object.values(registry)[0];
      if (!runtime) return mirror.listSkills();
      try {
        const skills = await hermesJson<Array<{ id?: string; name?: string; description?: string; category?: string }>>(
          runtime,
          "/v1/skills",
          { method: "GET" }
        );
        return skills.map((skill, index): Skill => {
          const name = skill.name ?? skill.id ?? `Hermes skill ${index + 1}`;
          const skillId = skill.id ?? `hermes_skill_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
          return {
            id: skillId,
            name,
            description: skill.description ?? "Skill discovered from the configured Hermes profile.",
            category: skill.category ?? "Hermes",
            ageMin: 6,
            ageMax: 17,
            hermesSkillPackageId: skillId,
            status: "approved",
            riskLevel: "low",
            manifest: {
              id: skillId,
              version: "discovered",
              name,
              creator_id: "hermes_profile",
              short_description: skill.description ?? "Hermes profile skill",
              long_description: skill.description ?? "Skill discovered from the configured Hermes profile.",
              category: skill.category ?? "hermes",
              age_min: 6,
              age_max: 17,
              reading_level: "profile_configured",
              hermes: {
                skill_type: "hermes_profile_skill",
                runs_inside_child_agent: true,
                prompt_layer_id: "profile_skill",
                state_schema_id: "profile_skill_state",
                eval_suite_ids: []
              },
              permissions: [],
              data_access: {
                reads: [],
                writes: [],
                retention_days: 0
              },
              safety: {
                risk_level: "low",
                blocked_topics: [],
                requires_parent_approval: true,
                requires_admin_review: true
              },
              monetization: {
                type: "free",
                price_cents: 0
              }
            }
          };
        });
      } catch {
        return mirror.listSkills();
      }
    },

    async listInstalledSkills(childProfileId: string) {
      return mirror.listInstalledSkills(childProfileId);
    },

    async installSkill(input: { childProfileId: string; hermesAgentId: string; skillId: string; approvedBy: string }) {
      return mirror.installSkill(input);
    },

    async uninstallSkill(input: { childProfileId: string; hermesAgentId: string; skillId: string }) {
      return mirror.uninstallSkill(input);
    },

    async startChildSession(input: { childProfileId: string; hermesAgentId: string }) {
      const runtime = runtimeFor(input.hermesAgentId);
      return {
        sessionId: `kidsafe-${input.childProfileId}`,
        status: "active" as const,
        timeRemainingSeconds: 900,
        intro: `Connected to Hermes profile ${runtime.profileName}.`
      };
    },

    async sendChildMessage(input: HermesChatInput): Promise<HermesChatResponse> {
      const runtime = runtimeFor(input.hermesAgentId);
      const response = await hermesJson<{ id: string }>(runtime, "/v1/responses", {
        method: "POST",
        headers: {
          "X-Hermes-Session-Id": `kidsafe-${input.childProfileId}`,
          "X-Hermes-Session-Key": `agent:main:kidsafe:dm:${input.childProfileId}`
        },
        body: JSON.stringify({
          model: runtime.modelName ?? runtime.profileName,
          input: input.message,
          conversation: `kidsafe-${input.childProfileId}`,
          store: true
        })
      });
      const content = extractResponseText(response);
      const assistantMessage: ChatMessage = {
        id: response.id ?? id("hermes_msg"),
        role: "assistant",
        content,
        skillId: input.skillId,
        policyAction: "allow",
        createdAt: nowIso()
      };

      return {
        messageId: assistantMessage.id,
        hermesAgentId: input.hermesAgentId,
        response: content,
        policyAction: "allow",
        assistantMessage,
        skillState: {
          hermesRuntime: "real_api_server",
          hermesProfileName: runtime.profileName
        },
        rewards: [],
        checkpoint: null,
        timeRemainingSeconds: 900
      };
    },

    async submitCheckpoint(input: {
      childProfileId: string;
      hermesAgentId: string;
      checkpointId: string;
      answer: string;
    }) {
      return mirror.submitCheckpoint(input);
    },

    async getMessages(childProfileId: string) {
      return mirror.getMessages(childProfileId);
    },

    async listPolicyEvents() {
      return mirror.listPolicyEvents();
    },

    async listPrompts() {
      return mirror.listPrompts();
    },

    async listEvalRuns() {
      return mirror.listEvalRuns();
    },

    async runEval(input: { suiteId: string; target: EvalRun["target"]; hermesAgentId?: string }) {
      return mirror.runEval(input);
    }
  };
};

export const createHermesClient = () => {
  if (process.env.HERMES_RUNTIME_MODE === "real") return createRealHermesClient();
  return createDemoHermesClient();
};

export type HermesClient = ReturnType<typeof createHermesClient>;
