
import React, { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  FileText,
  Receipt,
  UserCircle,
  Users,
  Upload,
  Home,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isAdmin = profile?.type === "admin";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <img src="/cco-logo.png" alt="CCO ENERGY" className="h-10" />
            </div>
            <nav className="hidden md:flex space-x-2">
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Início
              </Button>
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                onClick={() => navigate("/dashboard/reports")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                onClick={() => navigate("/dashboard/boletos")}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Boletos
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                    onClick={() => navigate("/dashboard/users")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Usuários
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                    onClick={() => navigate("/dashboard/clients")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Clientes
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                    onClick={() => navigate("/dashboard/upload")}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-cco-blue-dark hover:bg-cco-blue-light/10"
                    onClick={() => navigate("/dashboard/admin/energy")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Dados
                  </Button>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              className="flex items-center text-gray-600 hover:text-cco-blue-dark"
              onClick={() => navigate("/dashboard/profile")}
            >
              <UserCircle className="w-5 h-5 mr-2" />
              <span className="hidden md:block">
                {profile?.full_name || "Meu Perfil"}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={signOut}
              className="text-gray-600 border-gray-300 hover:border-cco-blue-dark hover:text-cco-blue-dark"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden md:block">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center">
        <div className="flex justify-center items-center mb-2">
          <img src="/cco-logo.png" alt="CCO ENERGY" className="h-8" />
        </div>
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} CCO ENERGY. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
