import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/utils/trpc";

interface AuthContextValue {
  user: ReturnType<typeof trpc.auth.me.useQuery>["data"];
  isLoading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  return (
    <AuthContext.Provider
      value={{ user: data, isLoading, refetch: () => refetch() }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
