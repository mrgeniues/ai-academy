import { useState, useRef } from "react";
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
import { BookOpen, Users, Plus, GraduationCap, Lock, Globe, Trash2, ImageIcon, X, MessageCircle } from "lucide-react";
import { Link } from "wouter";


type CourseWithExtras = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  externalUrl?: string | null;
  visibility?: string;
  lessonCount: number;
  enrollmentCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

type LessonDraft = { title: string; description: string; videoUrl: string };

const emptyLesson = (): LessonDraft => ({ title: "", description: "", videoUrl: "" });

export default function CoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [privateAlertCourse, setPrivateAlertCourse] = useState<CourseWithExtras | null>(null);

  // Course form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [lessonDrafts, setLessonDrafts] = useState<LessonDraft[]>([emptyLesson()]);
  const [creating, setCreating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: courses, isLoading: coursesLoading } = useListCourses({
    query: { queryKey: getListCoursesQueryKey() }
  });
  const { data: enrollments } = useListMyEnrollments({
    query: { queryKey: getListMyEnrollmentsQueryKey() }
  });
  const enrollMutation = useEnrollInCourse();

  const enrolledIds = new Set<number>((enrollments ?? []).map((e: { courseId: number }) => e.courseId));
  const progressMap = new Map<number, number>((enrollments ?? []).map((e: { courseId: number; progress: number }) => [e.courseId, e.progress] as [number, number]));

  const isAdmin = user?.role === "admin";

  const resetForm = () => {
    setTitle(""); setDescription(""); setImageFile(null); setImagePreview(null); setExternalUrl("");
    setVisibility("public"); setLessonDrafts([emptyLesson()]);
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
      const token = localStorage.getItem("lms_token");

      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadResp = await fetch(`/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!uploadResp.ok) throw new Error("Failed to upload image");
        const uploadData = await uploadResp.json() as { url: string };
        uploadedImageUrl = uploadData.url;
      }

      const resp = await fetch(`/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          thumbnail: uploadedImageUrl,
          externalUrl: externalUrl.trim() || null,
          visibility,
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
                  {/* Basic info */}
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
                          <button
                            type="button"
                            onClick={clearImage}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="mt-1 w-full h-28 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
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
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Public — anyone can enroll</span></SelectItem>
                          <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Private — contact admin to access</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lessons */}
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
                          <Input
                            placeholder="Lesson title *"
                            value={lesson.title}
                            onChange={e => updateLessonDraft(i, "title", e.target.value)}
                          />
                          <Textarea
                            placeholder="Lesson description"
                            value={lesson.description}
                            onChange={e => updateLessonDraft(i, "description", e.target.value)}
                            rows={2}
                          />
                          <Input
                            placeholder="Video URL (YouTube, Vimeo, etc.)"
                            value={lesson.videoUrl}
                            onChange={e => updateLessonDraft(i, "videoUrl", e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? "Creating..." : "Create Course"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Course grid */}
        {coursesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-0"><Skeleton className="h-44 w-full" /><div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div></CardContent></Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(courses as CourseWithExtras[]).map(course => {
              const isEnrolled = enrolledIds.has(course.id);
              const progress = progressMap.get(course.id) ?? 0;
              const isPrivate = course.visibility === "private";
              const canAccess = !isPrivate || isAdmin;

              return (
                <Card key={course.id} data-testid={`card-course-${course.id}`} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {/* Thumbnail */}
                  <div className="relative">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    {/* Visibility badge */}
                    {isPrivate && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <Lock className="w-3 h-3" /> Private Course
                        </Badge>
                      </div>
                    )}
                    {!isPrivate && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Globe className="w-3 h-3" /> Public
                        </Badge>
                      </div>
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
                      {course.externalUrl && (
                        <a href={course.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline ml-auto">
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

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      {canAccess ? (
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
                      {isEnrolled && (
                        <Badge variant="secondary" className="px-3 text-xs flex items-center">✓ Enrolled</Badge>
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
            {isAdmin && <p className="text-sm mt-1">Create your first course using the button above</p>}
          </div>
        )}
      </div>

      {/* Private Course Dialog */}
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
            <a
              href="https://wa.me/923278035433"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
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
