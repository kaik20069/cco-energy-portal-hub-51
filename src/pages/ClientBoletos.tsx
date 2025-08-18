
import React, { useState, useEffect } from "react";
import { format, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Boleto, BoletoStatus } from "@/types";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { FileDown, Eye, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { BoletoStatusBadge } from "@/components/tables/BoletoStatusBadge";

const ClientBoletos = () => {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBoletos(user.id);
    }
  }, [user]);

  const fetchBoletos = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Process boletos to add isOverdue flag for UI purposes
      const processedBoletos = data?.map(boleto => {
        const dueDate = new Date(boleto.due_date);
        const today = new Date();
        const isOverdue = boleto.status !== 'pago' && !isAfter(dueDate, today);
        
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
      }) || [];

      setBoletos(processedBoletos);
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
      console.log("Tentando visualizar arquivo:", fileUrl);
      
      // Tratar o caminho do arquivo corretamente
      let filePath = fileUrl;
      
      // Se o caminho já contém "documents/", remover o prefixo para obter apenas o caminho relativo
      if (filePath.includes("documents/")) {
        filePath = filePath.split("documents/")[1];
      }
      
      console.log("Caminho processado para visualização:", filePath);
      
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos
      
      if (error) {
        console.error("Erro ao gerar URL assinada:", error);
        throw new Error(`Erro ao acessar documento: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error("Não foi possível gerar URL para visualização do documento");
      }
      
      console.log("URL assinada gerada com sucesso:", data.signedUrl);
      setPreviewUrl(data.signedUrl);
      setIsPreviewOpen(true);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao visualizar boleto",
        description: error.message || "Documento não encontrado. Por favor, entre em contato com o suporte.",
      });
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      console.log("Tentando baixar arquivo:", fileUrl);
      
      // Tratar o caminho do arquivo corretamente
      let filePath = fileUrl;
      
      // Se o caminho já contém "documents/", remover o prefixo para obter apenas o caminho relativo
      if (filePath.includes("documents/")) {
        filePath = filePath.split("documents/")[1];
      }
      
      console.log("Caminho processado para download:", filePath);
      
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos
      
      if (error) {
        console.error("Erro ao gerar URL para download:", error);
        throw new Error(`Erro ao acessar documento para download: ${error.message}`);
      }
      
      if (!data?.signedUrl) {
        throw new Error("Não foi possível gerar URL para download do documento");
      }
      
      console.log("URL de download gerada com sucesso:", data.signedUrl);
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer download",
        description: error.message || "Documento não encontrado. Por favor, entre em contato com o suporte.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <h2 className="text-xl font-semibold mb-4">Meus Boletos</h2>
        
        {loading ? (
          <p className="text-center py-4">Carregando boletos...</p>
        ) : boletos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum boleto disponível.</p>
        ) : (
          <div className="grid gap-4">
            {boletos.map((boleto) => {
              const isOverdue = boleto.status === 'vencido' || (boleto.status !== 'pago' && new Date(boleto.due_date) < new Date());
              
              return (
                <Card 
                  key={boleto.id}
                  className={isOverdue ? 'bg-red-50 border-red-200' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{boleto.reference_month}</h3>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <span>
                            Vencimento: {format(parseISO(boleto.due_date), "PPP", { locale: ptBR })}
                          </span>
                          {isOverdue && (
                            <div className="ml-2 flex items-center text-red-500">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              <span>Vencido</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <BoletoStatusBadge status={boleto.status} dueDate={boleto.due_date} />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(boleto.file_url)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-[#ADD8E6] hover:bg-[#9CC8D6] text-black"
                          onClick={() => handleDownload(boleto.file_url)}
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Visualização do Boleto</DialogTitle>
              <DialogDescription>Boleto gerado pelo sistema</DialogDescription>
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

export default ClientBoletos;
