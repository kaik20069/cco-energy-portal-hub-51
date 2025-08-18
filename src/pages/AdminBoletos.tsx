
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Boleto, BoletoStatus } from "@/types";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminBoletosTable } from "@/components/tables/AdminBoletosTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminBoletos = () => {
  const [boletos, setBoletos] = useState<(Boleto & { full_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchBoletos();
  }, []);

  const fetchBoletos = async () => {
    try {
      setLoading(true);
      // First, get all unpaid boletos
      const { data: boletosData, error: boletosError } = await supabase
        .from('boletos')
        .select('*')
        .not('status', 'eq', 'pago')
        .order('due_date', { ascending: false });

      if (boletosError) throw boletosError;
      
      // Process boletos to correctly identify overdue status
      const processedBoletos = boletosData.map(boleto => {
        const dueDate = new Date(boleto.due_date);
        const today = new Date();
        const isOverdue = boleto.status !== 'pago' && dueDate < today;
        
        // If it's overdue but not marked as 'vencido', treat it as 'vencido' for UI
        let status = boleto.status as BoletoStatus | null;
        if (isOverdue && status === 'devendo') {
          status = 'vencido';
        }
        
        return {
          ...boleto,
          isOverdue,
          status
        };
      });
      
      // For each boleto, get the user's profile information
      const boletosWithProfiles = await Promise.all(
        processedBoletos.map(async (boleto) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', boleto.user_id)
            .single();
            
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return {
              ...boleto,
              full_name: 'Cliente sem nome',
            };
          }
          
          return {
            ...boleto,
            full_name: profileData?.full_name || 'Cliente sem nome',
          };
        })
      );

      setBoletos(boletosWithProfiles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar boletos",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(fileUrl, 60);
      
      if (error) throw error;
      
      setPreviewUrl(data.signedUrl);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao visualizar boleto",
        description: error.message,
      });
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer download",
        description: error.message,
      });
    }
  };

  const handleStatusChange = async (boletoId: string, newStatus: BoletoStatus) => {
    try {
      // Atualiza o status no banco de dados
      const { error } = await supabase
        .from('boletos')
        .update({ status: newStatus })
        .eq('id', boletoId);

      if (error) throw error;

      // Atualiza o estado local
      setBoletos(currentBoletos =>
        currentBoletos.filter(boleto => boleto.id !== boletoId)
      );
      
      toast({
        description: `Status do boleto atualizado para ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Boletos em Aberto</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Boletos Pendentes de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando boletos...</p>
            ) : boletos.length === 0 ? (
              <p>Nenhum boleto em aberto.</p>
            ) : (
              <AdminBoletosTable 
                boletos={boletos} 
                onPreview={handlePreview}
                onDownload={handleDownload}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>
        
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Visualização do Boleto</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Visualização do Boleto"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminBoletos;
