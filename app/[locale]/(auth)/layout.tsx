// app/(auth)/layout.tsx
import { Navbar } from "@/shared/layout/navbar";
import { Footer } from "@/shared/layout/footer";
import { BackgroundParallax } from "@/shared/ui/background-parallax";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative z-10 flex min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center bg-white/5 py-12 shadow-sm shadow-black/20 ring-1 ring-white/10 backdrop-blur-md">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
