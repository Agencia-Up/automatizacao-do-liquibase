import { Outlet, Navigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid place-items-center h-full">
        <Sparkles className="h-8 w-8 text-brand-orange animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
