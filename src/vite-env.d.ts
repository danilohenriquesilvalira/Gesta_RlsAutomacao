/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    // mais variáveis de ambiente...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
