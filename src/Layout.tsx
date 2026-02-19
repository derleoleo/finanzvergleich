import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Formspree: Konto anlegen auf formspree.io → Form-ID hier eintragen
const FORMSPREE_ID = "mgolzyve";
import {
  Calculator,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  Home,
  Target,
  DollarSign,
  TrendingDown,
  Wallet,
  MessageSquare,
  Send,
  X,
  User,
  LogOut,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const calculatorItems = [
  { title: "Übersicht", url: createPageUrl("Home"), icon: Home },
  {
    title: "Fonds-Sparvertrag",
    url: createPageUrl("Calculator"),
    icon: Calculator,
  },
  {
    title: "Fonds-Einmalanlage",
    url: createPageUrl("SinglePaymentCalculator"),
    icon: DollarSign,
  },
  {
    title: "BestAdvice",
    url: createPageUrl("BestAdviceCalculator"),
    icon: Target,
  },
  {
    title: "Rentenlücke",
    url: createPageUrl("PensionGapCalculator"),
    icon: TrendingDown,
  },
  { title: "Entnahmeplan", url: createPageUrl("WithdrawalPlan"), icon: Wallet },
];

const resultItems = [
  { title: "Alle Ergebnisse", url: createPageUrl("Results"), icon: BarChart3 },
];

const profileItems = [
  { title: "Mein Profil", url: createPageUrl("Profile"), icon: User },
  { title: "Voreinstellungen", url: createPageUrl("Defaults"), icon: SlidersHorizontal },
  { title: "Premium", url: createPageUrl("Pricing"), icon: TrendingUp },
];

type Props = {
  children?: React.ReactNode;
};

const PAID_ONLY_URLS = [
  createPageUrl("BestAdviceCalculator"),
  createPageUrl("PensionGapCalculator"),
  createPageUrl("Defaults"),
];

export default function Layout({ children }: Props) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isPaid } = useSubscription();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("verbesserung");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setIsSending(true);
    setFeedbackError(false);

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          typ: feedbackType,
          nachricht: feedbackMessage,
          email: feedbackEmail,
        }),
      });

      if (!res.ok) throw new Error("Formspree error");

      setFeedbackMessage("");
      setFeedbackEmail("");
      setFeedbackType("verbesserung");
      setFeedbackSent(true);

      setTimeout(() => {
        setFeedbackSent(false);
        setShowFeedback(false);
      }, 2000);
    } catch {
      setFeedbackError(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SidebarProvider>
      {/* WICHTIG: h-screen + overflow-hidden -> NUR rechter Content scrollt */}
      <div className="h-screen w-full bg-slate-50 overflow-hidden flex">
        {/* Sidebar: sticky + volle Höhe, eigener Scroll */}
        <Sidebar className="border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col overflow-hidden print:hidden">
          <SidebarHeader className="border-b border-slate-100 p-6">
            <Link
              to={createPageUrl("Home")}
              className="hover:opacity-80 transition-opacity block"
            >
              <img src="/rentencheck-logo.svg" alt="RentenCheck" className="h-10 w-auto" />
            </Link>
          </SidebarHeader>

          {/* SidebarContent: scrollt, wenn nötig */}
          <SidebarContent className="p-3 overflow-y-auto flex-1">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Rechner
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {calculatorItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url
                            ? "bg-slate-100 text-slate-900 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium text-sm flex-1">
                            {item.title}
                          </span>
                          {!isPaid && PAID_ONLY_URLS.includes(item.url) && (
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Ergebnisse
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {resultItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url
                            ? "bg-slate-100 text-slate-900 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium text-sm">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Einstellungen
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {profileItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url
                            ? "bg-slate-100 text-slate-900 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium text-sm">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 space-y-3 shrink-0 overflow-y-auto max-h-[60vh]">
            {/* Nutzer-Info + Abmelden */}
            <div className="flex items-center gap-2 px-1">
              <span className="flex-1 text-xs text-slate-500 truncate min-w-0">{user?.email}</span>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-slate-500 hover:text-slate-900 px-2"
                onClick={() => signOut()}
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            {showFeedback ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-900">
                    Feedback
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFeedback(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verbesserung">Verbesserung</SelectItem>
                    <SelectItem value="wunschrechner">Wunschrechner</SelectItem>
                    <SelectItem value="fehler">Fehler</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Ihre Nachricht..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={3}
                  className="text-xs"
                />

                <Input
                  type="email"
                  placeholder="Ihre E-Mail-Adresse"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  className="h-8 text-xs"
                />

                {feedbackError && (
                  <p className="text-xs text-red-500">
                    Fehler beim Senden. Bitte später erneut versuchen.
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full bg-slate-800 hover:bg-slate-700"
                  onClick={handleSendFeedback}
                  disabled={isSending || !feedbackMessage.trim() || !feedbackEmail.trim()}
                >
                  {isSending ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : feedbackSent ? (
                    "✓ Gesendet!"
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-2" />
                      Absenden
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start text-slate-600 hover:text-slate-900"
                onClick={() => setShowFeedback(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedback & Wünsche
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Rechter Bereich: ebenfalls volle Höhe + nur hier scrollen */}
        <main className="flex-1 h-screen overflow-hidden flex flex-col">
          {/* Mobile Header bleibt optional – aber Content scrollt darunter */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 md:hidden shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200 shrink-0" />
              <img src="/rentencheck-logo.svg" alt="RentenCheck" className="h-8 w-auto" />
            </div>
          </header>

          {/* Hier wird gescrollt */}
          <div className="flex-1 overflow-y-auto print:overflow-visible">
            <style>{`
              :root {
                --color-primary: #1e293b;
                --color-primary-light: #334155;
                --color-accent: #3b82f6;
                --color-accent-light: #60a5fa;
                --color-success: #059669;
                --color-warning: #d97706;
                --color-error: #dc2626;
                --color-surface: #ffffff;
                --color-background: #f8fafc;
                --color-border: #e2e8f0;
                --color-text: #0f172a;
                --color-text-muted: #64748b;
              }
            `}</style>

            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
