import { useState } from "react";
import { useRoute } from "wouter";
import { useGetCourse, useEnrollInCourse, useCreateLesson, useDeleteLesson, getGetCourseQueryKey, getListMyEnrollmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextDisplay } from "@/components/rich-text-display";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, PlayCircle, CheckCircle, Circle, FileText, Plus, ArrowLeft, Trash2, Lock, MessageCircle, Globe, ExternalLink, Clock, Pencil, Zap, XCircle, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import { YouTubePlayer, isYouTubeUrl } from "@/components/youtube-player";
import { Link } from "wouter";


type ExtendedCourse = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  externalUrl?: string | null;
  visibility?: string;
  enrollmentMode?: "open" | "approval_required";
  lessonCount: number;
  enrollmentCount: number;
  isEnrolled?: boolean;
  enrollmentApproved?: boolean | null;
  progress?: number | null;
  completedLessons?: number;
  lessons?: ExtendedLesson[];
};

type ExtendedLesson = {
  id: number;
  courseId: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  content?: string | null;
  order: number;
  isPublic?: boolean;
  isCompleted?: boolean;
};

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const courseId = parseInt(params?.id ?? "0", 10);
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonVisibility, setLessonVisibility] = useState<"public" | "private">("public");
  const [completingLesson, setCompletingLesson] = useState<number | null>(null);

  // Edit lesson state
  const [editLessonOpen, setEditLessonOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<ExtendedLesson | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("public");
  const [editSaving, setEditSaving] = useState(false);

  const { data: courseRaw, isLoading } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) }
  });
  const course = courseRaw as unknown as ExtendedCourse | undefined;

  const enrollMutation = useEnrollInCourse();
  const createLessonMutation = useCreateLesson();
  const deleteLessonMutation = useDeleteLesson();

  const isAdmin = user?.role === "admin";
  const isPrivate = course?.visibility === "private";
  const canAccess = !isPrivate || isAdmin;

  const isEnrolled = course?.isEnrolled ?? false;
  const { data: rejectionData } = useQuery<{ found: boolean; reason: string | null; rejectedAt?: string }>({
    queryKey: ["enrollment-rejection-reason", courseId],
    enabled: !!courseId && !isAdmin && !isEnrolled && !!token,
    queryFn: async () => {
      const authToken = token ?? localStorage.getItem("lms_token");
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/enrollments/rejection-reason?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return { found: false, reason: null };
      return res.json() as Promise<{ found: boolean; reason: string | null; rejectedAt?: string }>;
    },
    staleTime: 30 * 1000,
  });

  const handleEnroll = async () => {
    try {
      await enrollMutation.mutateAsync({ data: { courseId } });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
      toast({ title: "Enrolled successfully!" });
    } catch {
      toast({ title: "Failed to enroll", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (lessonId: number, isCompleted: boolean) => {
    setCompletingLesson(lessonId);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const method = isCompleted ? "DELETE" : "POST";
      const resp = await fetch(`/api/lessons/${lessonId}/complete`, {
        method,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error || "Failed to update progress");
      }
      const result = await resp.json() as { progress: number; completedLessons: number; totalLessons: number };

      // Immediately update cached course data so UI reflects change without waiting for refetch
      queryClient.setQueryData(getGetCourseQueryKey(courseId), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const course = old as ExtendedCourse & { isEnrolled?: boolean };
        return {
          ...course,
          progress: result.progress,
          completedLessons: result.completedLessons,
          lessons: (course.lessons ?? []).map((l) =>
            l.id === lessonId ? { ...l, isCompleted: !isCompleted } : l
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });

      toast({
        title: isCompleted ? "Marked as incomplete" : "Lesson completed!",
        description: `${result.completedLessons} of ${result.totalLessons} lessons done — ${result.progress}%`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update progress";
      toast({ title: message, variant: "destructive" });
    } finally {
      setCompletingLesson(null);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) { toast({ title: "Lesson title is required", variant: "destructive" }); return; }
    try {
      await createLessonMutation.mutateAsync({
        courseId,
        data: {
          title: lessonTitle.trim(),
          content: lessonDesc.trim() || null,
          videoUrl: lessonVideoUrl.trim() || null,
          order: (course?.lessonCount ?? 0) + 1,
          isPublic: lessonVisibility === "public",
        } as Parameters<typeof createLessonMutation.mutateAsync>[0]["data"],
      });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      setAddLessonOpen(false);
      setLessonTitle(""); setLessonDesc(""); setLessonVideoUrl(""); setLessonVisibility("public");
      toast({ title: "Lesson added" });
    } catch {
      toast({ title: "Failed to add lesson", variant: "destructive" });
    }
  };

  const openEditLesson = (lesson: ExtendedLesson) => {
    setEditLesson(lesson);
    setEditTitle(lesson.title);
    setEditDesc(lesson.content ?? "");
    setEditVideoUrl(lesson.videoUrl ?? "");
    setEditVisibility(lesson.isPublic === false ? "private" : "public");
    setEditLessonOpen(true);
  };

  const handleEditLesson = async () => {
    if (!editLesson) return;
    if (!editTitle.trim()) { toast({ title: "Lesson title is required", variant: "destructive" }); return; }
    setEditSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/lessons/${editLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editDesc.trim() || null,
          videoUrl: editVideoUrl.trim() || null,
          isPublic: editVisibility === "public",
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update lesson");
      }
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      setEditLessonOpen(false);
      setEditLesson(null);
      toast({ title: "Lesson updated" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      await deleteLessonMutation.mutateAsync({ id: lessonId });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      if (selectedLesson === lessonId) setSelectedLesson(null);
      toast({ title: "Lesson deleted" });
    } catch {
      toast({ title: "Failed to delete lesson", variant: "destructive" });
    }
  };

  const activeLesson = course?.lessons?.find(l => l.id === selectedLesson) ?? course?.lessons?.[0];

  if (isLoading) {
    return (
      <Layout hideSidebar>
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="grid lg:grid-cols-3 gap-6 mt-4">
            <Skeleton className="h-64" />
            <Skeleton className="lg:col-span-2 h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout hideSidebar>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Course not found</p>
          <Link href="/courses"><Button variant="outline" className="mt-4">Back to courses</Button></Link>
        </div>
      </Layout>
    );
  }

  // Private course restriction for non-admins
  if (isPrivate && !isAdmin) {
    return (
      <Layout hideSidebar>
        <div className="p-6 max-w-6xl mx-auto">
          <Link href="/courses">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to courses
            </button>
          </Link>
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-10 pb-10 space-y-5">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Private Course</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  <strong>{course.title}</strong> is a private course. To get access, contact the admin on WhatsApp.
                </p>
              </div>
              <a href="https://wa.me/923278035433" target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white text-base py-6">
                  <MessageCircle className="w-5 h-5" />
                  Contact Admin on WhatsApp
                </Button>
              </a>
              <p className="text-xs text-muted-foreground">+923278035433</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const totalLessons = course.lessons?.length ?? course.lessonCount;
  const completedLessons = course.completedLessons ?? 0;
  const progress = course.progress ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
  const lessonsList = course.lessons ?? [];
  const currentLessonIdx = selectedLesson !== null ? lessonsList.findIndex(l => l.id === selectedLesson) : -1;
  const popupLesson = currentLessonIdx >= 0 ? lessonsList[currentLessonIdx] : null;
  const goPrevLesson = () => { if (currentLessonIdx > 0) setSelectedLesson(lessonsList[currentLessonIdx - 1].id); };
  const goNextLesson = () => { if (currentLessonIdx < lessonsList.length - 1) setSelectedLesson(lessonsList[currentLessonIdx + 1].id); };

  const ytLessons = lessonsList.filter(l => l.videoUrl && isYouTubeUrl(l.videoUrl));
  const { data: durationsMap } = useQuery<Record<number, string>>({
    queryKey: ["yt-durations", ytLessons.map(l => l.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        ytLessons.map(async l => {
          try {
            const res = await fetch(`/api/youtube-duration?url=${encodeURIComponent(l.videoUrl!)}`);
            const data = await res.json() as { duration?: string };
            return { id: l.id, duration: data.duration ?? "" };
          } catch {
            return { id: l.id, duration: "" };
          }
        })
      );
      return Object.fromEntries(results.map(r => [r.id, r.duration]));
    },
    enabled: ytLessons.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Layout hideSidebar>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back + Share */}
        <div className="flex items-center justify-between">
          <Link href="/courses">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-courses">
              <ArrowLeft className="w-4 h-4" /> Back to courses
            </button>
          </Link>
          <button
            onClick={() => {
              const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
              navigator.clipboard.writeText(`${window.location.origin}${base}/courses/${courseId}`);
              toast({ title: "Link copied!" });
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Copy shareable link"
          >
            <Link2 className="w-4 h-4" /> Copy Link
          </button>
        </div>

        {/* Course header */}
        <div className="flex flex-col md:flex-row gap-6">
          {course.thumbnail && (
            <img src={course.thumbnail} alt={course.title} className="w-full md:w-72 h-44 object-cover rounded-xl flex-shrink-0" />
          )}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold flex-1" data-testid="text-course-title">{course.title}</h1>
              {course.visibility === "private" ? (
                <Badge variant="destructive" className="gap-1 shrink-0"><Lock className="w-3 h-3" /> Private</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Globe className="w-3 h-3" /> Public
                </Badge>
              )}
            </div>
            {course.description && <p className="text-muted-foreground text-sm">{course.description}</p>}

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {course.lessonCount} lessons</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {course.enrollmentCount} students</span>
              {course.externalUrl && (
                <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> External Resource
                </a>
              )}
            </div>

            {/* Progress bar for approved enrolled users */}
            {course.isEnrolled && course.enrollmentApproved === true && (
              <div className="space-y-1.5 max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{progress}% completed</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{completedLessons} of {totalLessons} lessons done</p>
              </div>
            )}

            {/* Pending approval badge */}
            {course.isEnrolled && course.enrollmentApproved !== true && !isAdmin && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm max-w-sm">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Enrollment request sent — waiting for admin approval</span>
              </div>
            )}

            {/* Enrollment rejected banner */}
            {!course.isEnrolled && !isAdmin && rejectionData?.found && (
              <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm max-w-sm">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Enrollment request was not approved</span>
                </div>
                {rejectionData.reason ? (
                  <p className="text-red-600 dark:text-red-300 text-xs leading-relaxed pl-6">
                    {rejectionData.reason}
                  </p>
                ) : (
                  <p className="text-red-600 dark:text-red-300 text-xs leading-relaxed pl-6">
                    No reason was provided. Please contact an admin for more information.
                  </p>
                )}
              </div>
            )}

            {/* Enrollment mode indicator — shown to non-admin unenrolled students on public courses */}
            {!course.isEnrolled && canAccess && !isAdmin && !rejectionData?.found && (
              course.enrollmentMode === "open" ? (
                <div className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-4 h-4" />
                  <span>Instant Access — you'll be enrolled immediately</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span>Approval Required — an admin will review your request</span>
                </div>
              )
            )}

            {/* Enroll button */}
            {!course.isEnrolled && canAccess && (
              <Button data-testid="button-enroll-course" className="gap-2" onClick={handleEnroll} disabled={enrollMutation.isPending}>
                <BookOpen className="w-4 h-4" />
                {enrollMutation.isPending ? "Enrolling..." : "Enroll for Free"}
              </Button>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <Dialog open={addLessonOpen} onOpenChange={v => { setAddLessonOpen(v); if (!v) { setLessonTitle(""); setLessonDesc(""); setLessonVideoUrl(""); setLessonVisibility("public"); } }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-lesson" variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Lesson
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Title <span className="text-destructive">*</span></Label>
                      <Input className="mt-1" placeholder="Lesson title" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <div className="mt-1">
                        <RichTextEditor
                          value={lessonDesc}
                          onChange={setLessonDesc}
                          placeholder="What will students learn in this lesson?"
                          minHeight="200px"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Video URL</Label>
                      <Input className="mt-1" placeholder="https://youtube.com/watch?v=..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} />
                    </div>
                    <div>
                      <Label>Visibility</Label>
                      <Select value={lessonVisibility} onValueChange={v => setLessonVisibility(v as "public" | "private")}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-green-500" /> Public — visible to everyone</span>
                          </SelectItem>
                          <SelectItem value="private">
                            <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-red-400" /> Private — enrolled only</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setAddLessonOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddLesson} disabled={createLessonMutation.isPending}>
                        {createLessonMutation.isPending ? "Adding..." : "Add Lesson"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Lesson content area */}
        {((course.isEnrolled && course.enrollmentApproved === true) || isAdmin) && course.lessons && course.lessons.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Course Lessons</h3>
              <span className="text-xs text-muted-foreground">{course.lessons.length} lectures</span>
            </div>
            {course.lessons.map((lesson, i) => {
              const isCompleted = lesson.isCompleted ?? false;
              const duration = durationsMap?.[lesson.id];
              return (
                <div key={lesson.id} className="flex items-center border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors group">
                  <button
                    data-testid={`button-lesson-${lesson.id}`}
                    onClick={() => setSelectedLesson(lesson.id)}
                    className="flex-1 flex items-center gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-sm text-muted-foreground w-5 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                    <span className="text-muted-foreground/40 flex-shrink-0">—</span>
                    <span className={`flex-1 text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {lesson.title}
                    </span>
                    {duration && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        <Clock className="w-3 h-3" />{duration}
                      </span>
                    )}
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {lesson.isPublic === false && <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0" title="Private" />}
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-1 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditLesson(lesson)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-edit-lesson-${lesson.id}`}
                        title="Edit lesson"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-delete-lesson-${lesson.id}`}
                        title="Delete lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : course.isEnrolled && course.enrollmentApproved !== true && !isAdmin ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-base">Waiting for Admin Approval</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Your enrollment request has been received. You'll be able to access the course content once an admin approves it.
              </p>
            </CardContent>
          </Card>
        ) : !course.isEnrolled && !isAdmin && canAccess ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">Enroll to access lessons</p>
              <p className="text-sm text-muted-foreground mt-1">It's completely free</p>
              <Button className="mt-4" onClick={handleEnroll} disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
              </Button>
            </CardContent>
          </Card>
        ) : course.lessons && course.lessons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No lessons added yet</p>
              {isAdmin && <p className="text-sm text-muted-foreground mt-1">Use "Add Lesson" above to add content</p>}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ── Video Popup Dialog ─────────────────────────────────────────────── */}
      <Dialog open={selectedLesson !== null} onOpenChange={open => { if (!open) setSelectedLesson(null); }}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">{popupLesson?.title ?? "Lesson Video"}</DialogTitle>
          {/* Gradient header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#3b0764] to-[#1e3a8a]">
            <button
              onClick={() => setSelectedLesson(null)}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Lessons
            </button>
            <span className="flex-1 text-white font-semibold text-sm truncate">
              {popupLesson ? `Lesson ${currentLessonIdx + 1}: ${popupLesson.title}` : ""}
            </span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={goPrevLesson}
                disabled={currentLessonIdx <= 0}
                className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 transition-colors rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/70 text-sm tabular-nums px-1">
                {currentLessonIdx + 1} / {lessonsList.length}
              </span>
              <button
                onClick={goNextLesson}
                disabled={currentLessonIdx >= lessonsList.length - 1}
                className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 transition-colors rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setSelectedLesson(null)}
              className="p-1.5 text-white/70 hover:text-white transition-colors rounded flex-shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Video content */}
          {popupLesson && (
            <div className="p-5 space-y-4">
              {popupLesson.isPublic === false && !isAdmin ? (
                <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">This lesson is private.</p>
                    <p className="text-sm text-muted-foreground mt-1">Contact the admin to unlock access.</p>
                  </div>
                  <a href="https://wa.me/923278035433" target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-2 bg-green-500 hover:bg-green-600 text-white">
                      <MessageCircle className="w-4 h-4" /> Contact Admin on WhatsApp
                    </Button>
                  </a>
                </div>
              ) : popupLesson.videoUrl ? (
                isYouTubeUrl(popupLesson.videoUrl) ? (
                  <YouTubePlayer url={popupLesson.videoUrl} />
                ) : (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    <a
                      data-testid="link-video"
                      href={popupLesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline text-sm p-4"
                    >
                      <PlayCircle className="w-5 h-5" /> Watch Video
                    </a>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <PlayCircle className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No video available for this lesson</p>
                </div>
              )}

              {popupLesson.content && (
                <div className="text-sm text-foreground">
                  <RichTextDisplay html={popupLesson.content} />
                </div>
              )}

              {/* Mark complete */}
              {course.isEnrolled && !isAdmin && popupLesson.isPublic !== false && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  {popupLesson.isCompleted ? (
                    <Button
                      data-testid="button-update-progress"
                      size="sm"
                      variant="outline"
                      className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => handleToggleComplete(popupLesson.id, true)}
                      disabled={completingLesson === popupLesson.id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {completingLesson === popupLesson.id ? "Updating..." : "Completed — Click to Undo"}
                    </Button>
                  ) : (
                    <Button
                      data-testid="button-update-progress"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleToggleComplete(popupLesson.id, false)}
                      disabled={completingLesson === popupLesson.id}
                    >
                      <Circle className="w-4 h-4" />
                      {completingLesson === popupLesson.id ? "Updating..." : "Mark as Complete"}
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">{completedLessons}/{totalLessons} lessons completed</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Lesson Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editLessonOpen} onOpenChange={open => { if (!open) { setEditLessonOpen(false); setEditLesson(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Lesson title" />
            </div>
            <div>
              <Label>Description</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={editDesc}
                  onChange={setEditDesc}
                  placeholder="What will students learn in this lesson?"
                  minHeight="200px"
                />
              </div>
            </div>
            <div>
              <Label>Video URL</Label>
              <Input className="mt-1" placeholder="https://youtube.com/watch?v=..." value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={editVisibility} onValueChange={v => setEditVisibility(v as "public" | "private")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-green-500" /> Public — visible to everyone</span>
                  </SelectItem>
                  <SelectItem value="private">
                    <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-red-400" /> Private — enrolled only</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditLessonOpen(false); setEditLesson(null); }}>Cancel</Button>
              <Button onClick={handleEditLesson} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
