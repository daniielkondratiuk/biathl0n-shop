import { ProductCreatePage } from "@/features/admin/products";
import { getEnabledLanguagesForAdminProductForms } from "@/server/services/languages";

export default async function AdminNewProductPage() {
  const enabledLanguages = await getEnabledLanguagesForAdminProductForms();
  return <ProductCreatePage enabledLanguages={enabledLanguages} />;
}
