import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, Clock, Upload, CreditCard, Zap, Calendar, Infinity,
  Copy, ExternalLink, ImageIcon, Loader2, AlertCircle, ArrowLeft,
} from "lucide-react";

const API = "/api";
function authH(token: string | null) { return token ? { Authorization: `Bearer ${token}` } : {}; }
function jsonH(token: string | null) { return { "Content-Type": "application/json", ...authH(token) }; }

type PaymentSettings = {
  monthly_price: number; yearly_price: number; lifetime_price: number;
  binance_account: string | null; binance_qr_url: string | null;
  nayapay_account: string | null; nayapay_qr_url: string | null;
};
type ExistingPayment = { id: number; plan: string; payment_method: string; status: string; created_at: string } | null;

const PLAN_CONFIG = {
  monthly:  { label: "Monthly",  icon: Calendar,  desc: "Billed every month",   badge: null },
  yearly:   { label: "Yearly",   icon: Zap,        desc: "Best value — save 33%", badge: "Most Popular" },
  lifetime: { label: "Lifetime", icon: Infinity,   desc: "Pay once, own forever", badge: "Best Deal" },
};

const METHOD_CONFIG = {
  binance:  { label: "Binance Pay",   color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
  nayapay:  { label: "NayaPay",       color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
};

export default function CommunityPaymentPage() {
  const [, params] = useRoute("/community-payment/:id");
  const communityId = parseInt(params?.id ?? "0", 10);
  const { token } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [settings, setSettings]       = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSL]      = useState(true);
  const [existingPayment, setEP]      = useState<ExistingPayment>(null);
  const [epLoading, setEPL]           = useState(true);

  const [step, setStep]               = useState<"plan" | "method" | "pay" | "done">("plan");
  const [selectedPlan, setPlan]       = useState<"monthly" | "yearly" | "lifetime" | null>(null);
  const [selectedMethod, setMethod]   = useState<"binance" | "nayapay" | null>(null);

  const [screenshotFile, setFile]     = useState<File | null>(null);
  const [screenshotPreview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/community-payments/settings`)
      .then(r => r.json()).then(d => { if (!d.error) setSettings(d); })
      .catch(() => {}).finally(() => setSL(false));
  }, []);

  useEffect(() => {
    if (!token || !communityId) return;
    setEPL(true);
    fetch(`${API}/community-payments/my/${communityId}`, { headers: authH(token) })
      .then(r => r.json()).then(d => { setEP(d); })
      .catch(() => {}).finally(() => setEPL(false));
  }, [token, communityId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!screenshotFile || !selectedPlan || !selectedMethod) return;
    setUploading(true);

    let screenshotUrl = "";
    try {
      const fd = new FormData();
      fd.append("file", screenshotFile);
      const upRes = await fetch(`${API}/upload`, { method: "POST", headers: authH(token), body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Upload failed");
      screenshotUrl = upData.url;
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }
    setUploading(false);
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/community-payments`, {
        method: "POST",
        headers: jsonH(token),
        body: JSON.stringify({
          community_id: communityId,
          plan: selectedPlan,
          payment_method: selectedMethod,
          screenshot_url: screenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setStep("done");
      setEP({ id: data.id, plan: selectedPlan, payment_method: selectedMethod, status: "pending", created_at: data.created_at });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (settingsLoading || epLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  // ── Already submitted ────────────────────────────────────────────────────
  if (existingPayment && step !== "done") {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto space-y-6">
          <button onClick={() => navigate("/create-community")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              {existingPayment.status === "approved" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold">Payment Approved!</h2>
                  <p className="text-sm text-muted-foreground">Your community is now live.</p>
                  <Button onClick={() => navigate(`/community/${communityId}`)}>Open Community</Button>
                </>
              ) : existingPayment.status === "rejected" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold">Payment Rejected</h2>
                  <p className="text-sm text-muted-foreground">Please resubmit with a valid payment screenshot.</p>
                  <Button onClick={() => { setEP(null); setStep("plan"); }}>Try Again</Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold">Payment Under Review</h2>
                  <p className="text-sm text-muted-foreground">
                    Your <strong>{existingPayment.plan}</strong> plan payment via <strong>{existingPayment.payment_method}</strong> is being verified by an admin.
                  </p>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending Verification</Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ── Done state ───────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold">Payment Submitted!</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Your screenshot has been sent for admin review. Your community will go live once the payment is verified.
              </p>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">Awaiting Verification</Badge>
              <div className="pt-2">
                <Button variant="outline" onClick={() => navigate("/create-community")}>View My Submissions</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const price = settings && selectedPlan ? settings[`${selectedPlan}_price` as keyof PaymentSettings] as number : 0;
  const accountKey = selectedMethod ? `${selectedMethod}_account` as keyof PaymentSettings : null;
  const qrKey = selectedMethod ? `${selectedMethod}_qr_url` as keyof PaymentSettings : null;
  const account = accountKey && settings ? settings[accountKey] as string | null : null;
  const qrUrl   = qrKey && settings ? settings[qrKey] as string | null : null;

  const hasMethod = (m: "binance" | "nayapay") =>
    settings ? !!(m === "binance" ? settings.binance_account || settings.binance_qr_url
                                  : settings.nayapay_account || settings.nayapay_qr_url) : false;

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/create-community")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />Complete Payment
            </h1>
            <p className="text-sm text-muted-foreground">Your community will go live after payment verification</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(["plan", "method", "pay"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                ${step === s ? "bg-primary text-white"
                  : (["plan","method","pay"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-muted text-muted-foreground")}`}>
                {["plan","method","pay"].indexOf(step) > i ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={step === s ? "text-foreground font-medium" : ""}>
                {s === "plan" ? "Choose Plan" : s === "method" ? "Payment Method" : "Pay & Upload"}
              </span>
              {i < 2 && <span className="mx-1">→</span>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Plan selection ── */}
        {step === "plan" && (
          <div className="space-y-3">
            {(["monthly", "yearly", "lifetime"] as const).map(plan => {
              const cfg = PLAN_CONFIG[plan];
              const Icon = cfg.icon;
              const priceVal = settings ? settings[`${plan}_price`] as number : 0;
              return (
                <button key={plan} onClick={() => setPlan(plan)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedPlan === plan
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        selectedPlan === plan ? "bg-primary/15" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${selectedPlan === plan ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{cfg.label}</span>
                          {cfg.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cfg.badge}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">${priceVal}</span>
                      {plan !== "lifetime" && <span className="text-xs text-muted-foreground">/{plan === "monthly" ? "mo" : "yr"}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            <Button className="w-full mt-2" disabled={!selectedPlan} onClick={() => setStep("method")}>
              Continue →
            </Button>
          </div>
        )}

        {/* ── STEP 2: Payment method ── */}
        {step === "method" && (
          <div className="space-y-3">
            {(["binance", "nayapay"] as const).map(m => {
              const cfg = METHOD_CONFIG[m];
              const available = hasMethod(m);
              return (
                <button key={m} onClick={() => available && setMethod(m)} disabled={!available}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    !available ? "opacity-40 cursor-not-allowed border-border" :
                    selectedMethod === m
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <CreditCard className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{cfg.label}</span>
                        {!available && <p className="text-xs text-muted-foreground">Not configured</p>}
                      </div>
                    </div>
                    {selectedMethod === m && <CheckCircle className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              );
            })}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("plan")}>← Back</Button>
              <Button className="flex-1" disabled={!selectedMethod} onClick={() => setStep("pay")}>Continue →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pay & upload ── */}
        {step === "pay" && selectedPlan && selectedMethod && (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium capitalize">{selectedPlan}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg text-primary">${price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">{METHOD_CONFIG[selectedMethod].label}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment details */}
            <Card className={`border ${METHOD_CONFIG[selectedMethod].bg}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Send payment to:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {account && (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Account / ID</p>
                      <p className="font-mono text-sm font-semibold">{account}</p>
                    </div>
                    <button onClick={() => copyToClipboard(account)}
                      className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {qrUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Scan QR Code</p>
                    <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border object-contain bg-white p-1" />
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Open full size <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Screenshot upload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />Upload Payment Screenshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {screenshotPreview ? (
                  <div className="relative">
                    <img src={screenshotPreview} alt="Screenshot preview" className="w-full rounded-lg border object-contain max-h-52" />
                    <button onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-accent/30 transition-all">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload payment screenshot</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP accepted</span>
                  </button>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("method")}>← Back</Button>
              <Button className="flex-1" disabled={!screenshotFile || uploading || submitting} onClick={handleSubmit}>
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                  : submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                  : "Submit Payment"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
