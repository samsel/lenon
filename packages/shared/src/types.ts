export type UserRole = "parent" | "child" | "creator" | "admin" | "safety_reviewer";

export type AgeBand = "6-8" | "9-12" | "13-15" | "16-17";

export type PolicyPreset = "strict" | "balanced" | "explorer" | "custom";

export type TranscriptVisibility = "summary" | "balanced" | "full";

export type PolicyAction =
  | "allow"
  | "allow_with_age_adjustment"
  | "answer_with_caution"
  | "educational_redirect"
  | "ask_parent_permission"
  | "block"
  | "escalate_to_parent"
  | "crisis_escalation"
  | "admin_review"
  | "offer_checkpoint";

export type HermesAgentStatus = "provisioning" | "active" | "paused" | "error" | "archived";

export type SkillStatus = "draft" | "submitted" | "approved" | "rejected" | "suspended";

export type RewardEvent = {
  id: string;
  label: string;
  type: "xp" | "badge" | "theme" | "helper" | "bonus_minutes";
  amount?: number;
  createdAt: string;
};

export type Checkpoint = {
  id: string;
  type: "math" | "reading" | "reflection" | "movement";
  prompt: string;
  options?: string[];
  requiredCorrectAnswers?: number;
  bonusMinutes: number;
  status: "offered" | "passed" | "failed";
};

export type User = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
};

export type Family = {
  id: string;
  name: string;
  createdBy: string;
  childIds: string[];
};

export type ChildProfile = {
  id: string;
  familyId: string;
  nickname: string;
  ageBand: AgeBand;
  readingLevel: string;
  interests: string[];
  learningGoals: string[];
  autonomyLevel: number;
  transcriptVisibility: TranscriptVisibility;
  loginCode: string;
  createdAt: string;
};

export type HermesAgentMapping = {
  id: string;
  childProfileId: string;
  hermesAgentId: string;
  hermesProfileName?: string;
  isolationMode?: "hermes_profile" | "hermes_profile_process" | "demo_memory";
  gatewayMode?: "dedicated_api_server" | "multiplexed_gateway" | "local_demo";
  hermesAgentType: "kid_safe_child_agent";
  status: HermesAgentStatus;
  activePromptStackVersion: string;
  activePolicyPackVersion: string;
  activeModelRoute: string;
  memoryMode: "single_child_scoped";
  installedSkillIds: string[];
  runtimeHealth: "healthy" | "degraded" | "offline";
  lastSyncedAt: string;
  createdAt: string;
};

export type ParentPolicyCache = {
  id: string;
  childProfileId: string;
  hermesAgentId: string;
  allowedTopics: string[];
  blockedTopics: string[];
  parentApprovalTopics: string[];
  dailyTimeLimitMinutes: number;
  sessionLimitMinutes: number;
  bedtimeStart: string;
  bedtimeEnd: string;
  checkpointBonusEnabled: boolean;
  maxBonusMinutesPerDay: number;
  familyValues: string;
  tonePreference: string;
  homeworkHelpMode: "hints_first" | "explain_then_answer" | "practice_only";
  transcriptVisibility: TranscriptVisibility;
  dataRetentionDays: number;
  active: boolean;
  lastPushedToHermesAt: string;
};

export type SkillManifest = {
  id: string;
  version: string;
  name: string;
  creator_id: string;
  short_description: string;
  long_description: string;
  category: string;
  age_min: number;
  age_max: number;
  reading_level: string;
  hermes: {
    skill_type: string;
    runs_inside_child_agent: true;
    prompt_layer_id: string;
    state_schema_id: string;
    eval_suite_ids: string[];
  };
  permissions: string[];
  data_access: {
    reads: string[];
    writes: string[];
    retention_days: number;
  };
  safety: {
    risk_level: "low" | "medium" | "high";
    blocked_topics: string[];
    requires_parent_approval: boolean;
    requires_admin_review: boolean;
  };
  monetization: {
    type: "free" | "paid";
    price_cents: number;
  };
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  manifest: SkillManifest;
  hermesSkillPackageId: string;
  status: SkillStatus;
  riskLevel: "low" | "medium" | "high";
};

export type SkillInstall = {
  id: string;
  skillId: string;
  childProfileId: string;
  hermesAgentId: string;
  approvedBy: string;
  hermesInstallationId: string;
  settings: Record<string, unknown>;
  installedAt: string;
  disabledAt?: string;
};

export type ChatMessage = {
  id: string;
  role: "child" | "assistant" | "system";
  content: string;
  skillId?: string;
  policyAction?: PolicyAction;
  createdAt: string;
};

export type ActivitySummary = {
  childProfileId: string;
  topics: string[];
  skillsUsed: string[];
  learningHighlights: string[];
  safetyRedirects: number;
  suggestedConversationStarters: string[];
  timeUsedMinutes: number;
};

export type PolicyEvent = {
  id: string;
  hermesAgentId: string;
  childProfileId: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  action: PolicyAction;
  summary: string;
  createdAt: string;
};

export type EvalRun = {
  id: string;
  suiteId: string;
  target: "child_agent" | "skill" | "prompt_stack";
  hermesAgentId?: string;
  status: "queued" | "running" | "passed" | "failed";
  passRate: number;
  startedAt: string;
  completedAt?: string;
  findings: string[];
};

export type PromptVersion = {
  id: string;
  name: string;
  version: string;
  scope: "global" | "age_band" | "parent_overlay" | "family_values" | "skill" | "safety" | "output_contract";
  status: "draft" | "active" | "archived";
  content: string;
  hermesTarget: "child_agent" | "parent_summary_agent" | "admin_eval_agent";
  evalSuiteIds: string[];
  createdBy: string;
  createdAt: string;
  activatedAt?: string;
  changelog: string;
};
