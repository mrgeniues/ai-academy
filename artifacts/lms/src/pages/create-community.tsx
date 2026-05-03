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
  ArrowRight, ArrowLeft, Users, Wrench, BookOpen, Tag, Check, Sparkles, BadgeCheck,
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
  plans?: { name: string; price: number } | null;
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

  const [name, setName]                 = useState("");
  const [description, setDescription]   = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loadingList, setLoadingList]     = useState(true);

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
        body: JSON.stringify({
          name:        name.trim(),
          description: description.trim() || null,
          plan_id:     selectedPlan.id,
        }),
      });
      const data = await res.json() as { id?: number; error?: string; code?: string };
      if (!res.ok) {
        toast({ title: data.error ?? "Failed to submit", variant: "destructive" });
        return;
      }
      toast({ title: "Community created!", description: "Complete your payment to activate it." });
      navigate(`/community-payment/${data.id}`);
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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
                  const isPopular = idx === 1;
                  const features = [
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
                      {/* Most Popular badge */}
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      {/* Paid pill — top right corner */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm">
                          <Sparkles className="w-3 h-3" /> Paid
                        </span>
                      </div>

                      {/* Plan name + discount */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                          {plan.name}
                        </span>
                        {plan.discount_percent > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {plan.discount_percent}% off
                          </Badge>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">one-time · secure payment</p>
                      </div>

                      {/* Select button */}
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className="w-full mb-5"
                        onClick={e => { e.stopPropagation(); setSelectedPlan(plan); }}
                      >
                        {isSelected
                          ? <><Check className="w-4 h-4 mr-1.5" />Selected</>
                          : "Select Plan"
                        }
                      </Button>

                      {/* Divider */}
                      <div className="border-t mb-4" />

                      {/* Feature list */}
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

            <Button
              className="w-full"
              disabled={!selectedPlan}
              onClick={() => setStep("details")}
              data-testid="button-continue-plan"
            >
              Continue with {selectedPlan ? selectedPlan.name : "selected plan"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Community details ── */}
        {step === "details" && selectedPlan && (
          <div className="space-y-4">
            {/* Selected plan summary */}
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
              <div className="text-right">
                <span className="text-lg font-bold">${selectedPlan.price}</span>
              </div>
              <button
                onClick={() => setStep("plan")}
                className="ml-2 text-xs text-primary hover:underline flex-shrink-0"
              >
                Change
              </button>
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
                    <Label htmlFor="community-name">
                      Community Name <span className="text-destructive">*</span>
                    </Label>
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
                    <Label htmlFor="community-description">
                      Description <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
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
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep("plan")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={submitting || !name.trim()}
                      data-testid="button-submit-community"
                    >
                      {submitting ? "Creating…" : "Create & Pay →"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My submissions */}
        {myCommunities.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Submissions</h2>
            {loadingList ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : (
              <div className="space-y-2">
                {myCommunities.map(c => {
                  const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <Card key={c.id} className="border">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            {c.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>
                            )}
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
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                            {c.status === "pending" && (
                              <button
                                onClick={() => navigate(`/community-payment/${c.id}`)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
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
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
