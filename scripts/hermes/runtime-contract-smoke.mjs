#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  childRuntimeDir,
  provisionChildRuntime,
  registryPathFor,
  runtimeMetadataPath
} from "./runtime-manager-lib.mjs";

const read = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(read(path));

const runtimeRoot = mkdtempSync(join(tmpdir(), "lenon-hermes-runtime-"));

try {
  const result = await provisionChildRuntime(
    {
      childProfileId: "child_contract",
      nickname: "Contract",
      ageBand: "9-12",
      parentPolicyPreset: "balanced",
      inferenceModel: "contract-model",
      inferenceProvider: "custom",
      inferenceBaseUrl: "http://provider.local/v1"
    },
    {
      runtimeRoot,
      executeDocker: false,
      port: 18743
    }
  );

  assert.equal(result.docker.action, "planned");
  assert.equal(result.api.ok, false);
  assert.equal(result.api.error, "not_started");
  assert.equal(result.mapping.childProfileId, "child_contract");
  assert.equal(result.mapping.hermesAgentId, "hermes_profile_child_contract");
  assert.equal(result.mapping.isolationMode, "docker_container");
  assert.equal(result.mapping.gatewayMode, "container_api_server");

  const registryPath = registryPathFor(runtimeRoot);
  const metadataPath = runtimeMetadataPath("child_contract", runtimeRoot);
  const dataDir = join(childRuntimeDir("child_contract", runtimeRoot), "data");
  const requiredFiles = [
    registryPath,
    metadataPath,
    join(dataDir, ".env"),
    join(dataDir, "SOUL.md"),
    join(dataDir, "KIDSAFE_POLICY.json"),
    join(dataDir, "KIDSAFE_CONFIG_SNIPPET.yaml"),
    join(dataDir, "config.yaml")
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(file), true, `expected generated file: ${file}`);
  }

  const registry = readJson(registryPath);
  const entry = registry.hermes_profile_child_contract;
  assert.equal(entry.childProfileId, "child_contract");
  assert.equal(entry.profileName, "child_contract");
  assert.equal(entry.baseUrl, "http://127.0.0.1:18743");
  assert.equal(entry.modelName, "child_contract");
  assert.equal(entry.isolationMode, "docker_container");
  assert.equal(entry.gatewayMode, "container_api_server");
  assert.match(entry.apiKey, /^[a-f0-9]{64}$/);

  const envText = read(join(dataDir, ".env"));
  assert.match(envText, /^API_SERVER_ENABLED=true$/m);
  assert.match(envText, /^API_SERVER_KEY=[a-f0-9]{64}$/m);
  assert.doesNotMatch(envText, new RegExp("OPENAI_API_KEY" + "="));
  assert.doesNotMatch(envText, new RegExp("CODEX_ACCESS_TOKEN" + "="));

  const configText = read(join(dataDir, "config.yaml"));
  assert.match(configText, /default: "contract-model"/);
  assert.match(configText, /provider: "custom"/);
  assert.match(configText, /base_url: "http:\/\/provider\.local\/v1"/);
  assert.match(configText, /docker_volumes: \[\]/);
  assert.doesNotMatch(configText, /\/var\/run\/docker\.sock/);

  for (const toolset of ["web", "browser", "terminal", "file", "code_execution", "memory", "delegation", "cronjob"]) {
    assert.match(configText, new RegExp(`\\n\\s+- ${toolset}\\n`), `expected ${toolset} to be disabled`);
  }

  const policy = readJson(join(dataDir, "KIDSAFE_POLICY.json"));
  assert.equal(policy.child_profile_id, "child_contract");
  assert.equal(policy.isolation_model, "one_docker_container_per_child");

  console.log(
    JSON.stringify(
      {
        status: "passed",
        runtimeRoot,
        registryPath,
        hermesAgentId: result.mapping.hermesAgentId,
        checkedFiles: requiredFiles.length,
        providerConfig: {
          configurable: true,
          defaultCredentialCommitted: false
        }
      },
      null,
      2
    )
  );
} finally {
  rmSync(runtimeRoot, { recursive: true, force: true });
}
