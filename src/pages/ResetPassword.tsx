import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('E-Mail gesendet. Bitte prüfen Sie Ihren Posteingang.')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/favicon.svg" alt="RentenCheck" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-slate-900">RentenCheck</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {mode === 'request' ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Passwort zurücksetzen</h2>
              <p className="text-sm text-slate-500 mb-6">
                Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
              </p>
              <form onSubmit={handleRequest} className="space-y-4">
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
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{success}</p>
                )}
                <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700" disabled={loading}>
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                  Link senden
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Neues Passwort setzen</h2>
              <p className="text-sm text-slate-500 mb-6">Bitte wählen Sie ein neues Passwort.</p>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700" disabled={loading}>
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
                  Passwort speichern
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link to="/login" className="text-slate-700 hover:underline">Zurück zur Anmeldung</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
