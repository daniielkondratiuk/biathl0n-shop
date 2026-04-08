import Link from "next/link";

type NotFoundPageProps = {
  homeHref: string;
  showAdminButton?: boolean;
};

export function NotFoundPage({
  homeHref,
  showAdminButton = false,
}: NotFoundPageProps) {
  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-900 ">
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-10 shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white text-sm font-semibold text-slate-700">
            404
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">404</h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">Page not found</p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={homeHref}
              className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-md bg-slate-700 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 sm:w-auto"
            >
              Back to home
            </Link>
            {showAdminButton ? (
              <Link
                href="/admin"
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 sm:w-auto"
              >
                Back to backoffice
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

