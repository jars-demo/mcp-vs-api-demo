import { Container } from "../components/ui";
import { Link } from "../lib/router";

export function NotFoundPage() {
  return (
    <Container className="py-24 text-center">
      <p className="font-mono text-[12px] text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block underline underline-offset-4">
        Back to the start
      </Link>
    </Container>
  );
}
