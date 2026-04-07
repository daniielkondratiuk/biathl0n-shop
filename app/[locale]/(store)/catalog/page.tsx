// app/catalog/page.tsx
import type { Metadata } from "next";
import { CatalogPage } from "@/features/catalog";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Catalog",
  description: "Browse all custom-ready garments and accessories.",
  openGraph: {
    title: "Catalog | predators",
    description: "Browse all custom-ready garments and accessories.",
  },
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Catalog({ searchParams }: CatalogPageProps) {
  return <CatalogPage searchParams={searchParams} />;
}
