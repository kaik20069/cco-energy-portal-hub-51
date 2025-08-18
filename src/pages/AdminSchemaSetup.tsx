import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export default function AdminSchemaSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const runSchemaSetup = async () => {
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const { data, error } = await supabase.functions.invoke('setup-units-schema');
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        setStatus('success');
        toast({ 
          title: "Schema atualizado com sucesso!", 
          description: "Todas as colunas necessárias foram criadas e o schema foi recarregado."
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Error running schema setup:', error);
      setStatus('error');
      toast({ 
        variant: "destructive",
        title: "Erro ao atualizar schema", 
        description: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Configuração do Schema - Energy Units
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Esta função irá:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Criar a tabela <code>energy_units</code> se não existir</li>
              <li>Adicionar coluna <code>unit_id</code> em <code>energy_monthly_metrics</code></li>
              <li>Adicionar todas as colunas de demanda faturada e reativo</li>
              <li>Configurar políticas RLS para <code>energy_units</code></li>
              <li>Forçar o PostgREST a recarregar o schema</li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={runSchemaSetup} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isLoading ? "Executando..." : "Executar Setup do Schema"}
            </Button>

            {status === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Setup concluído com sucesso!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Erro no setup. Verifique os logs.</span>
              </div>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Campos que serão adicionados:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>
                <strong>Demanda Faturada:</strong>
                <ul className="list-disc list-inside ml-2">
                  <li>demanda_faturada_kw_ponta</li>
                  <li>demanda_faturada_kw_fora</li>
                  <li>demanda_faturada_kw_reservado</li>
                </ul>
              </div>
              <div>
                <strong>Preços kW:</strong>
                <ul className="list-disc list-inside ml-2">
                  <li>preco_kw_ponta</li>
                  <li>preco_kw_fora</li>
                  <li>preco_kw_reservado</li>
                </ul>
              </div>
              <div>
                <strong>Reativo:</strong>
                <ul className="list-disc list-inside ml-2">
                  <li>reativo_kvarh_ponta</li>
                  <li>reativo_kvarh_fora</li>
                  <li>reativo_kvarh_reservado</li>
                  <li>reativo_excedente_kvarh</li>
                  <li>preco_kvarh_excedente</li>
                  <li>fator_potencia</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}