#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const next = process.argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, true);
    } else {
      args.set(key, next);
      index += 1;
    }
  }
}

const required = (key) => {
  const value = args.get(key);
  if (!value || value === true) {
    throw new Error(`Missing required --${key}`);
  }
  return String(value);
};

const childId = required("child-id");
const nickname = required("nickname");
const ageBand = required("age-band");
const port = Number(required("port"));
const execute = args.get("execute") === true;
const overwriteSoul = args.get("overwrite-soul") === true;
const templateProfile = args.get("template-profile") ? String(args.get("template-profile")) : "";
const profileName = args.get("profile")
  ? String(args.get("profile"))
  : `child_${childId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const hermesRoot = args.get("hermes-root") ? String(args.get("hermes-root")) : join(homedir(), ".hermes");
const profileDir = profileName === "default" ? hermesRoot : join(hermesRoot, "profiles", profileName);
const apiKey = args.get("api-key") ? String(args.get("api-key")) : randomBytes(32).toString("hex");

const soul = `# KidSafe Hermes Child Agent

You are a child-safe learning assistant for ${nickname}, age band ${ageBand}.

## Runtime Identity
- You are Hermes Agent running in a dedicated child profile.
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

const policy = {
  child_profile_id: childId,
  nickname,
  age_band: ageBand,
  isolation_model: "one_hermes_profile_process_per_child",
  api_server_port: port,
  notes: [
    "This file is product policy metadata for KidSafe integration.",
    "The enforceable runtime should live in Hermes SOUL.md plus KidSafe Hermes plugin/hooks."
  ]
};

const upsertEnv = (existing, updates) => {
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match) return line;
    const key = match[1];
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }
  return `${next.filter(Boolean).join("\n")}\n`;
};

const command = templateProfile
  ? ["profile", "create", profileName, "--clone-from", templateProfile, "--description", `KidSafe child profile for ${nickname}`]
  : ["profile", "create", profileName, "--no-skills", "--description", `KidSafe child profile for ${nickname}`];

console.log(`Hermes profile: ${profileName}`);
console.log(`Profile directory: ${profileDir}`);
console.log(`API server: http://127.0.0.1:${port}`);
console.log(`Mode: ${execute ? "execute" : "dry-run"}`);

if (!execute) {
  console.log("\nDry run only. Re-run with --execute to create/update files and invoke Hermes.");
  console.log(`Would run: hermes ${command.join(" ")}`);
  process.exit(0);
}

try {
  execFileSync("hermes", command, { stdio: "inherit" });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists|exists/i.test(message)) {
    console.warn("Hermes profile create did not complete cleanly. Continuing only if profile directory exists.");
  }
}

mkdirSync(profileDir, { recursive: true });

const envPath = join(profileDir, ".env");
const currentEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
writeFileSync(
  envPath,
  upsertEnv(currentEnv, {
    API_SERVER_ENABLED: "true",
    API_SERVER_HOST: "127.0.0.1",
    API_SERVER_PORT: String(port),
    API_SERVER_KEY: apiKey,
    API_SERVER_MODEL_NAME: profileName
  })
);

const soulPath = join(profileDir, "SOUL.md");
if (overwriteSoul || !existsSync(soulPath)) {
  writeFileSync(soulPath, soul);
}

writeFileSync(join(profileDir, "KIDSAFE_POLICY.json"), `${JSON.stringify(policy, null, 2)}\n`);
writeFileSync(
  join(profileDir, "KIDSAFE_CONFIG_SNIPPET.yaml"),
  `# Merge these settings into ${profileDir}/config.yaml after provider setup.
platform_toolsets:
  cli:
    - no_mcp
  api_server:
    - no_mcp
known_plugin_toolsets:
  cli: []
  api_server: []
terminal:
  backend: docker
  home_mode: profile
  docker_mount_cwd_to_workspace: false
  docker_volumes: []
agent:
  disabled_toolsets:
    - web
    - browser
    - terminal
    - file
    - code_execution
    - vision
    - video
    - image_gen
    - video_gen
    - x_search
    - moa
    - tts
    - skills
    - todo
    - memory
    - context_engine
    - session_search
    - clarify
    - delegation
    - cronjob
    - homeassistant
    - spotify
    - discord
    - discord_admin
    - yuanbao
    - computer_use
browser:
  allow_private_urls: false
checkpoints:
  enabled: false
`
);

console.log("\nProfile files updated.");
console.log(`Start the gateway with: hermes -p ${profileName} gateway`);
console.log("\nAdd this to your app .env.local HERMES_PROFILE_REGISTRY:");
console.log(
  JSON.stringify(
    {
      [`hermes_profile_${profileName}`]: {
        profileName,
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey,
        modelName: profileName
      }
    },
    null,
    2
  )
);
