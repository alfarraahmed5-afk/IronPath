import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Copy, Check, AlertTriangle } from 'lucide-react';
import api, { STORAGE_KEYS } from '../lib/api';
import { readStoredUser } from '../lib/session';

interface Enrollment {
  secret: string;
  otpauth_url: string;
  qr_data_url: string;
}

type Stage = 'loading' | 'scan' | 'codes' | 'done';

export default function EnrollTOTPPage() {
  const [stage, setStage] = useState<Stage>('loading');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/super-admin/2fa/enroll');
        if (cancelled) return;
        setEnrollment(res.data.data);
        setStage('scan');
      } catch (err: unknown) {
        if (cancelled) return;
        setError(extractErr(err) ?? 'Could not start enrollment.');
        setStage('scan');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/super-admin/2fa/confirm', {
        secret: enrollment.secret,
        totp_code: code.trim(),
      });
      const codes: string[] = res.data.data.recovery_codes ?? [];
      setRecoveryCodes(codes);
      // Reflect the new state in localStorage so the route guard releases.
      const user = readStoredUser();
      if (user) {
        localStorage.setItem(
          STORAGE_KEYS.user,
          JSON.stringify({ ...user, totp_enabled: true })
        );
      }
      setStage('codes');
    } catch (err: unknown) {
      setError(extractErr(err) ?? 'Verification failed. Try a fresh code.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinish() {
    setStage('done');
    navigate('/gyms');
  }

  async function copyText(text: string, mark: 'secret' | 'codes') {
    try {
      await navigator.clipboard.writeText(text);
      if (mark === 'secret') {
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 1500);
      } else {
        setCodesCopied(true);
        setTimeout(() => setCodesCopied(false), 1500);
      }
    } catch {
      // Clipboard denied — operator can still hand-copy.
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <ShieldCheck size={20} strokeWidth={1.75} className="text-brand-400" />
            <h1 className="text-2xl font-semibold text-ink-50 tracking-tight">
              Enable two-factor auth
            </h1>
          </div>
          <p className="text-ink-300 text-sm">
            Required for super admin access. Takes about a minute.
          </p>
        </div>

        {stage === 'loading' && (
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-7 text-center text-ink-300 text-sm">
            Loading enrollment…
          </div>
        )}

        {stage === 'scan' && enrollment && (
          <form onSubmit={handleConfirm} className="bg-ink-800 border border-ink-700 rounded-lg p-7 shadow-xl">
            <ol className="text-ink-200 text-sm space-y-1 mb-5 list-decimal pl-4">
              <li>Open your authenticator app (1Password, Authy, Google Authenticator).</li>
              <li>Scan the QR code or paste the secret.</li>
              <li>Enter the 6-digit code below.</li>
            </ol>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-2 rounded-md">
                <img src={enrollment.qr_data_url} alt="TOTP QR code" className="block w-44 h-44" />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-ink-300 mb-1.5 font-medium uppercase tracking-wider">
                Manual secret
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={enrollment.secret}
                  className="flex-1 bg-ink-700 text-ink-100 rounded-md px-3 py-2 border border-ink-600 text-xs font-mono select-all"
                  data-numeric
                />
                <button
                  type="button"
                  onClick={() => copyText(enrollment.secret, 'secret')}
                  className="px-3 rounded-md border border-ink-600 text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors"
                  aria-label="Copy secret"
                >
                  {secretCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs text-ink-300 mb-1.5 font-medium uppercase tracking-wider">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-ink-700 text-ink-50 rounded-md px-3 py-2 border border-ink-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 font-mono text-center text-lg tracking-[0.4em]"
                placeholder="000000"
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? 'Verifying' : 'Verify and enable'}
            </button>
          </form>
        )}

        {stage === 'codes' && (
          <div className="bg-ink-800 border border-ink-700 rounded-lg p-7 shadow-xl">
            <div className="flex items-start gap-2 mb-4 bg-amber-950/30 border border-amber-900/60 rounded-md px-3 py-2">
              <AlertTriangle size={16} strokeWidth={1.75} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-200 text-xs">
                Save these recovery codes in a password manager. They will not be shown again.
                Each code works once if you lose your authenticator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {recoveryCodes.map((c) => (
                <div
                  key={c}
                  className="bg-ink-700 border border-ink-600 rounded px-3 py-2 font-mono text-sm text-ink-50 text-center"
                  data-numeric
                >
                  {c}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => copyText(recoveryCodes.join('\n'), 'codes')}
              className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-ink-600 text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors text-sm"
            >
              {codesCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{codesCopied ? 'Copied' : 'Copy all to clipboard'}</span>
            </button>

            <label className="flex items-start gap-2 mb-5 text-sm text-ink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={savedConfirmed}
                onChange={(e) => setSavedConfirmed(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span>I have saved my recovery codes somewhere safe.</span>
            </label>

            <button
              type="button"
              onClick={handleFinish}
              disabled={!savedConfirmed}
              className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Continue to console
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function extractErr(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const r = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
