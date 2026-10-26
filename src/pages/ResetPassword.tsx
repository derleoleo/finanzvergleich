import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { BrandMark, MARKE } from '@/components/BrandLogo'
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
    /*
     * Auf `PASSWORD_RECOVERY` allein ist kein Verlass.
     *
     * Der Supabase-Client entsteht beim Laden seines Moduls und verarbeitet
     * den Link aus der Mail sofort. Diese Seite wird dagegen nachgeladen und
     * haengt ihren Zuhoerer erst danach ein - das Ereignis ist dann vorbei.
     * Die Seite blieb deshalb im Anforderungsmodus, und wer auf den Link
     * klickte, landete wieder beim Feld "E-Mail eingeben". Ein Kreislauf, aus
     * dem es ohne zweiten Weg kein Entkommen gab.
     */
    const hash = window.location.hash
    const suche = new URLSearchParams(window.location.search)

    // Abgelaufener oder bereits benutzter Link: Das stand bisher nur im
    // Adressfeld, und die Seite tat, als waere nichts gewesen.
    const fehlerAusLink =
      new URLSearchParams(hash.replace(/^#/, '')).get('error_description') ??
      suche.get('error_description')
    if (fehlerAusLink) {
      setError(
        `${fehlerAusLink}. Bitte fordern Sie einen neuen Link an - er gilt nur begrenzte Zeit.`
      )
    }

    const ausWiederherstellung =
      hash.includes('type=recovery') || suche.has('code') || suche.has('token_hash')
    if (ausWiederherstellung) setMode('update')

    // Zweiter Weg: Hat der Client den Link schon verarbeitet, ist die Adresse
    // bereits bereinigt - dann verraet nur noch die bestehende Sitzung, dass
    // wir aus der Mail kommen. Diese Seite ist ausschliesslich von der
    // Anmeldeseite aus verlinkt, eine Sitzung hier hat also keinen anderen
    // Grund.
    let abgebrochen = false
    supabase.auth.getSession().then(({ data }) => {
      if (!abgebrochen && data.session && !fehlerAusLink) setMode('update')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
      }
    })
    return () => {
      abgebrochen = true
      subscription.unsubscribe()
    }
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
          <BrandMark className="w-12 h-12" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{MARKE}</h1>
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
