// src/features/auth/ui/register-page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";

export function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const locale = useLocale();
  const prefix = `/${locale}`;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t("failedToRegister"));
        setLoading(false);
        return;
      }

      router.push(`${prefix}/login`);
    } catch {
      setError(t("somethingWentWrong"));
      setLoading(false);
    }
  }

  async function handleOAuth() {
    setError(null);
    setOauthLoading("google");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error(`[oauth:google]`, err);
      setError(t("unableToContinue"));
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
              htmlFor="name"
              className="text-sm font-medium text-foreground"
            >
              {t("name")}
            </label>
            <Input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("creatingAccount") : t("createAccount")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("haveAccount")}{" "}
          <a
            href={`${prefix}/login`}
            className="font-medium text-foreground underline-offset-4 hover:text-accent transition-colors"
          >
            {t("signIn")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

