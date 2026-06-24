import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";

const nowIso = () => new Date().toISOString();

const sanitizeId = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const readJson = (path, fallback) => {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const required = (value, label) => {
  if (!value) throw new Error(`Missing required ${label}`);
  return value;
};

export const defaultRuntimeRoot = () =>
  resolve(process.env.HERMES_RUNTIME_ROOT ?? join(process.cwd(), ".local", "hermes-runtimes"));

export const registryPathFor = (runtimeRoot = defaultRuntimeRoot()) => join(runtimeRoot, "registry.json");

export const childRuntimeDir = (childProfileId, runtimeRoot = defaultRuntimeRoot()) =>
  join(runtimeRoot, "children", sanitizeId(childProfileId));

export const runtimeMetadataPath = (childProfileId, runtimeRoot = defaultRuntimeRoot()) =>
  join(childRuntimeDir(childProfileId, runtimeRoot), "runtime.json");

export const readRuntimeRecord = (childProfileId, runtimeRoot = defaultRuntimeRoot()) =>
  readJson(runtimeMetadataPath(childProfileId, runtimeRoot), null);

export const listRuntimeRecords = (runtimeRoot = defaultRuntimeRoot()) => {
  const registry = readJson(registryPathFor(runtimeRoot), {});
  return Object.entries(registry).map(([hermesAgentId, runtime]) => ({
    hermesAgentId,
    ...runtime
  }));
};

const choosePort = (runtimeRoot, preferredPort) => {
  if (preferredPort) return Number(preferredPort);
  const used = new Set(
    listRuntimeRecords(runtimeRoot)
      .map((runtime) => Number(new URL(runtime.baseUrl).port))
      .filter(Boolean)
  );
  for (let port = 8643; port < 8943; port += 1) {
    if (!used.has(port)) return port;
  }
  throw new Error("No free Hermes API port found in the 8643-8942 local range.");
};

export const registryFromRecords = (records) =>
  Object.fromEntries(
    records.map((runtime) => [
      runtime.hermesAgentId,
      {
        childProfileId: runtime.childProfileId,
        profileName: runtime.profileName,
        baseUrl: runtime.baseUrl,
        apiKey: runtime.apiKey,
        modelName: runtime.modelName,
        isolationMode: "docker_container",
        gatewayMode: "container_api_server",
        containerName: runtime.containerName
      }
    ])
  );

const upsertRegistryRecord = (runtimeRoot, runtime) => {
  mkdirSync(runtimeRoot, { recursive: true });
  const registryPath = registryPathFor(runtimeRoot);
  const registry = readJson(registryPath, {});
  registry[runtime.hermesAgentId] = {
    childProfileId: runtime.childProfileId,
    profileName: runtime.profileName,
    baseUrl: runtime.baseUrl,
    apiKey: runtime.apiKey,
    modelName: runtime.modelName,
    isolationMode: "docker_container",
    gatewayMode: "container_api_server",
    containerName: runtime.containerName
  };
  writeJson(registryPath, registry);
  return registry;
};

const removeRegistryRecord = (runtimeRoot, hermesAgentId) => {
  const registryPath = registryPathFor(runtimeRoot);
  const registry = readJson(registryPath, {});
  delete registry[hermesAgentId];
  writeJson(registryPath, registry);
  return registry;
};

export const buildRuntimeSpec = (input, options = {}) => {
  const runtimeRoot = resolve(options.runtimeRoot ?? defaultRuntimeRoot());
  const childProfileId = required(sanitizeId(input.childProfileId ?? input.child_profile_id), "childProfileId");
  const nickname = required(String(input.nickname ?? "").trim(), "nickname");
  const ageBand = required(String(input.ageBand ?? input.age_band ?? "").trim(), "ageBand");
  const runtimeDir = childRuntimeDir(childProfileId, runtimeRoot);
  const existing = readJson(join(runtimeDir, "runtime.json"), {});
  const defaultProfileName = childProfileId.startsWith("child_") ? childProfileId : `child_${childProfileId}`;
  const profileName = sanitizeId(options.profileName ?? input.profileName ?? existing.profileName ?? defaultProfileName);
  const hermesAgentId = `hermes_profile_${profileName}`;
  const hostPort = choosePort(runtimeRoot, options.port ?? input.port ?? existing.hostPort);
  const containerName = sanitizeId(
    options.containerName ?? input.containerName ?? existing.containerName ?? `lenon-hermes-${profileName}`
  ).replace(/_/g, "-");
  const apiKey = String(options.apiKey ?? input.apiKey ?? existing.apiKey ?? randomBytes(32).toString("hex"));
  const image = String(options.image ?? input.image ?? existing.image ?? "nousresearch/hermes-agent:latest");
  const modelName = String(options.modelName ?? input.modelName ?? existing.modelName ?? profileName);
  const baseUrl = `http://127.0.0.1:${hostPort}`;
  const dataDir = resolve(options.dataDir ?? input.dataDir ?? existing.dataDir ?? join(runtimeDir, "data"));
  const now = existing.createdAt ? nowIso() : nowIso();

  return {
    childProfileId,
    nickname,
    ageBand,
    profileName,
    hermesAgentId,
    containerName,
    image,
    hostPort,
    containerPort: 8642,
    baseUrl,
    apiKey,
    modelName,
    runtimeRoot,
    runtimeDir,
    dataDir,
    memory: String(options.memory ?? input.memory ?? existing.memory ?? "1g"),
    cpus: String(options.cpus ?? input.cpus ?? existing.cpus ?? "1"),
    createdAt: existing.createdAt ?? now,
    updatedAt: now
  };
};

const childSoul = (runtime) => `# KidSafe Hermes Child Agent

You are a child-safe learning assistant for ${runtime.nickname}, age band ${runtime.ageBand}.

## Runtime Identity
- You are Hermes Agent running in a dedicated Lenon child runtime.
- You are not a human, parent, doctor, therapist, or best friend.
- You never encourage secrecy from parents or trusted adults.
- You never ask for addresses, school names, phone numbers, family secrets, passwords, or precise location.

## Teaching Style
- Match the child's reading level and age band.
- Prefer hints, examples, and questions before giving direct homework answers.
- Encourage curiosity, effort, kindness, and safe offline breaks.
- For serious, medical, legal, safety, or emotional-crisis topics, encourage a trusted adult.

## Safety
- Gently refuse unsafe requests and offer safe alternatives.
- Do not provide dangerous instructions, sexual content, graphic violence, self-harm guidance, bullying help, hate, weapons help, drug guidance, or manipulation.
- If the child appears at risk of harm, tell them to contact a trusted adult immediately.
`;

const runtimeEnv = (runtime) => `API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=${runtime.containerPort}
API_SERVER_KEY=${runtime.apiKey}
API_SERVER_MODEL_NAME=${runtime.modelName}
API_SERVER_CORS_ORIGINS=http://localhost:3000
HERMES_DASHBOARD=0
`;

const runtimePolicy = (runtime) => ({
  child_profile_id: runtime.childProfileId,
  nickname: runtime.nickname,
  age_band: runtime.ageBand,
  hermes_agent_id: runtime.hermesAgentId,
  hermes_profile_name: runtime.profileName,
  isolation_model: "one_docker_container_per_child",
  api_server_base_url: runtime.baseUrl,
  notes: [
    "This file is Lenon product policy metadata for the child Hermes runtime.",
    "Do not mount Docker socket, host home directories, or shared child data into this container.",
    "Keep terminal, browser, code, web, cron, delegation, and broad memory tools disabled unless explicitly reviewed."
  ]
});

export const writeRuntimeFiles = (runtime) => {
  mkdirSync(runtime.runtimeDir, { recursive: true });
  mkdirSync(runtime.dataDir, { recursive: true });
  writeFileSync(join(runtime.dataDir, ".env"), runtimeEnv(runtime));
  writeFileSync(join(runtime.dataDir, "SOUL.md"), childSoul(runtime));
  writeJson(join(runtime.dataDir, "KIDSAFE_POLICY.json"), runtimePolicy(runtime));
  writeFileSync(
    join(runtime.dataDir, "KIDSAFE_CONFIG_SNIPPET.yaml"),
    `# Review and merge into config.yaml after Hermes/provider setup if supported by the installed Hermes version.
terminal:
  home_mode: profile
agent:
  disabled_toolsets:
    - terminal
    - web
    - browser
    - code
    - delegation
    - cron
    - memory
`
  );
  writeJson(join(runtime.runtimeDir, "runtime.json"), runtime);
  return upsertRegistryRecord(runtime.runtimeRoot, runtime);
};

const docker = (args, options = {}) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

const dockerJson = (args) => {
  const output = docker(args);
  return JSON.parse(output);
};

export const dockerAvailable = () => {
  try {
    docker(["version", "--format", "{{.Server.Version}}"]);
    return true;
  } catch {
    return false;
  }
};

export const inspectContainer = (containerName) => {
  try {
    return dockerJson(["inspect", containerName])[0] ?? null;
  } catch {
    return null;
  }
};

export const createOrStartContainer = (runtime, options = {}) => {
  if (!dockerAvailable()) {
    throw new Error("Docker is not available. Start Docker Desktop or point the manager at a Docker host.");
  }

  const existing = inspectContainer(runtime.containerName);
  if (existing && options.recreate) {
    docker(["rm", "-f", runtime.containerName], { stdio: "inherit" });
  } else if (existing) {
    if (existing.State?.Running) return { action: "already_running", containerName: runtime.containerName };
    docker(["start", runtime.containerName], { stdio: "inherit" });
    return { action: "started", containerName: runtime.containerName };
  }

  const args = [
    "run",
    "-d",
    "--name",
    runtime.containerName,
    "--restart",
    "unless-stopped",
    "--label",
    "com.lenon.role=hermes-child-runtime",
    "--label",
    `com.lenon.child_profile_id=${runtime.childProfileId}`,
    "--label",
    `com.lenon.hermes_agent_id=${runtime.hermesAgentId}`,
    "--memory",
    runtime.memory,
    "--cpus",
    runtime.cpus,
    "--pids-limit",
    "256",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=128m",
    "-v",
    `${runtime.dataDir}:/opt/data`,
    "-p",
    `127.0.0.1:${runtime.hostPort}:${runtime.containerPort}`,
    "-e",
    "API_SERVER_ENABLED=true",
    "-e",
    "API_SERVER_HOST=0.0.0.0",
    "-e",
    `API_SERVER_PORT=${runtime.containerPort}`,
    "-e",
    `API_SERVER_KEY=${runtime.apiKey}`,
    "-e",
    `API_SERVER_MODEL_NAME=${runtime.modelName}`,
    "-e",
    "HERMES_DASHBOARD=0",
    runtime.image,
    "gateway",
    "run"
  ];

  docker(args, { stdio: "inherit" });
  return { action: "created", containerName: runtime.containerName };
};

export const startRuntime = (childProfileId, runtimeRoot = defaultRuntimeRoot()) => {
  const runtime = readRuntimeRecord(childProfileId, runtimeRoot);
  if (!runtime) throw new Error(`No runtime metadata found for ${childProfileId}`);
  docker(["start", runtime.containerName], { stdio: "inherit" });
  return runtime;
};

export const stopRuntime = (childProfileId, runtimeRoot = defaultRuntimeRoot()) => {
  const runtime = readRuntimeRecord(childProfileId, runtimeRoot);
  if (!runtime) throw new Error(`No runtime metadata found for ${childProfileId}`);
  docker(["stop", runtime.containerName], { stdio: "inherit" });
  return runtime;
};

export const destroyRuntime = (childProfileId, options = {}) => {
  const runtimeRoot = resolve(options.runtimeRoot ?? defaultRuntimeRoot());
  const runtime = readRuntimeRecord(childProfileId, runtimeRoot);
  if (!runtime) throw new Error(`No runtime metadata found for ${childProfileId}`);
  if (inspectContainer(runtime.containerName)) {
    docker(["rm", "-f", runtime.containerName], { stdio: "inherit" });
  }
  removeRegistryRecord(runtimeRoot, runtime.hermesAgentId);
  if (options.removeFiles) rmSync(childRuntimeDir(childProfileId, runtimeRoot), { recursive: true, force: true });
  return runtime;
};

export const checkHermesApi = async (runtime, timeoutMs = 4000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${runtime.baseUrl}/v1/models`, {
      headers: {
        authorization: `Bearer ${runtime.apiKey}`
      },
      signal: controller.signal
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
};

export const statusRuntime = async (childProfileId, runtimeRoot = defaultRuntimeRoot()) => {
  const runtime = readRuntimeRecord(childProfileId, runtimeRoot);
  if (!runtime) throw new Error(`No runtime metadata found for ${childProfileId}`);
  const container = inspectContainer(runtime.containerName);
  const api = container?.State?.Running ? await checkHermesApi(runtime) : { ok: false, error: "container_not_running" };
  return {
    runtime,
    container: container
      ? {
          id: container.Id,
          name: container.Name,
          image: container.Config?.Image,
          running: Boolean(container.State?.Running),
          status: container.State?.Status,
          startedAt: container.State?.StartedAt,
          finishedAt: container.State?.FinishedAt
        }
      : null,
    api
  };
};

export const buildAgentMapping = (runtime, status = "provisioning", runtimeHealth = "offline") => ({
  id: `mapping_${runtime.childProfileId}`,
  childProfileId: runtime.childProfileId,
  hermesAgentId: runtime.hermesAgentId,
  hermesProfileName: runtime.profileName,
  isolationMode: "docker_container",
  gatewayMode: "container_api_server",
  hermesAgentType: "kid_safe_child_agent",
  status,
  activePromptStackVersion: runtime.ageBand === "6-8" ? "child_safety_stack_early_reader_v1.4" : "child_safety_stack_v1.4",
  activePolicyPackVersion: "balanced_policy_v1.2",
  activeModelRoute: runtime.modelName,
  memoryMode: "single_child_scoped",
  installedSkillIds: ["skill_math_quest", "skill_story_builder", "skill_science_explainer"],
  runtimeHealth,
  lastSyncedAt: nowIso(),
  createdAt: runtime.createdAt
});

export const buildParentPolicy = (runtime, preset = "balanced") => ({
  id: `policy_${runtime.childProfileId}`,
  childProfileId: runtime.childProfileId,
  hermesAgentId: runtime.hermesAgentId,
  allowedTopics: ["learning", "reading", "math", "science", "creative writing"],
  blockedTopics: preset === "explorer" ? ["weapons"] : ["weapons", "adult content", "scary stories"],
  parentApprovalTopics: ["external websites", "news", "medical questions"],
  dailyTimeLimitMinutes: preset === "strict" ? 25 : 35,
  sessionLimitMinutes: preset === "strict" ? 10 : 15,
  bedtimeStart: "20:30",
  bedtimeEnd: "07:00",
  checkpointBonusEnabled: true,
  maxBonusMinutesPerDay: 12,
  familyValues: "Encourage curiosity, kindness, privacy, and hints-first help.",
  tonePreference: "Warm and clear",
  homeworkHelpMode: "hints_first",
  transcriptVisibility: runtime.ageBand === "16-17" ? "summary" : "balanced",
  dataRetentionDays: 90,
  active: true,
  lastPushedToHermesAt: nowIso()
});

export const provisionChildRuntime = async (input, options = {}) => {
  const runtime = buildRuntimeSpec(input, options);
  const registry = writeRuntimeFiles(runtime);
  let dockerResult = { action: "planned", containerName: runtime.containerName };
  let api = { ok: false, error: "not_started" };

  if (options.executeDocker) {
    dockerResult = createOrStartContainer(runtime, options);
    api = await checkHermesApi(runtime, Number(options.healthTimeoutMs ?? 1500));
  }

  const status = api.ok ? "active" : options.executeDocker ? "provisioning" : "provisioning";
  const runtimeHealth = api.ok ? "healthy" : options.executeDocker ? "degraded" : "offline";

  return {
    runtime,
    docker: dockerResult,
    api,
    registry,
    registryPath: registryPathFor(runtime.runtimeRoot),
    mapping: buildAgentMapping(runtime, status, runtimeHealth),
    policy: buildParentPolicy(runtime, input.parentPolicyPreset ?? input.parent_policy_preset ?? "balanced")
  };
};
