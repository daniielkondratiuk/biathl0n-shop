// src/server/auth/auth.ts
import "server-only";
import type { NextAuthOptions, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare, hash } from "bcrypt";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";


const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }): Promise<boolean> {
      if (account?.provider === "google") {
        const email = profile?.email || user?.email;
        if (!email) {
          console.error(`[oauth:google] missing email in profile`);
          return false;
        }

        const existing = await prisma.user.findUnique({
          where: { email },
        });

        if (!existing) {
          const passwordHash = await hash(randomBytes(32).toString("hex"), 10);
          await prisma.user.create({
            data: {
              email,
              name: profile?.name || user?.name || null,
              passwordHash,
            },
          });
        }
      }

      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: User }): Promise<JWT> {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if ((!token.id || !token.role) && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          ...(token.id ? { id: token.id as string } : {}),
          ...(token.role ? { role: token.role as "USER" | "ADMIN" } : {}),
        },
      };
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }): Promise<string> {
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // Handle absolute URLs (ensure same origin for security)
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch {
        // Invalid URL, fall through to baseUrl
      }
      
      // Default to home page
      return baseUrl;
    },
  },
};

