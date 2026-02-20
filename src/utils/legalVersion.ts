export const LEGAL_DOC_VERSION = "2026-02" as const
export const REQUIRED_CONSENT_TYPES = ["avv", "agb", "b2b_confirm"] as const
export type ConsentType = "avv" | "agb" | "b2b_confirm" | "privacy_notice"
export type RequiredConsentType = (typeof REQUIRED_CONSENT_TYPES)[number]
