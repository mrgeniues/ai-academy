import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Link2, ExternalLink, Play, Clock, Wrench } from "lucide-react";
import { YouTubePlayer, isYouTubeUrl } from "@/components/youtube-player";

const API = "/api";
function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Tool = {
  id: number; title: string; description: string | null;
  imageUrl: string | null; videoUrl: string | null; toolUrl: string | null;
  createdBy: number; createdAt: string;
};
type MyRequest = { id: number; toolId: number; isApproved: boolean };

export default function ToolDetailPage() {
  const [, params] = useRoute("/tool/:id");
  const toolId = parseInt(params?.id ?? "0", 10);
  const { user, token } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const authToken = token ?? localStorage.getItem("lms_token");

  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRequest, setMyRequest] = useState<MyRequest | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!toolId) return;
    Promise.all([
      fetch(`${API}/tools/${toolId}`, { headers: authHeaders(authToken) })
        .then(r => r.ok ? r.json() as Promise<Tool> : null),
      !isAdmin
        ? fetch(`${API}/tool-requests/my`, { headers: authHeaders(authToken) })
            .then(r => r.ok ? r.json() as Promise<MyRequest[]> : [])
        : Promise.resolve([]),
    ]).then(([toolData, requests]) => {
      setTool(toolData);
      if (Array.isArray(requests)) {
        const req = (requests as MyRequest[]).find(r => r.toolId === toolId) ?? null;
        setMyRequest(req);
      }
    }).finally(() => setLoading(false));
  }, [toolId, authToken, isAdmin]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`${API}/tools/${toolId}/request`, {
        method: "POST",
        headers: authHeaders(authToken),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to request");
      }
      const data = await res.json() as MyRequest;
      setMyRequest({ id: data.id, toolId: data.toolId, isApproved: data.isApproved });
      toast({ title: "Access requested! Wait for admin approval." });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setRequesting(false); }
  };

  const handleCopyLink = () => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    navigator.clipboard.writeText(`${window.location.origin}${base}/tool/${toolId}`);
    toast({ title: "Link copied!" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!tool) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
          <p className="text-muted-foreground">Tool not found.</p>
          <Link href="/ai-tools"><Button variant="outline">Back to AI Tools</Button></Link>
        </div>
      </Layout>
    );
  }

  const hasRequested = !!myRequest;
  const isApproved = myRequest?.isApproved === true;

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Back + Copy Link */}
        <div className="flex items-center justify-between">
          <Link href="/ai-tools">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to AI Tools
            </button>
          </Link>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Copy shareable link"
          >
            <Link2 className="w-4 h-4" /> Copy Link
          </button>
        </div>

        <Card className="overflow-hidden">
          {/* Media */}
          {tool.videoUrl && isYouTubeUrl(tool.videoUrl) ? (
            <YouTubePlayer url={tool.videoUrl} />
          ) : tool.imageUrl ? (
            <div className="aspect-video overflow-hidden bg-muted">
              <img src={tool.imageUrl} alt={tool.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Wrench className="w-16 h-16 text-primary/20" />
            </div>
          )}

          <CardContent className="pt-5 pb-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold">{tool.title}</h1>
              {tool.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{tool.description}</p>
              )}
            </div>

            {/* Access control */}
            <div className="pt-1">
              {isAdmin ? (
                tool.toolUrl ? (
                  <a href={tool.toolUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2">
                      <ExternalLink className="w-4 h-4" /> Open Tool
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full" disabled>No link set</Button>
                )
              ) : isApproved ? (
                tool.toolUrl ? (
                  <a href={tool.toolUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2">
                      <ExternalLink className="w-4 h-4" /> Access Tool
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full" disabled>Access Tool</Button>
                )
              ) : hasRequested ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-amber-600 dark:text-amber-400 border border-amber-400 rounded-lg">
                  <Clock className="w-4 h-4" /> Waiting for admin approval
                </div>
              ) : (
                <Button className="w-full" onClick={handleRequest} disabled={requesting}>
                  {requesting ? "Requesting…" : "Request Access"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
