// app/[locale]/(store)/layout.tsx
import { Navbar } from "@/shared/layout/navbar";
import { Footer } from "@/shared/layout/footer";
import { GlassWrapper } from "./components/glass-wrapper";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="relative mt-10 flex flex-1 flex-col overflow-hidden">
        <div className="relative z-10 flex flex-1 flex-col">
          <GlassWrapper>{children}</GlassWrapper>
        </div>
      </main>
      <Footer />
    </div>
  );
}
