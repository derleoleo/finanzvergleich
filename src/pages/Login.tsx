import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

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
        await signUp(email, password)
        navigate('/')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anmelden')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    setError('')
    setSuccessMessage('')
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{successMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700"
              disabled={loading}
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
      </div>
    </div>
  )
}
