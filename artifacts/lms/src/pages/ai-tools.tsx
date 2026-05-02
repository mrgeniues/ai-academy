import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Plus, Trash2, ImageIcon, X, ExternalLink, Play, Clock, Pencil, Link2 } from "lucide-react";

type Tool = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  toolUrl: string | null;
  createdBy: number;
  createdAt: string;
};

type MyRequest = {
  id: number;
  toolId: number;
  isApproved: boolean;
};

const TOOLS_QK = ["tools"];
const MY_REQUESTS_QK = ["tool-requests-my"];

export default function AiToolsPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const authToken = token ?? localStorage.getItem("lms_token");

  // ── Data state ────────────────────────────────────────────────────────────
  const [tools, setTools] = useState<Tool[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<number | null>(null);

  // ── Create form ───────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editToolUrl, setEditToolUrl] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    const resp = await fetch("/api/tools", { headers: { Authorization: `Bearer ${authToken}` } });
    if (resp.ok) setTools(await resp.json() as Tool[]);
  }, [authToken]);

  const fetchMyRequests = useCallback(async () => {
    if (isAdmin) return;
    const resp = await fetch("/api/tool-requests/my", { headers: { Authorization: `Bearer ${authToken}` } });
    if (resp.ok) setMyRequests(await resp.json() as MyRequest[]);
  }, [authToken, isAdmin]);

  useEffect(() => {
    Promise.all([fetchTools(), fetchMyRequests()]).finally(() => setLoading(false));
  }, [fetchTools, fetchMyRequests]);

  const requestMap = new Map(myRequests.map(r => [r.toolId, r]));

  // ── Image upload helper ────────────────────────────────────────────────────
  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const resp = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: fd });
    if (!resp.ok) throw new Error("Image upload failed");
    const data = await resp.json() as { url: string };
    return data.url;
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const resetCreate = () => {
    setTitle(""); setDescription(""); setToolUrl(""); setVideoUrl("");
    setImageFile(null); setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const resp = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          imageUrl,
          videoUrl: videoUrl.trim() || null,
          toolUrl: toolUrl.trim() || null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to create");
      }
      const newTool = await resp.json() as Tool;
      setTools(prev => [newTool, ...prev]);
      queryClient.invalidateQueries({ queryKey: TOOLS_QK });
      setCreateOpen(false);
      resetCreate();
      toast({ title: "Tool created" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (t: Tool) => {
    setEditTool(t);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    setEditToolUrl(t.toolUrl ?? "");
    setEditVideoUrl(t.videoUrl ?? "");
    setEditImagePreview(t.imageUrl);
    setEditImageFile(null);
  };

  const handleEditSave = async () => {
    if (!editTool) return;
    if (!editTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setEditSaving(true);
    try {
      let imageUrl: string | null | undefined = undefined;
      if (editImageFile) imageUrl = await uploadImage(editImageFile);
      else if (editImagePreview === null) imageUrl = null;

      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        toolUrl: editToolUrl.trim() || null,
        videoUrl: editVideoUrl.trim() || null,
      };
      if (imageUrl !== undefined) body.imageUrl = imageUrl;

      const resp = await fetch(`/api/tools/${editTool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update");
      }
      const updated = await resp.json() as Tool;
      setTools(prev => prev.map(t => t.id === updated.id ? updated : t));
      setEditTool(null);
      toast({ title: "Tool updated" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (toolId: number) => {
    const resp = await fetch(`/api/tools/${toolId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (resp.ok || resp.status === 204) {
      setTools(prev => prev.filter(t => t.id !== toolId));
      toast({ title: "Tool deleted" });
    } else {
      toast({ title: "Failed to delete tool", variant: "destructive" });
    }
  };

  // ── Request access ─────────────────────────────────────────────────────────
  const handleRequest = async (toolId: number) => {
    setRequesting(toolId);
    try {
      const resp = await fetch(`/api/tools/${toolId}/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to request");
      }
      const data = await resp.json() as MyRequest;
      setMyRequests(prev => [...prev, { id: data.id, toolId: data.toolId, isApproved: data.isApproved }]);
      toast({ title: "Access requested! Wait for admin approval." });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setRequesting(null);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">AI Tools</h1>
              <p className="text-muted-foreground text-sm">Access powerful AI tools curated for you</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} size="sm" data-testid="button-create-tool">
              <Plus className="w-4 h-4 mr-1" /> Add Tool
            </Button>
          )}
        </div>

        {/* Tools grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-5"><Skeleton className="h-40 w-full rounded-lg mb-3" /><Skeleton className="h-4 w-2/3 mb-2" /><Skeleton className="h-3 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No AI tools yet</p>
            {isAdmin && <p className="text-sm mt-1">Click "Add Tool" to get started</p>}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {tools.map(tool => {
              const request = requestMap.get(tool.id);
              const hasRequested = !!request;
              const isApproved = request?.isApproved === true;
              const embedUrl = tool.videoUrl ? getYouTubeEmbed(tool.videoUrl) : null;

              return (
                <motion.div
                  key={tool.id}
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden flex flex-col h-full">
                    {/* Thumbnail / Video */}
                    {embedUrl ? (
                      <div className="relative aspect-video bg-black">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Play className="w-3 h-3" /> Preview
                          </Badge>
                        </div>
                      </div>
                    ) : tool.imageUrl ? (
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        <img src={tool.imageUrl} alt={tool.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <Wrench className="w-10 h-10 text-primary/30" />
                      </div>
                    )}

                    <CardContent className="pt-4 pb-4 flex flex-col flex-1 gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm leading-tight">{tool.title}</h3>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
                                navigator.clipboard.writeText(`${window.location.origin}${base}/tool/${tool.id}`);
                                toast({ title: "Link copied!" });
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy shareable link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openEdit(tool)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                  data-testid={`button-edit-tool-${tool.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(tool.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                  data-testid={`button-delete-tool-${tool.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-auto">
                        {isAdmin ? (
                          // Admin: just show the link directly
                          tool.toolUrl ? (
                            <a href={tool.toolUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-sm">
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Tool
                              </Button>
                            </a>
                          ) : (
                            <Button variant="outline" size="sm" className="flex-1 text-sm" disabled>
                              No link set
                            </Button>
                          )
                        ) : isApproved ? (
                          // Approved user: open tool
                          tool.toolUrl ? (
                            <a href={tool.toolUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button size="sm" className="w-full text-sm" data-testid={`button-open-tool-${tool.id}`}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Access Tool
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" className="flex-1 text-sm" disabled>Access Tool</Button>
                          )
                        ) : hasRequested ? (
                          // Pending approval
                          <Badge
                            variant="outline"
                            className="flex-1 justify-center py-1.5 text-xs border-amber-400 text-amber-600 dark:text-amber-400 gap-1"
                          >
                            <Clock className="w-3 h-3" /> Wait for admin approval
                          </Badge>
                        ) : (
                          // Not yet requested
                          <Button
                            size="sm"
                            className="flex-1 text-sm"
                            onClick={() => handleRequest(tool.id)}
                            disabled={requesting === tool.id}
                            data-testid={`button-access-tool-${tool.id}`}
                          >
                            {requesting === tool.id ? "Requesting…" : "Access Tool"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Create Tool Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); resetCreate(); } else setCreateOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New AI Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ChatGPT" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What this tool does…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Tool URL</Label>
              <Input value={toolUrl} onChange={e => setToolUrl(e.target.value)} placeholder="https://chat.openai.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Preview Video URL <span className="text-muted-foreground text-xs">(YouTube)</span></Label>
              <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail Image</Label>
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Click to upload image</span>
                </button>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); }} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setCreateOpen(false); resetCreate(); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Tool"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Tool Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!editTool} onOpenChange={open => { if (!open) setEditTool(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Tool URL</Label>
              <Input value={editToolUrl} onChange={e => setEditToolUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Preview Video URL <span className="text-muted-foreground text-xs">(YouTube)</span></Label>
              <Input value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail Image</Label>
              {editImagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                  <img src={editImagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setEditImageFile(null); setEditImagePreview(null); if (editImageInputRef.current) editImageInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => editImageInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Click to upload image</span>
                </button>
              )}
              <input ref={editImageInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; setEditImageFile(f); setEditImagePreview(URL.createObjectURL(f)); }} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTool(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
