import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useUpdateUser, useListMyEnrollments, getGetMeQueryKey, getListMyEnrollmentsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiWhatsapp } from "react-icons/si";
import { Linkedin, BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bio: z.string().optional(),
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  tiktok: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const socialPlatforms = [
  { key: "facebook" as const, label: "Facebook", icon: SiFacebook, color: "#1877F2" },
  { key: "instagram" as const, label: "Instagram", icon: SiInstagram, color: "#E4405F" },
  { key: "tiktok" as const, label: "TikTok", icon: SiTiktok, color: "#000000" },
  { key: "twitter" as const, label: "Twitter / X", icon: SiX, color: "#000000" },
  { key: "whatsapp" as const, label: "WhatsApp", icon: SiWhatsapp, color: "#25D366" },
  { key: "linkedin" as const, label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useUpdateUser();
  const { data: enrollments } = useListMyEnrollments({
    query: { queryKey: getListMyEnrollmentsQueryKey() }
  });

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      avatar: user?.avatar ?? "",
      bio: user?.bio ?? "",
      facebook: user?.socialLinks?.facebook ?? "",
      instagram: user?.socialLinks?.instagram ?? "",
      tiktok: user?.socialLinks?.tiktok ?? "",
      twitter: user?.socialLinks?.twitter ?? "",
      whatsapp: user?.socialLinks?.whatsapp ?? "",
      linkedin: user?.socialLinks?.linkedin ?? "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        avatar: user.avatar ?? "",
        bio: user.bio ?? "",
        facebook: user.socialLinks?.facebook ?? "",
        instagram: user.socialLinks?.instagram ?? "",
        tiktok: user.socialLinks?.tiktok ?? "",
        twitter: user.socialLinks?.twitter ?? "",
        whatsapp: user.socialLinks?.whatsapp ?? "",
        linkedin: user.socialLinks?.linkedin ?? "",
      });
    }
  }, [user]);

  const handleSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: {
          name: data.name,
          avatar: data.avatar || null,
          bio: data.bio || null,
          socialLinks: {
            facebook: data.facebook || null,
            instagram: data.instagram || null,
            tiktok: data.tiktok || null,
            twitter: data.twitter || null,
            whatsapp: data.whatsapp || null,
            linkedin: data.linkedin || null,
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your personal information and social links</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Avatar + summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                <Avatar className="w-20 h-20" data-testid="img-profile-avatar">
                  <AvatarImage src={user?.avatar ?? undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg" data-testid="text-profile-name">{user?.name}</p>
                  <Badge variant="secondary" className="mt-1">{user?.role}</Badge>
                </div>
                {user?.bio && <p className="text-sm text-muted-foreground" data-testid="text-profile-bio">{user.bio}</p>}

                {/* Social icons */}
                {user?.socialLinks && (
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    {socialPlatforms.map(({ key, icon: Icon, color, label }) => {
                      const url = user.socialLinks?.[key];
                      if (!url) return null;
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-social-${key}`}
                          title={label}
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          style={{ color }}
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      );
                    })}
                  </div>
                )}

                <div className="w-full pt-2 space-y-1.5 text-left text-xs text-muted-foreground">
                  {user?.lastLogin && (
                    <p>Last login: {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}</p>
                  )}
                  {user?.createdAt && (
                    <p>Joined: {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enrolled courses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">My Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrollments && enrollments.length > 0 ? (
                  enrollments.map(e => (
                    <div key={e.id} data-testid={`enrollment-${e.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <p className="text-xs font-medium truncate">{e.course.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={e.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{e.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No courses enrolled yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Edit form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl><Input data-testid="input-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="avatar" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl><Input data-testid="input-avatar" placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="bio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl><Textarea data-testid="input-bio" placeholder="Tell us about yourself..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="pt-2">
                      <p className="text-sm font-medium mb-3">Social Media Links</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {socialPlatforms.map(({ key, label, icon: Icon, color }) => (
                          <FormField key={key} control={form.control} name={key} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-xs">
                                <Icon className="w-3.5 h-3.5" style={{ color }} />
                                {label}
                              </FormLabel>
                              <FormControl>
                                <Input data-testid={`input-social-${key}`} placeholder="https://..." {...field} className="text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        ))}
                      </div>
                    </div>

                    <Button
                      data-testid="button-save-profile"
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="w-full"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
