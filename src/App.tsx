import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from './app/(auth)/login/page';
import DashboardPage from './app/(admin)/dashboard/page';
import ApontamentosPage from './app/(admin)/apontamentos/page';
import ObrasPage from './app/(admin)/obras/page';
import TecnicosPage from './app/(admin)/tecnicos/page';
import RelatoriosPage from './app/(admin)/relatorios/page';
import InicioPage from './app/(tecnico)/inicio/page';
import MeusApontamentosPage from './app/(tecnico)/meus-apontamentos/page';
import FotosPage from './app/(tecnico)/fotos/page';
import PerfilPage from './app/(tecnico)/perfil/page';
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

                    {/* Técnico Routes */}
                    <Route path="/inicio" element={<InicioPage />} />
                    <Route path="/meus-apontamentos" element={<MeusApontamentosPage />} />
                    <Route path="/fotos" element={<FotosPage />} />
                    <Route path="/perfil" element={<PerfilPage />} />
                </Route>
            </Routes>
            <Toaster position="top-right" richColors />
        </BrowserRouter>
    );
}

export default App;
