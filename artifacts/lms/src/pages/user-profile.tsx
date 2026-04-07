import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiWhatsapp } from "react-icons/si";
import { Linkedin, ArrowLeft, Calendar, UserCircle2, UserPlus, UserMinus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const socialPlatforms = [
  { key: "facebook", label: "Facebook", icon: SiFacebook, color: "#1877F2" },
  { key: "instagram", label: "Instagram", icon: SiInstagram, color: "#E4405F" },
  { key: "tiktok", label: "TikTok", icon: SiTiktok, color: "#555555" },
  { key: "twitter", label: "Twitter / X", icon: SiX, color: "#555555" },
  { key: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, color: "#25D366" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
];

type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  lastLogin: string | null;
  socialLinks: Record<string, string | null> | null;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
};

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { token, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/users/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error();
        const data: PublicUser = await res.json();
        setProfile(data);
        setIsFollowing(data.isFollowing ?? false);
        setFollowersCount(data.followersCount ?? 0);
        setFollowingCount(data.followingCount ?? 0);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.id, token]);

  const handleFollow = async () => {
    if (!profile || !token) return;
    setFollowLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed");
      }
      if (isFollowing) {
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
        toast({ title: `Unfollowed ${profile.name}` });
      } else {
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
        toast({ title: `Now following ${profile.name}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwnProfile = currentUser?.id === profile?.id;
  const initials = profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Back button */}
        <button
          onClick={() => history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {loading ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-48" />
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card>
            <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-3">
              <UserCircle2 className="w-12 h-12 text-muted-foreground/30" />
              <p className="font-semibold text-lg">User not found</p>
              <p className="text-sm text-muted-foreground">This profile doesn't exist or has been removed.</p>
              <Button variant="outline" size="sm" onClick={() => setLocation("/community")}>
                Back to Community
              </Button>
            </CardContent>
          </Card>
        ) : profile ? (
          <>
            <Card>
              <CardContent className="pt-6 pb-5">
                {/* Header row */}
                <div className="flex items-start gap-5">
                  <Avatar className="w-20 h-20 flex-shrink-0 ring-2 ring-primary/20">
                    <AvatarImage src={profile.avatar ?? undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <h1 className="text-xl font-bold">{profile.name}</h1>
                      <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
                      {isOwnProfile && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>

                    {/* Followers / Following counts */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span><strong className="text-foreground">{followersCount}</strong> Followers</span>
                      <span><strong className="text-foreground">{followingCount}</strong> Following</span>
                    </div>

                    {profile.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                    </div>

                    {/* Follow / Unfollow button */}
                    {!isOwnProfile && (
                      <div className="pt-1">
                        <Button
                          size="sm"
                          variant={isFollowing ? "outline" : "default"}
                          onClick={handleFollow}
                          disabled={followLoading}
                          className="gap-1.5"
                        >
                          {isFollowing ? (
                            <><UserMinus className="w-3.5 h-3.5" /> Unfollow</>
                          ) : (
                            <><UserPlus className="w-3.5 h-3.5" /> Follow</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social links */}
                {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Social Links</p>
                    <div className="flex flex-wrap gap-2">
                      {socialPlatforms.map(({ key, label, icon: Icon, color }) => {
                        const url = profile.socialLinks?.[key];
                        if (!url) return null;
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                            style={{ color }}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-foreground text-xs">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Own profile link */}
                {isOwnProfile && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => setLocation("/profile")}>
                      Edit your profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
