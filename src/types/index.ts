
export type UserType = 'admin' | 'client';

export interface UserProfile {
  id: string;
  type: UserType;
  full_name: string | null;
  created_at: string;
  phone?: string | null;
}

export interface Report {
  id: string;
  user_id: string;
  file_url: string;
  reference_month: string;
  uploaded_at: string;
}

export type BoletoStatus = 'pago' | 'devendo' | 'vencido';

export interface Boleto {
  id: string;
  user_id: string;
  file_url: string;
  reference_month: string;
  uploaded_at: string;
  due_date: string;
  status: BoletoStatus | null;
  isOverdue?: boolean; // UI helper property
}

export interface Notification {
  id: string;
  user_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface EnergyUnit {
  id: string;
  user_id: string;
  code: string;
  nickname?: string;
  distribuidora?: string;
  fornecedora_energia?: string;
  demanda_contratada_kw_ponta?: number;
  demanda_contratada_kw_fora?: number;
  demanda_contratada_kw_reservado?: number;
  created_at: string;
}
