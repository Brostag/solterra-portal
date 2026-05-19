import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import PortalShell from "@/components/portal/PortalShell";
import { ThemeProvider } from "@/components/portal/ThemeProvider";

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

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <ThemeProvider>
        <PortalShell nombre={session.nombre} email={session.email} rol={session.rol}>
          {children}
        </PortalShell>
      </ThemeProvider>
    </>
  );
}
