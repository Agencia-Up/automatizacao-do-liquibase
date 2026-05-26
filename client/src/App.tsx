import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { TRPCProvider } from "@/providers/TRPCProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { ProtectedLayout } from "@/components/Layout";

import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Carousels } from "@/pages/Carousels";
import { Stories } from "@/pages/Stories";
import { Clients } from "@/pages/Clients";
import { History } from "@/pages/History";

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      toastOptions={{
        style: {
          border: "1px solid hsl(var(--border))",
        },
      }}
    />
  );
}

export function App() {
  return (
    <ThemeProvider>
      <TRPCProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/carrosseis" element={<Carousels />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/historico" element={<History />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ThemedToaster />
          </BrowserRouter>
        </AuthProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}
