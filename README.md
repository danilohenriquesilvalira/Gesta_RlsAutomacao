# FieldSync - Gestão de Obras e Apontamentos

Sistema de gestão de obras e apontamentos de horas para técnicos de campo, desenvolvido com **Vite**, **React** e **Supabase**.

## 🛠️ Tecnologias
- **Frontend**: React + Vite
- **Estilização**: Tailwind CSS + ShadcnUI
- **Backend/Auth**: Supabase
- **Offline**: IndexedDB + Service Workers (PWA)

## 🚀 Como rodar
1.  Clone o repositório
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Configure as variáveis de ambiente no arquivo `.env`:
    ```env
    VITE_SUPABASE_URL=seu_url
    VITE_SUPABASE_ANON_KEY=sua_chave
    ```
4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## 📋 Funcionalidades
- [x] Login e Gestão de Perfis
- [x] Criação e Gestão de Obras
- [x] Apontamento de Horas com GPS e Fotos
- [x] Modo Offline com sincronização automática
- [x] Painel Administrativo com KPIs e Relatórios
