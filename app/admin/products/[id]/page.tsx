import { ProductEditPage } from "@/features/admin/products";
import { getEnabledLanguagesForAdminProductForms } from "@/server/services/languages";

export default async function AdminEditProductPage() {
  const enabledLanguages = await getEnabledLanguagesForAdminProductForms();
  return <ProductEditPage enabledLanguages={enabledLanguages} />;
}
