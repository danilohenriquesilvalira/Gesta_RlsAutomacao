import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from './app/(auth)/login/page';
import DashboardPage from './app/(admin)/dashboard/page';
import ApontamentosPage from './app/(admin)/apontamentos/page';
import ObrasPage from './app/(admin)/obras/page';
import TecnicosPage from './app/(admin)/tecnicos/page';
import RelatoriosPage from './app/(admin)/relatorios/page';
import AdminDespesasPage from './app/(admin)/despesas/page';
import InicioPage from './app/(tecnico)/inicio/page';
import TecnicoApontamentosPage from './app/(tecnico)/apontamentos/page';
import TecnicoDashboardPage from './app/(tecnico)/dashboard/page';
import PerfilPage from './app/(tecnico)/perfil/page';
import MinhasDespesasPage from './app/(tecnico)/despesas/page';
import MinhasObrasPage from './app/(tecnico)/obras/page';
import AppLayout from './components/shared/AppLayout';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Raiz redireciona para Login */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />

                {/* Main App (Protected) */}
                <Route element={<AppLayout />}>
                    {/* Admin Routes */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/apontamentos" element={<ApontamentosPage />} />
                    <Route path="/obras" element={<ObrasPage />} />
                    <Route path="/tecnicos" element={<TecnicosPage />} />
                    <Route path="/relatorios" element={<RelatoriosPage />} />
                    <Route path="/despesas" element={<AdminDespesasPage />} />

                    {/* Técnico Routes */}
                    <Route path="/inicio" element={<InicioPage />} />
                    <Route path="/meus-apontamentos" element={<TecnicoApontamentosPage />} />
                    <Route path="/meu-dashboard" element={<TecnicoDashboardPage />} />
                    <Route path="/perfil" element={<PerfilPage />} />
                    <Route path="/minhas-despesas" element={<MinhasDespesasPage />} />
                    <Route path="/minhas-obras" element={<MinhasObrasPage />} />
                </Route>
            </Routes>
            <Toaster position="top-right" richColors />
        </BrowserRouter>
    );
}

export default App;
