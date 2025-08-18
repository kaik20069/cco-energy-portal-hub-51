
import React, { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizeFileName, generateStoragePath } from "@/utils/fileUtils";
import { Loader } from "lucide-react";

interface FileUploaderProps {
  userId: string;
  fileType: "boleto" | "report";
  referenceMonth: string;
  onSuccess: () => void;
  dueDate?: string;
  existingFileId?: string;
}

export const FileUploader = ({
  userId,
  fileType,
  referenceMonth,
  onSuccess,
  dueDate,
  existingFileId
}: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  
  // Referência para o input de arquivo para poder limpar
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      // Criar um nome sanitizado para exibição
      const cleanName = sanitizeFileName(selectedFile.name);
      setFileName(cleanName);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileName("");
    // Limpar o input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Determinar o tipo de pasta (boletos ou relatórios)
      const folder = fileType === "boleto" ? "boletos" : "reports";
      
      // Gerar um caminho sanitizado para o storage
      const filePath = generateStoragePath(folder, file.name, userId, referenceMonth);

      // Upload do arquivo para o Supabase Storage com upsert true (sobreescrever se existir)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      // Criar ou atualizar registro no banco de dados
      const fileUrl = filePath;
      
      let dbError;
      
      if (fileType === "boleto") {
        if (existingFileId) {
          // Atualizar boleto existente
          const { error } = await supabase
            .from("boletos")
            .update({
              file_url: fileUrl,
              reference_month: referenceMonth,
              due_date: dueDate || new Date().toISOString().split('T')[0]
            })
            .eq("id", existingFileId);
          dbError = error;
        } else {
          // Inserir novo boleto
          const { error } = await supabase
            .from("boletos")
            .insert({
              user_id: userId,
              file_url: fileUrl,
              reference_month: referenceMonth,
              due_date: dueDate || new Date().toISOString().split('T')[0],
              status: "devendo",
            });
          dbError = error;
        }
      } else {
        if (existingFileId) {
          // Atualizar relatório existente
          const { error } = await supabase
            .from("reports")
            .update({
              file_url: fileUrl,
              reference_month: referenceMonth
            })
            .eq("id", existingFileId);
          dbError = error;
        } else {
          // Inserir novo relatório
          const { error } = await supabase
            .from("reports")
            .insert({
              user_id: userId,
              file_url: fileUrl,
              reference_month: referenceMonth,
            });
          dbError = error;
        }
      }

      if (dbError) {
        // Se houver erro no banco, tenta remover o arquivo enviado
        await supabase.storage.from("documents").remove([filePath]);
        throw new Error(`Erro ao salvar informações: ${dbError.message}`);
      }

      toast({
        title: existingFileId ? "Arquivo atualizado" : "Upload concluído",
        description: `O ${fileType === "boleto" ? "boleto" : "relatório"} foi ${existingFileId ? "atualizado" : "enviado"} com sucesso.`,
      });

      // Limpar o formulário
      resetForm();

      // Notificar componente pai
      onSuccess();
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Melhorar a mensagem de erro para problemas de nome de arquivo
      if (errorMessage.includes("Invalid key")) {
        errorMessage = "Nome de arquivo inválido. Por favor, renomeie o arquivo sem espaços ou caracteres especiais antes de enviar.";
      }
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Input 
          type="file" 
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          ref={fileInputRef}
        />
        {fileName && (
          <p className="text-sm text-muted-foreground mt-1">
            Nome do arquivo: {fileName}
          </p>
        )}
      </div>
      
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
      >
        {isUploading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          existingFileId ? `Atualizar ${fileType === "boleto" ? "boleto" : "relatório"}` : `Enviar ${fileType === "boleto" ? "boleto" : "relatório"}`
        )}
      </Button>
    </div>
  );
};
