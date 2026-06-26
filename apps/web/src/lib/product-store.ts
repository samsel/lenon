import { createHermesClient } from "@kidsafe/hermes-client";
import {
  seedActivity,
  seedAgentMappings,
  seedChildren,
  seedFamily,
  seedPolicies,
  seedSkillInstalls,
  seedUsers,
  nowIso
} from "@kidsafe/shared";
import type {
  ActivitySummary,
  AgeBand,
  ChildProfile,
  Family,
  HermesAgentMapping,
  ParentPolicyCache,
  PolicyEvent,
  PolicyAction,
  PolicyPreset,
  SkillInstall,
  TranscriptVisibility,
  User
} from "@kidsafe/shared";

type ProductState = {
  users: User[];
  family: Family;
  children: ChildProfile[];
  agentMappings: HermesAgentMapping[];
  policyCache: ParentPolicyCache[];
  skillInstalls: SkillInstall[];
  activity: ActivitySummary[];
  policyEvents: PolicyEvent[];
};

declare global {
  // eslint-disable-next-line no-var
  var __kidsafeProductState: ProductState | undefined;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const getState = () => {
  globalThis.__kidsafeProductState ??= {
    users: clone(seedUsers),
    family: clone(seedFamily),
    children: clone(seedChildren),
    agentMappings: clone(seedAgentMappings),
    policyCache: clone(seedPolicies),
    skillInstalls: clone(seedSkillInstalls),
    activity: clone(seedActivity),
    policyEvents: []
  };
  globalThis.__kidsafeProductState.policyEvents ??= [];
  return globalThis.__kidsafeProductState;
};

const mergedPolicyEvents = (localEvents: PolicyEvent[], remoteEvents: PolicyEvent[]) =>
  [...localEvents, ...remoteEvents].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

export const productStore = {
  async health() {
    const hermes = createHermesClient();
    return hermes.health();
  },

  async getFamilyOverview() {
    const state = getState();
    const hermes = createHermesClient();
    const skills = await hermes.listSkills();
    const events = mergedPolicyEvents(state.policyEvents, await hermes.listPolicyEvents());
    const children = await Promise.all(
      state.children.map(async (child) => {
        const mapping = state.agentMappings.find((agent) => agent.childProfileId === child.id);
        const agent = mapping ? await hermes.getAgent(mapping.hermesAgentId) : null;
        const policy = mapping ? await hermes.getPolicy(mapping.hermesAgentId) : null;
        const installs = await hermes.listInstalledSkills(child.id);
        return {
          ...child,
          agent,
          policy,
          installedSkills: installs.map((install) => skills.find((skill) => skill.id === install.skillId)).filter(Boolean),
          activity: state.activity.find((summary) => summary.childProfileId === child.id) ?? null,
          safetyEvents: events.filter((event) => event.childProfileId === child.id)
        };
      })
    );
    return {
      user: state.users.find((user) => user.role === "parent"),
      family: state.family,
      children,
      hermes: await hermes.health()
    };
  },

  async createChild(input: {
    nickname: string;
    ageBand: AgeBand;
    readingLevel?: string;
    interests?: string[];
    learningGoals?: string[];
    parentPolicyPreset: PolicyPreset;
    familyValues?: string;
    transcriptVisibility?: TranscriptVisibility;
  }) {
    const state = getState();
    const hermes = createHermesClient();
    const child: ChildProfile = {
      id: id("child"),
      familyId: state.family.id,
      nickname: input.nickname,
      ageBand: input.ageBand,
      readingLevel: input.readingLevel || (input.ageBand === "6-8" ? "early_reader" : "grade_level"),
      interests: input.interests ?? [],
      learningGoals: input.learningGoals ?? [],
      autonomyLevel: input.ageBand === "16-17" ? 4 : input.ageBand === "13-15" ? 3 : 2,
      transcriptVisibility: input.transcriptVisibility ?? (input.ageBand === "16-17" ? "summary" : "balanced"),
      loginCode: `${input.nickname.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
      createdAt: nowIso()
    };
    const { mapping, policy } = await hermes.provisionChildAgent({
      familyId: state.family.id,
      childProfileId: child.id,
      nickname: child.nickname,
      ageBand: child.ageBand,
      readingLevel: child.readingLevel,
      interests: child.interests,
      learningGoals: child.learningGoals,
      parentPolicyPreset: input.parentPolicyPreset
    });
    if (input.familyValues) policy.familyValues = input.familyValues;
    state.children.unshift(child);
    state.family.childIds.unshift(child.id);
    state.agentMappings.unshift(mapping);
    state.policyCache.unshift(policy);
    state.activity.unshift({
      childProfileId: child.id,
      topics: ["first session"],
      skillsUsed: [],
      learningHighlights: ["Hermes child agent provisioned and ready."],
      safetyRedirects: 0,
      suggestedConversationStarters: ["Ask what they want to learn first."],
      timeUsedMinutes: 0
    });
    return { child, mapping, policy };
  },

  async getChild(childId: string) {
    const state = getState();
    const hermes = createHermesClient();
    const child = state.children.find((item) => item.id === childId);
    if (!child) throw new Error("Child profile not found.");
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    const agent = mapping ? await hermes.getAgent(mapping.hermesAgentId) : null;
    const policy = mapping ? await hermes.getPolicy(mapping.hermesAgentId) : null;
    const installs = await hermes.listInstalledSkills(childId);
    const skills = await hermes.listSkills();
    const events = mergedPolicyEvents(state.policyEvents, await hermes.listPolicyEvents());
    const messages = await hermes.getMessages(childId);
    return {
      child,
      mapping,
      agent,
      policy,
      installs,
      installedSkills: installs.map((install) => skills.find((skill) => skill.id === install.skillId)).filter(Boolean),
      marketplaceSkills: skills,
      activity: state.activity.find((summary) => summary.childProfileId === childId) ?? null,
      safetyEvents: events.filter((event) => event.childProfileId === childId),
      messages
    };
  },

  async updateChild(childId: string, patch: Partial<ChildProfile>) {
    const state = getState();
    const child = state.children.find((item) => item.id === childId);
    if (!child) throw new Error("Child profile not found.");
    Object.assign(child, patch);
    return this.getChild(childId);
  },

  async updatePolicy(childId: string, patch: Partial<ParentPolicyCache>) {
    const state = getState();
    const hermes = createHermesClient();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const result = await hermes.updatePolicy(mapping.hermesAgentId, patch);
    const localPolicy = state.policyCache.find((policy) => policy.childProfileId === childId);
    if (localPolicy) Object.assign(localPolicy, result.policy);
    return result;
  },

  async pauseAgent(childId: string) {
    const state = getState();
    const hermes = createHermesClient();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const agent = await hermes.pauseAgent(mapping.hermesAgentId);
    Object.assign(mapping, agent);
    return agent;
  },

  async resumeAgent(childId: string) {
    const state = getState();
    const hermes = createHermesClient();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const agent = await hermes.resumeAgent(mapping.hermesAgentId);
    Object.assign(mapping, agent);
    return agent;
  },

  async getMarketplace() {
    return createHermesClient().listSkills();
  },

  async installSkill(childId: string, skillId: string) {
    const state = getState();
    const hermes = createHermesClient();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const install = await hermes.installSkill({
      childProfileId: childId,
      hermesAgentId: mapping.hermesAgentId,
      skillId,
      approvedBy: "user_parent_maya"
    });
    if (!state.skillInstalls.some((item) => item.id === install.id)) state.skillInstalls.unshift(install);
    return install;
  },

  async uninstallSkill(childId: string, skillId: string) {
    const state = getState();
    const hermes = createHermesClient();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const result = await hermes.uninstallSkill({ childProfileId: childId, hermesAgentId: mapping.hermesAgentId, skillId });
    state.skillInstalls = state.skillInstalls.map((install) =>
      install.childProfileId === childId && install.skillId === skillId ? { ...install, disabledAt: nowIso() } : install
    );
    return result;
  },

  async startChildSession(childId: string, options: { reset?: boolean } = {}) {
    const state = getState();
    const mapping = state.agentMappings.find((item) => item.childProfileId === childId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const policy = state.policyCache.find((item) => item.childProfileId === childId);
    return createHermesClient().startChildSession({
      childProfileId: childId,
      hermesAgentId: mapping.hermesAgentId,
      reset: options.reset,
      policy
    });
  },

  async sendChildMessage(input: {
    childProfileId: string;
    message: string;
    sessionId?: string;
    skillId?: string;
    clientContext?: Record<string, unknown>;
  }) {
    const state = getState();
    const mapping = state.agentMappings.find((item) => item.childProfileId === input.childProfileId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const policy = state.policyCache.find((item) => item.childProfileId === input.childProfileId);
    return createHermesClient().sendChildMessage({
      childProfileId: input.childProfileId,
      hermesAgentId: mapping.hermesAgentId,
      message: input.message,
      sessionId: input.sessionId,
      skillId: input.skillId,
      clientContext: input.clientContext,
      policy
    });
  },

  async logClientSafetyEvent(input: {
    childProfileId: string;
    category: string;
    action: PolicyAction;
    severity?: PolicyEvent["severity"];
    summary: string;
  }) {
    const state = getState();
    const mapping = state.agentMappings.find((item) => item.childProfileId === input.childProfileId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    const event: PolicyEvent = {
      id: id("policy_event"),
      hermesAgentId: mapping.hermesAgentId,
      childProfileId: input.childProfileId,
      category: input.category,
      severity: input.severity ?? "low",
      action: input.action,
      summary: input.summary,
      createdAt: nowIso()
    };
    state.policyEvents.unshift(event);
    const activity = state.activity.find((summary) => summary.childProfileId === input.childProfileId);
    if (activity) activity.safetyRedirects += 1;
    return event;
  },

  async submitCheckpoint(input: { childProfileId: string; checkpointId: string; answer: string }) {
    const state = getState();
    const mapping = state.agentMappings.find((item) => item.childProfileId === input.childProfileId);
    if (!mapping) throw new Error("Hermes agent mapping not found.");
    return createHermesClient().submitCheckpoint({
      childProfileId: input.childProfileId,
      hermesAgentId: mapping.hermesAgentId,
      checkpointId: input.checkpointId,
      answer: input.answer
    });
  },

  async adminOverview() {
    const state = getState();
    const hermes = createHermesClient();
    const [agents, events, evalRuns, prompts, health] = await Promise.all([
      hermes.listAgents(),
      hermes.listPolicyEvents(),
      hermes.listEvalRuns(),
      hermes.listPrompts(),
      hermes.health()
    ]);
    return { agents, events: mergedPolicyEvents(state.policyEvents, events), evalRuns, prompts, health };
  },

  async runtimeAudit() {
    return createHermesClient().auditRuntimes();
  },

  async provisionChildRuntimes() {
    const state = getState();
    const hermes = createHermesClient();
    const results = await hermes.provisionConfiguredChildren(
      state.children.map((child) => ({
        familyId: state.family.id,
        childProfileId: child.id,
        nickname: child.nickname,
        ageBand: child.ageBand,
        readingLevel: child.readingLevel,
        interests: child.interests,
        learningGoals: child.learningGoals,
        parentPolicyPreset:
          state.policyCache.find((policy) => policy.childProfileId === child.id)?.dailyTimeLimitMinutes === 25
            ? "strict"
            : "balanced"
      }))
    );
    const audits = await hermes.auditRuntimes();
    return { results, audits };
  },

  async runEval(input: { suiteId: string; target: "child_agent" | "skill" | "prompt_stack"; hermesAgentId?: string }) {
    return createHermesClient().runEval(input);
  }
};
