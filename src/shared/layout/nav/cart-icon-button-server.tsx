import { CartIconButton } from "./cart-icon-button";
import { getLocale } from "next-intl/server";

export async function CartIconButtonServer() {
  const locale = await getLocale();
  return <CartIconButton cartCount={0} href={`/${locale}/cart`} />;
}
