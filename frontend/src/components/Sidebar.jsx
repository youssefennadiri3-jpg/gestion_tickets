import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, UserCog, Users, Tag, User, LogOut, Crown, ScrollText } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const getInitials = () => {
    if (!user) return 'U';
    const first = user.first_name ? user.first_name[0] : user.username[0];
    const last = user.last_name ? user.last_name[0] : '';
    return (first + last).toUpperCase();
  };

  const NavLink = ({ to, icon: Icon, children }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive(to) ? 'bg-[#e8f5ee] text-[#288a58]' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between min-h-screen p-4 select-none shrink-0">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-9 h-9 bg-[#31a66b] rounded-xl flex items-center justify-center text-white shadow-sm">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-800">HelpDesk Pro</span>
        </div>

        {/* Section Label */}
        <div className="px-3 mb-2 text-xs font-bold text-slate-400 tracking-wider uppercase">
          {user?.role === 'ADMIN' ? 'ADMINISTRATION' : user?.role === 'AGENT' ? 'ESPACE AGENT' : 'ESPACE CLIENT'}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/" icon={LayoutDashboard}>Tableau de bord</NavLink>
              <NavLink to="/tickets" icon={Ticket}>Tous les tickets</NavLink>
              <NavLink to="/agents" icon={UserCog}>Agents</NavLink>
              <NavLink to="/clients" icon={Users}>Clients</NavLink>
              <NavLink to="/admins" icon={Crown}>Administrateurs</NavLink>
              <NavLink to="/categories" icon={Tag}>Catégories</NavLink>
              {user?.is_superuser && <NavLink to="/logs" icon={ScrollText}>Journal d'activité</NavLink>}
            </>
          )}

          {user?.role === 'AGENT' && (
            <NavLink to="/" icon={Ticket}>Tickets</NavLink>
          )}

          {user?.role === 'CLIENT' && (
            <>
              <NavLink to="/" icon={LayoutDashboard}>Tableau de bord</NavLink>
              <NavLink to="/tickets" icon={Ticket}>Mes tickets</NavLink>
            </>
          )}

          <NavLink to="/profile" icon={User}>Mon profil</NavLink>
        </nav>
      </div>

      {/* User Info Bottom Footer */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#31a66b] text-white flex items-center justify-center font-bold text-sm shrink-0">
            {getInitials()}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-slate-800 truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
            </h4>
            <p className="text-xs text-slate-400 capitalize">
              {user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'AGENT' ? 'Agent' : 'Client'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
