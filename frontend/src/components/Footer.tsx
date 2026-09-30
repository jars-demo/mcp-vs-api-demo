import { Container } from "./ui";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line py-8 text-[13px] text-muted">
      <Container className="flex flex-col justify-between gap-2 sm:flex-row">
        <p>MCP vs API: an open-source workshop. MIT licensed.</p>
        <p className="font-mono text-[12px]">Weather data is demo data, not live weather.</p>
      </Container>
    </footer>
  );
}
