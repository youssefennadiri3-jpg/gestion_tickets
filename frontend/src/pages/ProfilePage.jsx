import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import Layout from '../components/Layout';
import { ShieldCheck, ChevronLeft } from 'lucide-react';

const ROLE_LABEL = { ADMIN: 'Administrateur', AGENT: 'Agent', CLIENT: 'Client' };

export default function ProfilePage() {
  const { user, setUser } = useContext(AuthContext);
  const [step, setStep] = useState(1); // 1 = formulaire, 2 = code OTP
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const initials = () => {
    if (!user) return 'U';
    const first = user.first_name ? user.first_name[0] : user.username[0];
    const last = user.last_name ? user.last_name[0] : '';
    return (first + last).toUpperCase();
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRequestUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (password || password2) {
      if (password !== password2) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (password) {
        payload.password = password;
        payload.password2 = password2;
      }
      await api.post('auth/me/update/request/', payload);
      setInfo(`Un code de confirmation a été envoyé à ${user.email}.`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la demande de modification.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('auth/me/update/verify/', { code });
      if (setUser) setUser(res.data);
      setPassword('');
      setPassword2('');
      setCode('');
      setStep(1);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const payload = { ...form };
      if (password) {
        payload.password = password;
        payload.password2 = password2;
      }
      await api.post('auth/me/update/request/', payload);
      setInfo('Nouveau code envoyé à votre email.');
    } catch (err) {
      setError("Impossible de renvoyer le code pour l'instant.");
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mon profil</h1>
        <p className="text-slate-400 text-sm mt-1">Gérez vos informations personnelles</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#31a66b] text-white flex items-center justify-center font-bold text-xl shrink-0">
            {initials()}
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</h2>
            <span className="inline-block mt-1 text-xs font-medium bg-emerald-50 text-[#288a58] px-2.5 py-1 rounded-full">
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          {saved && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm p-3 rounded-lg mb-4">Profil mis à jour avec succès.</div>}
          {error && <div className="bg-red-50 border border-red-100 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleRequestUpdate} className="space-y-4">
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Toute modification doit être confirmée par un code envoyé à votre email actuel ({user?.email}).
              </p>

              <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm text-slate-600 mb-1">Nom d'utilisateur</label>
                <input value={user?.username || ''} disabled className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Nouveau mot de passe</label>
                  <input type="password" placeholder="Laisser vide pour ne pas changer" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Confirmer le mot de passe</label>
                  <input type="password" placeholder="Retapez le mot de passe" value={password2} onChange={(e) => setPassword2(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#31a66b]" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={loading} className="bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {loading ? 'Envoi du code...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-[#31a66b] rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Confirmez la modification</h2>
                <p className="text-slate-400 text-sm">Entrez le code à 6 chiffres envoyé à votre email</p>
              </div>

              {info && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm p-3 rounded-lg mb-4 text-center">{info}</div>}

              <form onSubmit={handleVerifyUpdate} className="space-y-5 max-w-xs mx-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-center tracking-[0.5em] font-bold text-lg focus:outline-none focus:border-[#31a66b]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Vérification...' : 'Confirmer'}
                </button>
              </form>

              <p className="text-center text-slate-400 text-sm mt-5">
                Vous n'avez pas reçu le code ?{' '}
                <button onClick={handleResend} className="text-[#288a58] hover:underline font-medium">
                  Renvoyer
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
