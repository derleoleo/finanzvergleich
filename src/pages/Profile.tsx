import { useEffect, useRef, useState } from "react";
import { UserProfile, type UserProfileData } from "@/entities/UserProfile";
const EMPTY_PROFILE: UserProfileData = { name: "", company: "", email: "", phone: "", address: "", city: "", zip: "", logo: "" };

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { User, Save, CheckCircle, Building, Mail, Phone, MapPin, ImagePlus, X, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [profile, setProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    UserProfile.load().then(setProfile);
  }, []);

  const update = (field: keyof UserProfileData, value: string) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const handleDeleteAccount = async () => {
    if (!session) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      // localStorage leeren
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("fv_") || k.startsWith("finanzvergleich") || k.startsWith("rc_") || k.startsWith("wp_")) {
          localStorage.removeItem(k);
        }
      });
      await signOut();
      navigate("/");
    } catch {
      alert("Konto konnte nicht gelöscht werden. Bitte versuche es erneut.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    await UserProfile.save(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Mein Profil</h1>
              <p className="text-slate-600 mt-1">Angaben werden für PDF-Exporte verwendet</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Persönliche Angaben */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                Persönliche Angaben
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><User className="w-4 h-4" />Vollständiger Name</div>
                </Label>
                <Input value={profile.name} onChange={(e) => update("name", e.target.value)}
                  placeholder="Max Mustermann" className={inputClass} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Building className="w-4 h-4" />Unternehmen / Firma (optional)</div>
                </Label>
                <Input value={profile.company} onChange={(e) => update("company", e.target.value)}
                  placeholder="Musterberatung GmbH" className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* Kontaktdaten */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                Kontaktdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4" />E-Mail</div>
                  </Label>
                  <Input type="email" value={profile.email} onChange={(e) => update("email", e.target.value)}
                    placeholder="max@beispiel.de" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4" />Telefon</div>
                  </Label>
                  <Input value={profile.phone} onChange={(e) => update("phone", e.target.value)}
                    placeholder="+49 123 456789" className={inputClass} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Straße und Hausnummer</Label>
                <Input value={profile.address} onChange={(e) => update("address", e.target.value)}
                  placeholder="Musterstraße 1" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">PLZ</Label>
                  <Input value={profile.zip} onChange={(e) => update("zip", e.target.value)}
                    placeholder="12345" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Ort</Label>
                  <Input value={profile.city} onChange={(e) => update("city", e.target.value)}
                    placeholder="Musterstadt" className={inputClass} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-orange-600" />
                </div>
                Logo für PDF-Exporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.logo ? (
                <div className="flex items-start gap-4">
                  <img
                    src={profile.logo}
                    alt="Logo"
                    className="max-h-24 max-w-48 object-contain border border-slate-200 rounded-xl p-2 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => update("logo", "")}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                    Entfernen
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Logo hochladen</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG – max. 1 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1_048_576) {
                    alert("Die Datei ist zu groß (max. 1 MB).");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => update("logo", reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl flex items-center gap-2"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Gespeichert!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Profil speichern
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Profildaten werden sicher in Ihrem Konto gespeichert und in PDF-Exporten verwendet.
          </div>

          {/* Danger Zone */}
          <Card className="border border-red-200 bg-red-50 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-base font-semibold text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Konto löschen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-red-600">
                    Löscht dein Konto und alle gespeicherten Daten unwiderruflich.
                  </p>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 shrink-0"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Konto löschen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-700">
                    Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                    Alle Berechnungen, Profildaten und das Abonnement werden dauerhaft gelöscht.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Ja, Konto löschen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
