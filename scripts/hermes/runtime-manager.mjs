#!/usr/bin/env node
import {
  defaultRuntimeRoot,
  destroyRuntime,
  dockerAvailable,
  provisionChildRuntime,
  registryPathFor,
  startRuntime,
  statusRuntime,
  stopRuntime
} from "./runtime-manager-lib.mjs";
import { existsSync, readFileSync } from "node:fs";

const args = new Map();
const positional = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) {
    positional.push(arg);
    continue;
  }
  const key = arg.slice(2);
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, true);
  } else {
    args.set(key, next);
    index += 1;
  }
}

const command = positional[0] ?? "help";

const value = (key, fallback) => {
  const raw = args.get(key);
  if (raw === undefined || raw === true) return fallback;
  return raw;
};

const bool = (key) => args.get(key) === true || args.get(key) === "true";

const childInput = () => ({
  childProfileId: value("child-id", value("childProfileId")),
  nickname: value("nickname"),
  ageBand: value("age-band", value("ageBand")),
  parentPolicyPreset: value("policy-preset", "balanced"),
  port: value("port"),
  profileName: value("profile"),
  containerName: value("container-name"),
  image: value("image"),
  memory: value("memory"),
  cpus: value("cpus"),
  modelName: value("model-name")
});

const runtimeRoot = () => value("runtime-root", defaultRuntimeRoot());

const print = (payload) => {
  console.log(JSON.stringify(payload, null, 2));
};

const usage = () => {
  console.log(`Hermes Runtime Manager

Usage:
  npm run hermes:runtime -- plan --child-id child_ava --nickname Ava --age-band 9-12 --port 8643
  npm run hermes:runtime -- provision --child-id child_ava --nickname Ava --age-band 9-12 --port 8643
  npm run hermes:runtime -- status --child-id child_ava
  npm run hermes:runtime -- start --child-id child_ava
  npm run hermes:runtime -- stop --child-id child_ava
  npm run hermes:runtime -- destroy --child-id child_ava
  npm run hermes:runtime -- registry
  npm run hermes:runtime -- doctor

Options:
  --runtime-root <path>     Defaults to .local/hermes-runtimes
  --image <image>           Defaults to nousresearch/hermes-agent:latest
  --memory <limit>          Defaults to 1g
  --cpus <count>            Defaults to 1
  --recreate                Recreate an existing Docker container on provision
  --remove-files            Also delete local runtime files on destroy
`);
};

try {
  if (command === "help" || command === "--help" || command === "-h") {
    usage();
    process.exit(0);
  }

  if (command === "doctor") {
    print({
      dockerAvailable: dockerAvailable(),
      runtimeRoot: runtimeRoot(),
      registryPath: registryPathFor(runtimeRoot())
    });
    process.exit(0);
  }

  if (command === "registry") {
    const path = registryPathFor(runtimeRoot());
    print({
      path,
      registry: existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}
    });
    process.exit(0);
  }

  if (command === "plan" || command === "provision") {
    const result = await provisionChildRuntime(childInput(), {
      runtimeRoot: runtimeRoot(),
      executeDocker: command === "provision",
      recreate: bool("recreate"),
      port: value("port"),
      profileName: value("profile"),
      containerName: value("container-name"),
      image: value("image"),
      memory: value("memory"),
      cpus: value("cpus"),
      modelName: value("model-name")
    });
    print({
      mode: command,
      runtime: result.runtime,
      docker: result.docker,
      api: result.api,
      registryPath: result.registryPath,
      appEnv: {
        HERMES_RUNTIME_MODE: "real",
        HERMES_PROFILE_REGISTRY_FILE: result.registryPath
      },
      mapping: result.mapping
    });
    process.exit(0);
  }

  const childProfileId = value("child-id", value("childProfileId"));
  if (!childProfileId) throw new Error("Missing --child-id");

  if (command === "status") {
    print(await statusRuntime(childProfileId, runtimeRoot()));
    process.exit(0);
  }

  if (command === "start") {
    print(startRuntime(childProfileId, runtimeRoot()));
    process.exit(0);
  }

  if (command === "stop") {
    print(stopRuntime(childProfileId, runtimeRoot()));
    process.exit(0);
  }

  if (command === "destroy") {
    print(destroyRuntime(childProfileId, { runtimeRoot: runtimeRoot(), removeFiles: bool("remove-files") }));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
