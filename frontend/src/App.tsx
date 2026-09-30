import type { JSX } from "react";
import { Footer } from "./components/Footer";
import { NavBar } from "./components/NavBar";
import { usePath } from "./lib/router";
import { ExercisesPage } from "./pages/ExercisesPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { WorkshopPage } from "./pages/WorkshopPage";

const ROUTES: Record<string, () => JSX.Element> = {
  "/": HomePage,
  "/simulator": SimulatorPage,
  "/workshop": WorkshopPage,
  "/exercises": ExercisesPage,
};

export default function App() {
  const path = usePath();
  const Page = ROUTES[path.replace(/\/+$/, "") || "/"] ?? NotFoundPage;

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar path={path} />
      <main className="flex-1">
        <Page />
      </main>
      <Footer />
    </div>
  );
}
