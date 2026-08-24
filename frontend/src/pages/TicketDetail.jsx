import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Send } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { STATUT_STYLES, PRIORITE_STYLES, statutLabel, prioriteLabel, formatDate } from '../utils/ticketStyles';

const ROLE_LABEL = { ADMIN: 'Admin', AGENT: 'Agent', CLIENT: 'Client' };

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');
  const [statut, setStatut] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`tickets/${id}/`);
      setTicket(res.data);
      setStatut(res.data.statut);
      setAgentId(res.data.agent || '');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('agents/').then(res => setAgents(res.data)).catch(console.error);
    }
  }, [user]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!nouveauCommentaire.trim()) return;
    try {
      await api.post('comments/', { ticket: id, contenu: nouveauCommentaire });
      setNouveauCommentaire('');
      fetchTicket();
    } catch (err) {
      alert("Erreur lors de l'ajout du commentaire");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { statut };
      if (user?.role === 'ADMIN') {
        payload.agent = agentId || null;
      }
      await api.patch(`tickets/${id}/`, payload);
      fetchTicket();
    } catch (err) {
      alert('Erreur lors de la mise à jour du ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleSelfAssign = async () => {
    setSaving(true);
    try {
      await api.patch(`tickets/${id}/`, { agent: user.id });
      fetchTicket();
    } catch (err) {
      alert("Erreur lors de l'auto-assignation");
    } finally {
      setSaving(false);
    }
  };

  const handleSelfUnassign = async () => {
    if (!confirm('Vous désister de ce ticket ? Il redeviendra non assigné.')) return;
    setSaving(true);
    try {
      await api.patch(`tickets/${id}/`, { agent: null });
      fetchTicket();
    } catch (err) {
      alert('Erreur lors du désistement');
    } finally {
      setSaving(false);
    }
  };

  const authorInitials = (name) => (name ? name.slice(0, 2).toUpperCase() : '??');

  if (!ticket) {
    return (
      <Layout>
        <p className="text-slate-400">Chargement...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to={user?.role === 'AGENT' ? '/' : '/tickets'} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-2">
              <span className="text-xs font-mono text-slate-400">T-{String(ticket.id).padStart(3, '0')}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUT_STYLES[ticket.statut] || ''}`}>{statutLabel(ticket.statut)}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITE_STYLES[ticket.priorite] || ''}`}>{prioriteLabel(ticket.priorite)}</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-3">{ticket.titre}</h1>
            <p className="text-slate-600 leading-relaxed">{ticket.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Commentaires ({ticket.commentaires?.length || 0})
            </h2>

            <div className="space-y-4 mb-5">
              {ticket.commentaires && ticket.commentaires.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#31a66b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {authorInitials(c.auteur_username)}
                  </div>
                  <div className="flex-1 min-w-0 bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{c.auteur_username}</span>
                      <span className="text-[11px] bg-slate-200/70 text-slate-500 px-2 py-0.5 rounded-full">{c.auteur_role ? ROLE_LABEL[c.auteur_role] : ''}</span>
                      <span className="text-xs text-slate-400 ml-auto">{new Date(c.date_creation).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{c.contenu}</p>
                  </div>
                </div>
              ))}
              {(!ticket.commentaires || ticket.commentaires.length === 0) && (
                <p className="text-slate-400 text-sm text-center py-6">Aucun commentaire pour le moment.</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 flex gap-3 items-end">
              <textarea
                rows="2"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-[#31a66b] resize-none"
                placeholder="Ajouter un commentaire..."
                value={nouveauCommentaire}
                onChange={(e) => setNouveauCommentaire(e.target.value)}
              ></textarea>
              <button
                type="submit"
                disabled={!nouveauCommentaire.trim()}
                className="bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-4">Informations</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Catégorie</dt>
                <dd><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{ticket.categorie_nom || '-'}</span></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Client</dt>
                <dd className="font-semibold text-slate-700">{ticket.client_username}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Agent</dt>
                <dd className="font-semibold text-slate-700">{ticket.agent_username || 'Non assigné'}</dd>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <dt className="text-slate-400">Créé le</dt>
                <dd className="font-medium text-slate-600">{formatDate(ticket.date_creation)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Modifié le</dt>
                <dd className="font-medium text-slate-600">{formatDate(ticket.date_modification)}</dd>
              </div>
            </dl>
          </div>

          {(user?.role === 'ADMIN' || user?.role === 'AGENT') && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4">Actions</h2>

              {user?.role === 'ADMIN' && (
                <>
                  <label className="block text-xs text-slate-400 mb-1.5">Agent assigné</label>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#31a66b] mb-4"
                  >
                    <option value="">Non assigné</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.first_name ? `${a.first_name} ${a.last_name || ''}` : a.username}</option>
                    ))}
                  </select>
                </>
              )}

              {user?.role === 'AGENT' && !ticket.agent && (
                <button
                  onClick={handleSelfAssign}
                  disabled={saving}
                  className="w-full mb-4 bg-emerald-50 hover:bg-emerald-100 text-[#288a58] font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  M'auto-assigner ce ticket
                </button>
              )}

              {user?.role === 'AGENT' && ticket.agent === user.id && (
                <button
                  onClick={handleSelfUnassign}
                  disabled={saving}
                  className="w-full mb-4 bg-red-50 hover:bg-red-100 text-red-500 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Me désister de ce ticket
                </button>
              )}

              <label className="block text-xs text-slate-400 mb-1.5">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#31a66b] mb-4"
              >
                <option value="OUVERT">Ouvert</option>
                <option value="EN_COURS">En cours</option>
                <option value="RESOLU">Résolu</option>
                <option value="FERME">Fermé</option>
              </select>
              <button
                onClick={handleSave}
                disabled={saving || (statut === ticket.statut && (user?.role !== 'ADMIN' || String(agentId) === String(ticket.agent || '')))}
                className="w-full bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
