import { useState, useEffect, useContext } from 'react';
import { UserX, UserCheck, Crown, ShieldAlert } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function AdminsPage() {
  const { user } = useContext(AuthContext);
  const [admins, setAdmins] = useState([]);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('admins/');
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`admins/${id}/`, { role });
      fetchAdmins();
    } catch (err) {
      alert("Erreur : seul le Super Admin peut modifier un administrateur.");
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Désactiver ce compte administrateur ? Il ne pourra plus se connecter, mais son historique reste intact.')) return;
    try {
      await api.delete(`admins/${id}/`);
      fetchAdmins();
    } catch (err) {
      alert("Erreur : seul le Super Admin peut désactiver un administrateur.");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await api.patch(`admins/${id}/`, { is_active: true });
      fetchAdmins();
    } catch (err) {
      alert("Erreur : seul le Super Admin peut réactiver un administrateur.");
    }
  };

  const initials = (a) => ((a.first_name?.[0] || a.username[0]) + (a.last_name?.[0] || '')).toUpperCase();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Administrateurs</h1>
        <p className="text-slate-400 text-sm mt-1">{admins.length} administrateur(s)</p>
      </div>

      {!user?.is_superuser && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-700 text-sm p-4 rounded-xl mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Seul le Super Admin peut modifier le rôle ou désactiver un administrateur. Vous pouvez consulter la liste, mais pas la modifier.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map(a => (
          <div key={a.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${a.is_superuser ? 'border-amber-200' : 'border-slate-200/80'} ${a.is_active === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 ${a.is_superuser ? 'bg-amber-500' : 'bg-[#31a66b]'}`}>
                  {initials(a)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {a.first_name ? `${a.first_name} ${a.last_name || ''}` : a.username}
                    {a.is_superuser && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {a.is_active === false && <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Inactif</span>}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">{a.email || a.username}</p>
                </div>
              </div>
              {!a.is_superuser && user?.is_superuser && (
                a.is_active === false ? (
                  <button onClick={() => handleReactivate(a.id)} title="Réactiver" className="text-slate-300 hover:text-emerald-600 transition-colors shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => handleDeactivate(a.id)} title="Désactiver" className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <UserX className="w-4 h-4" />
                  </button>
                )
              )}
            </div>

            {a.is_superuser ? (
              <div className="pt-3 mt-1 border-t border-slate-100">
                <span className="inline-block text-xs font-medium bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                  Super Admin — protégé
                </span>
              </div>
            ) : (
              <div className="pt-3 mt-1 border-t border-slate-100">
                <label className="block text-xs text-slate-400 mb-1">Rôle</label>
                <select
                  value="ADMIN"
                  onChange={(e) => handleRoleChange(a.id, e.target.value)}
                  disabled={!user?.is_superuser}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-[#31a66b] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="AGENT">Agent</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            Aucun administrateur trouvé.
          </div>
        )}
      </div>
    </Layout>
  );
}
