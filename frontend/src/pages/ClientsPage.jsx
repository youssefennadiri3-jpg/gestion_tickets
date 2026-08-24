import { useState, useEffect } from 'react';
import { UserX, UserCheck, Users } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);

  const fetchClients = async () => {
    try {
      const res = await api.get('clients/');
      setClients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDeactivate = async (id) => {
    if (!confirm('Désactiver ce client ? Il ne pourra plus se connecter, mais ses tickets restent intacts.')) return;
    try {
      await api.delete(`clients/${id}/`);
      fetchClients();
    } catch (err) {
      alert('Erreur lors de la désactivation.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await api.patch(`clients/${id}/`, { is_active: true });
      fetchClients();
    } catch (err) {
      alert('Erreur lors de la réactivation.');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`clients/${id}/`, { role });
      fetchClients();
    } catch (err) {
      alert('Erreur lors du changement de rôle.');
    }
  };

  const initials = (c) => ((c.first_name?.[0] || c.username[0]) + (c.last_name?.[0] || '')).toUpperCase();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
        <p className="text-slate-400 text-sm mt-1">{clients.length} client(s)</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-4 font-semibold">Client</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Tickets créés</th>
              <th className="p-4 font-semibold">Rôle</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => (
              <tr key={c.id} className={`hover:bg-slate-50/70 transition-colors ${c.is_active === false ? 'opacity-60' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#31a66b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {initials(c)}
                    </div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username}
                      {c.is_active === false && <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Inactif</span>}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-slate-500">{c.email || '-'}</td>
                <td className="p-4 text-slate-600 font-medium">{c.nb_tickets}</td>
                <td className="p-4">
                  <select
                    value="CLIENT"
                    onChange={(e) => handleRoleChange(c.id, e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-[#31a66b]"
                  >
                    <option value="CLIENT">Client</option>
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  {c.is_active === false ? (
                    <button onClick={() => handleReactivate(c.id)} title="Réactiver" className="text-slate-300 hover:text-emerald-600 transition-colors">
                      <UserCheck className="w-4 h-4 inline" />
                    </button>
                  ) : (
                    <button onClick={() => handleDeactivate(c.id)} title="Désactiver" className="text-slate-300 hover:text-red-500 transition-colors">
                      <UserX className="w-4 h-4 inline" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Aucun client pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
