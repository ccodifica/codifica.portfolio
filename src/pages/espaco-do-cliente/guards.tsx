import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) {
    return (
      <Navigate
        to="/espaco-do-cliente/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <>{children}</>;
};

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/espaco-do-cliente/login" replace />;
  if (user.role !== "admin") {
    return <Navigate to="/espaco-do-cliente/painel" replace />;
  }
  return <>{children}</>;
};
