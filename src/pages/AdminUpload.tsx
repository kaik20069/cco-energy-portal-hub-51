import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/upload/FileUploader";
import { format, addDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminUpload = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const fileIdFromUrl = searchParams.get("fileId");
  const fileTypeFromUrl = searchParams.get("fileType");

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [referenceMonth, setReferenceMonth] = useState<string>(
    format(new Date(), "MMMM/yyyy", { locale: ptBR })
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [uploadType, setUploadType] = useState<"boleto" | "report">("boleto");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [existingFileId, setExistingFileId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchClients();

    // Set the selected client ID from URL if present
    if (clientIdFromUrl) {
      setSelectedClientId(clientIdFromUrl);
    }

    if (fileIdFromUrl && fileTypeFromUrl) {
      setExistingFileId(fileIdFromUrl);
      setUploadType(fileTypeFromUrl as "boleto" | "report");
      setIsEditMode(true);
      
      // Carregar dados do arquivo existente
      if (fileTypeFromUrl === "boleto") {
        fetchBoleto(fileIdFromUrl);
      } else if (fileTypeFromUrl === "report") {
        fetchReport(fileIdFromUrl);
      }
    }
  }, [clientIdFromUrl, fileIdFromUrl, fileTypeFromUrl]);

  const fetchBoleto = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('boletos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedClientId(data.user_id);
        setReferenceMonth(data.reference_month);
        if (data.due_date) {
          setDueDate(new Date(data.due_date));
        }
        
        // Parse the reference month to set the selected date
        try {
          const parsedDate = parse(data.reference_month, "MMMM/yyyy", new Date(), { locale: ptBR });
          setSelectedDate(parsedDate);
        } catch (e) {
          console.error("Failed to parse date:", e);
          setSelectedDate(new Date());
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar boleto",
        description: error.message,
      });
    }
  };

  const fetchReport = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedClientId(data.user_id);
        setReferenceMonth(data.reference_month);
        
        // Parse the reference month to set the selected date
        try {
          const parsedDate = parse(data.reference_month, "MMMM/yyyy", new Date(), { locale: ptBR });
          setSelectedDate(parsedDate);
        } catch (e) {
          console.error("Failed to parse date:", e);
          setSelectedDate(new Date());
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar relatório",
        description: error.message,
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('type', 'client');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar clientes",
        description: error.message,
      });
    }
  };

  const handleUploadSuccess = () => {
    toast({
      title: isEditMode ? "Documento atualizado" : "Documento enviado",
      description: `O documento foi ${isEditMode ? "atualizado" : "enviado"} com sucesso.`,
    });
    
    // Redirecionar para a página de clientes se estiver editando
    if (isEditMode) {
      window.history.back();
    }
  };

  // Handle month selection on the calendar
  const handleMonthSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setReferenceMonth(format(date, "MMMM/yyyy", { locale: ptBR }));
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? "Editar Documento" : "Upload de Documentos"}
          </h1>
          <p className="text-gray-500">
            {isEditMode ? "Substitua um documento existente" : "Envie boletos e relatórios para os clientes"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEditMode ? "Atualizar Documento" : "Enviar Novo Documento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Selecione o Cliente</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                disabled={isEditMode}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-type">Tipo de Documento</Label>
                  <Select
                    value={uploadType}
                    onValueChange={(value: "boleto" | "report") => setUploadType(value)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger id="document-type">
                      <SelectValue placeholder="Selecione o tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="report">Relatório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference-month">Mês de Referência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "MMMM/yyyy", { locale: ptBR }) : <span>Selecione um mês</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleMonthSelect}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        showOutsideDays={false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {uploadType === "boleto" && (
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <FileUploader
                  userId={selectedClientId}
                  fileType={uploadType}
                  referenceMonth={referenceMonth}
                  onSuccess={handleUploadSuccess}
                  dueDate={dueDate && uploadType === "boleto" ? format(dueDate, 'yyyy-MM-dd') : undefined}
                  existingFileId={existingFileId}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminUpload;
