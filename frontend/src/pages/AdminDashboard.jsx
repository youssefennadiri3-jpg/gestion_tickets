import { useState, useEffect } from 'react';
import {
  Ticket, Circle, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import { PRIORITE_LABELS, PRIORITE_DOT, CATEGORIE_COLORS } from '../utils/ticketStyles';

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-sm text-slate-400 mt-1.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('stats/').then(res => setStats(res.data)).catch(console.error);
  }, []);

  const priorityData = (stats?.par_priorite || []).map(p => ({
    name: PRIORITE_LABELS[p.priorite] || p.priorite,
    key: p.priorite,
    value: p.total,
  }));
  const priorityTotal = priorityData.reduce((s, p) => s + p.value, 0);
  const priorityAvg = priorityData.length ? Math.round(priorityTotal / priorityData.length) : 0;

  const categorieData = stats?.par_categorie || [];
  const maxCategorie = Math.max(1, ...categorieData.map(c => c.total));

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
      <p className="text-slate-400 text-sm mt-1 mb-6">Vue d'ensemble de l'activité</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Ticket} value={stats?.total ?? '-'} label="Total" color="bg-emerald-50 text-[#31a66b]" />
        <StatCard icon={Circle} value={stats?.ouverts ?? '-'} label="Ouverts" color="bg-blue-50 text-blue-500" />
        <StatCard icon={Clock} value={stats?.en_cours ?? '-'} label="En cours" color="bg-orange-50 text-orange-500" />
        <StatCard icon={CheckCircle2} value={stats?.resolus ?? '-'} label="Résolus" color="bg-emerald-50 text-emerald-500" />
        <StatCard icon={TrendingUp} value={`${stats?.taux_resolution ?? 0}%`} label="Taux résolution" color="bg-purple-50 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Evolution mensuelle */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Évolution mensuelle</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.evolution_mensuelle || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Line type="monotone" dataKey="crees" name="créés" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolus" name="résolus" stroke="#31a66b" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 justify-center text-sm text-slate-500 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>créés</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#31a66b]"></span>résolus</span>
          </div>
        </div>

        {/* Par priorité */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Par priorité</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {priorityData.map((entry) => (
                  <Cell key={entry.key} fill={PRIORITE_DOT[entry.key] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm mt-2">
            {priorityData.map(p => (
              <span key={p.key} className="flex items-center gap-1.5" style={{ color: PRIORITE_DOT[p.key] }}>
                <span className="w-2 h-2 rounded-full" style={{ background: PRIORITE_DOT[p.key] }}></span>
                {p.name}: {p.value}
              </span>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 mt-1">Moyenne: {priorityAvg}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Performance agents */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Performance agents</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.performance_agents || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="username" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="tickets_resolus" name="résolus" fill="#31a66b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Par catégorie */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">Par catégorie</h2>
          <div className="space-y-4">
            {categorieData.map((c, i) => (
              <div key={c.categorie__nom} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORIE_COLORS[i % CATEGORIE_COLORS.length] }}></span>
                <span className="text-sm text-slate-600 w-28 truncate">{c.categorie__nom || 'Sans catégorie'}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.total / maxCategorie) * 100}%`, background: CATEGORIE_COLORS[i % CATEGORIE_COLORS.length] }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-700 w-6 text-right">{c.total}</span>
              </div>
            ))}
            {categorieData.length === 0 && <p className="text-slate-400 text-sm">Aucune donnée.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
