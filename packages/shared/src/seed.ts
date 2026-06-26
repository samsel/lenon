import type {
  ActivitySummary,
  ChildProfile,
  EvalRun,
  Family,
  HermesAgentMapping,
  ParentPolicyCache,
  PolicyEvent,
  PromptVersion,
  Skill,
  SkillInstall,
  User
} from "./types";

export const nowIso = () => new Date().toISOString();

export const seedUsers: User[] = [
  {
    id: "user_parent_maya",
    email: "maya@example.com",
    role: "parent",
    displayName: "Maya Rivera"
  },
  {
    id: "user_admin_sam",
    email: "admin@example.com",
    role: "admin",
    displayName: "Sam Admin"
  },
  {
    id: "user_creator_lee",
    email: "creator@example.com",
    role: "creator",
    displayName: "Lee Creator"
  }
];

export const seedFamily: Family = {
  id: "family_rivera",
  name: "Rivera Family",
  createdBy: "user_parent_maya",
  childIds: ["child_ava"]
};

export const seedChildren: ChildProfile[] = [
  {
    id: "child_ava",
    familyId: "family_rivera",
    nickname: "Ava",
    ageBand: "9-12",
    readingLevel: "grade_4",
    interests: ["space", "stories", "math puzzles"],
    learningGoals: ["Fractions confidence", "Daily reading habit", "Kind creative writing"],
    autonomyLevel: 2,
    transcriptVisibility: "balanced",
    loginCode: "AVA-042",
    createdAt: nowIso()
  }
];

export const createSkillManifest = (input: {
  id: string;
  name: string;
  description: string;
  category: string;
  ageMin: number;
  ageMax: number;
  promptLayerId: string;
  evalSuiteIds: string[];
  permissions: string[];
}) => ({
  id: input.id,
  version: "1.0.0",
  name: input.name,
  creator_id: "creator_internal",
  short_description: input.description,
  long_description: `${input.description} Runs inside the child's dedicated Lenon agent with parent-approved permissions and Hermes safety gates.`,
  category: input.category,
  age_min: input.ageMin,
  age_max: input.ageMax,
  reading_level: "grade_2_to_8",
  hermes: {
    skill_type: "guided_learning_skill",
    runs_inside_child_agent: true as const,
    prompt_layer_id: input.promptLayerId,
    state_schema_id: `${input.id}_state_v1`,
    eval_suite_ids: input.evalSuiteIds
  },
  permissions: input.permissions,
  data_access: {
    reads: ["child_profile.age_band", "child_profile.learning_goals"],
    writes: ["skill_progress", "reward_events", "checkpoint_events"],
    retention_days: 365
  },
  safety: {
    risk_level: "low" as const,
    blocked_topics: ["violence", "adult_content", "self_harm", "personal_data"],
    requires_parent_approval: true,
    requires_admin_review: true
  },
  monetization: {
    type: "free" as const,
    price_cents: 0
  }
});

export const seedSkills: Skill[] = [
  {
    id: "skill_math_quest",
    name: "Math Quest",
    description: "Practice math through quests, hints, and parent-capped bonus checkpoints.",
    category: "Math",
    ageMin: 8,
    ageMax: 12,
    hermesSkillPackageId: "hermes_skill_pkg_math_quest_v1",
    status: "approved",
    riskLevel: "low",
    manifest: createSkillManifest({
      id: "skill_math_quest",
      name: "Math Quest",
      description: "Practice math through quests, hints, and rewards.",
      category: "math",
      ageMin: 8,
      ageMax: 12,
      promptLayerId: "prompt_skill_math_quest_v1",
      evalSuiteIds: ["math_correctness_grade_4", "age_appropriate_tone", "homework_integrity"],
      permissions: [
        "read_child_age_band",
        "read_learning_goals",
        "write_skill_progress",
        "grant_reward_events",
        "request_checkpoint_bonus_time"
      ]
    })
  },
  {
    id: "skill_story_builder",
    name: "Story Builder",
    description: "Co-create gentle stories, characters, worlds, and endings.",
    category: "Writing",
    ageMin: 6,
    ageMax: 15,
    hermesSkillPackageId: "hermes_skill_pkg_story_builder_v1",
    status: "approved",
    riskLevel: "low",
    manifest: createSkillManifest({
      id: "skill_story_builder",
      name: "Story Builder",
      description: "Co-create safe stories, characters, and worlds.",
      category: "writing",
      ageMin: 6,
      ageMax: 15,
      promptLayerId: "prompt_skill_story_builder_v1",
      evalSuiteIds: ["age_appropriate_tone", "no_scary_story_policy", "no_personal_data_request"],
      permissions: ["read_child_age_band", "read_learning_goals", "write_skill_progress", "grant_reward_events"]
    })
  },
  {
    id: "skill_science_explainer",
    name: "Science Lab",
    description: "Explore science with safe examples and grown-up check notes for experiments.",
    category: "Science",
    ageMin: 7,
    ageMax: 15,
    hermesSkillPackageId: "hermes_skill_pkg_science_explainer_v1",
    status: "approved",
    riskLevel: "low",
    manifest: createSkillManifest({
      id: "skill_science_explainer",
      name: "Science Lab",
      description: "Age-appropriate science explanations and safe experiments.",
      category: "science",
      ageMin: 7,
      ageMax: 15,
      promptLayerId: "prompt_skill_science_explainer_v1",
      evalSuiteIds: ["age_appropriate_tone", "safe_experiment_boundary", "misinformation_risk"],
      permissions: ["read_child_age_band", "read_learning_goals", "write_skill_progress"]
    })
  },
  {
    id: "skill_reading_buddy",
    name: "Reading Buddy",
    description: "Vocabulary, summaries, and comprehension questions at the child's level.",
    category: "Reading",
    ageMin: 6,
    ageMax: 12,
    hermesSkillPackageId: "hermes_skill_pkg_reading_buddy_v1",
    status: "approved",
    riskLevel: "low",
    manifest: createSkillManifest({
      id: "skill_reading_buddy",
      name: "Reading Buddy",
      description: "Vocabulary and reading comprehension support.",
      category: "reading",
      ageMin: 6,
      ageMax: 12,
      promptLayerId: "prompt_skill_reading_buddy_v1",
      evalSuiteIds: ["age_appropriate_tone", "reading_comprehension_quality", "privacy_pii_protection"],
      permissions: ["read_child_age_band", "read_learning_goals", "write_skill_progress", "grant_reward_events"]
    })
  },
  {
    id: "skill_code_playground",
    name: "Code Playground",
    description: "Beginner coding puzzles with step-by-step debugging support.",
    category: "Coding",
    ageMin: 9,
    ageMax: 17,
    hermesSkillPackageId: "hermes_skill_pkg_code_playground_v1",
    status: "approved",
    riskLevel: "low",
    manifest: createSkillManifest({
      id: "skill_code_playground",
      name: "Code Playground",
      description: "Beginner coding puzzles in Scratch-like and Python-like styles.",
      category: "coding",
      ageMin: 9,
      ageMax: 17,
      promptLayerId: "prompt_skill_code_playground_v1",
      evalSuiteIds: ["age_appropriate_tone", "code_safety_basics", "homework_integrity"],
      permissions: ["read_child_age_band", "read_learning_goals", "write_skill_progress"]
    })
  }
];

export const seedAgentMappings: HermesAgentMapping[] = [
  {
    id: "mapping_ava",
    childProfileId: "child_ava",
    hermesAgentId: "hermes_profile_child_ava",
    hermesProfileName: "child_ava",
    isolationMode: "demo_memory",
    gatewayMode: "local_demo",
    hermesAgentType: "kid_safe_child_agent",
    status: "active",
    activePromptStackVersion: "child_safety_stack_v1.4",
    activePolicyPackVersion: "balanced_policy_v1.2",
    activeModelRoute: "hermes_route_child_9_12_default",
    memoryMode: "single_child_scoped",
    installedSkillIds: ["skill_math_quest", "skill_story_builder", "skill_science_explainer"],
    runtimeHealth: "healthy",
    lastSyncedAt: nowIso(),
    createdAt: nowIso()
  }
];

export const seedPolicies: ParentPolicyCache[] = [
  {
    id: "policy_ava",
    childProfileId: "child_ava",
    hermesAgentId: "hermes_profile_child_ava",
    allowedTopics: ["math", "space", "reading", "creative writing", "safe science"],
    blockedTopics: ["scary stories", "dating", "weapons"],
    parentApprovalTopics: ["external websites", "news", "medical questions"],
    dailyTimeLimitMinutes: 35,
    sessionLimitMinutes: 15,
    bedtimeStart: "20:30",
    bedtimeEnd: "07:00",
    checkpointBonusEnabled: true,
    maxBonusMinutesPerDay: 12,
    familyValues: "Encourage patience, kindness, curiosity, and hints-first homework help. Avoid scary stories.",
    tonePreference: "Warm, encouraging, not overly chatty",
    homeworkHelpMode: "hints_first",
    transcriptVisibility: "balanced",
    dataRetentionDays: 90,
    active: true,
    lastPushedToHermesAt: nowIso()
  }
];

export const seedSkillInstalls: SkillInstall[] = [
  {
    id: "install_math_ava",
    skillId: "skill_math_quest",
    childProfileId: "child_ava",
    hermesAgentId: "hermes_profile_child_ava",
    approvedBy: "user_parent_maya",
    hermesInstallationId: "hermes_install_math_ava_001",
    settings: { perSkillLimitMinutes: 15 },
    installedAt: nowIso()
  },
  {
    id: "install_story_ava",
    skillId: "skill_story_builder",
    childProfileId: "child_ava",
    hermesAgentId: "hermes_profile_child_ava",
    approvedBy: "user_parent_maya",
    hermesInstallationId: "hermes_install_story_ava_001",
    settings: { perSkillLimitMinutes: 20 },
    installedAt: nowIso()
  },
  {
    id: "install_science_ava",
    skillId: "skill_science_explainer",
    childProfileId: "child_ava",
    hermesAgentId: "hermes_profile_child_ava",
    approvedBy: "user_parent_maya",
    hermesInstallationId: "hermes_install_science_ava_001",
    settings: { requiresGrownUpForExperiments: true },
    installedAt: nowIso()
  }
];

export const seedPolicyEvents: PolicyEvent[] = [
  {
    id: "policy_event_001",
    hermesAgentId: "hermes_profile_child_ava",
    childProfileId: "child_ava",
    category: "privacy_pii_protection",
    severity: "low",
    action: "educational_redirect",
    summary: "Lenon redirected a school-name sharing attempt into a privacy reminder.",
    createdAt: nowIso()
  },
  {
    id: "policy_event_002",
    hermesAgentId: "hermes_profile_child_ava",
    childProfileId: "child_ava",
    category: "checkpoint_bonus_abuse_prevention",
    severity: "info",
    action: "offer_checkpoint",
    summary: "Lenon offered Math Quest checkpoint for bonus time within parent cap.",
    createdAt: nowIso()
  }
];

export const seedActivity: ActivitySummary[] = [
  {
    childProfileId: "child_ava",
    topics: ["fractions", "planets", "story characters"],
    skillsUsed: ["Math Quest", "Story Builder", "Science Lab"],
    learningHighlights: [
      "Explained equivalent fractions with pizza slices.",
      "Wrote a kind robot explorer story.",
      "Asked how craters form on the Moon."
    ],
    safetyRedirects: 1,
    suggestedConversationStarters: [
      "Ask Ava to show you two ways to make one-half.",
      "Ask which planet she would visit and what safety gear she would pack."
    ],
    timeUsedMinutes: 22
  }
];

export const seedPrompts: PromptVersion[] = [
  {
    id: "prompt_global_child_safety_v1",
    name: "Global Child Safety Constitution",
    version: "1.4",
    scope: "global",
    status: "active",
    content: "Hermes child agents must teach safely, avoid secrecy, protect personal data, and encourage trusted adults for serious topics.",
    hermesTarget: "child_agent",
    evalSuiteIds: ["general_child_safety_core", "privacy_pii_protection", "emotional_dependency_prevention"],
    createdBy: "user_admin_sam",
    createdAt: nowIso(),
    activatedAt: nowIso(),
    changelog: "Tightened dependency and privacy language."
  },
  {
    id: "prompt_age_9_12_v3",
    name: "Age Band 9-12",
    version: "3.1",
    scope: "age_band",
    status: "active",
    content: "Use clear, curious explanations, ask one helpful question at a time, and prefer hints before answers.",
    hermesTarget: "child_agent",
    evalSuiteIds: ["age_appropriate_tone", "homework_integrity"],
    createdBy: "user_admin_sam",
    createdAt: nowIso(),
    activatedAt: nowIso(),
    changelog: "Improved homework support for middle grade learners."
  }
];

export const seedEvalRuns: EvalRun[] = [
  {
    id: "eval_run_core_001",
    suiteId: "general_child_safety_core",
    target: "child_agent",
    hermesAgentId: "hermes_profile_child_ava",
    status: "passed",
    passRate: 0.97,
    startedAt: nowIso(),
    completedAt: nowIso(),
    findings: ["No direct provider calls detected.", "Refusal style matched age band."]
  },
  {
    id: "eval_run_marketplace_001",
    suiteId: "marketplace_skill_review",
    target: "skill",
    status: "passed",
    passRate: 0.94,
    startedAt: nowIso(),
    completedAt: nowIso(),
    findings: ["Skill manifests declare Hermes prompt layers and permissions."]
  }
];
