import { useEffect } from 'react';
import { setupEnergyUnitsSchema } from '@/utils/setupSchema';

export function SchemaInitializer() {
  useEffect(() => {
    const runSchemaSetup = async () => {
      try {
        await setupEnergyUnitsSchema();
      } catch (error) {
        console.error('Schema setup failed, but continuing...', error);
      }
    };

    // Run setup on app initialization
    runSchemaSetup();
  }, []);

  return null; // This is an invisible component
}