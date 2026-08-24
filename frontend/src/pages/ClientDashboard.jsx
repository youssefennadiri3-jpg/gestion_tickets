import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Circle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { STATUT_STYLES, PRIORITE_STYLES, statutLabel, prioriteLabel } from '../utils/ticketStyles';

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-sm text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('stats/').then(res => setStats(res.data)).catch(console.error);
  }, []);

  const firstName = user?.first_name || user?.username;

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-800">Bonjour, {firstName} 👋</h1>
      <p className="text-slate-400 text-sm mt-1 mb-6">Voici un aperçu de vos tickets</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Ticket} value={stats?.total ?? '-'} label="Total tickets" color="bg-emerald-50 text-[#31a66b]" />
        <StatCard icon={Circle} value={stats?.ouverts ?? '-'} label="Ouverts" color="bg-blue-50 text-blue-500" />
        <StatCard icon={Clock} value={stats?.en_cours ?? '-'} label="En cours" color="bg-orange-50 text-orange-500" />
        <StatCard icon={CheckCircle2} value={stats?.resolus ?? '-'} label="Résolus" color="bg-emerald-50 text-emerald-500" />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-800">Tickets récents</h2>
          <Link to="/tickets" className="text-sm text-[#288a58] font-medium hover:underline inline-flex items-center gap-1">
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {stats?.tickets_recents?.map(t => (
            <Link
              to={`/ticket/${t.id}`}
              key={t.id}
              className="flex items-center justify-between py-3.5 hover:bg-slate-50/60 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-slate-400 shrink-0">T-{String(t.id).padStart(3, '0')}</span>
                <span className="font-semibold text-slate-800 truncate">{t.titre}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITE_STYLES[t.priorite] || ''}`}>{prioriteLabel(t.priorite)}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[t.statut] || ''}`}>{statutLabel(t.statut)}</span>
              </div>
            </Link>
          ))}
          {stats && (!stats.tickets_recents || stats.tickets_recents.length === 0) && (
            <p className="text-slate-400 text-sm text-center py-8">Aucun ticket pour le moment.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
