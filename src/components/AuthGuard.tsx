
import React, { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface AuthGuardProps {
  children: ReactNode | (({ user, profile }: { user: any, profile: any }) => ReactNode);
  requireAdmin?: boolean;
}

const AuthGuard = ({ children, requireAdmin = false }: AuthGuardProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Você precisa estar logado para acessar esta página",
        });
        navigate("/login");
      } else if (requireAdmin && profile?.type !== "admin") {
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página",
        });
        navigate("/dashboard");
      }
    }
  }, [user, profile, loading, navigate, requireAdmin]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  // Se children é uma função, chama passando user e profile
  if (typeof children === 'function') {
    return <>{children({ user, profile })}</>;
  }

  return <>{children}</>;
};

export default AuthGuard;
