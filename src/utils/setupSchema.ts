import { supabase } from "@/integrations/supabase/client";

export async function setupEnergyUnitsSchema() {
  try {
    console.log('Starting schema setup...');
    
    const { data, error } = await supabase.functions.invoke('setup-units-schema');
    
    if (error) {
      console.error('Error invoking setup function:', error);
      throw error;
    }
    
    console.log('Schema setup result:', data);
    
    if (data.success) {
      console.log('✅ Schema setup completed successfully!');
      return { success: true, message: data.message };
    } else {
      console.error('❌ Schema setup failed:', data.error);
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error: any) {
    console.error('Error setting up schema:', error);
    throw error;
  }
}

// Function to manually test if we can run this
if (typeof window !== 'undefined') {
  (window as any).setupSchema = setupEnergyUnitsSchema;
}