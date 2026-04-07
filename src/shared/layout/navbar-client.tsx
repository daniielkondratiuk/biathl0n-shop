// src/shared/layout/navbar-client.tsx
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/shared/theme";
import { useStoreThemeTokens } from "@/shared/store-theme";
import { SearchIcon } from "@/components/icons/search-icon";
import { WishlistIconButton } from "@/shared/layout/nav/wishlist-icon-button";
import { CartIconButton } from "@/shared/layout/nav/cart-icon-button";
import { UserAvatarDropdown } from "@/shared/layout/nav/user-avatar-dropdown";
import { LoginIconLink } from "@/shared/layout/nav/login-link";
import { LocaleSwitcher } from "@/shared/i18n/locale-switcher";
import type { Category } from "@/shared/types/prisma";
import { useCartStore } from "@/features/cart";
import { GlassWrapper } from "@/app/[locale]/(store)/components/glass-wrapper";
import type { LocaleMeta } from "@/i18n/locales";

type NavItem = { label: string; href: string };

const emptySubscribe = () => () => {};

interface NavbarClientProps {
  user:
    | {
        id: string;
        role: "USER" | "ADMIN";
        name: string | null;
        email: string;
      }
    | null;
  categories: Category[];
  enabledLocales?: ReadonlyArray<LocaleMeta>;
}

export function NavbarClient({ user, enabledLocales }: NavbarClientProps) {
  const themeTokens = useStoreThemeTokens();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");
  const NAV_ITEMS: readonly NavItem[] = [
    { href: "/catalog", label: t("shop") },
    { href: "/about", label: t("aboutUs") },
    { href: "/values", label: t("ourValues") },
    { href: "/contact", label: t("contact") },
  ] as const;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLinkBarVisible, setIsLinkBarVisible] = useState(true);
  const linkBarRef = useRef<HTMLElement | null>(null);
  const tickingRef = useRef(false);
  const lastYRef = useRef(0);
  const accumRef = useRef(0);
  const dirRef = useRef<"up" | "down" | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    const TOP_Y = 8;
    const HIDE_AFTER = 18;
    const SHOW_AFTER = 10;
    const MIN_DELTA = 1;
    let initialized = false;

    const update = () => {
      const y = window.scrollY;
      setIsScrolled(y > TOP_Y);

      if (!initialized) {
        lastYRef.current = y;
        initialized = true;
        if (y <= TOP_Y) setIsLinkBarVisible(true);
        tickingRef.current = false;
        return;
      }

      if (y <= TOP_Y) {
        setIsLinkBarVisible(true);
        lastYRef.current = y;
        accumRef.current = 0;
        dirRef.current = null;
        tickingRef.current = false;
        return;
      }

      const delta = y - lastYRef.current;

      if (Math.abs(delta) < MIN_DELTA) {
        lastYRef.current = y;
        tickingRef.current = false;
        return;
      }

      const dir: "up" | "down" = delta > 0 ? "down" : "up";

      if (dirRef.current !== dir) {
        accumRef.current = 0;
        dirRef.current = dir;
      }

      accumRef.current += Math.abs(delta);

      if (dir === "down" && accumRef.current >= HIDE_AFTER) {
        setIsLinkBarVisible(false);
        accumRef.current = 0;
      } else if (dir === "up" && accumRef.current >= SHOW_AFTER) {
        setIsLinkBarVisible(true);
        accumRef.current = 0;
      }

      lastYRef.current = y;
      tickingRef.current = false;
    };

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsSearching(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const opts: AddEventListenerOptions = { capture: true };

    const onPointerDown = (ev: PointerEvent) => {
      const root = searchWrapRef.current;
      if (!root) return;

      const target = ev.target;
      if (!(target instanceof Node)) return;

      if (root.contains(target)) return;

      setIsSearchOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, opts);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, opts);
    };
  }, [isSearchOpen]);

  const focusSearchInput = () => {
    searchWrapRef.current?.querySelector("input")?.focus();
  };

  const handleSearchClick = () => {
    if (!isSearchOpen) {
      setIsSearchOpen(true);
      requestAnimationFrame(focusSearchInput);
    } else {
      const q = searchValue.trim();
      if (q.length >= 3) {
        setIsSearching(true);
        router.push(`/${locale}/catalog?q=${encodeURIComponent(q)}`);
      } else {
        focusSearchInput();
      }
    }
  };

  const handleInputBlur = () => {
    if (searchValue.trim().length === 0 && !isSearching) {
      setIsSearchOpen(false);
    }
  };

  const cartCount = mounted
    ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  return (
    <div className="sticky top-0 z-50">
      {/* TOP BAR */}
      <div
        className="relative z-20 transition-colors duration-200"
        style={{
          backgroundColor: isScrolled ? themeTokens.headerBgGlass : themeTokens.headerBgSolid,
          backdropFilter: isScrolled ? `blur(${themeTokens.headerGlassBlurPx}px)` : "none",
          WebkitBackdropFilter: isScrolled ? `blur(${themeTokens.headerGlassBlurPx}px)` : "none",
        }}
      >
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-3 items-center px-6">
          {/* Left Group - User + Locale Switcher + Search */}
          <div className="flex items-center gap-4 justify-self-start">
            {/* Auth Section */}
            {user ? (
              <UserAvatarDropdown
                userName={user.name}
                userEmail={user.email}
              />
            ) : (
              <LoginIconLink />
            )}

            {/* Locale Switcher */}
            <LocaleSwitcher enabledLocales={enabledLocales} />

            {/* Search */}
            <div ref={searchWrapRef} className="flex items-center">
              <div
                className={`overflow-hidden transition-[width,opacity] duration-300 ease-out ${
                  isSearchOpen
                    ? "mr-2 w-36 opacity-100 sm:w-36"
                    : "w-0 opacity-0 pointer-events-none"
                }`}
              >
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchClick();
                  }}
                  placeholder={`${t("search")}...`}
                  className="w-full border-0 border-b border-border/40 bg-transparent px-0 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchClick}
                onMouseDown={(e) => e.preventDefault()}
                className="flex cursor-pointer items-center justify-center"
                aria-label={t("search")}
              >
                <SearchIcon className="h-6 w-6 text-foreground" />
              </button>
            </div>
          </div>

          {/* Center - Logo */}
          <Link href={`/${locale}`} className="flex items-center justify-self-center">
            <Image
              src={themeTokens.logoSrc}
              alt="predators"
              width={180}
              height={80}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Right Group - Wishlist + Cart + Theme Toggle */}
          <div className="flex items-center gap-4 justify-self-end">
            {/* Wishlist Icon */}
            <WishlistIconButton href={`/${locale}/wishlist`} />

            {/* Cart Icon */}
            <CartIconButton cartCount={cartCount} href={`/${locale}/cart`} />

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* LINK BAR */}
      <nav
        ref={linkBarRef}
        aria-label="Secondary"
        className={`absolute z-10 bg-white/5 shadow-sm shadow-black/20 backdrop-blur-md left-0 right-0 top-full py-2 transition-[transform,opacity] duration-300 ease-out will-change-transform sm:py-2`}
      >
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-20 gap-y-2 px-6 sm:gap-x-24 lg:gap-x-28">
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}${item.href}`;
            const isActive =
              pathname === href ||
              (item.href !== "/" && pathname.startsWith(`${href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={`relative inline-flex text-sm font-medium uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 ${
                    isActive
                      ? "text-foreground after:scale-x-100"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
