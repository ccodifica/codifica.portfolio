import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { ReactNode } from "react";
import { ROTAS } from "@/config/rotas";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) {
    return <Navigate to={ROTAS.entrar} replace state={{ from: location.pathname }} />;
  }
  return <PresenceProvider>{children}</PresenceProvider>;
};

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to={ROTAS.entrar} replace state={{ from: location.pathname }} />;
  if (user.role !== "admin") {
    return <Navigate to={ROTAS.minhaArea} replace />;
  }
  return <PresenceProvider>{children}</PresenceProvider>;
};
