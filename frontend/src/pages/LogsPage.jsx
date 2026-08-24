import { useState, useEffect } from 'react';
import { ScrollText, CheckCircle2, XCircle, Lock, UserPlus, UserX, UserCheck } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';

const ACTION_META = {
  LOGIN_SUCCESS: { label: 'Connexion réussie', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  LOGIN_FAILED: { label: 'Connexion échouée', color: 'bg-red-50 text-red-600', icon: XCircle },
  ACCOUNT_LOCKED: { label: 'Compte verrouillé', color: 'bg-amber-50 text-amber-600', icon: Lock },
  REGISTER: { label: 'Inscription', color: 'bg-blue-50 text-blue-600', icon: UserPlus },
  ACCOUNT_DEACTIVATED: { label: 'Compte désactivé', color: 'bg-slate-100 text-slate-500', icon: UserX },
  ACCOUNT_REACTIVATED: { label: 'Compte réactivé', color: 'bg-emerald-50 text-emerald-600', icon: UserCheck },
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const params = filter ? { action: filter } : {};
      const res = await api.get('logs/', { params });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filter]);

  const formatDateTime = (d) => new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Journal d'activité</h1>
          <p className="text-slate-400 text-sm mt-1">{logs.length} évènement(s) — 500 derniers affichés</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none shadow-sm"
        >
          <option value="">Tous les évènements</option>
          {Object.entries(ACTION_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Évènement</th>
              <th className="p-4 font-semibold">Utilisateur</th>
              <th className="p-4 font-semibold">IP</th>
              <th className="p-4 font-semibold">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => {
              const meta = ACTION_META[l.action] || { label: l.action_display, color: 'bg-slate-100 text-slate-500', icon: ScrollText };
              const Icon = meta.icon;
              return (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 text-slate-500 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {meta.label}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{l.username || l.username_attempted || '-'}</td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{l.ip_address || '-'}</td>
                  <td className="p-4 text-slate-500">{l.details || '-'}</td>
                </tr>
              );
            })}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan="5" className="p-12 text-center text-slate-400">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Aucun évènement enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
