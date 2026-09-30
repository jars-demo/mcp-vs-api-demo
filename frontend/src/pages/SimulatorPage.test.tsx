import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import { ModePanel } from "../components/ModePanel";
import type { RunState } from "../lib/useRun";
import { SimulatorPage } from "./SimulatorPage";

test("simulator renders the prompt, run buttons and both modes", () => {
  const html = renderToString(<SimulatorPage />);
  for (const text of ["Run API", "Run MCP", "Run Both", "Traditional Integration", "Model Context Protocol"]) {
    assert.ok(html.includes(text), `missing: ${text}`);
  }
  assert.ok(html.includes("What&#x27;s the weather in Mumbai?"));
  assert.ok(html.includes("tools/list") && html.includes("tools/call"));
  assert.ok(html.includes("MCP does not replace APIs."));
});

test("a finished MCP run shows the answer and the explanation", () => {
  const state: RunState = {
    phase: "done",
    message: "What's the weather in Mumbai?",
    steps: [
      {
        type: "step",
        mode: "mcp",
        step_id: "server",
        stage: "server",
        title: 'get_weather(city="Mumbai")',
        description: "",
        status: "success",
        node: "tool",
        details: null,
        timestamp: new Date(0).toISOString(),
        elapsed_ms: 12,
      },
    ],
    log: [],
    answer: "It is 29°C and partly cloudy in Mumbai.",
    error: null,
    elapsedMs: 900,
  };
  const html = renderToString(<ModePanel mode="mcp" state={state} presenter={false} />);
  assert.ok(html.includes("It is 29°C and partly cloudy in Mumbai."));
  assert.ok(html.includes("Demo data — not live weather"));
  assert.ok(html.includes("The MCP client discovered a standardized tool exposed by the MCP server."));
});
