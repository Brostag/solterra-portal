import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import PortalShell from "@/components/portal/PortalShell";
import { ThemeProvider } from "@/components/portal/ThemeProvider";
import { canAccessModule, landingFor } from "@/lib/modules";
import { esSoporte } from "@/lib/soporte";

// Aplica la clase `dark` antes de que React hidrate para evitar parpadeo
// cuando el usuario tiene tema oscuro guardado en localStorage.
const themeInitScript = `(function(){try{var t=localStorage.getItem('solterra-theme');var d=(t==='dark')||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  // Operativos (área asignada, no admin) no entran al Comercial: van a su módulo.
  if (!canAccessModule(session, "COMERCIAL")) redirect(landingFor(session));

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <ThemeProvider>
        {/* esSoporte se resuelve acá: SOPORTE_EMAILS es server-only y el
            Sidebar es cliente. Para el resto de las cuentas viaja como false. */}
        <PortalShell
          nombre={session.nombre}
          email={session.email}
          rol={session.rol}
          area={session.area}
          esSoporte={esSoporte(session)}
        >
          {children}
        </PortalShell>
      </ThemeProvider>
    </>
  );
}
