import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import TicketsList from './pages/TicketsList';
import TicketDetail from './pages/TicketDetail';
import AgentsPage from './pages/AgentsPage';
import ClientsPage from './pages/ClientsPage';
import AdminsPage from './pages/AdminsPage';
import LogsPage from './pages/LogsPage';
import CategoriesPage from './pages/CategoriesPage';
import ProfilePage from './pages/ProfilePage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return user.role === 'ADMIN' ? children : <Navigate to="/" />;
};

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return user.is_superuser ? children : <Navigate to="/" />;
};

// Page d'accueil : dépend du rôle de l'utilisateur connecté
const Home = () => {
  const { user } = useContext(AuthContext);
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'AGENT') return <TicketsList />;
  return <ClientDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/tickets" element={<PrivateRoute><TicketsList /></PrivateRoute>} />
          <Route path="/ticket/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          <Route path="/agents" element={<AdminRoute><AgentsPage /></AdminRoute>} />
          <Route path="/clients" element={<AdminRoute><ClientsPage /></AdminRoute>} />
          <Route path="/admins" element={<AdminRoute><AdminsPage /></AdminRoute>} />
          <Route path="/categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="/logs" element={<SuperAdminRoute><LogsPage /></SuperAdminRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
