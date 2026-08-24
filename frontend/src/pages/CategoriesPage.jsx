import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { CATEGORIE_COLORS } from '../utils/ticketStyles';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [nom, setNom] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('categories/');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('categories/', { nom });
      setNom('');
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError("Erreur : cette catégorie existe peut-être déjà.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await api.delete(`categories/${id}/`);
      fetchCategories();
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catégories</h1>
          <p className="text-slate-400 text-sm mt-1">{categories.length} catégorie(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[#31a66b] hover:bg-[#288a58] text-white font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/20 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nouvelle catégorie
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c, i) => (
          <div key={c.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: CATEGORIE_COLORS[i % CATEGORIE_COLORS.length] }}></span>
              <div>
                <h3 className="font-bold text-slate-800">{c.nom}</h3>
                <p className="text-xs text-slate-400">{c.nb_tickets ?? 0} ticket(s)</p>
              </div>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Aucune catégorie pour le moment.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Nouvelle catégorie</h3>
            {error && <div className="bg-red-50 border border-red-100 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nom *</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
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
