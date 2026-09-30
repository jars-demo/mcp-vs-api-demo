// The workshop companion: short sections to follow along with the live session.

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { ComparisonTable } from "../components/ComparisonTable";
import { Callout, Container, Eyebrow, InlineCode } from "../components/ui";
import { Link } from "../lib/router";

const SECTIONS = [
  { id: "apis", title: "APIs" },
  { id: "tool-calling", title: "LLM Tool Calling" },
  { id: "integration-problem", title: "The Integration Problem" },
  { id: "mcp", title: "MCP" },
  { id: "run-api", title: "Run API Mode" },
  { id: "run-mcp", title: "Run MCP Mode" },
  { id: "compare", title: "Compare the Architectures" },
  { id: "exercise", title: "Hands-on Exercise" },
  { id: "build", title: "Build Your Own Tool" },
];

function Section({ index, children }: { index: number; children: ReactNode }) {
  const section = SECTIONS[index];
  return (
    <section id={section.id} className="scroll-mt-20 border-t border-line py-10 first:border-0 first:pt-0">
      <p className="font-mono text-[12px] text-subtle">{String(index + 1).padStart(2, "0")}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{section.title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-line font-mono text-[11px] text-muted">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Flow({ lines }: { lines: string[] }) {
  return <CodeBlock language="text" code={lines.join("\n   ↓\n")} />;
}

const SimulatorLink = ({ label = "Open the simulator" }: { label?: string }) => (
  <Link to="/simulator" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">
    {label} <ArrowRight className="size-3.5" />
  </Link>
);

export function WorkshopPage() {
  return (
    <Container className="pt-10 sm:pt-14">
      <Eyebrow>Workshop companion</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">MCP vs API, in nine short steps</h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
        Read along during the session. Each section takes a few minutes. The simulator is where the ideas become
        visible.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ol className="sticky top-20 space-y-1 text-[13px]">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex gap-2 rounded px-2 py-1 text-muted hover:bg-wash hover:text-ink">
                  <span className="font-mono text-subtle">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-3xl">
          <Section index={0}>
            <p>
              An API is a contract for using a capability: an HTTP endpoint, an SDK method or a plain function. The
              application decides <em>when</em> to call it and <em>how</em>.
            </p>
            <CodeBlock language="python" code={`weather = get_weather("Mumbai")          # a function\n# or: GET https://api.example.com/weather?city=Mumbai`} />
            <p>Nothing here needs AI. The developer wired the call in advance.</p>
          </Section>

          <Section index={1}>
            <p>
              With tool calling, you describe tools to the model: a name, a description and a JSON Schema for the
              arguments. The <strong>model</strong> decides whether a tool is needed and returns a tool call. Your code
              runs it and sends the result back.
            </p>
            <Flow lines={["User prompt", "Model: “I need get_weather(city=Mumbai)”", "Your code runs get_weather()", "Model writes the final answer"]} />
            <p>
              Ask “Tell me a joke.” and the model answers without any tool. That choice is why tool calling exists.
            </p>
          </Section>

          <Section index={2}>
            <p>
              Tool calling tells the model <em>what</em> tools exist, but every application still writes its own glue:
              schemas, invocation code, error handling. If three AI apps need the same five tools, that glue is written
              again in each app.
            </p>
            <p>
              Changing a tool then means changing every application that hard-coded it. The tools are not easy to
              reuse outside the app that defined them.
            </p>
          </Section>

          <Section index={3}>
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is an open protocol that standardizes how AI
              applications discover and call capabilities. An <em>MCP server</em> exposes tools. An <em>MCP client</em>{" "}
              lists them with <InlineCode>tools/list</InlineCode> and runs them with <InlineCode>tools/call</InlineCode>.
            </p>
            <Callout title="MCP does not replace APIs.">MCP can sit above APIs. The tool behind an MCP server usually calls one.</Callout>
            <div className="grid gap-3 sm:grid-cols-3">
              <Flow lines={["MCP Server", "get_weather()", "REST API"]} />
              <Flow lines={["MCP Server", "get_customer()", "PostgreSQL"]} />
              <Flow lines={["MCP Server", "create_ticket()", "Jira API"]} />
            </div>
          </Section>

          <Section index={4}>
            <Steps
              items={[
                <>
                  <SimulatorLink /> and keep the default prompt <InlineCode>What's the weather in Mumbai?</InlineCode>
                </>,
                <>
                  Click <strong>Run API</strong>.
                </>,
                <>
                  Watch <InlineCode>POST /api/api-mode/chat</InlineCode>, then Groq choosing <InlineCode>get_weather</InlineCode>,
                  then a direct Python function call.
                </>,
                <>
                  Open <InlineCode>backend/api_mode/tools.py</InlineCode>: the tool schema and the function are both
                  written inside the application.
                </>,
              ]}
            />
            <p className="text-muted">Takeaway: the application controls the integration.</p>
          </Section>

          <Section index={5}>
            <Steps
              items={[
                <>
                  Make sure the MCP server is running (<InlineCode>python server.py</InlineCode> in{" "}
                  <InlineCode>mcp-server/</InlineCode>).
                </>,
                <>
                  Click <strong>Run MCP</strong>.
                </>,
                <>
                  Watch the client connect, then <InlineCode>tools/list</InlineCode>, the discovered tools, Groq's choice
                  and <InlineCode>tools/call</InlineCode>.
                </>,
                <>
                  Expand any step to see the real payloads. Turn on <strong>Presenter Mode</strong> for timestamps and the
                  raw event stream.
                </>,
                <>
                  Open <InlineCode>mcp-server/server.py</InlineCode> (create, register, implement, run) and{" "}
                  <InlineCode>backend/mcp_mode/service.py</InlineCode>.
                </>,
              ]}
            />
            <p className="text-muted">Takeaway: the backend learned about the tools at runtime, through a standard protocol.</p>
          </Section>

          <Section index={6}>
            <p>
              Click <strong>Run Both</strong>. Same user request, different integration path. Neither is automatically
              better. They solve different problems.
            </p>
            <ComparisonTable />
          </Section>

          <Section index={7}>
            <p>
              Add a <InlineCode>get_time(city)</InlineCode> tool to the MCP server, restart it and watch it appear in{" "}
              <InlineCode>tools/list</InlineCode> without changing the backend.
            </p>
            <Link to="/exercises" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">
              Go to the exercises <ArrowRight className="size-3.5" />
            </Link>
          </Section>

          <Section index={8}>
            <p>Build a tool of your own and send it back as a pull request.</p>
            <Flow
              lines={[
                "Fork the repository",
                "Create a feature branch",
                "Add your own MCP tool",
                "Update documentation",
                "Test it",
                "Commit and push",
                "Open a Pull Request",
              ]}
            />
            <Link to="/exercises#build-something" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">
              Ideas and the full workflow <ArrowRight className="size-3.5" />
            </Link>
          </Section>
        </div>
      </div>
    </Container>
  );
}
