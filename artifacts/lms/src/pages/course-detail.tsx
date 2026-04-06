import { useState } from "react";
import { useRoute } from "wouter";
import { useGetCourse, useEnrollInCourse, useUpdateProgress, useCreateLesson, useDeleteLesson, getGetCourseQueryKey, getListMyEnrollmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Users, PlayCircle, CheckCircle, FileText, Plus, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const lessonSchema = z.object({
  title: z.string().min(2, "Title required"),
  content: z.string().optional(),
  videoUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  order: z.coerce.number().min(1),
});

type LessonForm = z.infer<typeof lessonSchema>;

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const courseId = parseInt(params?.id ?? "0", 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [addLessonOpen, setAddLessonOpen] = useState(false);

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) }
  });
  const enrollMutation = useEnrollInCourse();
  const progressMutation = useUpdateProgress();
  const createLessonMutation = useCreateLesson();
  const deleteLessonMutation = useDeleteLesson();

  const canManage = user?.role === "admin" || user?.role === "creator";

  const form = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: "", content: "", videoUrl: "", order: (course?.lessons?.length ?? 0) + 1 },
  });

  const handleEnroll = async () => {
    try {
      await enrollMutation.mutateAsync({ data: { courseId } });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
      toast({ title: "Enrolled successfully" });
    } catch {
      toast({ title: "Failed to enroll", variant: "destructive" });
    }
  };

  const handleProgress = async (progress: number) => {
    try {
      await progressMutation.mutateAsync({ courseId, data: { progress } });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    } catch {}
  };

  const handleAddLesson = async (data: LessonForm) => {
    try {
      await createLessonMutation.mutateAsync({
        courseId,
        data: { title: data.title, content: data.content || null, videoUrl: data.videoUrl || null, order: data.order },
      });
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      setAddLessonOpen(false);
      form.reset();
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
        <div className="p-6 max-w-6xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-4 w-full" />
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
            <img src={course.thumbnail} alt={course.title} className="w-full md:w-64 h-40 object-cover rounded-xl flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-course-title">{course.title}</h1>
            {course.description && <p className="text-muted-foreground mt-2">{course.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {course.lessonCount} lessons</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {course.enrollmentCount} students</span>
            </div>

            {course.isEnrolled && course.progress != null && (
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your progress</span>
                  <span className="font-medium">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2" />
              </div>
            )}

            {!course.isEnrolled && (
              <Button data-testid="button-enroll-course" className="mt-4 gap-2" onClick={handleEnroll} disabled={enrollMutation.isPending}>
                <BookOpen className="w-4 h-4" />
                {enrollMutation.isPending ? "Enrolling..." : "Enroll for Free"}
              </Button>
            )}

            {canManage && (
              <Dialog open={addLessonOpen} onOpenChange={setAddLessonOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-lesson" variant="outline" className="mt-4 ml-2 gap-2">
                    <Plus className="w-4 h-4" /> Add Lesson
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddLesson)} className="space-y-4">
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Lesson title" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="videoUrl" render={({ field }) => (
                        <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="content" render={({ field }) => (
                        <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Lesson content..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="order" render={({ field }) => (
                        <FormItem><FormLabel>Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setAddLessonOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createLessonMutation.isPending}>
                          {createLessonMutation.isPending ? "Adding..." : "Add Lesson"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Content area */}
        {course.isEnrolled && course.lessons && course.lessons.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lesson list */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Lessons</h3>
              {course.lessons.map((lesson, i) => {
                const isActive = activeLesson?.id === lesson.id;
                return (
                  <div key={lesson.id} className="flex items-center gap-2">
                    <button
                      data-testid={`button-lesson-${lesson.id}`}
                      onClick={() => setSelectedLesson(lesson.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                        isActive ? "bg-primary text-white" : "hover:bg-muted"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? "bg-white/20" : "bg-muted"}`}>
                        {i + 1}
                      </span>
                      <span className="truncate">{lesson.title}</span>
                      {lesson.videoUrl && <PlayCircle className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white/70" : "text-muted-foreground"}`} />}
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-delete-lesson-${lesson.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lesson content */}
            <div className="lg:col-span-2">
              {activeLesson ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {activeLesson.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeLesson.videoUrl && (
                      <div>
                        <a
                          data-testid="link-video"
                          href={activeLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline text-sm"
                        >
                          <PlayCircle className="w-4 h-4" /> Watch Video
                        </a>
                      </div>
                    )}
                    {activeLesson.content && (
                      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        <p>{activeLesson.content}</p>
                      </div>
                    )}
                    {course.isEnrolled && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          data-testid="button-update-progress"
                          size="sm"
                          variant="outline"
                          onClick={() => handleProgress(Math.min(100, (course.progress ?? 0) + 25))}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark Progress
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Select a lesson to begin
                </div>
              )}
            </div>
          </div>
        ) : !course.isEnrolled ? (
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
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No lessons yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

