import { ArrowRight, BookOpen } from "lucide-react";
import { ArchitectureFlow } from "../components/ArchitectureView";
import { CodeBlock } from "../components/CodeBlock";
import { Callout, Card, Container, Eyebrow, SectionHeading } from "../components/ui";
import { Link } from "../lib/router";

const CONCEPTS = [
  {
    number: "01",
    title: "API",
    body: "Application-controlled integration. Your code decides what to call and when.",
  },
  {
    number: "02",
    title: "Tool Calling",
    body: "Let the model decide when a capability is required. Your code still runs the tool.",
  },
  {
    number: "03",
    title: "MCP",
    body: "A standardized protocol for connecting AI applications to tools.",
  },
];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <Container className="py-16 sm:py-24">
          <Eyebrow>Open-source workshop</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold tracking-tighter sm:text-7xl">
            MCP <span className="text-subtle">vs</span> API
          </h1>
          <p className="mt-6 max-w-2xl text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
            Same AI task.
            <br />
            <span className="text-muted">Two different integration patterns.</span>
          </p>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
            An interactive workshop for understanding how AI applications connect models to external capabilities.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/simulator"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-[14px] font-semibold text-canvas transition hover:bg-ink/85"
            >
              Open Simulator <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/workshop"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-5 text-[14px] font-medium transition hover:border-ink"
            >
              <BookOpen className="size-4" /> Read Workshop <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Three concepts */}
      <Container className="py-14 sm:py-20">
        <div className="grid gap-4 md:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <Card key={concept.number} className="p-5">
              <p className="font-mono text-[12px] text-subtle">{concept.number}</p>
              <h2 className="mt-6 text-xl font-semibold tracking-tight">{concept.title}</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{concept.body}</p>
            </Card>
          ))}
        </div>

        {/* Architecture preview */}
        <section className="mt-20">
          <SectionHeading eyebrow="Architecture" title="One backend, two paths to the same tool">
            Both modes use the same React UI, the same FastAPI backend, the same Groq model and the same demo data. Only
            the way the backend reaches the tool changes.
          </SectionHeading>
          <Card className="mt-6 space-y-6 p-5 sm:p-6">
            <ArchitectureFlow mode="api" visited={new Set(["user", "react", "fastapi", "groq", "app_tool", "data"])} showDetails />
            <ArchitectureFlow
              mode="mcp"
              visited={new Set(["user", "react", "fastapi", "groq", "mcp_client", "mcp_server", "tool", "data"])}
              showDetails
            />
          </Card>
        </section>

        {/* What you'll build */}
        <section className="mt-20 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading eyebrow="What you'll build" title="A tiny AI app with one capability, wired up two ways">
              A tiny AI application that can use the same capability through both an API integration and an MCP server.
              Then you add your own MCP tool and open a pull request.
            </SectionHeading>
            <ul className="mt-5 space-y-2 text-[14.5px]">
              {[
                "Run the same prompt side by side",
                "Watch tools/list and tools/call happen live",
                "Add get_time() and get_exchange_rate() tools",
                "Contribute your own tool back to the repo",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-ink" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <CodeBlock
              language="python"
              title="mcp-server/server.py"
              code={`@mcp.tool()\ndef get_weather(city: str) -> dict:\n    """Get weather information for a city."""\n    return tools.get_weather(city)`}
            />
            <Callout title="MCP does not eliminate APIs.">
              MCP can sit above APIs. An MCP tool can call a REST API, a database or an internal service. MCP
              standardizes how AI applications discover and call it.
            </Callout>
          </div>
        </section>
      </Container>
    </>
  );
}
