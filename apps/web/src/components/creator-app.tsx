"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardCheck, Code2, FileJson, LibraryBig, Send, Store } from "lucide-react";
import type { Skill } from "@kidsafe/shared";
import { apiGet } from "@/lib/api";
import { AppShell, RouteTitle, StatusPill } from "@/components/shell";

export function CreatorApp({ slug }: { slug: string[] }) {
  const section = slug[0] ?? "home";
  const activePath = `/creator/${slug.join("/") || "home"}`;
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    void apiGet<Skill[]>("/api/marketplace/skills").then(setSkills);
  }, []);

  return (
    <AppShell activePath={activePath}>
      {section === "skills" && slug[1] === "new" ? (
        <ManifestEditor />
      ) : section === "skills" ? (
        <CreatorSkills skills={skills} />
      ) : section === "docs" ? (
        <CreatorDocs />
      ) : (
        <CreatorHome skills={skills} />
      )}
    </AppShell>
  );
}

function CreatorHome({ skills }: { skills: Skill[] }) {
  return (
    <div className="grid">
      <RouteTitle title="Creator workspace" subtitle="Build governed skills that run inside child Hermes agents." />
      <section className="grid three">
        <div className="metric">
          <strong>{skills.length}</strong>
          <span>catalog skills</span>
        </div>
        <div className="metric">
          <strong>5</strong>
          <span>required permissions reviewed</span>
        </div>
        <div className="metric">
          <strong>0</strong>
          <span>direct LLM calls allowed</span>
        </div>
      </section>
      <section className="grid three">
        <Link className="panel" href="/creator/skills">
          <Store />
          <h2>Skill catalog</h2>
          <p className="muted">Review manifests, permissions, safety status, and eval coverage.</p>
        </Link>
        <Link className="panel" href="/creator/skills/new">
          <FileJson />
          <h2>Manifest editor</h2>
          <p className="muted">Draft Hermes-compatible skill metadata before submission.</p>
        </Link>
        <Link className="panel" href="/creator/docs">
          <LibraryBig />
          <h2>Creator docs</h2>
          <p className="muted">Follow sandbox, state schema, prompt layer, and review rules.</p>
        </Link>
      </section>
    </div>
  );
}

function CreatorSkills({ skills }: { skills: Skill[] }) {
  return (
    <div className="grid">
      <RouteTitle title="Creator skills" subtitle="Each skill is a Hermes capability package, not a standalone agent." />
      <section className="grid three">
        {skills.map((skill) => (
          <article className="panel grid" key={skill.id}>
            <div className="panel-header">
              <h2>{skill.name}</h2>
              <StatusPill>{skill.status}</StatusPill>
            </div>
            <p className="muted">{skill.manifest.long_description}</p>
            <div className="chip-list">
              <span className="chip">{skill.manifest.hermes.prompt_layer_id}</span>
              <span className="chip">{skill.manifest.permissions.length} permissions</span>
              <span className="chip">{skill.manifest.hermes.eval_suite_ids.length} evals</span>
            </div>
            <Link className="btn secondary" href={`/creator/skills/${skill.id}/evals`}>
              <ClipboardCheck /> Eval results
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}

function ManifestEditor() {
  return (
    <div className="grid">
      <RouteTitle title="Skill manifest editor" subtitle="Draft manifests declare Hermes package IDs, prompt layers, permissions, data access, and evals." />
      <section className="panel grid">
        <div className="field-grid">
          <label className="field">
            <span>Skill name</span>
            <input defaultValue="Kindness Quest" />
          </label>
          <label className="field">
            <span>Category</span>
            <select defaultValue="Life skills">
              <option>Life skills</option>
              <option>Math</option>
              <option>Reading</option>
              <option>Science</option>
            </select>
          </label>
          <label className="field">
            <span>Prompt layer ID</span>
            <input defaultValue="prompt_skill_kindness_quest_v1" />
          </label>
          <label className="field">
            <span>Eval suites</span>
            <input defaultValue="age_appropriate_tone, no_personal_data_request" />
          </label>
        </div>
        <label className="field">
          <span>Permission declaration</span>
          <textarea defaultValue={"read_child_age_band\nwrite_skill_progress\ngrant_reward_events"} />
        </label>
        <div className="button-row">
          <button className="btn">
            <Send /> Submit for Hermes review
          </button>
          <button className="btn secondary">
            <Code2 /> Validate manifest
          </button>
        </div>
      </section>
    </div>
  );
}

function CreatorDocs() {
  return (
    <div className="grid">
      <RouteTitle title="Creator docs" subtitle="Safe skill development rules for the Hermes marketplace." />
      <section className="grid two">
        <div className="panel">
          <h2>Runtime boundary</h2>
          <p className="muted">Skills run inside or through Hermes. They cannot call model providers, bypass policy gates, or store arbitrary data.</p>
        </div>
        <div className="panel">
          <h2>Submission checklist</h2>
          <p className="muted">Manifest, permission declaration, prompt layer, state schema, eval suite IDs, and safety notes are required.</p>
        </div>
        <div className="panel">
          <h2>Parent approval</h2>
          <p className="muted">Approved skills are still installed per child by a parent and scoped to that child's Hermes agent.</p>
        </div>
        <div className="panel">
          <h2>No child monetization</h2>
          <p className="muted">Skills cannot monetize directly to children or create hidden prompts, messages, or purchases.</p>
        </div>
      </section>
    </div>
  );
}
