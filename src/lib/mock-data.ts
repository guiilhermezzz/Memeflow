export interface User {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  favorite_humor_styles: string[];
  posts_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  video_url: string;
  thumbnail_url: string;
  status: "public" | "private" | "draft";
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  gradient: string;
}

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "message";
  from_user_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export const SAMPLE_USERS: User[] = [
  {
    id: "user-1",
    username: "memeflow",
    full_name: "MemeFlow",
    bio: "Criador de conteúdo para comunidade",
    avatar_url: "",
    favorite_humor_styles: ["Ironia", "Sarcasmo"],
    posts_count: 4,
    followers_count: 1200,
    following_count: 85,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "user-2",
    username: "ana.reacoes",
    full_name: "Ana Reações",
    bio: "Reações curtas e muito humor",
    avatar_url: "",
    favorite_humor_styles: ["Pastelão", "Autodepreciativo"],
    posts_count: 9,
    followers_count: 5400,
    following_count: 180,
    created_at: "2024-02-20T14:30:00Z",
  },
  {
    id: "user-3",
    username: "dev.humor",
    full_name: "Dev Humor",
    bio: "Meme de programação e café",
    avatar_url: "",
    favorite_humor_styles: ["Ironia", "Inteligente"],
    posts_count: 7,
    followers_count: 3200,
    following_count: 150,
    created_at: "2023-11-10T09:15:00Z",
  },
];

export const SAMPLE_VIDEOS: Video[] = [
  {
    id: "video-1",
    user_id: "user-1",
    title: "Reação ao código finalmente funcionar",
    description: "Um momento raro e digno de registro.",
    category: "Reações",
    video_url: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    thumbnail_url: "",
    status: "public",
    views_count: 4320,
    likes_count: 512,
    comments_count: 74,
    created_at: "2024-12-01T10:00:00Z",
    gradient: "linear-gradient(135deg, #7C3AED, #EC4899)",
  },
  {
    id: "video-2",
    user_id: "user-2",
    title: "Quando a reunião podia ter sido um e-mail",
    description: "Sátira do trabalho remoto e das reuniões infinitas.",
    category: "Sátira",
    video_url: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    thumbnail_url: "",
    status: "public",
    views_count: 2140,
    likes_count: 311,
    comments_count: 39,
    created_at: "2024-11-28T14:30:00Z",
    gradient: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  },
  {
    id: "video-3",
    user_id: "user-3",
    title: "CSS é uma linguagem de programação",
    description: "A discussão clássica entre devs.",
    category: "Programação",
    video_url: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    thumbnail_url: "",
    status: "public",
    views_count: 1800,
    likes_count: 244,
    comments_count: 21,
    created_at: "2024-11-25T09:15:00Z",
    gradient: "linear-gradient(135deg, #EC4899, #FACC15)",
  },
];

export const SAMPLE_COMMENTS: Comment[] = [
  {
    id: "comment-1",
    user_id: "user-2",
    video_id: "video-1",
    content: "Essa reação foi perfeita.",
    parent_id: null,
    created_at: "2024-12-01T11:00:00Z",
  },
];

export const SAMPLE_MESSAGES: Message[] = [];

export const SAMPLE_NOTIFICATIONS: Notification[] = [];

export const TRENDING_HASHTAGS = [
  "#MemeDoDia",
  "#ProgramadorVida",
  "#ReaçãoÉpica",
  "#FailBrasil",
  "#SatiraNecessária",
  "#DublagemBR",
  "#HumorNerd",
  "#GatoMeme",
  "#TrabalhoRemoto",
  "#CSSisProgramming",
];
