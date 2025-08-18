
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ClientReports from "./pages/ClientReports";
import ClientBoletos from "./pages/ClientBoletos";
import AdminUsers from "./pages/AdminUsers";
import AdminUpload from "./pages/AdminUpload";
import AdminClients from "./pages/AdminClients";
import AdminReports from "./pages/AdminReports";
import AdminBoletos from "./pages/AdminBoletos";
import UserProfile from "./pages/UserProfile";
import AuthGuard from "./components/AuthGuard";
import AdminEnergyHistory from "./pages/AdminEnergyHistory";
import AdminEnergy from "./pages/AdminEnergy";
import AdminSchemaSetup from "./pages/AdminSchemaSetup";
// import { SchemaInitializer } from "./components/SchemaInitializer";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* <SchemaInitializer /> */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Rotas protegidas */}
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/dashboard/reports" element={
              <AuthGuard>
                {({ profile }) => profile?.type === 'admin' 
                  ? <Navigate to="/dashboard/admin/reports" replace /> 
                  : <ClientReports />
                }
              </AuthGuard>
            } />
            <Route path="/dashboard/boletos" element={
              <AuthGuard>
                {({ profile }) => profile?.type === 'admin' 
                  ? <Navigate to="/dashboard/admin/boletos" replace /> 
                  : <ClientBoletos />
                }
              </AuthGuard>
            } />
            <Route path="/dashboard/profile" element={<AuthGuard><UserProfile /></AuthGuard>} />
            
            {/* Rotas de admin */}
            <Route path="/dashboard/users" element={<AuthGuard requireAdmin={true}><AdminUsers /></AuthGuard>} />
            <Route path="/dashboard/upload" element={<AuthGuard requireAdmin={true}><AdminUpload /></AuthGuard>} />
            <Route path="/dashboard/clients" element={<AuthGuard requireAdmin={true}><AdminClients /></AuthGuard>} />
            <Route path="/dashboard/admin/reports" element={<AuthGuard requireAdmin={true}><AdminReports /></AuthGuard>} />
            <Route path="/dashboard/admin/boletos" element={<AuthGuard requireAdmin={true}><AdminBoletos /></AuthGuard>} />
            <Route path="/dashboard/admin/energy" element={<AuthGuard requireAdmin={true}><AdminEnergy /></AuthGuard>} />
            <Route path="/dashboard/admin/schema-setup" element={<AuthGuard requireAdmin={true}><AdminSchemaSetup /></AuthGuard>} />
            {/* Rota de fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
