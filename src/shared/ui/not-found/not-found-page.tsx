import Link from "next/link";

type NotFoundPageProps = {
  homeHref: string;
  showAdminButton?: boolean;
};

export function NotFoundPage({
  homeHref,
  showAdminButton = false,
}: NotFoundPageProps) {
  const actionButtonClassName =
    "inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-md bg-[var(--not-found-action-bg)] text-[var(--not-found-action-text)] px-8 text-lg font-semibold shadow-sm transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/20 sm:w-auto sm:text-xl"

  return (
    <main
      className="not-found-root relative min-h-screen w-full"
    >
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-end px-6 pb-28 pt-16 text-center sm:pb-30">
        <div className="flex w-full max-w-md justify-center">
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={homeHref}
              className={actionButtonClassName}
            >
              Back to Home
            </Link>
            {showAdminButton ? (
              <Link
                href="/admin"
                className={actionButtonClassName}
              >
                Back to Backoffice
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

