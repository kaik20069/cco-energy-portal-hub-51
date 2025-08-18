import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt, Users, Upload, PieChart, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Notification, BoletoStatus } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import EnergyKpis from "@/components/energy/EnergyKpis";
import ClientEnergySection from "@/components/energy/ClientEnergySection";

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.type === "admin";
  const [boletosStats, setBoletosStats] = useState<{paid: number, pending: number, overdue: number}>({ 
    paid: 0, 
    pending: 0,
    overdue: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      fetchBoletosStats();
      if (!isAdmin) {
        fetchNotifications();
      }
    }
  }, [profile, isAdmin]);

  const fetchBoletosStats = async () => {
    setIsLoading(true);
    try {
      // Base query that we'll reuse
      const userFilter = !isAdmin && profile ? { user_id: profile.id } : {};
      
      // Current date for overdue calculation
      const today = new Date().toISOString().split('T')[0];

      // Get all boletos first
      const { data, error } = await supabase
        .from('boletos')
        .select('*')
        .match(userFilter);
        
      if (error) throw error;
      
      // Process boletos to calculate status counts
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;
      
      if (data) {
        data.forEach(boleto => {
          // Check if paid
          if (boleto.status === 'pago') {
            paidCount++;
          } 
          // Check if overdue
          else if (boleto.due_date < today || boleto.status === 'vencido') {
            overdueCount++;
          } 
          // Otherwise it's pending
          else {
            pendingCount++;
          }
        });
      }
      
      console.log("Estatísticas de boletos:", { paidCount, pendingCount, overdueCount });
      
      setBoletosStats({
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar estatísticas",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setNotifications(data as Notification[]);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update local notifications
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Ensure we create chart data even when all values are 0
  const chartData = [
    { name: "Pagos", value: boletosStats.paid, color: "#4ADE80" },
    { name: "Pendentes", value: boletosStats.pending, color: "#F59E0B" },
    { name: "Vencidos", value: boletosStats.overdue, color: "#EF4444" },
  ].filter(item => item.value > 0);
  
  // Se não houver dados, adicionar valores zero para garantir que o gráfico seja exibido corretamente
  if (chartData.length === 0) {
    chartData.push(
      { name: "Pagos", value: 0, color: "#4ADE80" },
      { name: "Pendentes", value: 0, color: "#F59E0B" },
      { name: "Vencidos", value: 0, color: "#EF4444" }
    );
  }

  // Ensure we have a consistent chart config
  const chartConfig = {
    paid: { label: "Pagos", theme: { light: "#4ADE80", dark: "#4ADE80" } },
    pending: { label: "Pendentes", theme: { light: "#F59E0B", dark: "#F59E0B" } },
    overdue: { label: "Vencidos", theme: { light: "#EF4444", dark: "#EF4444" } },
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bem-vindo, {profile?.full_name || "Cliente"}
            </h1>
            <p className="text-gray-500 mt-2">
              {isAdmin
                ? "Acesse as funcionalidades de administrador abaixo"
                : "Acesse seus relatórios e boletos abaixo"}
            </p>
          </div>
          
          {!isAdmin && (
            <div className="relative">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10">
                  <div className="p-3 border-b">
                    <h3 className="text-sm font-semibold">Notificações</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 text-center">
                        Nenhuma notificação disponível
                      </p>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`p-3 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium">{notification.sender_name}</p>
                            <span className="text-xs text-gray-500">
                              {format(parseISO(notification.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="mt-2 flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => markNotificationAsRead(notification.id)}
                              disabled={notification.read}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {notification.read ? "Lida" : "Marcar como lida"}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!isAdmin && (
          <ClientEnergySection />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-[#ADD8E6]" />
              Status dos Boletos
            </CardTitle>
            <CardDescription>
              Visualização da distribuição de boletos pagos, pendentes e vencidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p>Carregando...</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ChartContainer 
                  config={chartConfig} 
                  className="h-full"
                >
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      label={({ name, percent }) => {
                        // Evitar NaN em porcentagens quando todos os valores são zero
                        const total = boletosStats.paid + boletosStats.pending + boletosStats.overdue;
                        if (total === 0) return `${name}: 0%`;
                        return `${name}: ${(percent * 100).toFixed(0)}%`;
                      }}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent 
                          labelKey="name"
                          formatter={(value, name) => {
                            let label = "";
                            if (name === "Pagos") label = "Pagos";
                            else if (name === "Pendentes") label = "Pendentes";
                            else if (name === "Vencidos") label = "Vencidos";
                            return [
                              `${value} boletos`, 
                              label
                            ];
                          }} 
                        />
                      }
                    />
                  </RechartsPieChart>
                </ChartContainer>
                <div className="mt-6 flex justify-center space-x-6">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-[#4ADE80] mr-2" />
                    <span>Pagos: {boletosStats.paid}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-[#F59E0B] mr-2" />
                    <span>Pendentes: {boletosStats.pending}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-[#EF4444] mr-2" />
                    <span>Vencidos: {boletosStats.overdue}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-secondary" />
                Relatórios
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Gerencie os relatórios dos clientes"
                  : "Visualize seus relatórios mensais"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">
                {isAdmin
                  ? "Faça upload de novos relatórios e gerencie os existentes."
                  : "Acesse seus relatórios mensais de consumo e economia."}
              </p>
              <Button 
                onClick={() => navigate("/dashboard/reports")}
                variant="secondary"
                className="w-full"
              >
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-secondary" />
                Boletos
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Gerencie os boletos dos clientes"
                  : "Visualize seus boletos para pagamento"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">
                {isAdmin
                  ? "Faça upload de novos boletos e gerencie os existentes."
                  : "Acesse seus boletos mensais para pagamento."}
              </p>
              <Button 
                onClick={() => navigate("/dashboard/boletos")}
                variant="secondary"
                className="w-full"
              >
                Ver Boletos
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-secondary" />
                Usuários
              </CardTitle>
                  <CardDescription>
                    Gerencie os usuários do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    Adicione ou remova usuários e defina permissões.
                  </p>
                  <Button 
                    onClick={() => navigate("/dashboard/users")}
                    variant="secondary"
                    className="w-full"
                  >
                    Gerenciar Usuários
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-secondary" />
                Clientes
              </CardTitle>
                  <CardDescription>
                    Gerencie os clientes e seus documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    Visualize e gerencie todos os clientes cadastrados no sistema.
                  </p>
                  <Button 
                    onClick={() => navigate("/dashboard/clients")}
                    variant="secondary"
                    className="w-full"
                  >
                    Gerenciar Clientes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2 text-secondary" />
                Upload
              </CardTitle>
                  <CardDescription>
                    Faça upload de documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    Envie relatórios e boletos para os clientes.
                  </p>
                  <Button 
                    onClick={() => navigate("/dashboard/upload")}
                    variant="secondary"
                    className="w-full"
                  >
                    Enviar Documentos
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
