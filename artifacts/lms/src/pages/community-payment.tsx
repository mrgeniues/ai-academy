import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, Clock, Upload, CreditCard, Copy, ExternalLink,
  ImageIcon, Loader2, AlertCircle, ArrowLeft, Tag, Users,
  Wrench, BookOpen, Percent,
} from "lucide-react";

const API = "/api";
function authH(token: string | null) { return token ? { Authorization: `Bearer ${token}` } : {}; }
function jsonH(token: string | null) { return { "Content-Type": "application/json", ...authH(token) }; }

type Plan = {
  id: number; name: string; price: number;
  max_communities: number; max_tools: number; max_courses: number;
};

type Community = {
  id: number; name: string; description: string | null;
  status: string; plan_id: number | null;
  plans: Plan | null;
};

type PaymentSettings = {
  binance_account: string | null; binance_qr_url: string | null;
  nayapay_account: string | null; nayapay_qr_url: string | null;
};

type CouponValidation = { id: number; code: string; discount_percent: number; valid: boolean } | null;
type ExistingPayment = {
  id: number; plan: string | null; plan_id: number | null;
  payment_method: string; status: string; created_at: string;
  final_price: number | null;
  plans: Plan | null;
} | null;

const METHOD_CONFIG = {
  binance:  { label: "Binance Pay",  color: "text-yellow-600",  bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
  nayapay:  { label: "NayaPay",      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
};

type Step = "coupon" | "method" | "pay" | "done";

export default function CommunityPaymentPage() {
  const [, params]   = useRoute("/community-payment/:id");
  const communityId  = parseInt(params?.id ?? "0", 10);
  const { token }    = useAuth();
  const { toast }    = useToast();
  const [, navigate] = useLocation();

  const [community, setCommunity]           = useState<Community | null>(null);
  const [communityLoading, setCL]           = useState(true);
  const [settings, setSettings]             = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSL]            = useState(true);
  const [existingPayment, setEP]            = useState<ExistingPayment>(null);
  const [epLoading, setEPL]                 = useState(true);

  const [step, setStep]                     = useState<Step>("coupon");
  const [selectedMethod, setMethod]         = useState<"binance" | "nayapay" | null>(null);

  const [couponCode, setCouponCode]         = useState("");
  const [couponValidating, setCouponVal]    = useState(false);
  const [coupon, setCoupon]                 = useState<CouponValidation>(null);
  const [couponError, setCouponError]       = useState<string | null>(null);

  const [screenshotFile, setFile]           = useState<File | null>(null);
  const [screenshotPreview, setPreview]     = useState<string | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch community + plan info
  useEffect(() => {
    if (!token || !communityId) return;
    fetch(`${API}/communities/mine`, { headers: authH(token) })
      .then(r => r.json())
      .then((list: Community[]) => {
        const c = list.find(x => x.id === communityId) ?? null;
        setCommunity(c);
      })
      .catch(() => {})
      .finally(() => setCL(false));
  }, [token, communityId]);

  // Fetch payment settings (binance/nayapay info)
  useEffect(() => {
    fetch(`${API}/community-payments/settings`)
      .then(r => r.json())
      .then(d => { if (!d.error) setSettings(d); })
      .catch(() => {})
      .finally(() => setSL(false));
  }, []);

  // Check for existing payment
  useEffect(() => {
    if (!token || !communityId) return;
    setEPL(true);
    fetch(`${API}/community-payments/my/${communityId}`, { headers: authH(token) })
      .then(r => r.json())
      .then(d => setEP(d ?? null))
      .catch(() => {})
      .finally(() => setEPL(false));
  }, [token, communityId]);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !community?.plan_id) return;
    setCouponVal(true);
    setCouponError(null);
    setCoupon(null);
    try {
      const res = await fetch(`${API}/coupons/validate`, {
        method: "POST",
        headers: jsonH(token),
        body: JSON.stringify({ code: couponCode.trim(), plan_id: community.plan_id }),
      });
      const d = await res.json() as { error?: string; id?: number; code?: string; discount_percent?: number; valid?: boolean };
      if (!res.ok) { setCouponError(d.error ?? "Invalid coupon"); return; }
      setCoupon({ id: d.id!, code: d.code!, discount_percent: d.discount_percent!, valid: true });
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponVal(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else setPreview(null);
  };

  const handleSubmit = async () => {
    if (!screenshotFile || !selectedMethod) return;
    const plan = community?.plans;
    setUploading(true);

    let screenshotUrl = "";
    try {
      const fd = new FormData();
      fd.append("file", screenshotFile);
      const upRes = await fetch(`${API}/upload`, { method: "POST", headers: authH(token), body: fd });
      const upData = await upRes.json() as { url?: string; error?: string };
      if (!upRes.ok) throw new Error(upData.error ?? "Upload failed");
      screenshotUrl = upData.url!;
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }
    setUploading(false);
    setSubmitting(true);

    const basePrice       = plan?.price ?? 0;
    const discountAmount  = coupon ? (basePrice * coupon.discount_percent) / 100 : 0;
    const finalPrice      = Math.max(0, basePrice - discountAmount);

    try {
      const res = await fetch(`${API}/community-payments`, {
        method: "POST",
        headers: jsonH(token),
        body: JSON.stringify({
          community_id:    communityId,
          plan:            plan?.name ?? "custom",
          plan_id:         community?.plan_id ?? null,
          coupon_id:       coupon?.id ?? null,
          payment_method:  selectedMethod,
          screenshot_url:  screenshotUrl,
          final_price:     finalPrice,
          discount_amount: discountAmount,
        }),
      });
      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setStep("done");
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Submission failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast({ title: "Copied!" });
  };

  const isLoading = communityLoading || settingsLoading || epLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  const plan         = community?.plans ?? null;
  const basePrice    = plan?.price ?? 0;
  const discount     = coupon ? (basePrice * coupon.discount_percent) / 100 : 0;
  const finalPrice   = Math.max(0, basePrice - discount);

  const account = selectedMethod ? (selectedMethod === "binance" ? settings?.binance_account : settings?.nayapay_account) ?? null : null;
  const qrUrl   = selectedMethod ? (selectedMethod === "binance" ? settings?.binance_qr_url  : settings?.nayapay_qr_url)  ?? null : null;
  const hasMethod = (m: "binance" | "nayapay") =>
    m === "binance"
      ? !!(settings?.binance_account || settings?.binance_qr_url)
      : !!(settings?.nayapay_account || settings?.nayapay_qr_url);

  const STEPS: Step[] = ["coupon", "method", "pay"];
  const STEP_LABELS: Record<Step, string> = { coupon: "Coupon", method: "Payment Method", pay: "Pay & Upload", done: "" };

  // ── Already submitted or approved ────────────────────────────────────────
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
                  <Button onClick={() => { setEP(null); setStep("coupon"); }}>Try Again</Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold">Payment Under Review</h2>
                  <p className="text-sm text-muted-foreground">
                    Your <strong>{existingPayment.plans?.name ?? existingPayment.plan ?? "plan"}</strong> payment
                    via <strong>{existingPayment.payment_method}</strong> is being verified.
                    {existingPayment.final_price != null && (
                      <span> Amount: <strong>${existingPayment.final_price.toFixed(2)}</strong></span>
                    )}
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

  // ── Done state ────────────────────────────────────────────────────────────
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
                Your screenshot is under admin review. Your community will go live once verified.
              </p>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">Awaiting Verification</Badge>
              <div className="pt-2">
                <Button variant="outline" onClick={() => navigate("/create-community")}>Back to My Communities</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
              <CreditCard className="w-5 h-5 text-primary" /> Complete Payment
            </h1>
            <p className="text-sm text-muted-foreground">Your community goes live after payment verification</p>
          </div>
        </div>

        {/* Plan summary card */}
        {plan && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{plan.name} Plan</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{plan.max_communities} communit{plan.max_communities === 1 ? "y" : "ies"}</span>
                <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{plan.max_tools} tools</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{plan.max_courses} courses</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold">${basePrice.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors
                ${step === s ? "bg-primary text-primary-foreground"
                  : STEPS.indexOf(step) > i ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"}`}>
                {STEPS.indexOf(step) > i ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={step === s ? "text-foreground font-medium" : ""}>{STEP_LABELS[s]}</span>
              {i < STEPS.length - 1 && <span className="mx-1">→</span>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Coupon ── */}
        {step === "coupon" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Apply Coupon (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCoupon(null); setCouponError(null); }}
                    className="font-mono uppercase"
                    data-testid="input-coupon-code"
                  />
                  <Button
                    variant="outline"
                    onClick={validateCoupon}
                    disabled={!couponCode.trim() || couponValidating || !community?.plan_id}
                    data-testid="button-apply-coupon"
                  >
                    {couponValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>

                {coupon && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      {coupon.code} — {coupon.discount_percent}% off applied!
                    </span>
                    <button
                      onClick={() => { setCoupon(null); setCouponCode(""); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}

                {plan && (
                  <div className="border-t pt-3 space-y-1.5 text-sm">
                    <Label className="text-xs text-muted-foreground">Price Summary</Label>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base price</span>
                      <span>${basePrice.toFixed(2)}</span>
                    </div>
                    {coupon && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount ({coupon.discount_percent}%)</span>
                        <span>−${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1.5">
                      <span>Total</span>
                      <span>${finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => setStep("method")} data-testid="button-continue-coupon">
              Continue → Payment Method
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
                <button
                  key={m}
                  onClick={() => available && setMethod(m)}
                  disabled={!available}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    !available ? "opacity-40 cursor-not-allowed border-border"
                      : selectedMethod === m
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
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
              <Button variant="outline" className="flex-1" onClick={() => setStep("coupon")}>← Back</Button>
              <Button className="flex-1" disabled={!selectedMethod} onClick={() => setStep("pay")}>Continue →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pay & upload ── */}
        {step === "pay" && selectedMethod && (
          <div className="space-y-4">
            {/* Payment summary */}
            <Card>
              <CardContent className="pt-4 pb-3 space-y-2.5">
                {plan && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                )}
                {coupon && (
                  <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Coupon ({coupon.code})</span>
                    <span>−${discount.toFixed(2)} ({coupon.discount_percent}%)</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground font-medium">Total</span>
                  <span className="font-bold text-lg text-primary">${finalPrice.toFixed(2)}</span>
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
                <CardTitle className="text-sm">Send ${finalPrice.toFixed(2)} to:</CardTitle>
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
                {!account && !qrUrl && (
                  <p className="text-sm text-muted-foreground">Payment details not configured. Contact admin.</p>
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
                    <img src={screenshotPreview} alt="Screenshot" className="w-full rounded-lg border object-contain max-h-52" />
                    <button
                      onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
              <Button
                className="flex-1"
                disabled={!screenshotFile || uploading || submitting}
                onClick={handleSubmit}
                data-testid="button-submit-payment"
              >
                {uploading   ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
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
