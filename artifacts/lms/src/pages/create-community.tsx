import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Users2, Clock, CheckCircle, XCircle, CreditCard,
  ArrowRight, ArrowLeft, Users, Wrench, BookOpen, Tag, Check,
  Sparkles, BadgeCheck, Unlock,
} from "lucide-react";

const API = "/api";
function authH(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Plan = {
  id: number;
  name: string;
  price: number;
  max_communities: number;
  max_tools: number;
  max_courses: number;
  discount_percent: number;
  description: string | null;
};

type Community = {
  id: number;
  name: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  plans?: {
    id: number;
    name: string;
    price: number;
    max_communities: number;
    max_tools: number;
    max_courses: number;
  } | null;
};

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", icon: Clock,       className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
  approved: { label: "Approved",       icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
  rejected: { label: "Rejected",       icon: XCircle,     className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
};

type Step = "plan" | "details";

export default function CreateCommunityPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [step, setStep]                 = useState<Step>("plan");
  const [plans, setPlans]               = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loadingList, setLoadingList]     = useState(true);
  const [openedId, setOpenedId]           = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/plans`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPlans(d); })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/communities/mine`, { headers: authH(token) })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setMyCommunities(d); })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: "Community name is required", variant: "destructive" }); return; }
    if (!selectedPlan) { toast({ title: "Please select a plan first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH(token) },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, plan_id: selectedPlan.id }),
      });
      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok) { toast({ title: data.error ?? "Failed to submit", variant: "destructive" }); return; }
      toast({ title: "Community created!", description: "Complete your payment to activate it." });
      navigate(`/community-payment/${data.id}`);
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Split communities by status — rejected ones are hidden from the UI (auto-purged server-side after 24h)
  const approvedCommunities = myCommunities.filter(c => c.status === "approved");
  const otherCommunities    = myCommunities.filter(c => c.status === "pending");

  // If at least one community is approved, show the Active view instead of plan selection
  const hasApproved = approvedCommunities.length > 0;

  // ── ACTIVE COMMUNITY VIEW ────────────────────────────────────────────────
  if (!loadingList && hasApproved) {
    return (
      <Layout>
        <div className="p-6 max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Unlock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Community</h1>
              <p className="text-muted-foreground text-sm">Your plan is active — features are unlocked</p>
            </div>
          </div>

          {/* Approved community cards */}
          {approvedCommunities.map(c => {
            const plan = c.plans;
            const features = plan ? [
              { icon: Users,    label: "Communities",  value: plan.max_communities, unit: "community" },
              { icon: Wrench,   label: "AI Tools",     value: plan.max_tools,       unit: "tool" },
              { icon: BookOpen, label: "Courses",      value: plan.max_courses,     unit: "course" },
            ] : [];

            return (
              <div key={c.id} className="rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden bg-card">

                {/* Community header */}
                <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-b border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                        <Users2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg leading-tight">{c.name}</h2>
                        {c.description && <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {plan && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                              <Sparkles className="w-3 h-3" /> {plan.name} Plan · ${plan.price}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                            <BadgeCheck className="w-4 h-4" /> Payment Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/community-dashboard/${c.id}`)}>
                      Open Community <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Unlocked features */}
                {plan && (
                  <div className="p-5 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 text-green-500" /> Features Unlocked with {plan.name} Plan
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {features.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                          <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">{value}</span>
                          <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Feature checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { icon: Users,    text: `Create up to ${plan.max_communities} communit${plan.max_communities === 1 ? "y" : "ies"}` },
                        { icon: Wrench,   text: `Access up to ${plan.max_tools} AI tools` },
                        { icon: BookOpen, text: `Publish up to ${plan.max_courses} courses` },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-muted-foreground">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Inline community panel (shown when "Open Community" clicked) ── */}
                {openedId === c.id && (() => {
                  const plan = c.plans;
                  const maxSlots    = plan?.max_communities ?? 0;
                  const usedSlots   = myCommunities.filter(m => m.status !== "rejected").length;
                  const remaining   = Math.max(0, maxSlots - usedSlots);
                  const limitReached = remaining === 0;

                  return (
                    <div className="border-t border-green-200 dark:border-green-800 p-5 space-y-5 bg-muted/30">

                      {/* Plan usage bar */}
                      {plan && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-primary" /> Plan Usage
                            </span>
                            <span className="font-bold tabular-nums">
                              {usedSlots} / {maxSlots} Communities Used
                            </span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${limitReached ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${maxSlots > 0 ? Math.min(100, (usedSlots / maxSlots) * 100) : 0}%` }}
                            />
                          </div>
                          {limitReached ? (
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Community limit reached for your plan
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> You can create {remaining} more communit{remaining === 1 ? "y" : "ies"}
                            </p>
                          )}
                        </div>
                      )}

                      {/* All communities list */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All My Communities</p>

                        {/* Approved */}
                        {approvedCommunities.map(ac => (
                          <div key={ac.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{ac.name}</p>
                              {ac.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ac.description}</p>}
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          </div>
                        ))}

                        {/* Pending */}
                        {otherCommunities.map(oc => {
                          const cfg  = STATUS_CONFIG[oc.status] ?? STATUS_CONFIG.pending;
                          const Icon = cfg.icon;
                          return (
                            <div key={oc.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-card border">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{oc.name}</p>
                                {oc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{oc.description}</p>}
                              </div>
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.className}`}>
                                <Icon className="w-3 h-3" /> {cfg.label}
                              </span>
                            </div>
                          );
                        })}

                        {myCommunities.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-3">No communities yet.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Pending / rejected submissions */}
          {otherCommunities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Other Submissions</h2>
              <div className="space-y-2">
                {otherCommunities.map(c => {
                  const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <Card key={c.id} className="border">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                              {c.plans && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                                  <Sparkles className="w-2.5 h-2.5" /> Paid · {c.plans.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.className}`}>
                              <Icon className="w-3 h-3" />{cfg.label}
                            </span>
                            {c.status === "pending" && (
                              <button onClick={() => navigate(`/community-payment/${c.id}`)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <CreditCard className="w-3 h-3" /> Complete payment →
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── PLAN SELECTION / CREATION FLOW ───────────────────────────────────────
  return (
    <Layout>
      <div className={`p-6 mx-auto space-y-6 transition-all ${step === "plan" ? "max-w-5xl" : "max-w-2xl"}`}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Your Community</h1>
            <p className="text-muted-foreground text-sm">Choose a plan, then set up your community</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 text-xs">
          {(["plan", "details"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors
                ${step === s
                  ? "bg-primary text-primary-foreground"
                  : (step === "details" && s === "plan")
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"}`}>
                {step === "details" && s === "plan" ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`font-medium ${step === s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === "plan" ? "Choose Plan" : "Community Details"}
              </span>
              {i === 0 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Plan selection ── */}
        {step === "plan" && (
          <div className="space-y-6">
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
              </div>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No plans available yet. Please contact the admin.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((plan, idx) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const isPopular  = idx === 1;
                  const features   = [
                    `${plan.max_communities} communit${plan.max_communities === 1 ? "y" : "ies"}`,
                    `${plan.max_tools} tools`,
                    `${plan.max_courses} courses`,
                    ...(plan.description
                      ? plan.description.split("\n").filter(l => l.trim()).map(l => l.trim())
                      : []),
                  ];
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative flex flex-col rounded-2xl border p-6 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-primary ring-2 ring-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      {/* Paid pill */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm">
                          <Sparkles className="w-3 h-3" /> Paid
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-primary">{plan.name}</span>
                        {plan.discount_percent > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">{plan.discount_percent}% off</Badge>
                        )}
                      </div>

                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">one-time · secure payment</p>
                      </div>

                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className="w-full mb-5"
                        onClick={e => { e.stopPropagation(); setSelectedPlan(plan); }}
                      >
                        {isSelected ? <><Check className="w-4 h-4 mr-1.5" />Selected</> : "Select Plan"}
                      </Button>

                      <div className="border-t mb-4" />

                      <ul className="space-y-2.5 flex-1">
                        {features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            <Button className="w-full" disabled={!selectedPlan} onClick={() => setStep("details")} data-testid="button-continue-plan">
              Continue with {selectedPlan ? selectedPlan.name : "selected plan"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Community details ── */}
        {step === "details" && selectedPlan && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{selectedPlan.name} Plan</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPlan.max_communities} communit{selectedPlan.max_communities === 1 ? "y" : "ies"} · {selectedPlan.max_tools} tools · {selectedPlan.max_courses} courses
                </p>
              </div>
              <div className="text-right"><span className="text-lg font-bold">${selectedPlan.price}</span></div>
              <button onClick={() => setStep("plan")} className="ml-2 text-xs text-primary hover:underline flex-shrink-0">Change</button>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users2 className="w-4 h-4" /> Community Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="community-name">Community Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="community-name"
                      placeholder="e.g. AI Enthusiasts, Python Learners…"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      maxLength={100}
                      data-testid="input-community-name"
                    />
                    <p className="text-xs text-muted-foreground text-right">{name.length}/100</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="community-description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea
                      id="community-description"
                      placeholder="What is this community about?"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      data-testid="input-community-description"
                    />
                    <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>After submission you'll be taken to the payment page. Your community goes live once payment is verified.</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("plan")}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting || !name.trim()} data-testid="button-submit-community">
                      {submitting ? "Creating…" : "Create & Pay →"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending / rejected submissions */}
        {!loadingList && otherCommunities.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Submissions</h2>
            <div className="space-y-2">
              {otherCommunities.map(c => {
                const cfg  = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <Card key={c.id} className="border">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                            {c.plans && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                                <Sparkles className="w-2.5 h-2.5" /> Paid · {c.plans.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.className}`}>
                            <Icon className="w-3 h-3" />{cfg.label}
                          </span>
                          {c.status === "pending" && (
                            <button onClick={() => navigate(`/community-payment/${c.id}`)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                              <CreditCard className="w-3 h-3" /> Complete payment →
                            </button>
                          )}
                          {c.status === "approved" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                              <BadgeCheck className="w-3.5 h-3.5" /> Payment verified
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading skeleton for submissions */}
        {loadingList && (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
