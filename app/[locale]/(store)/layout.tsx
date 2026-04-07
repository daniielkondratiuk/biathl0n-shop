// app/[locale]/(store)/layout.tsx
import { Navbar } from "@/shared/layout/navbar";
import { Footer } from "@/shared/layout/footer";
import { GlassWrapper } from "./components/glass-wrapper";
import { StoreThemeShell } from "./store-theme-shell";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreThemeShell>
      <Navbar />
      <main className="relative mt-10 flex flex-1 flex-col overflow-hidden">
        <div className="relative z-10 flex flex-1 flex-col">
          <GlassWrapper>{children}</GlassWrapper>
        </div>
      </main>
      <Footer />
    </StoreThemeShell>
  );
}
