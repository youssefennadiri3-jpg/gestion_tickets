import { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, ShieldCheck, ChevronLeft, Lock } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '../api/axios';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function Login() {
  const [step, setStep] = useState(1); // 1 = identifiants, 2 = code OTP
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const { requestLoginOtp, verifyLoginOtp } = useContext(AuthContext);
  const navigate = useNavigate();

  // Décompte visuel du verrouillage : diminue chaque seconde jusqu'à 0
  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const t = setTimeout(() => setLockedSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedSeconds]);

  const isLocked = lockedSeconds > 0;

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setError('');
    if (!recaptchaToken) {
      setError('Veuillez valider le reCAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      await requestLoginOtp(username, password, recaptchaToken);
      setInfo('Un code de vérification a été envoyé à votre email.');
      setStep(2);
    } catch (err) {
      const seconds = err.response?.data?.locked_seconds;
      if (err.response?.status === 429 && seconds) {
        setLockedSeconds(seconds);
        setError('');
      } else {
        setError(err.response?.data?.detail || "Nom d'utilisateur ou mot de passe incorrect.");
      }
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyLoginOtp(username, code);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api.post('auth/otp/resend/', { username, purpose: 'LOGIN' });
      setInfo('Nouveau code envoyé à votre email.');
    } catch (err) {
      setError("Impossible de renvoyer le code pour l'instant.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-10 h-10 bg-[#31a66b] rounded-xl flex items-center justify-center text-white">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-800">HelpDesk Pro</span>
        </div>

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Bienvenue 👋</h1>
              <p className="text-slate-400 text-sm">Connectez-vous à votre espace support</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            {isLocked && (
              <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 p-3 rounded-lg mb-6 text-sm text-center">
                <Lock className="w-4 h-4 shrink-0" />
                Trop de tentatives. Réessayez dans <span className="font-bold tabular-nums">{formatTime(lockedSeconds)}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCredentials} className="space-y-5">
              <div>
                <label className="block text-slate-600 text-sm font-medium mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#31a66b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-sm font-medium mb-2">Mot de passe</label>
                <input
                  type="password"
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#31a66b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !recaptchaToken || isLocked}
                className="w-full bg-[#31a66b] hover:bg-[#288a58] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-sm shadow-emerald-600/20"
              >
                {isLocked ? `Réessayez dans ${formatTime(lockedSeconds)}` : loading ? 'Vérification...' : 'Se connecter'}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-[#288a58] hover:underline font-medium">
                S'inscrire
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
              <h1 className="text-xl font-bold text-slate-800 mb-1">Vérification en 2 étapes</h1>
              <p className="text-slate-400 text-sm">Entrez le code à 6 chiffres envoyé à votre email</p>
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

            <form onSubmit={handleSubmitOtp} className="space-y-5">
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
                {loading ? 'Vérification...' : 'Vérifier et se connecter'}
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
