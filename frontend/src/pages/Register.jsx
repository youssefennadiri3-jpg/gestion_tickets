import { useState, useRef } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, ShieldCheck, ChevronLeft } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function Register() {
  const [step, setStep] = useState(1); // 1 = formulaire, 2 = code OTP
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  });
  const [code, setCode] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (!recaptchaToken) {
      setError('Veuillez valider le reCAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      await api.post('auth/register/', { ...formData, recaptcha_token: recaptchaToken });
      setInfo('Un code de vérification a été envoyé à votre email.');
      setStep(2);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const firstError = Object.values(data)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError('Erreur lors de la création du compte.');
      }
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('auth/register/verify/', { username: formData.username, code });
      alert('Compte activé avec succès ! Connectez-vous.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api.post('auth/otp/resend/', { username: formData.username, purpose: 'REGISTER' });
      setInfo('Nouveau code envoyé à votre email.');
    } catch (err) {
      setError("Impossible de renvoyer le code pour l'instant.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm w-full max-w-lg">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-10 h-10 bg-[#31a66b] rounded-xl flex items-center justify-center text-white">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-800">HelpDesk Pro</span>
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Créer un compte</h1>
              <p className="text-slate-400 text-sm">Rejoignez la plateforme en tant que client</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Prénom</label>
                  <input type="text" name="first_name" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Nom</label>
                  <input type="text" name="last_name" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 text-sm font-medium mb-1">Nom d'utilisateur *</label>
                <input type="text" name="username" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} required />
              </div>

              <div>
                <label className="block text-slate-600 text-sm font-medium mb-1">Email *</label>
                <input type="email" name="email" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} required />
                <p className="text-xs text-slate-400 mt-1">Un code de vérification sera envoyé à cet email.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Mot de passe *</label>
                  <input type="password" name="password" value={formData.password} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm font-medium mb-1">Confirmer *</label>
                  <input type="password" name="password2" value={formData.password2} className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#31a66b]" onChange={handleChange} required />
                </div>
              </div>

              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                />
              </div>

              <button type="submit" disabled={loading || !recaptchaToken} className="w-full bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 mt-2">
                {loading ? 'Création...' : "S'inscrire"}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-[#288a58] hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </>
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
              <h1 className="text-xl font-bold text-slate-800 mb-1">Vérifiez votre email</h1>
              <p className="text-slate-400 text-sm">Entrez le code à 6 chiffres envoyé à {formData.email}</p>
            </div>

            {info && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-lg mb-4 text-sm text-center">
                {info}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-slate-600 text-sm font-medium mb-2">Code de vérification</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-center tracking-[0.5em] font-bold text-lg focus:outline-none focus:border-[#31a66b] transition-colors"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-sm shadow-emerald-600/20"
              >
                {loading ? 'Activation...' : 'Activer mon compte'}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              Vous n'avez pas reçu le code ?{' '}
              <button onClick={handleResend} className="text-[#288a58] hover:underline font-medium">
                Renvoyer
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
