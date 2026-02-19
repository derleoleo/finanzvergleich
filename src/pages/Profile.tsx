import { useEffect, useState } from "react";
import { UserProfile, type UserProfileData } from "@/entities/UserProfile";

const EMPTY_PROFILE: UserProfileData = { name: "", company: "", email: "", phone: "", address: "", city: "", zip: "" };

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { User, Save, CheckCircle, Building, Mail, Phone, MapPin } from "lucide-react";

export default function Profile() {
  const [profile, setProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    UserProfile.load().then(setProfile);
  }, []);

  const update = (field: keyof UserProfileData, value: string) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

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
            Alle Daten werden ausschließlich lokal in Ihrem Browser gespeichert.
          </div>
        </div>
      </div>
    </div>
  );
}
