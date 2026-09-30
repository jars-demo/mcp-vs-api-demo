import assert from "node:assert/strict";
import { test } from "node:test";
import type { StepEvent } from "../types/events";
import { buildTimeline, TEMPLATES } from "./timeline";

function step(step_id: string, status: StepEvent["status"] = "success"): StepEvent {
  return {
    type: "step",
    mode: "mcp",
    step_id,
    stage: "x",
    title: step_id,
    description: "",
    status,
    node: null,
    details: null,
    timestamp: new Date(0).toISOString(),
    elapsed_ms: 0,
  };
}

test("idle timeline shows the expected MCP path as pending", () => {
  const rows = buildTimeline("mcp", [], "idle");
  assert.deepEqual(
    rows.map((row) => row.id),
    TEMPLATES.mcp.map((row) => row.id),
  );
  assert.ok(rows.every((row) => row.status === "pending"));
  assert.ok(rows.some((row) => row.title === "tools/list"));
  assert.ok(rows.some((row) => row.title === "tools/call"));
});

test("steps the model skipped are marked skipped, in template order", () => {
  const events = ["user", "backend", "model", "response"].map((id) => step(id));
  const rows = buildTimeline("api", events, "done");
  assert.deepEqual(
    rows.map((row) => `${row.id}:${row.status}`),
    ["user:success", "backend:success", "model:success", "tool:skipped", "data:skipped", "model_final:skipped", "response:success"],
  );
});

test("repeated tool calls keep their arrival order", () => {
  const ids = ["user", "backend", "model", "tool", "tool#2", "data", "data#2", "model_final", "response"];
  const rows = buildTimeline("api", ids.map((id) => step(id)), "done");
  assert.deepEqual(rows.map((row) => row.id), ids);
});

test("running run shows remaining steps as pending", () => {
  const rows = buildTimeline("api", [step("user"), step("backend"), step("model", "running")], "running");
  assert.equal(rows.find((row) => row.id === "model")?.status, "running");
  assert.equal(rows.find((row) => row.id === "tool")?.status, "pending");
});
