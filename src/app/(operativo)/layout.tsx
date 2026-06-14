import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import PortalShell from "@/components/portal/PortalShell";
import { ThemeProvider } from "@/components/portal/ThemeProvider";
import { canAccessModule, landingFor } from "@/lib/modules";

// Aplica la clase `dark` antes de hidratar para evitar parpadeo (igual que el portal).
const themeInitScript = `(function(){try{var t=localStorage.getItem('solterra-theme');var d=(t==='dark')||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  // Debe tener acceso a algún módulo de terreno; si no, lo mandamos a su home.
  if (
    !canAccessModule(session, "MANTENCION") &&
    !canAccessModule(session, "OPERACION")
  ) {
    redirect(landingFor(session));
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <ThemeProvider>
        <PortalShell
          nombre={session.nombre}
          email={session.email}
          rol={session.rol}
          area={session.area}
        >
          {children}
        </PortalShell>
      </ThemeProvider>
    </>
  );
}
