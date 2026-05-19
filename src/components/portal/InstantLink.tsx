"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type AnchorHTMLAttributes, type ReactNode } from "react";

interface InstantLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: ReactNode;
  /**
   * Si true, prefetcha la ruta al montar el componente (además del prefetch
   * de Next por viewport y de los hover/focus). Útil para filtros y botones
   * de acción primaria que el usuario probablemente clickeará pronto.
   * Por defecto false: el prefetch solo ocurre en hover/focus para no
   * saturar la red con listas largas de detalles.
   */
  prefetchOnMount?: boolean;
}

/**
 * Link de navegación interna con prefetch agresivo, replicando el mismo
 * patrón que el Sidebar (que navega en ~40-50ms):
 *  - prefetch prop en el Link (Next.js maneja prefetch por viewport)
 *  - router.prefetch(href) en hover y focus (forza descarga del RSC payload)
 *  - opcional: prefetch en mount para rutas que el usuario probablemente
 *    visitará a continuación
 *
 * Conserva por completo la UI: solo envuelve Link y no inyecta markup,
 * estilos ni estado pendiente visual.
 */
export default function InstantLink({
  href,
  children,
  prefetchOnMount = false,
  onMouseEnter,
  onFocus,
  ...rest
}: InstantLinkProps) {
  const router = useRouter();

  useEffect(() => {
    if (prefetchOnMount) router.prefetch(href);
  }, [router, href, prefetchOnMount]);

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={(e) => {
        router.prefetch(href);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        router.prefetch(href);
        onFocus?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
