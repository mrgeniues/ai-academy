import { useState, useEffect } from "react";
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
import { Users2, Clock, CheckCircle, XCircle } from "lucide-react";

const API = "/api";

type Community = {
  id: number;
  name: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", icon: Clock,         className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
  approved: { label: "Approved",       icon: CheckCircle,   className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
  rejected: { label: "Rejected",       icon: XCircle,       className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
};

export default function CreateCommunityPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loadingList, setLoadingList]     = useState(true);

  const fetchMine = async () => {
    try {
      const res = await fetch(`${API}/communities/mine`, { headers: authHeaders(token) });
      if (res.ok) setMyCommunities(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchMine(); }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: "Community name is required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Failed to submit", variant: "destructive" }); return; }

      toast({ title: "Community submitted!", description: "Your request is pending admin approval." });
      setName("");
      setDescription("");
      setSubmitted(true);
      setMyCommunities(prev => [data, ...prev]);
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Your Community</h1>
            <p className="text-muted-foreground text-sm">Submit a community for admin review</p>
          </div>
        </div>

        {/* Create form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Community Details</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="font-semibold text-lg">Request Submitted!</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Your community is pending admin approval. You'll be notified once it's reviewed.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                  Submit Another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="community-name">Community Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="community-name"
                    placeholder="e.g. AI Enthusiasts, Python Learners..."
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
                    rows={4}
                    maxLength={1000}
                    data-testid="input-community-description"
                  />
                  <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Your community will be reviewed by an admin before it goes live.</span>
                </div>

                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-community">
                  {submitting ? "Submitting..." : "Submit Community"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* My previous communities */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Submissions</h2>

          {loadingList ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : myCommunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No submissions yet.</p>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.className}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
