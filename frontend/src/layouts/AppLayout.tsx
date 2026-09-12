import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Bot, Camera, FileText, Gauge, Leaf, LogOut, Salad, Settings2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-card/95 backdrop-blur lg:block">
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">NutriTrack AI</p>
            <p className="text-xs text-muted-foreground">Personal nutrition OS</p>
          </div>
        </div>
        <nav className="space-y-1.5 p-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground",
                  isActive && "bg-primary/10 text-primary shadow-sm"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mx-4 border-t pt-4">
          <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Settings2 className="h-3 w-3" /> Appearance
          </div>
          <ThemeToggle />
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg bg-secondary/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.name?.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button className="w-full justify-start" variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></div>
              <span className="text-sm font-semibold">NutriTrack AI</span>
            </div>
            <p className="hidden text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground lg:block">Nutrition workspace</p>
            <div className="flex items-center gap-2">
              <div className="lg:hidden"><ThemeToggle /></div>
              <Button className="lg:hidden" size="sm" variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto pb-0.5 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground", isActive && "bg-primary/10 text-primary")}
                key={item.to}
                to={item.to}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
