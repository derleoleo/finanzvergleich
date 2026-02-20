import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Consent } from '@/entities/Consent'
import { supabase } from '@/lib/supabase'
import { LEGAL_DOC_VERSION, REQUIRED_CONSENT_TYPES } from '@/utils/legalVersion'
import { Button } from '@/components/ui/button'

type GateStatus = "loading" | "ok" | "required"

export default function ConsentGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<GateStatus>("loading")
  const [consentB2B, setConsentB2B] = useState(false)
  const [consentAVV, setConsentAVV] = useState(false)
  const [consentAGB, setConsentAGB] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    Consent.hasRequiredConsents(user.id, LEGAL_DOC_VERSION, REQUIRED_CONSENT_TYPES)
      .then((ok) => setStatus(ok ? "ok" : "required"))
      .catch(() => setStatus("ok")) // fail-open: Nutzer nicht aussperren
  }, [user, authLoading])

  const canSubmit = consentB2B && consentAVV && consentAGB

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Keine aktive Session')
      await Consent.saveConsents(
        [...REQUIRED_CONSENT_TYPES].map((t) => ({
          consent_type: t,
          document_version: LEGAL_DOC_VERSION,
        })),
        session
      )
      setStatus("ok")
    } catch {
      setSubmitError('Fehler beim Speichern der Zustimmung. Bitte versuchen Sie es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {children}
      {status === "required" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Zustimmung erforderlich</h2>
              <p className="text-sm text-slate-600 mt-1">
                Bitte bestätigen Sie die aktualisierten Vertragsbedingungen (Version {LEGAL_DOC_VERSION}),
                um die Plattform weiter zu nutzen.
              </p>
            </div>

            <div className="space-y-3">
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
                  Ich stimme dem{" "}
                  <Link to="/legal/avv" target="_blank" className="text-blue-600 hover:underline">
                    Auftragsverarbeitungsvertrag (AVV)
                  </Link>{" "}
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
                  Ich habe die{" "}
                  <Link to="/agb" target="_blank" className="text-blue-600 hover:underline">
                    AGB
                  </Link>{" "}
                  gelesen und stimme diesen zu.
                </span>
              </label>
            </div>

            {submitError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
            )}

            <Button
              className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              )}
              Zustimmen &amp; fortfahren
            </Button>

            <p className="text-xs text-slate-400 text-center">
              Ohne Zustimmung kann die Plattform nicht genutzt werden.{" "}
              <a href="mailto:info@rentencheck.app" className="hover:underline">Support kontaktieren</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
