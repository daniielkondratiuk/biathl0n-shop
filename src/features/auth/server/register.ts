import { z } from "zod";
import { hash } from "bcrypt";
import { prisma } from "@/server/db/prisma";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export interface RegisterError {
  status: number;
  body: {
    error: string;
    details?: unknown;
  };
}

export async function registerUser(
  input: unknown
): Promise<{ success: true } | RegisterError> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
    };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return {
      status: 409,
      body: {
        error: "Email is already in use",
      },
    };
  }

  const passwordHash = await hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  return { success: true };
}

