import { useState, useCallback } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Upload as UploadIcon,
  Link,
  X,
  Film,
  Image,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { Button, Input, Textarea, Select, Progress, Card } from "@/components/ui";
import { CATEGORIES, GRADIENTS, getMediaSource, isSupportedVideoUrl, isValidHttpUrl, resolveTikTokVideoUrl } from "@/lib/utils";
import { toast } from "sonner";

const sanitizeFileName = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, "_");
const makeStoragePath = (folder: "videos" | "thumbnails", userId: string, filename: string) =>
  `${userId}/${folder}/${Date.now()}-${sanitizeFileName(filename)}`;

const uploadToStorage = async (bucket: "videos" | "thumbnails", userId: string, file: File) => {
  if (!supabase) throw new Error("Supabase não configurado.");

  const storagePath = makeStoragePath(bucket, userId, file.name);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type || (bucket === "videos" ? "video/mp4" : "image/png"),
  });

  if (uploadError) {
    throw new Error(`Falha ao enviar ${bucket}: ${uploadError.message || JSON.stringify(uploadError)}`);
  }

  const { data: publicData, error: publicError } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  if (publicError || !publicData?.publicUrl) {
    throw new Error(publicError?.message || `Não foi possível obter URL pública de ${bucket}`);
  }

  return publicData.publicUrl;
};

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addVideo } = useAppStore();
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Título é obrigatório";
    else if (title.length > 100) newErrors.title = "Máximo 100 caracteres";
    if (description.length > 500) newErrors.description = "Máximo 500 caracteres";
    if (selectedCategory === "Outros" && !customCategory.trim()) {
      newErrors.category = "Escreva uma categoria personalizada para 'Outros'";
    }

    if (mode === "upload") {
      if (!videoFile) newErrors.video = "Selecione um vídeo";
    } else {
      if (!videoUrl.trim()) {
        newErrors.url = "Insira a URL do vídeo";
      } else if (!isValidHttpUrl(videoUrl)) {
        newErrors.url = "Insira uma URL válida (https://...)";
      } else if (!isSupportedVideoUrl(videoUrl)) {
        const mediaSource = getMediaSource(videoUrl);
        newErrors.url = mediaSource.type === "unsupported"
          ? "URL de vídeo não suportada. Use MP4/WebM direto ou um link de serviço compatível."
          : "Não foi possível processar essa URL de vídeo.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, selectedCategory, customCategory, videoFile, videoUrl, mode]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
      } else {
        toast.error("Por favor, selecione um arquivo de vídeo");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
      } else {
        toast.error("Por favor, selecione um arquivo de vídeo");
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
      } else {
        toast.error("Por favor, selecione um arquivo de imagem");
      }
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) {
      navigate("/login");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      let uploadUrl = "";
      let thumbnailUrl = thumbnailPreview;

      if (mode === "upload") {
        if (!videoFile) {
          throw new Error("Selecione um vídeo para enviar.");
        }
        if (!hasSupabaseConfig || !supabase) {
          throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para enviar vídeos.");
        }

        uploadUrl = await uploadToStorage("videos", user.id, videoFile);

        if (thumbnailFile) {
          thumbnailUrl = await uploadToStorage("thumbnails", user.id, thumbnailFile);
        }
      } else {
        uploadUrl = videoUrl;
        if (videoUrl && /tiktok\.com/i.test(videoUrl)) {
          const resolvedUrl = await resolveTikTokVideoUrl(videoUrl);
          if (resolvedUrl) {
            uploadUrl = resolvedUrl;
          }
        }

        if (thumbnailFile && hasSupabaseConfig && supabase) {
          thumbnailUrl = await uploadToStorage("thumbnails", user.id, thumbnailFile);
        }
      }

      const gradientIndex = Math.floor(Math.random() * GRADIENTS.length);
      const finalCategory = customCategory.trim() || selectedCategory;
      await addVideo({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        video_url: uploadUrl,
        thumbnail_url: thumbnailUrl || "",
        status: "public",
        gradient: GRADIENTS[gradientIndex],
      });

      clearInterval(interval);
      setUploadProgress(100);
      setUploading(false);
      toast.success("Publicação concluída", {
        description: "Seu vídeo já está visível para todos",
      });

      setTimeout(() => navigate("/"), 1000);
    } catch (error) {
      clearInterval(interval);
      setUploadProgress(0);
      setUploading(false);
      toast.error("Falha ao processar o vídeo", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <Film className="h-16 w-16 text-on-surface-muted mx-auto mb-4" />
        <h2 className="text-xl font-bold text-on-surface mb-2">Faça login para publicar</h2>
        <p className="text-on-surface-muted mb-4">Você precisa estar logado para compartilhar memes</p>
        <Button onClick={() => navigate("/login")}>Entrar</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-fade-in">
      <h1 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">Publicar Meme</h1>
      <p className="text-sm text-on-surface-muted mb-4 sm:mb-6">Compartilhe seu melhor meme com a comunidade</p>

      {/* Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
        <button
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            mode === "upload"
              ? "bg-primary text-white shadow-lg shadow-primary/25"
              : "bg-surface-alt text-on-surface-muted border border-border-color hover:bg-surface-hover"
          }`}
        >
          <UploadIcon className="h-4 w-4" />
          Upload
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            mode === "url"
              ? "bg-primary text-white shadow-lg shadow-primary/25"
              : "bg-surface-alt text-on-surface-muted border border-border-color hover:bg-surface-hover"
          }`}
        >
          <Link className="h-4 w-4" />
          URL do Vídeo
        </button>
      </div>

      {/* Upload Area or URL Input */}
      {mode === "upload" ? (
        <div className="mb-6">
          {!videoFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center transition-all duration-200 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border-color hover:border-primary/50 hover:bg-surface-alt"
              }`}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadIcon className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 ${dragActive ? "text-primary" : "text-on-surface-muted"}`} />
              <p className="text-sm font-medium text-on-surface mb-1">
                {dragActive ? "Solte o vídeo aqui!" : "Arraste e solte seu vídeo aqui"}
              </p>
              <p className="text-xs text-on-surface-muted">ou clique para selecionar</p>
              <p className="text-xs text-on-surface-muted mt-2">MP4, WebM, MOV • Máx. 100MB</p>
            </div>
          ) : (
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Film className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left sm:text-left">
                  <p className="text-sm font-medium text-on-surface truncate">{videoFile.name}</p>
                  <p className="text-xs text-on-surface-muted">
                    {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={() => setVideoFile(null)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover text-on-surface-muted cursor-pointer self-end sm:self-auto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}
          {errors.video && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.video}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <Input
            placeholder="https://youtube.com/watch?v=... ou URL do vídeo"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            error={errors.url}
          />
          <p className="mt-1.5 text-xs text-on-surface-muted">
            Cole a URL de vídeo direta ou de um serviço suportado (YouTube, Vimeo, TikTok, Instagram, etc.)
          </p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border-color bg-surface-alt p-3 sm:p-4 text-xs text-on-surface-muted">
          <p className="font-semibold text-on-surface">Aviso de direitos autorais</p>
          <p className="mt-1">
            Para respeitar termos de uso e copyright, só use vídeos que você possui ou serviços de embed/autorizados. Não insira páginas genéricas que não forneçam vídeo direto.
          </p>
        </div>
        <Input
          label="Título *"
          placeholder="Dê um título épico ao seu meme..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          error={errors.title}
        />
        <div className="flex justify-end">
          <span className="text-xs text-on-surface-muted">{title.length}/100</span>
        </div>

        <Textarea
          label="Descrição"
          placeholder="Descreva seu meme (opcional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          error={errors.description}
        />
        <div className="flex justify-end">
          <span className="text-xs text-on-surface-muted">{description.length}/500</span>
        </div>

        <div className="space-y-3">
          <Select
            label="Categoria"
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              if (value !== "Outros") {
                setCustomCategory("");
              }
            }}
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
          />
          {selectedCategory === "Outros" && (
            <>
              <Input
                label="Ou criar uma categoria personalizada"
                placeholder="Ex.: Cinema, Futebol, Tecnologia..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                maxLength={50}
                error={errors.category}
              />
              <p className="text-xs text-on-surface-muted">
                Escreva a categoria personalizada para concluir a publicação.
              </p>
            </>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface-muted">
            Thumbnail (opcional)
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border-color bg-surface-alt p-4 transition-colors hover:border-primary/50 hover:bg-surface-hover">
            <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Thumbnail preview" className="h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <Image className="h-8 w-8 text-on-surface-muted mb-2" />
                <p className="text-sm font-medium text-on-surface">Adicionar thumbnail</p>
                <p className="text-xs text-on-surface-muted">PNG, JPG ou WEBP</p>
              </div>
            )}
          </label>
        </div>

      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-on-surface-muted">Enviando...</span>
            <span className="text-sm font-medium text-primary">{Math.min(100, Math.round(uploadProgress))}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={uploading}
          className="w-full sm:flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full sm:flex-1"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Publicar Meme
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
