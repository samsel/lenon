#!/usr/bin/env node
import { createServer } from "node:http";
import {
  defaultRuntimeRoot,
  destroyRuntime,
  provisionChildRuntime,
  registryPathFor,
  startRuntime,
  statusRuntime,
  stopRuntime
} from "./runtime-manager-lib.mjs";
import { existsSync, readFileSync } from "node:fs";

const port = Number(process.env.HERMES_RUNTIME_MANAGER_PORT ?? 8787);
const host = process.env.HERMES_RUNTIME_MANAGER_HOST ?? "127.0.0.1";
const runtimeRoot = process.env.HERMES_RUNTIME_ROOT ?? defaultRuntimeRoot();
const managerKey = process.env.HERMES_RUNTIME_MANAGER_KEY ?? process.env.HERMES_PROVISIONER_KEY ?? "";

const send = (response, status, payload) => {
  response.writeHead(status, {
    "content-type": "application/json"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const authorized = (request) => {
  if (!managerKey) return true;
  return request.headers.authorization === `Bearer ${managerKey}`;
};

const childIdFromPath = (path) => {
  const match = /^\/children\/([^/]+)\/(status|start|stop|destroy)$/.exec(path);
  return match ? { childProfileId: decodeURIComponent(match[1]), action: match[2] } : null;
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);

    if (!authorized(request)) {
      send(response, 401, { error: "Unauthorized runtime manager request." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, {
        status: "ok",
        mode: "local-docker-runtime-manager",
        runtimeRoot,
        registryPath: registryPathFor(runtimeRoot)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/registry") {
      const registryPath = registryPathFor(runtimeRoot);
      send(response, 200, {
        path: registryPath,
        registry: existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, "utf8")) : {}
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/provision-child") {
      const body = await readBody(request);
      const result = await provisionChildRuntime(body, {
        runtimeRoot,
        executeDocker: process.env.HERMES_RUNTIME_MANAGER_DOCKER !== "false",
        port: body.port,
        profileName: body.profileName,
        containerName: body.containerName,
        image: body.image,
        memory: body.memory,
        cpus: body.cpus,
        modelName: body.modelName,
        inferenceModel: body.inferenceModel ?? body.inference_model ?? process.env.HERMES_RUNTIME_INFERENCE_MODEL,
        inferenceProvider: body.inferenceProvider ?? body.inference_provider ?? process.env.HERMES_RUNTIME_INFERENCE_PROVIDER,
        inferenceBaseUrl: body.inferenceBaseUrl ?? body.inference_base_url ?? process.env.HERMES_RUNTIME_INFERENCE_BASE_URL,
        healthTimeoutMs: process.env.HERMES_RUNTIME_MANAGER_HEALTH_TIMEOUT_MS ?? 30000
      });
      send(response, 201, {
        mapping: result.mapping,
        policy: result.policy,
        runtime: result.runtime,
        registryPath: result.registryPath,
        api: result.api,
        docker: result.docker
      });
      return;
    }

    const childRoute = childIdFromPath(url.pathname);
    if (childRoute) {
      if (request.method === "GET" && childRoute.action === "status") {
        send(response, 200, await statusRuntime(childRoute.childProfileId, runtimeRoot));
        return;
      }
      if (request.method === "POST" && childRoute.action === "start") {
        send(response, 200, startRuntime(childRoute.childProfileId, runtimeRoot));
        return;
      }
      if (request.method === "POST" && childRoute.action === "stop") {
        send(response, 200, stopRuntime(childRoute.childProfileId, runtimeRoot));
        return;
      }
      if (request.method === "POST" && childRoute.action === "destroy") {
        const body = await readBody(request);
        send(
          response,
          200,
          destroyRuntime(childRoute.childProfileId, {
            runtimeRoot,
            removeFiles: Boolean(body.removeFiles)
          })
        );
        return;
      }
    }

    send(response, 404, { error: `Unknown ${request.method} ${url.pathname}` });
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`Hermes Runtime Manager listening on http://${host}:${port}`);
  console.log(`Runtime root: ${runtimeRoot}`);
  console.log(`Registry file: ${registryPathFor(runtimeRoot)}`);
});
