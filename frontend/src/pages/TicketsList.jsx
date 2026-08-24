import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Plus, Ticket as TicketIcon } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  STATUT_STYLES, PRIORITE_STYLES, statutLabel, prioriteLabel, formatDate,
} from '../utils/ticketStyles';

export default function TicketsList() {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [prioriteFilter, setPrioriteFilter] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState('MOYENNE');
  const [categorie, setCategorie] = useState('');

  const title = user?.role === 'CLIENT' ? 'Mes tickets' : user?.role === 'AGENT' ? 'Tickets disponibles' : 'Tous les tickets';

  const fetchTickets = useCallback(async () => {
    try {
      const params = {};
      if (statutFilter) params.statut = statutFilter;
      if (prioriteFilter) params.priorite = prioriteFilter;
      if (categorieFilter) params.categorie = categorieFilter;
      if (search) params.search = search;
      const res = await api.get('tickets/', { params });
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statutFilter, prioriteFilter, categorieFilter, search]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('categories/');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
    if (user?.role === 'ADMIN') {
      api.get('agents/').then(res => setAgents(res.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(fetchTickets, 250);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  const handleAssignAgent = async (ticketId, agentId) => {
    // Mise à jour optimiste pour un retour visuel immédiat
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, agent: agentId || null } : t)));
    try {
      await api.patch(`tickets/${ticketId}/`, { agent: agentId || null });
      fetchTickets();
    } catch (err) {
      alert("Erreur lors de l'assignation de l'agent");
      fetchTickets();
    }
  };

  const handleTakeTicket = async (ticketId) => {
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, agent: user.id, agent_username: user.username } : t)));
    try {
      await api.patch(`tickets/${ticketId}/`, { agent: user.id });
      fetchTickets();
    } catch (err) {
      alert('Erreur lors de la prise en charge du ticket');
      fetchTickets();
    }
  };

  const handleReleaseTicket = async (ticketId) => {
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, agent: null, agent_username: null } : t)));
    try {
      await api.patch(`tickets/${ticketId}/`, { agent: null });
      fetchTickets();
    } catch (err) {
      alert('Erreur lors du désistement');
      fetchTickets();
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const payload = { titre, description, priorite };
      if (categorie) payload.categorie = categorie;
      await api.post('tickets/', payload);
      setShowModal(false);
      setTitre('');
      setDescription('');
      setCategorie('');
      setPriorite('MOYENNE');
      fetchTickets();
    } catch (err) {
      alert('Erreur lors de la création du ticket');
    }
  };

  const canCreate = user?.role === 'CLIENT' || user?.role === 'ADMIN' || user?.role === 'AGENT';

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">{tickets.length} ticket(s) trouvé(s)</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-[#31a66b] hover:bg-[#288a58] text-white font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/20 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#31a66b] shadow-sm"
          />
        </div>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none shadow-sm">
          <option value="">Tous les statuts</option>
          <option value="OUVERT">Ouvert</option>
          <option value="EN_COURS">En cours</option>
          <option value="RESOLU">Résolu</option>
          <option value="FERME">Fermé</option>
        </select>
        <select value={prioriteFilter} onChange={(e) => setPrioriteFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none shadow-sm">
          <option value="">Toutes priorités</option>
          <option value="BASSE">Faible</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="HAUTE">Haute</option>
        </select>
        <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none shadow-sm">
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-4 font-semibold">ID</th>
              <th className="p-4 font-semibold">Titre</th>
              <th className="p-4 font-semibold">Catégorie</th>
              <th className="p-4 font-semibold">Priorité</th>
              <th className="p-4 font-semibold">Statut</th>
              <th className="p-4 font-semibold">Client</th>
              {(user?.role === 'ADMIN' || user?.role === 'AGENT') && <th className="p-4 font-semibold">Agent</th>}
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold text-right">Voir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-4 font-mono text-slate-400">T-{String(t.id).padStart(3, '0')}</td>
                <td className="p-4 font-semibold text-slate-800 max-w-xs truncate">{t.titre}</td>
                <td className="p-4">
                  <span className="text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-xs">{t.categorie_nom || '-'}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITE_STYLES[t.priorite] || 'bg-slate-100 text-slate-500'}`}>
                    {prioriteLabel(t.priorite)}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[t.statut] || 'bg-slate-100 text-slate-500'}`}>
                    {statutLabel(t.statut)}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{t.client_username}</td>
                {user?.role === 'ADMIN' && (
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={t.agent || ''}
                      onChange={(e) => handleAssignAgent(t.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-[#31a66b] max-w-[140px]"
                    >
                      <option value="">Non assigné</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.first_name ? `${a.first_name} ${a.last_name || ''}` : a.username}</option>
                      ))}
                    </select>
                  </td>
                )}
                {user?.role === 'AGENT' && (
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    {t.agent ? (
                      t.agent === user.id ? (
                        <button
                          onClick={() => handleReleaseTicket(t.id)}
                          title="Se désister de ce ticket"
                          className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-red-50 hover:text-red-500 px-2.5 py-1.5 rounded-full transition-colors"
                        >
                          Moi ✕
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                          {t.agent_username}
                        </span>
                      )
                    ) : (
                      <button
                        onClick={() => handleTakeTicket(t.id)}
                        className="text-xs font-medium text-[#288a58] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Prendre
                      </button>
                    )}
                  </td>
                )}
                <td className="p-4 text-slate-400">{formatDate(t.date_creation)}</td>
                <td className="p-4 text-right">
                  <Link to={`/ticket/${t.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-[#288a58] hover:bg-emerald-50 transition-colors">
                    <Eye className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={(user?.role === 'ADMIN' || user?.role === 'AGENT') ? 9 : 8} className="p-12 text-center text-slate-400">
                  <TicketIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Aucun ticket disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nouveau Ticket */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Créer un nouveau ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Titre *</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm focus:outline-none focus:border-[#31a66b]" value={titre} onChange={(e) => setTitre(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Description *</label>
                <textarea rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm focus:outline-none focus:border-[#31a66b]" value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Catégorie</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm focus:outline-none" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Priorité</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm focus:outline-none" value={priorite} onChange={(e) => setPriorite(e.target.value)}>
                  <option value="BASSE">Faible</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
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
