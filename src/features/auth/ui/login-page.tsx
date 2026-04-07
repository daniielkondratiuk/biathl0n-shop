// src/features/auth/ui/login-page.tsx
"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";

function LoginContent() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const prefix = `/${locale}`;
  
  // Get callbackUrl from query params (set by NextAuth when redirecting to login)
  // If not present, default to home page
  const callbackUrlParam = searchParams.get("callbackUrl") || "/";
  
  // Strip locale prefixes to avoid double prefixing (e.g., /en/en)
  // The router/middleware will handle locale resolution
  const callbackUrl = (() => {
    if (callbackUrlParam.startsWith("http://") || callbackUrlParam.startsWith("https://")) {
      return callbackUrlParam;
    }

    // Keep admin unlocalized (no change needed)
    if (callbackUrlParam.startsWith("/admin")) {
      return callbackUrlParam;
    }

    // Strip locale prefix if present (e.g., /en/dashboard -> /dashboard)
    if (callbackUrlParam.startsWith("/en/")) {
      return callbackUrlParam.slice(4); // Remove "/en/"
    }
    if (callbackUrlParam.startsWith("/fr/")) {
      return callbackUrlParam.slice(4); // Remove "/fr/"
    }
    if (callbackUrlParam === "/en" || callbackUrlParam === "/fr") {
      return "/";
    }

    // Already relative (no locale prefix), use as-is
    return callbackUrlParam;
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (!result || result.error) {
      setLoading(false);
      setError(t("invalidCredentials"));
      return;
    }

    // After successful sign in, get the session to check user role
    const session = await getSession();
    
    if (session?.user?.role === "ADMIN") {
      // ADMIN always goes to /admin
      router.push("/admin");
    } else {
      // Regular USER returns to the page they were on
      // If callbackUrl is "/", redirect to current locale's home
      const finalUrl = callbackUrl === "/" ? prefix : callbackUrl;
      router.push(finalUrl);
    }
    
    setLoading(false);
  }

  async function handleOAuth() {
    setError(null);
    setOauthLoading("google");
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error(`[oauth:google]`, err);
      setError(t("unableToSignIn"));
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-card-foreground">
          {t("title")}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mb-4">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={oauthLoading === "google"}
            onClick={handleOAuth}
          >
            {oauthLoading === "google" ? t("continuingWithGoogle") : t("continueWithGoogle")}
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              {t("email")}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              {t("password")}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("noAccount")}{" "}
          <a
            href={`${prefix}/register`}
            className="font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
          >
            {t("createOne")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center px-4">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

