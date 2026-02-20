import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Consent } from '@/entities/Consent'
import { LEGAL_DOC_VERSION, REQUIRED_CONSENT_TYPES } from '@/utils/legalVersion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { user, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [consentB2B, setConsentB2B] = useState(false)
  const [consentAVV, setConsentAVV] = useState(false)
  const [consentAGB, setConsentAGB] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const canSubmit = tab === 'login' ? true : (consentB2B && consentAVV && consentAGB)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(email, password)
        navigate('/')
      } else {
        const { sessionCreated } = await signUp(email, password)
        if (sessionCreated) {
          const { data: { session: freshSession } } = await supabase.auth.getSession()
          if (freshSession) {
            try {
              await Consent.saveConsents(
                [...REQUIRED_CONSENT_TYPES].map((t) => ({
                  consent_type: t,
                  document_version: LEGAL_DOC_VERSION,
                })),
                freshSession
              )
            } catch {
              await signOut()
              setError('Fehler beim Speichern der Zustimmung. Bitte versuche es erneut.')
              setLoading(false)
              return
            }
          }
          navigate('/')
        } else {
          setSuccessMessage('Registrierung erfolgreich! Bitte überprüfe deine E-Mails und bestätige dein Konto.')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tab === 'login' ? 'Fehler beim Anmelden' : 'Fehler bei der Registrierung')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    setError('')
    setSuccessMessage('')
    setConsentB2B(false)
    setConsentAVV(false)
    setConsentAGB(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/favicon.svg" alt="RentenCheck" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-slate-900">RentenCheck</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Tab-Switch */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort"
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'register' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pflichtbestätigungen</p>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentB2B}
                    onChange={(e) => setConsentB2B(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Ich bestätige, dass ich als Unternehmer im Sinne des § 14 BGB handle und die
                    Plattform ausschließlich zu gewerblichen Zwecken nutze.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAVV}
                    onChange={(e) => setConsentAVV(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Ich stimme dem{' '}
                    <Link to="/legal/avv" target="_blank" className="text-blue-600 hover:underline">
                      Auftragsverarbeitungsvertrag (AVV)
                    </Link>{' '}
                    gemäß Art. 28 DSGVO zu.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAGB}
                    onChange={(e) => setConsentAGB(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Ich habe die{' '}
                    <Link to="/agb" target="_blank" className="text-blue-600 hover:underline">
                      AGB
                    </Link>{' '}
                    gelesen und stimme diesen zu.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{successMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700"
              disabled={loading || !canSubmit}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              )}
              {tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </Button>
            {tab === 'login' && (
              <p className="text-center text-sm text-slate-500">
                <Link to="/reset-password" className="hover:underline">Passwort vergessen?</Link>
              </p>
            )}
          </form>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <Link to="/impressum" className="hover:text-slate-600">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-slate-600">Datenschutz</Link>
          <Link to="/agb" className="hover:text-slate-600">AGB</Link>
          <Link to="/legal/avv" className="hover:text-slate-600">AVV</Link>
          <a href="mailto:info@rentencheck.app" className="hover:text-slate-600">Support</a>
        </div>
      </div>
    </div>
  )
}
