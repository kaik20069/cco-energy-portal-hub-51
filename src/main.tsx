
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createRequiredBuckets } from './integrations/supabase/createStorageBuckets.ts'

// Inicializar os buckets de storage necessários
createRequiredBuckets()
  .then(() => {
    console.log("Verificação de buckets concluída");
  })
  .catch(error => {
    console.error("Erro ao inicializar buckets:", error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
