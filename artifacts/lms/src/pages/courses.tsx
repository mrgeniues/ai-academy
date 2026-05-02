import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useListCourses, useListMyEnrollments, useEnrollInCourse, getListCoursesQueryKey, getListMyEnrollmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, Plus, GraduationCap, Lock, Globe, Trash2, ImageIcon, X, MessageCircle, Link as LinkIcon, Pencil, Zap, Clock } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";


type CourseWithExtras = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  externalUrl?: string | null;
  visibility?: string;
  enrollmentMode?: "open" | "approval_required";
  lessonCount: number;
  enrollmentCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

type LessonDraft = { title: string; description: string; videoUrl: string };

const emptyLesson = (): LessonDraft => ({ title: "", description: "", videoUrl: "" });

export default function CoursesPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [privateAlertCourse, setPrivateAlertCourse] = useState<CourseWithExtras | null>(null);
  const [pendingAlertCourse, setPendingAlertCourse] = useState<CourseWithExtras | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [lessonDrafts, setLessonDrafts] = useState<LessonDraft[]>([emptyLesson()]);
  const [enrollmentMode, setEnrollmentMode] = useState<"open" | "approval_required">("approval_required");
  const [creating, setCreating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editCourse, setEditCourse] = useState<CourseWithExtras | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExternalUrl, setEditExternalUrl] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("public");
  const [editEnrollmentMode, setEditEnrollmentMode] = useState<"open" | "approval_required">("approval_required");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const { data: courses, isLoading: coursesLoading } = useListCourses({
    query: { queryKey: getListCoursesQueryKey() }
  });
  const { data: enrollments } = useListMyEnrollments({
    query: { queryKey: getListMyEnrollmentsQueryKey() }
  });
  const enrollMutation = useEnrollInCourse();

  type EnrollmentRow = { courseId: number; progress: number; isApproved?: boolean };
  const enrolledIds = new Set<number>((enrollments as EnrollmentRow[] ?? []).map(e => e.courseId));
  const approvedIds = new Set<number>((enrollments as EnrollmentRow[] ?? []).filter(e => e.isApproved !== false).map(e => e.courseId));
  const progressMap = new Map<number, number>((enrollments as EnrollmentRow[] ?? []).map(e => [e.courseId, e.progress] as [number, number]));

  const isAdmin = user?.role === "admin";

  // ── Enrollment type filter (persisted in URL query string) ───────────────
  const validFilters = ["all", "open", "approval_required"] as const;
  type FilterValue = typeof validFilters[number];
  const rawFilter = new URLSearchParams(search).get("filter") ?? "all";
  const enrollmentFilter: FilterValue = (validFilters as readonly string[]).includes(rawFilter)
    ? (rawFilter as FilterValue)
    : "all";
  const setEnrollmentFilter = (value: FilterValue) => {
    const params = new URLSearchParams(search);
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    const qs = params.toString();
    setLocation(`/courses${qs ? `?${qs}` : ""}`, { replace: false });
  };

  // ── Sort (persisted in URL query string) ─────────────────────────────────
  const validSorts = ["newest", "most_enrolled", "az"] as const;
  type SortValue = typeof validSorts[number];
  const rawSort = new URLSearchParams(search).get("sort") ?? "newest";
  const sortValue: SortValue = (validSorts as readonly string[]).includes(rawSort)
    ? (rawSort as SortValue)
    : "newest";
  const setSortValue = (value: SortValue) => {
    const params = new URLSearchParams(search);
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const qs = params.toString();
    setLocation(`/courses${qs ? `?${qs}` : ""}`, { replace: false });
  };

  const sortCourses = (list: CourseWithExtras[]): CourseWithExtras[] => {
    const copy = [...list];
    if (sortValue === "az") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortValue === "most_enrolled") {
      copy.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return copy;
  };

  // ── Create form helpers ──────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setDescription(""); setImageFile(null); setImagePreview(null); setExternalUrl("");
    setVisibility("public"); setEnrollmentMode("approval_required"); setLessonDrafts([emptyLesson()]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const addLessonDraft = () => setLessonDrafts(d => [...d, emptyLesson()]);
  const removeLessonDraft = (i: number) => setLessonDrafts(d => d.filter((_, idx) => idx !== i));
  const updateLessonDraft = (i: number, field: keyof LessonDraft, value: string) =>
    setLessonDrafts(d => d.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleCreate = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!description.trim()) { toast({ title: "Description is required", variant: "destructive" }); return; }
    const validLessons = lessonDrafts.filter(l => l.title.trim());

    setCreating(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");

      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadResp = await fetch(`/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: fd,
        });
        if (!uploadResp.ok) {
          const errData = await uploadResp.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? `Failed to upload image (${uploadResp.status})`);
        }
        const uploadData = await uploadResp.json() as { url: string };
        uploadedImageUrl = uploadData.url;
      }

      const resp = await fetch(`/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          thumbnail: uploadedImageUrl,
          externalUrl: externalUrl.trim() || null,
          visibility,
          enrollmentMode,
          lessons: validLessons.map(l => ({
            title: l.title.trim(),
            description: l.description.trim() || null,
            videoUrl: l.videoUrl.trim() || null,
          })),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to create course");
      }
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Course created successfully" });
    } catch (err) {
      toast({ title: (err as Error).message ?? "Failed to create course", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // ── Edit dialog helpers ──────────────────────────────────────────────────
  const openEditDialog = (course: CourseWithExtras) => {
    setEditCourse(course);
    setEditTitle(course.title);
    setEditDescription(course.description ?? "");
    setEditExternalUrl(course.externalUrl ?? "");
    setEditVisibility((course.visibility as "public" | "private") ?? "public");
    setEditEnrollmentMode(course.enrollmentMode ?? "approval_required");
    setEditImageFile(null);
    setEditImagePreview(course.thumbnail ?? null);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const clearEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview(null);
    if (editImageInputRef.current) editImageInputRef.current.value = "";
  };

  const handleEditSave = async () => {
    if (!editCourse) return;
    if (!editTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }

    setEditSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");

      let thumbnailUrl: string | null | undefined = undefined;
      if (editImageFile) {
        const fd = new FormData();
        fd.append("file", editImageFile);
        const uploadResp = await fetch(`/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: fd,
        });
        if (!uploadResp.ok) {
          const errData = await uploadResp.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? `Failed to upload image (${uploadResp.status})`);
        }
        const uploadData = await uploadResp.json() as { url: string };
        thumbnailUrl = uploadData.url;
      } else if (editImagePreview === null) {
        thumbnailUrl = null;
      }

      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        externalUrl: editExternalUrl.trim() || null,
        visibility: editVisibility,
        enrollmentMode: editEnrollmentMode,
      };
      if (thumbnailUrl !== undefined) body.thumbnail = thumbnailUrl;

      const resp = await fetch(`/api/courses/${editCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update course");
      }

      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      setEditCourse(null);
      toast({ title: "Course updated successfully" });
    } catch (err) {
      toast({ title: (err as Error).message ?? "Failed to update course", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Enroll / private-click ───────────────────────────────────────────────
  const handleEnroll = async (courseId: number) => {
    try {
      await enrollMutation.mutateAsync({ data: { courseId } });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      toast({ title: "Enrolled successfully!" });
    } catch {
      toast({ title: "Already enrolled or error", variant: "destructive" });
    }
  };

  const handleCourseClick = (course: CourseWithExtras) => {
    if (course.visibility === "private" && user?.role !== "admin") {
      setPrivateAlertCourse(course);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Courses</h1>
            <p className="text-muted-foreground text-sm mt-1">Browse and enroll in available courses</p>
          </div>
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-course" className="gap-2">
                  <Plus className="w-4 h-4" /> Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div className="space-y-3">
                    <div>
                      <Label>Title <span className="text-destructive">*</span></Label>
                      <Input className="mt-1" placeholder="Course title" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>Description <span className="text-destructive">*</span></Label>
                      <Textarea className="mt-1" placeholder="What will students learn?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                    </div>
                    <div>
                      <Label>Course Image</Label>
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      {imagePreview ? (
                        <div className="mt-1 relative w-full h-36 rounded-lg overflow-hidden border border-border">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-1 w-full h-28 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-sm font-medium">Click to upload image</span>
                          <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                        </button>
                      )}
                    </div>
                    <div>
                      <Label>External URL</Label>
                      <Input className="mt-1" placeholder="https://external-resource.com" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
                    </div>
                    <div>
                      <Label>Visibility</Label>
                      <Select value={visibility} onValueChange={(v: "public" | "private") => setVisibility(v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Public — anyone can enroll</span></SelectItem>
                          <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Private — contact admin to access</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Enrollment Mode</Label>
                      <Select value={enrollmentMode} onValueChange={(v: "open" | "approval_required") => setEnrollmentMode(v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open — students are enrolled immediately</SelectItem>
                          <SelectItem value="approval_required">Requires Approval — admin must approve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Lessons ({lessonDrafts.length})</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLessonDraft} className="gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add Lesson
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {lessonDrafts.map((lesson, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-2 relative bg-muted/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-muted-foreground">Lesson {i + 1}</span>
                            {lessonDrafts.length > 1 && (
                              <button onClick={() => removeLessonDraft(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <Input placeholder="Lesson title *" value={lesson.title} onChange={e => updateLessonDraft(i, "title", e.target.value)} />
                          <Textarea placeholder="Lesson description" value={lesson.description} onChange={e => updateLessonDraft(i, "description", e.target.value)} rows={2} />
                          <Input placeholder="Video URL (YouTube, Vimeo, etc.)" value={lesson.videoUrl} onChange={e => updateLessonDraft(i, "videoUrl", e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create Course"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Enrollment type filter + sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium mr-1">Filter:</span>
            {(
              [
                { value: "all", label: "All Courses" },
                { value: "open", label: "Instant Access" },
                { value: "approval_required", label: "Approval Required" },
              ] as { value: "all" | "open" | "approval_required"; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                data-testid={`filter-enrollment-${value}`}
                onClick={() => setEnrollmentFilter(value)}
                className={[
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  enrollmentFilter === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {value === "open" && <Zap className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                {value === "approval_required" && <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground font-medium">Sort:</span>
            <Select value={sortValue} onValueChange={(v) => setSortValue(v as SortValue)}>
              <SelectTrigger data-testid="select-sort" className="h-8 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_enrolled">Most Enrolled</SelectItem>
                <SelectItem value="az">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Course grid */}
        {coursesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-0"><Skeleton className="h-44 w-full" /><div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div></CardContent></Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (() => {
          const filteredCourses = sortCourses(
            (courses as CourseWithExtras[]).filter(course =>
              enrollmentFilter === "all" || course.enrollmentMode === enrollmentFilter
            )
          );
          return filteredCourses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No courses match this filter</p>
              <p className="text-sm mt-1">
                <button onClick={() => setEnrollmentFilter("all")} className="text-primary underline underline-offset-2">
                  Show all courses
                </button>
              </p>
            </div>
          ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {filteredCourses.map(course => {
              const isEnrolled = enrolledIds.has(course.id);
              const progress = progressMap.get(course.id) ?? 0;
              const isPrivate = course.visibility === "private";
              const canAccess = !isPrivate || isAdmin;
              const showLink = course.externalUrl && (isEnrolled || isAdmin);

              return (
                <motion.div
                  key={course.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "tween", duration: 0.2 }}
                >
                <Card data-testid={`card-course-${course.id}`} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {/* Thumbnail */}
                  <div className="relative">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {isPrivate ? (
                        <Badge variant="destructive" className="gap-1 text-xs"><Lock className="w-3 h-3" /> Private</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Globe className="w-3 h-3" /> Public</Badge>
                      )}
                    </div>
                    {/* Admin edit button — top-left of thumbnail */}
                    {isAdmin && (
                      <button
                        onClick={() => openEditDialog(course)}
                        className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 hover:bg-primary text-white transition-colors"
                        title="Edit course"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3 flex flex-col flex-1">
                    <div>
                      <h3 className="font-semibold text-base leading-tight">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessonCount} lessons</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentCount} enrolled</span>
                      {showLink && (
                        <a href={course.externalUrl!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline ml-auto">
                          <LinkIcon className="w-3 h-3" /> Link
                        </a>
                      )}
                    </div>

                    {/* Progress */}
                    {isEnrolled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}% completed</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Enrollment mode indicator — only for non-admin, unenrolled students on public courses */}
                    {canAccess && !isEnrolled && !isAdmin && (
                      course.enrollmentMode === "open" ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Instant Access</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Approval Required</span>
                        </div>
                      )
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      {canAccess && isEnrolled && !approvedIds.has(course.id) && !isAdmin ? (
                        <Button
                          data-testid={`button-view-course-${course.id}`}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-sm"
                          onClick={() => setPendingAlertCourse(course)}
                        >
                          <Clock className="w-3 h-3 mr-1" /> View Course
                        </Button>
                      ) : canAccess ? (
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button data-testid={`button-view-course-${course.id}`} variant="outline" className="w-full text-sm" size="sm">
                            View Course
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          data-testid={`button-view-course-${course.id}`}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-sm"
                          onClick={() => handleCourseClick(course)}
                        >
                          <Lock className="w-3 h-3 mr-1" /> View Course
                        </Button>
                      )}
                      {canAccess && !isEnrolled && (
                        <Button
                          data-testid={`button-enroll-${course.id}`}
                          size="sm"
                          className="flex-1 text-sm"
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollMutation.isPending}
                        >
                          Enroll Free
                        </Button>
                      )}
                      {isEnrolled && approvedIds.has(course.id) && (
                        <Badge variant="secondary" className="px-3 text-xs flex items-center gap-1">✓ Enrolled</Badge>
                      )}
                      {isEnrolled && !approvedIds.has(course.id) && !isAdmin && (
                        <Badge variant="outline" className="px-3 text-xs flex items-center gap-1 border-amber-400 text-amber-600 dark:text-amber-400">
                          ⏳ Pending Approval
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              );
            })}
          </motion.div>
          );
        })() : (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No courses yet</p>
            {isAdmin && <p className="text-sm mt-1">Create your first course using the button above</p>}
          </div>
        )}
      </div>

      {/* ── Edit Course Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editCourse} onOpenChange={v => { if (!v) setEditCourse(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> Edit Course
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input className="mt-1" placeholder="Course title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" placeholder="What will students learn?" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Course Image</Label>
              <input ref={editImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageSelect} />
              {editImagePreview ? (
                <div className="mt-1 relative w-full h-36 rounded-lg overflow-hidden border border-border">
                  <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={clearEditImage} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => editImageInputRef.current?.click()} className="mt-1 w-full h-28 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-sm font-medium">Click to upload new image</span>
                  <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                </button>
              )}
            </div>
            <div>
              <Label>External URL</Label>
              <Input className="mt-1" placeholder="https://external-resource.com" value={editExternalUrl} onChange={e => setEditExternalUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Only shown to enrolled users</p>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={editVisibility} onValueChange={(v: "public" | "private") => setEditVisibility(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Public — anyone can enroll</span></SelectItem>
                  <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Private — contact admin to access</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enrollment Mode</Label>
              <Select value={editEnrollmentMode} onValueChange={(v: "open" | "approval_required") => setEditEnrollmentMode(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open — students are enrolled immediately</SelectItem>
                  <SelectItem value="approval_required">Requires Approval — admin must approve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setEditCourse(null)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pending Approval Dialog ──────────────────────────────────────── */}
      <Dialog open={!!pendingAlertCourse} onOpenChange={v => { if (!v) setPendingAlertCourse(null); }}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Awaiting Approval</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your enrollment request for <span className="font-medium text-foreground">{pendingAlertCourse?.title}</span> is pending. An admin will review and approve your request shortly.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">You'll gain access to the course content once approved.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Private Course Dialog ────────────────────────────────────────── */}
      <Dialog open={!!privateAlertCourse} onOpenChange={v => { if (!v) setPrivateAlertCourse(null); }}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Private Course</h2>
              <p className="text-muted-foreground text-sm mt-1">
                This course is private. To get access, contact the admin on WhatsApp.
              </p>
            </div>
            <a href="https://wa.me/923278035433" target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white">
                <MessageCircle className="w-4 h-4" />
                Contact Admin on WhatsApp
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">+923278035433</p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
