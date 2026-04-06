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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, PlayCircle, CheckCircle, Circle, FileText, Plus, ArrowLeft, Trash2, Lock, MessageCircle, Globe, ExternalLink } from "lucide-react";
import { Link } from "wouter";


type ExtendedCourse = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  externalUrl?: string | null;
  visibility?: string;
  lessonCount: number;
  enrollmentCount: number;
  isEnrolled?: boolean;
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
  isCompleted?: boolean;
};

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const courseId = parseInt(params?.id ?? "0", 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [completingLesson, setCompletingLesson] = useState<number | null>(null);

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
      const token = localStorage.getItem("lms_token");
      
      const method = isCompleted ? "DELETE" : "POST";
      const resp = await fetch(`/api/lessons/${lessonId}/complete`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Failed to update progress");
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
    } catch {
      toast({ title: "Failed to update progress", variant: "destructive" });
    } finally {
      setCompletingLesson(null);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) { toast({ title: "Lesson title is required", variant: "destructive" }); return; }
    try {
      await createLessonMutation.mutateAsync({
        courseId,
        data: { title: lessonTitle.trim(), content: lessonDesc.trim() || null, videoUrl: lessonVideoUrl.trim() || null, order: (course?.lessonCount ?? 0) + 1 },
      });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      setAddLessonOpen(false);
      setLessonTitle(""); setLessonDesc(""); setLessonVideoUrl("");
      toast({ title: "Lesson added" });
    } catch {
      toast({ title: "Failed to add lesson", variant: "destructive" });
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
      <Layout>
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
      <Layout>
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
      <Layout>
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

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/courses">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-courses">
            <ArrowLeft className="w-4 h-4" /> Back to courses
          </button>
        </Link>

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

            {/* Progress bar for enrolled users */}
            {course.isEnrolled && (
              <div className="space-y-1.5 max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{progress}% completed</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{completedLessons} of {totalLessons} lessons done</p>
              </div>
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
              <Dialog open={addLessonOpen} onOpenChange={v => { setAddLessonOpen(v); if (!v) { setLessonTitle(""); setLessonDesc(""); setLessonVideoUrl(""); } }}>
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
                      <Textarea className="mt-1" placeholder="What will students learn in this lesson?" value={lessonDesc} onChange={e => setLessonDesc(e.target.value)} rows={2} />
                    </div>
                    <div>
                      <Label>Video URL</Label>
                      <Input className="mt-1" placeholder="https://youtube.com/watch?v=..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} />
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
        {(course.isEnrolled || isAdmin) && course.lessons && course.lessons.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lesson list */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Course Lessons
              </h3>
              {course.lessons.map((lesson, i) => {
                const isActive = activeLesson?.id === lesson.id;
                const isCompleted = lesson.isCompleted ?? false;
                return (
                  <div key={lesson.id} className="flex items-center gap-1.5">
                    <button
                      data-testid={`button-lesson-${lesson.id}`}
                      onClick={() => setSelectedLesson(lesson.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                        isActive ? "bg-primary text-white shadow-sm" : "hover:bg-muted"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                        isCompleted
                          ? isActive ? "bg-white/20 border-white/30 text-white" : "bg-green-100 border-green-300 text-green-600"
                          : isActive ? "bg-white/10 border-white/20" : "border-border"
                      }`}>
                        {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <span className="flex-1 truncate">{lesson.title}</span>
                      {lesson.videoUrl && <PlayCircle className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white/70" : "text-muted-foreground"}`} />}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        data-testid={`button-delete-lesson-${lesson.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lesson viewer */}
            <div className="lg:col-span-2">
              {activeLesson ? (
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {activeLesson.title}
                    </CardTitle>
                    {activeLesson.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activeLesson.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {activeLesson.videoUrl && (
                      <div className="rounded-lg overflow-hidden bg-black">
                        {activeLesson.videoUrl.includes("youtube.com") || activeLesson.videoUrl.includes("youtu.be") ? (
                          <iframe
                            src={activeLesson.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                            className="w-full aspect-video"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <a
                            data-testid="link-video"
                            href={activeLesson.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline text-sm p-4"
                          >
                            <PlayCircle className="w-5 h-5" /> Watch Video
                          </a>
                        )}
                      </div>
                    )}
                    {activeLesson.content && (
                      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        <p>{activeLesson.content}</p>
                      </div>
                    )}

                    {/* Mark complete / undo — only for enrolled non-admin users */}
                    {course.isEnrolled && !isAdmin && (
                      <div className="flex items-center gap-3 pt-2 border-t border-border">
                        {activeLesson.isCompleted ? (
                          <Button
                            data-testid="button-update-progress"
                            size="sm"
                            variant="outline"
                            className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleToggleComplete(activeLesson.id, true)}
                            disabled={completingLesson === activeLesson.id}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {completingLesson === activeLesson.id ? "Updating..." : "Completed — Click to Undo"}
                          </Button>
                        ) : (
                          <Button
                            data-testid="button-update-progress"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleToggleComplete(activeLesson.id, false)}
                            disabled={completingLesson === activeLesson.id}
                          >
                            <Circle className="w-4 h-4" />
                            {completingLesson === activeLesson.id ? "Updating..." : "Mark as Complete"}
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {completedLessons}/{totalLessons} lessons completed
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border rounded-xl">
                  Select a lesson to begin
                </div>
              )}
            </div>
          </div>
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
    </Layout>
  );
}
