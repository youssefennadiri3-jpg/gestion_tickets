import { useState, useEffect } from 'react';
import { Plus, UserX, UserCheck, UserCog } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '' });
  const [error, setError] = useState('');

  const fetchAgents = async () => {
    try {
      const res = await api.get('agents/');
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('agents/', form);
      setShowModal(false);
      setForm({ username: '', email: '', first_name: '', last_name: '', password: '' });
      fetchAgents();
    } catch (err) {
      setError('Erreur lors de la création de l\'agent. Vérifiez les champs.');
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Désactiver cet agent ? Il ne pourra plus se connecter, mais ses tickets et son historique restent intacts.')) return;
    try {
      await api.delete(`agents/${id}/`);
      fetchAgents();
    } catch (err) {
      alert('Erreur lors de la désactivation.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await api.patch(`agents/${id}/`, { is_active: true });
      fetchAgents();
    } catch (err) {
      alert('Erreur lors de la réactivation.');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`agents/${id}/`, { role });
      fetchAgents();
    } catch (err) {
      alert('Erreur lors du changement de rôle.');
    }
  };

  const initials = (a) => ((a.first_name?.[0] || a.username[0]) + (a.last_name?.[0] || '')).toUpperCase();

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agents</h1>
          <p className="text-slate-400 text-sm mt-1">{agents.length} agent(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[#31a66b] hover:bg-[#288a58] text-white font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/20 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nouvel agent
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => (
          <div key={a.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${a.is_active === false ? 'border-slate-200/80 opacity-60' : 'border-slate-200/80'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#31a66b] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {initials(a)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {a.first_name ? `${a.first_name} ${a.last_name || ''}` : a.username}
                    {a.is_active === false && <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Inactif</span>}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">{a.email || a.username}</p>
                </div>
              </div>
              {a.is_active === false ? (
                <button onClick={() => handleReactivate(a.id)} title="Réactiver" className="text-slate-300 hover:text-emerald-600 transition-colors shrink-0">
                  <UserCheck className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => handleDeactivate(a.id)} title="Désactiver" className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-sm">
              <div>
                <p className="font-bold text-slate-800">{a.nb_tickets}</p>
                <p className="text-xs text-slate-400">Assignés</p>
              </div>
              <div>
                <p className="font-bold text-emerald-600">{a.nb_tickets_resolus}</p>
                <p className="text-xs text-slate-400">Résolus</p>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100">
              <label className="block text-xs text-slate-400 mb-1">Rôle</label>
              <select
                value="AGENT"
                onChange={(e) => handleRoleChange(a.id, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-[#31a66b]"
              >
                <option value="AGENT">Agent</option>
                <option value="CLIENT">Client</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <UserCog className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Aucun agent pour le moment.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Ajouter un agent</h3>
            {error && <div className="bg-red-50 border border-red-100 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Prénom</label>
                  <input name="first_name" value={form.first_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Nom</label>
                  <input name="last_name" value={form.last_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nom d'utilisateur *</label>
                <input name="username" value={form.username} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Mot de passe *</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700">Annuler</button>
                <button type="submit" className="bg-[#31a66b] hover:bg-[#288a58] text-white px-5 py-2 rounded-lg text-sm font-medium">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

