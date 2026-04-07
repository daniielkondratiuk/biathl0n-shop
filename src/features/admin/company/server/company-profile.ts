// src/features/admin/company/server/company-profile.ts
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import type { CompanyProfile } from "@prisma/client";

// Zod schema for company profile input validation
export const CompanyProfileInput = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  brandName: z.string().min(1, "Brand name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().min(1, "Postal code is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  siren: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
  vatId: z.string().optional().nullable(),
  vatNote: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  invoicePrefix: z.string().default("INV"),
  invoiceNextNumber: z.number().int().min(1).default(1),
  paymentTerms: z.string().optional().nullable(),
  legalFooter: z.string().optional().nullable(),
  logoUrl: z
    .union([z.string().url("Must be a valid URL"), z.literal("")])
    .nullable()
    .optional(),
});

export type CompanyProfileInput = z.infer<typeof CompanyProfileInput>;

export interface UpsertCompanyProfileError {
  status: number;
  error: string;
  details?: unknown;
}

/**
 * Get the company profile (singleton, id="default")
 * Returns null if not yet created
 */
export async function getCompanyProfile() {
  return await prisma.companyProfile.findUnique({
    where: { id: "default" },
  });
}

/**
 * Upsert company profile (always uses id="default")
 * Returns the saved profile or an error
 */
export async function upsertCompanyProfile(
  input: unknown
): Promise<{ profile: CompanyProfile } | UpsertCompanyProfileError> {
  const parsed = CompanyProfileInput.safeParse(input);
  
  if (!parsed.success) {
    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  try {
    // Normalize empty string to null for optional fields
    const data = {
      ...parsed.data,
      addressLine2: parsed.data.addressLine2 || null,
      siren: parsed.data.siren || null,
      siret: parsed.data.siret || null,
      vatId: parsed.data.vatId || null,
      vatNote: parsed.data.vatNote || null,
      paymentTerms: parsed.data.paymentTerms || null,
      legalFooter: parsed.data.legalFooter || null,
      logoUrl: parsed.data.logoUrl || null,
    };

    const profile = await prisma.companyProfile.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        ...data,
      },
    });

    return { profile };
  } catch (error) {
    console.error("Error upserting company profile:", error);
    return {
      status: 500,
      error: "Failed to save company profile",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

