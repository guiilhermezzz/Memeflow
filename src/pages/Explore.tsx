import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useAppStore } from "@/stores";
import { VideoCardGrid } from "@/components/VideoCard";
import { Input, Avatar, Button } from "@/components/ui";
import { CATEGORIES } from "@/lib/utils";

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { videos, users, followedUsers, toggleFollow } = useAppStore();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const predefinedCategories = CATEGORIES.filter((cat) => cat !== "Outros");

  const publicVideos = videos.filter((v) => {
    const matchesCategory =
      selectedCategory === "Todos" ||
      (selectedCategory === "Outros"
        ? !v.category || !predefinedCategories.includes(v.category as (typeof predefinedCategories)[number])
        : v.category === selectedCategory);

    const matchesSearch =
      normalizedQuery === "" ||
      v.title.toLowerCase().includes(normalizedQuery) ||
      v.description.toLowerCase().includes(normalizedQuery) ||
      v.category.toLowerCase().includes(normalizedQuery);

    return v.status === "public" && matchesCategory && matchesSearch;
  });

  const profileResults = users.filter((profileUser) => {
    if (normalizedQuery === "") return false;

    return (
      profileUser.username.toLowerCase().includes(normalizedQuery) ||
      profileUser.full_name.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in">
      <section>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Explorar</h1>
            <p className="text-sm text-on-surface-muted mt-1">Encontre vídeos e perfis de criadores.</p>
          </div>
          <div className="w-full md:w-auto">
            <Input
              placeholder="Buscar vídeos, categorias ou perfis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-[16rem]"
            />
          </div>
        </div>
      </section>
      {/* Removed 'Em Alta' per request */}

      {/* Category Filters */}
      <section>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setSelectedCategory("Todos")}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
              ${selectedCategory === "Todos"
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-surface-alt text-on-surface-muted hover:bg-surface-hover border border-border-color"
              }
            `}
          >
             Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
                ${selectedCategory === cat
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-surface-alt text-on-surface-muted hover:bg-surface-hover border border-border-color"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <section className="space-y-6">
          {searchQuery.trim() !== "" && (
            <div className="rounded-3xl border border-border-color bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Perfis encontrados</h2>
                  <p className="text-sm text-on-surface-muted">
                    {profileResults.length} usuário(s) correspondentes
                  </p>
                </div>
              </div>

              {profileResults.length === 0 ? (
                <p className="text-sm text-on-surface-muted">Nenhum perfil encontrado.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profileResults.map((suggestedUser) => {
                    const isFollowing = followedUsers.has(suggestedUser.id);
                    return (
                      <div
                        key={suggestedUser.id}
                        className="flex items-center gap-3 rounded-3xl border border-border-color bg-surface-alt p-4"
                      >
                        <Avatar
                          src={suggestedUser.avatar_url || undefined}
                          fallback={suggestedUser.full_name ? suggestedUser.full_name.charAt(0).toUpperCase() : "?"}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface truncate">{suggestedUser.full_name}</p>
                          <p className="text-sm text-on-surface-muted truncate">@{suggestedUser.username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {user && user.id !== suggestedUser.id && (
                            <Button
                              variant={isFollowing ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleFollow(suggestedUser.id)}
                            >
                              {isFollowing ? "Seguindo" : "Seguir"}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${suggestedUser.username}`)}>
                            Ver Perfil
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <section className="flex-1">
            <h2 className="text-lg font-bold text-on-surface mb-3">
              {selectedCategory === "Todos" ? "Descobrir Memes" : selectedCategory}
            </h2>
            {publicVideos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-on-surface-muted">Nenhum conteúdo encontrado nesta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {publicVideos.map((video) => (
                  <VideoCardGrid key={video.id} video={video} />
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
