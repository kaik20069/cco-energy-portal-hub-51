export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      boletos: {
        Row: {
          due_date: string
          file_url: string
          id: string
          reference_month: string
          status: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          due_date: string
          file_url: string
          id?: string
          reference_month: string
          status?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          due_date?: string
          file_url?: string
          id?: string
          reference_month?: string
          status?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      energy_monthly_metrics: {
        Row: {
          banco_trianon_rs: number | null
          bandeiras_rs: number | null
          cod_instal: string | null
          cofins_rate: number
          compra_energia_rs: number | null
          created_at: string | null
          demanda_contratada_kw_fora: number | null
          demanda_contratada_kw_ponta: number | null
          demanda_contratada_kw_reservado: number | null
          demanda_faturada_kw_fora: number | null
          demanda_faturada_kw_ponta: number | null
          demanda_faturada_kw_reservado: number | null
          demanda_kw_fora: number | null
          demanda_kw_ponta: number | null
          demanda_kw_reservado: number | null
          demanda_maxima_kw: number | null
          desconto_fonte: number
          dias_leitura: number | null
          distribuidora: string | null
          economia_liquida_pct: number | null
          economia_liquida_rs: number | null
          encargos_rs: number | null
          energia_kwh_fora: number | null
          energia_kwh_ponta: number | null
          energia_kwh_reservado: number | null
          fator_potencia: number | null
          fatura_geral_rs: number | null
          fatura_livre_rs: number | null
          fp_fora: number | null
          fp_global: number | null
          fp_param_max: number | null
          fp_param_min: number | null
          fp_ponta: number | null
          fp_res: number | null
          gestao_cco_rs: number | null
          gestao_parceiro_rs: number | null
          icms_energia_rs: number | null
          icms_rate: number
          id: string
          kvar_corrigir_max: number | null
          kvar_corrigir_min: number | null
          mwh_total_gerador: number | null
          n_relatorio: string | null
          pis_rate: number
          preco_kvarh_excedente: number | null
          preco_kvarh_fora: number | null
          preco_kvarh_ponta: number | null
          preco_kvarh_reservado: number | null
          preco_kw_fora: number | null
          preco_kw_ponta: number | null
          preco_kw_reservado: number | null
          preco_kwh_fora: number | null
          preco_kwh_ponta: number | null
          preco_kwh_reservado: number | null
          proinfa_rs: number | null
          rdb_rate: number
          reativo_excedente_kvarh: number | null
          reativo_kvarh_fora: number | null
          reativo_kvarh_ponta: number | null
          reativo_kvarh_reservado: number | null
          reativo_limite_rate: number | null
          reference_label: string
          tarifa_energia_rs_mwh: number | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          banco_trianon_rs?: number | null
          bandeiras_rs?: number | null
          cod_instal?: string | null
          cofins_rate?: number
          compra_energia_rs?: number | null
          created_at?: string | null
          demanda_contratada_kw_fora?: number | null
          demanda_contratada_kw_ponta?: number | null
          demanda_contratada_kw_reservado?: number | null
          demanda_faturada_kw_fora?: number | null
          demanda_faturada_kw_ponta?: number | null
          demanda_faturada_kw_reservado?: number | null
          demanda_kw_fora?: number | null
          demanda_kw_ponta?: number | null
          demanda_kw_reservado?: number | null
          demanda_maxima_kw?: number | null
          desconto_fonte?: number
          dias_leitura?: number | null
          distribuidora?: string | null
          economia_liquida_pct?: number | null
          economia_liquida_rs?: number | null
          encargos_rs?: number | null
          energia_kwh_fora?: number | null
          energia_kwh_ponta?: number | null
          energia_kwh_reservado?: number | null
          fator_potencia?: number | null
          fatura_geral_rs?: number | null
          fatura_livre_rs?: number | null
          fp_fora?: number | null
          fp_global?: number | null
          fp_param_max?: number | null
          fp_param_min?: number | null
          fp_ponta?: number | null
          fp_res?: number | null
          gestao_cco_rs?: number | null
          gestao_parceiro_rs?: number | null
          icms_energia_rs?: number | null
          icms_rate?: number
          id?: string
          kvar_corrigir_max?: number | null
          kvar_corrigir_min?: number | null
          mwh_total_gerador?: number | null
          n_relatorio?: string | null
          pis_rate?: number
          preco_kvarh_excedente?: number | null
          preco_kvarh_fora?: number | null
          preco_kvarh_ponta?: number | null
          preco_kvarh_reservado?: number | null
          preco_kw_fora?: number | null
          preco_kw_ponta?: number | null
          preco_kw_reservado?: number | null
          preco_kwh_fora?: number | null
          preco_kwh_ponta?: number | null
          preco_kwh_reservado?: number | null
          proinfa_rs?: number | null
          rdb_rate?: number
          reativo_excedente_kvarh?: number | null
          reativo_kvarh_fora?: number | null
          reativo_kvarh_ponta?: number | null
          reativo_kvarh_reservado?: number | null
          reativo_limite_rate?: number | null
          reference_label: string
          tarifa_energia_rs_mwh?: number | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          banco_trianon_rs?: number | null
          bandeiras_rs?: number | null
          cod_instal?: string | null
          cofins_rate?: number
          compra_energia_rs?: number | null
          created_at?: string | null
          demanda_contratada_kw_fora?: number | null
          demanda_contratada_kw_ponta?: number | null
          demanda_contratada_kw_reservado?: number | null
          demanda_faturada_kw_fora?: number | null
          demanda_faturada_kw_ponta?: number | null
          demanda_faturada_kw_reservado?: number | null
          demanda_kw_fora?: number | null
          demanda_kw_ponta?: number | null
          demanda_kw_reservado?: number | null
          demanda_maxima_kw?: number | null
          desconto_fonte?: number
          dias_leitura?: number | null
          distribuidora?: string | null
          economia_liquida_pct?: number | null
          economia_liquida_rs?: number | null
          encargos_rs?: number | null
          energia_kwh_fora?: number | null
          energia_kwh_ponta?: number | null
          energia_kwh_reservado?: number | null
          fator_potencia?: number | null
          fatura_geral_rs?: number | null
          fatura_livre_rs?: number | null
          fp_fora?: number | null
          fp_global?: number | null
          fp_param_max?: number | null
          fp_param_min?: number | null
          fp_ponta?: number | null
          fp_res?: number | null
          gestao_cco_rs?: number | null
          gestao_parceiro_rs?: number | null
          icms_energia_rs?: number | null
          icms_rate?: number
          id?: string
          kvar_corrigir_max?: number | null
          kvar_corrigir_min?: number | null
          mwh_total_gerador?: number | null
          n_relatorio?: string | null
          pis_rate?: number
          preco_kvarh_excedente?: number | null
          preco_kvarh_fora?: number | null
          preco_kvarh_ponta?: number | null
          preco_kvarh_reservado?: number | null
          preco_kw_fora?: number | null
          preco_kw_ponta?: number | null
          preco_kw_reservado?: number | null
          preco_kwh_fora?: number | null
          preco_kwh_ponta?: number | null
          preco_kwh_reservado?: number | null
          proinfa_rs?: number | null
          rdb_rate?: number
          reativo_excedente_kvarh?: number | null
          reativo_kvarh_fora?: number | null
          reativo_kvarh_ponta?: number | null
          reativo_kvarh_reservado?: number | null
          reativo_limite_rate?: number | null
          reference_label?: string
          tarifa_energia_rs_mwh?: number | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_monthly_metrics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "energy_units"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_units: {
        Row: {
          code: string
          demanda_contratada_kw_fora: number | null
          demanda_contratada_kw_ponta: number | null
          demanda_contratada_kw_reservado: number | null
          distribuidora: string | null
          fornecedora_energia: string | null
          id: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          code: string
          demanda_contratada_kw_fora?: number | null
          demanda_contratada_kw_ponta?: number | null
          demanda_contratada_kw_reservado?: number | null
          distribuidora?: string | null
          fornecedora_energia?: string | null
          id?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          code?: string
          demanda_contratada_kw_fora?: number | null
          demanda_contratada_kw_ponta?: number | null
          demanda_contratada_kw_reservado?: number | null
          distribuidora?: string | null
          fornecedora_energia?: string | null
          id?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_units_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          sender_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sender_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          comercializadora: string | null
          concessionaria: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          gestora_parceira: string | null
          id: string
          type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          comercializadora?: string | null
          concessionaria?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gestora_parceira?: string | null
          id: string
          type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          comercializadora?: string | null
          concessionaria?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gestora_parceira?: string | null
          id?: string
          type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          file_url: string
          id: string
          reference_month: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_url: string
          id?: string
          reference_month: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          file_url?: string
          id?: string
          reference_month?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
    }
    Enums: {
      user_type: "admin" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_type: ["admin", "client"],
    },
  },
} as const
