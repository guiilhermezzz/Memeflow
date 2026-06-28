import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { Avatar, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";
import type { User } from "@/lib/mock-data";

export default function ConnectionsPage() {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const selectedTab = query.get("tab") === "following" ? "following" : "followers";

  const { user: currentUser } = useAuthStore();
  const { users, followedUsers, toggleFollow, getUserById } = useAppStore();
  const [listUsers, setListUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const profileUser = username ? users.find((u) => u.username === username) : currentUser;
  const profileUsername = profileUser?.username || "";

  useEffect(() => {
    const loadConnections = async () => {
      if (!profileUser) {
        setListUsers([]);
        return;
      }

      setIsLoading(true);
      const isFollowers = selectedTab === "followers";
      const filterColumn = isFollowers ? "following_id" : "follower_id";
      const targetColumn = isFollowers ? "follower_id" : "following_id";
      const targetId = profileUser.id;

      if (!supabase) {
        const localIds = users
          .filter((user) => user.id !== profileUser.id)
          .map((user) => user.id);
        setListUsers(users.filter((user) => localIds.includes(user.id)));
        setIsLoading(false);
        return;
      }

      const { data: followRows, error: followError } = await supabase
        .from("follows")
        .select(`${targetColumn}`)
        .eq(filterColumn, targetId);

      if (followError || !followRows) {
        setListUsers([]);
        setIsLoading(false);
        return;
      }

      const ids = followRows.map((row: any) => row[targetColumn]);
      if (ids.length === 0) {
        setListUsers([]);
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, avatar_url, favorite_humor_styles, posts_count, followers_count, following_count, created_at")
        .in("id", ids)
        .order("full_name", { ascending: true });

      if (profileError || !profileData) {
        setListUsers([]);
      } else {
        setListUsers(profileData.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio ?? "",
          avatar_url: profile.avatar_url ?? "",
          favorite_humor_styles: profile.favorite_humor_styles ?? [],
          posts_count: profile.posts_count ?? 0,
          followers_count: profile.followers_count ?? 0,
          following_count: profile.following_count ?? 0,
          created_at: profile.created_at ?? new Date().toISOString(),
        })));
      }
      setIsLoading(false);
    };

    void loadConnections();
  }, [profileUser, selectedTab, users]);

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-on-surface mb-2">Faça login para ver seguidores</h2>
        <Button onClick={() => navigate("/login")}>Entrar</Button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-on-surface mb-2">Perfil não encontrado</h2>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  const title = selectedTab === "followers" ? "Seguidores" : "Seguindo";
  const count = listUsers.length > 0 ? listUsers.length : selectedTab === "followers" ? profileUser.followers_count : profileUser.following_count;

  const handleToggleTab = (tab: string) => {
    navigate(`/profile/${profileUsername}/connections?tab=${tab}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8 animate-fade-in">
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-on-surface-muted" />
        </button>
        <div>
          <p className="text-sm text-on-surface-muted">{profileUser.full_name}</p>
          <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-color bg-surface-alt p-3 mb-6">
        <button
          className={
            selectedTab === "followers"
              ? "rounded-2xl bg-primary px-4 py-2 text-white"
              : "rounded-2xl px-4 py-2 text-on-surface-muted hover:bg-surface-hover"
          }
          onClick={() => handleToggleTab("followers")}
        >
          Seguidores
        </button>
        <button
          className={
            selectedTab === "following"
              ? "rounded-2xl bg-primary px-4 py-2 text-white"
              : "rounded-2xl px-4 py-2 text-on-surface-muted hover:bg-surface-hover"
          }
          onClick={() => handleToggleTab("following")}
        >
          Seguindo
        </button>
        <div className="ml-auto text-sm text-on-surface-muted">
          {count} {title.toLowerCase()}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border-color bg-surface-alt p-6 text-center text-on-surface-muted">
          Carregando...
        </div>
      ) : listUsers.length === 0 ? (
        <div className="rounded-2xl border border-border-color bg-surface-alt p-6 text-center text-on-surface-muted">
          Nenhum {title.toLowerCase()} encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {listUsers.map((connection) => {
            const isOwn = connection.id === currentUser.id;
            const isFollowing = followedUsers.has(connection.id);
            return (
              <div
                key={connection.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-color bg-surface-alt p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={connection.avatar_url || undefined}
                    alt={connection.full_name}
                    fallback={getInitials(connection.full_name)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{connection.full_name}</p>
                    <p className="text-xs text-on-surface-muted truncate">@{connection.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isOwn && (
                    <Button
                      size="sm"
                      variant={isFollowing ? "secondary" : "default"}
                      onClick={() => toggleFollow(connection.id)}
                    >
                      {isFollowing ? "Seguindo" : "Seguir"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/profile/${connection.username}`)}
                  >
                    Ver perfil
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
