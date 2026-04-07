import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type UserSummary = {
  id: number;
  name: string;
  role: string;
  avatar: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number;
  type: "followers" | "following";
  token: string | null;
};

export function FollowListModal({ open, onClose, userId, type, token }: Props) {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setUsers([]);
    fetch(`/api/users/${userId}/${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: UserSummary[]) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, userId, type, token]);

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            users.map(u => {
              const initials = u.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
              return (
                <button
                  key={u.id}
                  onClick={() => { onClose(); setLocation(`/users/${u.id}`); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={u.avatar ?? undefined} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <Badge variant="secondary" className="text-xs capitalize mt-0.5">{u.role}</Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
