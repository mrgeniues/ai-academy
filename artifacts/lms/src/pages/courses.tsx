import { useState } from "react";
import { useListCourses, useListMyEnrollments, useEnrollInCourse, useCreateCourse, getListCoursesQueryKey, getListMyEnrollmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { BookOpen, Users, Plus, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  thumbnail: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

type CreateForm = z.infer<typeof createSchema>;

export default function CoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: courses, isLoading: coursesLoading } = useListCourses({
    query: { queryKey: getListCoursesQueryKey() }
  });
  const { data: enrollments } = useListMyEnrollments({
    query: { queryKey: getListMyEnrollmentsQueryKey() }
  });
  const enrollMutation = useEnrollInCourse();
  const createMutation = useCreateCourse();

  const enrolledIds = new Set(enrollments?.map(e => e.courseId) ?? []);
  const progressMap = new Map(enrollments?.map(e => [e.courseId, e.progress]) ?? []);

  const canCreate = user?.role === "admin" || user?.role === "creator";

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", description: "", thumbnail: "" },
  });

  const handleEnroll = async (courseId: number) => {
    try {
      await enrollMutation.mutateAsync({ data: { courseId } });
      queryClient.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      toast({ title: "Enrolled successfully" });
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      toast({ title: "Failed to enroll", description: error?.data?.error ?? "Already enrolled or error occurred", variant: "destructive" });
    }
  };

  const handleCreate = async (data: CreateForm) => {
    try {
      await createMutation.mutateAsync({ data: { title: data.title, description: data.description || null, thumbnail: data.thumbnail || null } });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Course created" });
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      toast({ title: "Failed to create course", description: error?.data?.error, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Courses</h1>
            <p className="text-muted-foreground text-sm mt-1">Browse and enroll in available courses</p>
          </div>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-course" className="gap-2">
                  <Plus className="w-4 h-4" /> New Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input data-testid="input-course-title" placeholder="Course title" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea data-testid="input-course-description" placeholder="Describe the course" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="thumbnail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thumbnail URL</FormLabel>
                        <FormControl><Input data-testid="input-course-thumbnail" placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                      <Button data-testid="button-submit-course" type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {coursesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-0"><Skeleton className="h-48 w-full rounded-t-lg" /><div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div></CardContent></Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => {
              const isEnrolled = enrolledIds.has(course.id);
              const progress = progressMap.get(course.id) ?? 0;
              return (
                <Card key={course.id} data-testid={`card-course-${course.id}`} className="overflow-hidden hover:shadow-md transition-shadow">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <GraduationCap className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-base leading-tight">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessonCount} lessons</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentCount} enrolled</span>
                    </div>

                    {isEnrolled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/courses/${course.id}`} className="flex-1">
                        <Button data-testid={`button-view-course-${course.id}`} variant="outline" className="w-full text-sm" size="sm">
                          View Course
                        </Button>
                      </Link>
                      {!isEnrolled && (
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
                      {isEnrolled && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2">
                          Enrolled
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No courses yet</p>
            <p className="text-sm mt-1">Check back soon or create a course</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
