import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Bot, Camera, FileText, Gauge, LogOut, Salad, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/meals", label: "Meals", icon: Salad },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/ai-upload", label: "AI Upload", icon: Camera },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/pdf-import", label: "PDF Import", icon: FileText }
];

export function AppLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold">NutriTrack AI</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  isActive && "bg-secondary text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button className="w-full justify-start" variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="lg:pl-64">
        <div className="flex items-center justify-between border-b bg-card px-4 py-4 lg:px-8">
          <p className="text-sm text-muted-foreground">AI-powered nutrition tracking workspace</p>
          <Button className="lg:hidden" size="sm" variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
