import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Edit3,
  Camera,
  Grid3X3,
  Heart,
  Bookmark,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { VideoCardGrid } from "@/components/VideoCard";
import { Avatar, Button, Tabs, Dialog, Input, Textarea, Select } from "@/components/ui";
import { CATEGORIES, formatCount, getInitials, timeAgo } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Video } from "@/lib/mock-data";

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateProfile } = useAuthStore();
  const { users, videos, likedVideos, savedVideos, followedUsers, toggleFollow, getUserVideos, deleteVideo, updateVideo } = useAppStore();
  const [activeTab, setActiveTab] = useState("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpenVideoId, setMenuOpenVideoId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoDescription, setEditVideoDescription] = useState("");
  const [editVideoCategoryPreset, setEditVideoCategoryPreset] = useState<string>(CATEGORIES[0]);
  const [editVideoCustomCategory, setEditVideoCustomCategory] = useState("");
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [editName, setEditName] = useState(currentUser?.full_name || "");
  const [editBio, setEditBio] = useState(currentUser?.bio || "");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(currentUser?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [dbFollowersCount, setDbFollowersCount] = useState<number | null>(null);
  const [dbFollowingCount, setDbFollowingCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Determine which profile to show
  const profileUser = username
    ? users.find((u) => u.username === username)
    : currentUser;

  const profileUsername = profileUser?.username || currentUser?.username || "";

  if (!profileUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <p className="text-4xl mb-3">🤔</p>
        <h2 className="text-xl font-bold text-on-surface mb-2">Usuário não encontrado</h2>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const isFollowing = followedUsers.has(profileUser.id);
  const userVideos = getUserVideos(profileUser.id);
  const likedVideoList = videos.filter((v) => likedVideos.has(v.id));
  const savedVideoList = videos.filter((v) => savedVideos.has(v.id));

  useEffect(() => {
    if (editOpen) {
      setEditName(currentUser?.full_name || "");
      setEditBio(currentUser?.bio || "");
      setEditAvatarPreview(currentUser?.avatar_url || null);
    }
  }, [editOpen, currentUser?.full_name, currentUser?.bio, currentUser?.avatar_url]);

  useEffect(() => {
    const loadFollowCounts = async () => {
      if (!profileUser || !supabase) {
        setDbFollowersCount(null);
        setDbFollowingCount(null);
        return;
      }

      const [{ count: followersCount, error: followersError }, { count: followingCount, error: followingError }] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", profileUser.id),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", profileUser.id),
      ]);

      setDbFollowersCount(followersError ? null : followersCount ?? null);
      setDbFollowingCount(followingError ? null : followingCount ?? null);
    };

    void loadFollowCounts();
  }, [profileUser?.id]);

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    const previewUrl = URL.createObjectURL(file);
    setEditAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      if (!supabase) {
        await updateProfile({ avatar_url: previewUrl });
        return;
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });

      if (uploadError || !uploadData?.path) throw uploadError || new Error("Falha ao fazer upload da foto");

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
      await updateProfile({ avatar_url: publicUrlData.publicUrl });
      setEditAvatarPreview(publicUrlData.publicUrl);
    } catch (error) {
      console.error("Erro ao atualizar foto de perfil:", error);
      setEditAvatarPreview(currentUser.avatar_url || null);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSaveProfile = () => {
    updateProfile({
      full_name: editName,
      bio: editBio,
    });
    setEditOpen(false);
  };

  const handleOpenVideoEditor = (video: Video) => {
    const knownCategory = CATEGORIES.find((cat) => cat === video.category);
    const shouldShowCustomField = video.category === "Outros" || (!knownCategory && Boolean(video.category));

    setEditingVideo(video);
    setEditVideoTitle(video.title);
    setEditVideoDescription(video.description);
    setEditVideoCategoryPreset(knownCategory ?? "Outros");
    setEditVideoCustomCategory(shouldShowCustomField ? video.category : "");
    setShowCustomCategoryInput(shouldShowCustomField);
    setMenuOpenVideoId(null);
  };

  const handleDeleteVideo = async (video: Video) => {
    if (!window.confirm(`Excluir o vídeo "${video.title}"?`)) return;
    await deleteVideo(video.id);
    setMenuOpenVideoId(null);
  };

  const handleSaveVideoEdit = async () => {
    if (!editingVideo) return;

    if (showCustomCategoryInput && !editVideoCustomCategory.trim()) {
      window.alert("Escreva uma categoria personalizada antes de salvar.");
      return;
    }

    const finalCategory = editVideoCustomCategory.trim() || (showCustomCategoryInput ? "Outros" : editVideoCategoryPreset);
    setIsSavingVideo(true);
    await updateVideo(editingVideo.id, {
      title: editVideoTitle.trim(),
      description: editVideoDescription.trim(),
      category: finalCategory,
    });
    setIsSavingVideo(false);
    setEditingVideo(null);
  };

  const tabContent = () => {
    switch (activeTab) {
      case "posts":
        return userVideos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {userVideos.map((video) => (
              <div key={video.id} className="relative">
                <VideoCardGrid video={video} />
                {isOwnProfile && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenVideoId((current) => (current === video.id ? null : video.id));
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm hover:bg-black/80"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {menuOpenVideoId === video.id && (
                      <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border-color bg-surface p-2 shadow-xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVideoEditor(video);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-on-surface hover:bg-surface-hover"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(video);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-on-surface-muted text-sm">Nenhum conteúdo publicado ainda</p>
          </div>
        );
      case "liked":
        return likedVideoList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {likedVideoList.map((video) => (
              <VideoCardGrid key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-on-surface-muted text-sm">Nenhum conteúdo salvo</p>
          </div>
        );
      case "saved":
        return savedVideoList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {savedVideoList.map((video) => (
              <VideoCardGrid key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-on-surface-muted text-sm">Nenhum conteúdo salvo</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Cover/Header */}
      <div
        className="h-32 md:h-48 relative"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #EC4899, #FACC15)",
          backgroundSize: "200% 200%",
          animation: "gradient-shift 8s ease infinite",
        }}
      >
        {/* Banner camera button removed per request */}
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-6">
        {/* Avatar */}
        <div className="-mt-12 md:-mt-16 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="ring-4 ring-surface rounded-full">
              <Avatar
                src={profileUser.avatar_url || undefined}
                alt={profileUser.full_name}
                fallback={getInitials(profileUser.full_name)}
                size="xl"
              />
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-on-surface">{profileUser.full_name}</h1>
            <p className="text-sm text-on-surface-muted">@{profileUser.username}</p>
            {profileUser.bio && (
              <p className="mt-2 text-sm text-on-surface">{profileUser.bio}</p>
            )}
          </div>
          <div className="w-full sm:w-auto flex justify-start sm:justify-end">
            {isOwnProfile ? (
              <Button
                variant="default"
                size="md"
                className="min-w-[120px]"
                onClick={() => setEditOpen(true)}
              >
                <Edit3 className="h-3.5 w-3.5 text-on-surface" />
                Editar Perfil
              </Button>
            ) : (
              <Button
                variant={isFollowing ? "secondary" : "default"}
                size="md"
                className="min-w-[120px] hover:bg-secondary-dark"
                onClick={() => toggleFollow(profileUser.id)}
              >
                {isFollowing ? "Seguindo" : "Seguir"}
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-on-surface-muted">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Entrou {timeAgo(profileUser.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Brasil
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4 pb-4 border-b border-border-color">
          <div className="text-center">
            <p className="text-lg font-bold text-on-surface">{profileUser.posts_count}</p>
            <p className="text-xs text-on-surface-muted">Posts</p>
          </div>
          <button
            onClick={() => navigate(profileUsername ? `/profile/${profileUsername}/connections?tab=followers` : "/profile/connections?tab=followers")}
            className="text-center transition-colors hover:text-primary"
          >
            <p className="text-lg font-bold text-on-surface">{formatCount(dbFollowersCount ?? profileUser.followers_count)}</p>
            <p className="text-xs text-on-surface-muted">Seguidores</p>
          </button>
          <button
            onClick={() => navigate(profileUsername ? `/profile/${profileUsername}/connections?tab=following` : "/profile/connections?tab=following")}
            className="text-center transition-colors hover:text-primary"
          >
            <p className="text-lg font-bold text-on-surface">{formatCount(dbFollowingCount ?? profileUser.following_count)}</p>
            <p className="text-xs text-on-surface-muted">Seguindo</p>
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: "posts", label: "Posts", icon: <Grid3X3 className="h-4 w-4" /> },
            { id: "liked", label: "Curtidos", icon: <Heart className="h-4 w-4" /> },
            { id: "saved", label: "Salvos", icon: <Bookmark className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-4"
        />

        {/* Tab Content */}
        <div className="pb-6">{tabContent()}</div>
      </div>

      {/* Edit Video Dialog */}
      <Dialog open={Boolean(editingVideo)} onClose={() => setEditingVideo(null)} title="Editar vídeo">
        <div className="space-y-4">
          <Input
            label="Título"
            value={editVideoTitle}
            onChange={(e) => setEditVideoTitle(e.target.value)}
            maxLength={100}
          />
          <Textarea
            label="Descrição"
            value={editVideoDescription}
            onChange={(e) => setEditVideoDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <div className="space-y-3">
            <Select
              label="Categoria"
              value={editVideoCategoryPreset}
              onChange={(value) => {
                setEditVideoCategoryPreset(value);
                if (value === "Outros") {
                  setShowCustomCategoryInput(true);
                  setEditVideoCustomCategory("");
                } else {
                  setShowCustomCategoryInput(false);
                  setEditVideoCustomCategory("");
                }
              }}
              options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            />
            {showCustomCategoryInput && (
              <Input
                label="Escreva a categoria personalizada"
                value={editVideoCustomCategory}
                onChange={(e) => setEditVideoCustomCategory(e.target.value)}
                maxLength={50}
                placeholder="Ex.: Cinema, Futebol..."
              />
            )}
            <p className="text-xs text-on-surface-muted">
              Selecione uma categoria da lista ou use “Outros” para escrever uma personalizada.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditingVideo(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSaveVideoEdit} className="flex-1" disabled={isSavingVideo || !editVideoTitle.trim()}>
              {isSavingVideo ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Editar Perfil">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Avatar
                src={editAvatarPreview || undefined}
                fallback={getInitials(editName)}
                size="xl"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelection} />
            </div>
          </div>
          <Input
            label="Nome de Exibição"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={50}
          />
          <Textarea
            label="Bio"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            maxLength={150}
            rows={3}
          />
          <div className="flex justify-end">
            <span className="text-xs text-on-surface-muted">{editBio.length}/150</span>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
