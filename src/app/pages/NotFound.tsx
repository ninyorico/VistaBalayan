import { useNavigate } from "react-router";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-[100dvh] place-items-center tourism-shell p-6 text-[#0B2530]">
      <section className="vista-card max-w-xl p-8 text-center sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EAF2F1] text-[#0E5A72] ring-1 ring-[#b8d2cf]">
          <Home className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0E5A72]">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#0B2530] sm:text-5xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#5D6F73]">
          The page you're looking for does not exist or may have moved to another VistaBalayan workspace.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="vista-button-soft px-5 py-3"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="vista-button-primary px-5 py-3"
          >
            <Home className="h-4 w-4" strokeWidth={1.8} />
            Home
          </button>
        </div>
      </section>
    </main>
  );
}
