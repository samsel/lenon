import { NextRequest, NextResponse } from "next/server";
import { productStore } from "@/lib/product-store";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

const readJson = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const fail = (error: unknown, status = 400) => {
  const message = error instanceof Error ? error.message : "Request failed";
  return ok({ error: message }, { status });
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const [area, one, two, three, four] = path;
  try {
    if (area === "hermes" && one === "health") return ok(await productStore.health());
    if (area === "families" && one === "current") return ok(await productStore.getFamilyOverview());
    if (area === "children" && one && !two) return ok(await productStore.getChild(one));
    if (area === "children" && one && two === "policy") {
      const child = await productStore.getChild(one);
      return ok(child.policy);
    }
    if (area === "children" && one && two === "skills") {
      const child = await productStore.getChild(one);
      return ok({ installs: child.installs, installedSkills: child.installedSkills });
    }
    if (area === "marketplace" && one === "skills") return ok(await productStore.getMarketplace());
    if (area === "child" && one === "messages") {
      const childProfileId = request.nextUrl.searchParams.get("childProfileId") ?? "child_ava";
      const child = await productStore.getChild(childProfileId);
      return ok(child.messages);
    }
    if (area === "admin" && one === "hermes" && two === "agents") {
      const admin = await productStore.adminOverview();
      return ok(admin.agents);
    }
    if (area === "admin" && one === "hermes" && two === "policy-events") {
      const admin = await productStore.adminOverview();
      return ok(admin.events);
    }
    if (area === "admin" && one === "hermes" && two === "evals" && three === "runs") {
      const admin = await productStore.adminOverview();
      return ok(admin.evalRuns);
    }
    if (area === "admin" && one === "hermes" && two === "prompts") {
      const admin = await productStore.adminOverview();
      return ok(admin.prompts);
    }
    if (area === "admin" && one === "overview") return ok(await productStore.adminOverview());
    if (area === "hermes" && one === "agents" && two) {
      const admin = await productStore.adminOverview();
      return ok(admin.agents.find((agent) => agent.hermesAgentId === two) ?? null);
    }
    return ok({ error: `Unknown GET /api/${path.join("/")}` }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const [area, one, two, three, four, five] = path;
  const body = await readJson(request);
  try {
    if (area === "children" && !one) return ok(await productStore.createChild(body), { status: 201 });
    if (area === "children" && one && two === "skills" && three && four === "install") {
      return ok(await productStore.installSkill(one, three));
    }
    if (area === "children" && one && two === "skills" && three && four === "uninstall") {
      return ok(await productStore.uninstallSkill(one, three));
    }
    if (area === "child" && one === "session" && two === "start") {
      return ok(await productStore.startChildSession(body.child_profile_id ?? body.childProfileId ?? "child_ava"));
    }
    if (area === "child" && one === "chat") {
      return ok(
        await productStore.sendChildMessage({
          childProfileId: body.child_profile_id ?? body.childProfileId,
          message: body.message,
          skillId: body.skill_id ?? body.skillId,
          clientContext: body.client_context ?? body.clientContext
        })
      );
    }
    if (area === "child" && one === "checkpoints" && two && three === "submit") {
      return ok(
        await productStore.submitCheckpoint({
          childProfileId: body.child_profile_id ?? body.childProfileId,
          checkpointId: two,
          answer: body.answer
        })
      );
    }
    if (area === "admin" && one === "hermes" && two === "evals" && three === "run") {
      return ok(await productStore.runEval(body));
    }
    if (area === "hermes" && one === "agents" && two && three === "pause") {
      const family = await productStore.getFamilyOverview();
      const child = family.children.find((item) => item.agent?.hermesAgentId === two);
      if (!child) throw new Error("Child for Hermes agent not found.");
      return ok(await productStore.pauseAgent(child.id));
    }
    if (area === "hermes" && one === "agents" && two && three === "resume") {
      const family = await productStore.getFamilyOverview();
      const child = family.children.find((item) => item.agent?.hermesAgentId === two);
      if (!child) throw new Error("Child for Hermes agent not found.");
      return ok(await productStore.resumeAgent(child.id));
    }
    return ok({ error: `Unknown POST /api/${path.join("/")}` }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const [area, one, two] = path;
  const body = await readJson(request);
  try {
    if (area === "children" && one && !two) return ok(await productStore.updateChild(one, body));
    if (area === "children" && one && two === "policy") return ok(await productStore.updatePolicy(one, body));
    return ok({ error: `Unknown PATCH /api/${path.join("/")}` }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}
