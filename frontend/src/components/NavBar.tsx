import { Link } from "../lib/router";

const LINKS = [
  { to: "/simulator", label: "Simulator" },
  { to: "/workshop", label: "Workshop" },
  { to: "/exercises", label: "Exercises" },
];

export function NavBar({ path }: { path: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span>
            MCP <span className="font-normal text-subtle">vs</span> API
          </span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto text-[14px]">
          {LINKS.map((link) => {
            const active = path === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 whitespace-nowrap transition ${
                  active ? "bg-wash font-medium text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
