import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './lib/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicHome } from './components/screens/PublicHome';
import { Login } from './components/screens/Login';
import { Register } from './components/screens/Register';
import { Dashboard } from './components/screens/Dashboard';
import { CreateChampionship } from './components/screens/CreateChampionship';
import { RegisterTeams } from './components/screens/RegisterTeams';
import { RegisterPlayers } from './components/screens/RegisterPlayers';
import { RoundsMatches } from './components/screens/RoundsMatches';
import { RegisterResult } from './components/screens/RegisterResult';
import { PublicChampionship } from './components/screens/PublicChampionship';

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/dashboard/novo" element={<Protected><CreateChampionship /></Protected>} />
          <Route path="/dashboard/times" element={<Protected><RegisterTeams /></Protected>} />
          <Route path="/dashboard/jogadores" element={<Protected><RegisterPlayers /></Protected>} />
          <Route path="/dashboard/rodadas" element={<Protected><RoundsMatches /></Protected>} />
          <Route path="/dashboard/resultado" element={<Protected><RegisterResult /></Protected>} />
          <Route path="/campeonato/:id" element={<PublicChampionship />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
