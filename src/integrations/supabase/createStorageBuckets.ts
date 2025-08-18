
import { supabase } from "./client";

export const createRequiredBuckets = async () => {
  try {
    // Verificar se o bucket documents existe
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Erro ao listar buckets:", error);
      return;
    }

    // Verificar se o bucket documents já existe
    const documentsExists = buckets.find(bucket => bucket.name === "documents");
    
    if (documentsExists) {
      console.log("Bucket 'documents' já existe e está pronto para uso");
      return;
    }

    // Se chegou aqui, o bucket não existe, mas não vamos tentar criar
    // pois pode ser uma limitação de permissões RLS
    console.log("Bucket 'documents' não encontrado, mas deve ser criado manualmente no painel do Supabase");
  } catch (error) {
    console.warn("Erro ao verificar buckets:", error);
  }
};
