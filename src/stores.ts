import { create } from "zustand";
import {
  SAMPLE_COMMENTS,
  SAMPLE_MESSAGES,
  SAMPLE_NOTIFICATIONS,
  SAMPLE_USERS,
  type User,
  type Video,
  type Comment,
  type Message,
  type Notification,
} from "./lib/mock-data";
import { generateId, GRADIENTS } from "./lib/utils";
import { hasSupabaseConfig, supabase, type SupabaseProfile } from "./lib/supabase";

let likesRequestVersion = 0;
let appDataRequestVersion = 0;

// ============ THEME STORE ============
interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  toggleTheme: () =>
    set((state) => {
      const newDark = !state.isDark;
      if (newDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { isDark: newDark };
    }),
  initTheme: () => {
    if (document.documentElement.classList.contains("dark")) return;
    document.documentElement.classList.add("dark");
  },
}));

// ============ AUTH STORE ============
interface Credential {
  email: string;
  password: string;
  userId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  credentials: Credential[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  hydrateSession: () => Promise<void>;
}

const mapProfileToUser = (profile: SupabaseProfile): User => ({
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
});

const syncAuthUser = async (sessionUserId: string | undefined) => {
  if (!sessionUserId || !supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, avatar_url, favorite_humor_styles, posts_count, followers_count, following_count, created_at")
    .eq("id", sessionUserId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileToUser(data as SupabaseProfile);
};

const getRandomGradient = () => GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

const mapVideoRowToVideo = (video: any) => ({
  id: video.id,
  user_id: video.user_id,
  title: video.title,
  description: video.description ?? "",
  category: video.category,
  video_url: video.video_url,
  thumbnail_url: video.thumbnail_url ?? "",
  status: video.status as "public" | "private" | "draft",
  views_count: video.views_count ?? 0,
  likes_count: video.likes_count ?? 0,
  comments_count: video.comments_count ?? 0,
  created_at: video.created_at ?? new Date().toISOString(),
  gradient: getRandomGradient(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  credentials: [],
  login: async (email: string, password: string) => {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;

    const user = await syncAuthUser(data.user.id);
    if (!user) return false;

    useAppStore.setState((state) => ({ users: state.users.some((existing) => existing.id === user.id) ? state.users.map((u) => (u.id === user.id ? user : u)) : [...state.users, user] }));
    set({ user, isAuthenticated: true });
    await useAppStore.getState().loadLikedVideosForCurrentUser();
    return true;
  },
  register: async (username: string, fullName: string, email: string, password: string) => {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
      },
    });
    if (error || !data.user) return false;

    const user = await syncAuthUser(data.user.id);
    if (!user) return false;

    useAppStore.setState((state) => ({ users: state.users.some((existing) => existing.id === user.id) ? state.users.map((u) => (u.id === user.id ? user : u)) : [...state.users, user] }));
    set({ user, isAuthenticated: true });
    await useAppStore.getState().loadLikedVideosForCurrentUser();
    return true;
  },
  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null, isAuthenticated: false });
    useAppStore.setState({ likedVideos: new Set<string>() });
  },
  updateProfile: async (data: Partial<User>) => {
    const current = get().user;
    if (!current || !supabase) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name ?? current.full_name,
        bio: data.bio ?? current.bio,
        username: data.username ?? current.username,
        avatar_url: data.avatar_url ?? current.avatar_url,
      })
      .eq("id", current.id);

    if (error) return;

    const updatedUser = { ...current, ...data };
    useAppStore.setState((state) => ({
      users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    }));
    set({ user: updatedUser });
  },
  hydrateSession: async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    const user = await syncAuthUser(session.user.id);
    if (!user) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    useAppStore.setState((state) => ({ users: state.users.some((existing) => existing.id === user.id) ? state.users.map((u) => (u.id === user.id ? user : u)) : [...state.users, user] }));
    set({ user, isAuthenticated: true });
    await useAppStore.getState().loadLikedVideosForCurrentUser();
  },
}));

useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id !== prevState.user?.id) {
    void useAppStore.getState().loadLikedVideosForCurrentUser();
  }
});

// ============ APP DATA STORE ============
interface AppState {
  users: User[];
  videos: Video[];
  comments: Comment[];
  messages: Message[];
  notifications: Notification[];
  likedVideos: Set<string>;
  savedVideos: Set<string>;
  followedUsers: Set<string>;

  addVideo: (video: Omit<Video, "id" | "views_count" | "likes_count" | "comments_count" | "created_at">) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  updateVideo: (videoId: string, updates: Partial<Pick<Video, "title" | "description" | "category" | "status" | "video_url" | "thumbnail_url">>) => Promise<void>;
  toggleLike: (videoId: string) => Promise<void>;
  loadLikedVideosForCurrentUser: () => Promise<void>;
  toggleSave: (videoId: string) => void;
  toggleFollow: (userId: string) => Promise<void>;
  loadAppData: () => Promise<void>;
  addComment: (videoId: string, content: string, parentId?: string | null) => void;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  incrementViews: (videoId: string) => void;
  getVideoComments: (videoId: string) => Comment[];
  getUserVideos: (userId: string) => Video[];
  getUserById: (userId: string) => User | undefined;
  getConversations: (userId: string) => { user: User; lastMessage: Message; unreadCount: number }[];
  getMessagesWith: (otherUserId: string) => Message[];
}

export const useAppStore = create<AppState>((set, get) => ({
  users: SAMPLE_USERS,
  videos: [],
  comments: SAMPLE_COMMENTS,
  messages: SAMPLE_MESSAGES,
  notifications: SAMPLE_NOTIFICATIONS,
  likedVideos: new Set<string>(),
  savedVideos: new Set<string>(),
  followedUsers: new Set<string>(),

  loadLikedVideosForCurrentUser: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !supabase) {
      set({ likedVideos: new Set<string>() });
      return;
    }

    const requestVersion = ++likesRequestVersion;
    const { data, error } = await supabase
      .from("likes")
      .select("video_id")
      .eq("user_id", currentUser.id);

    if (requestVersion !== likesRequestVersion) return;

    if (!error && data) {
      set({ likedVideos: new Set(data.map((row: any) => row.video_id)) });
      return;
    }

    set({ likedVideos: new Set<string>() });
  },

  addVideo: async (video) => {
    const gradient = getRandomGradient();
    const newVideo: Video = {
      ...video,
      id: generateId(),
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      gradient,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("videos")
        .insert({
          user_id: newVideo.user_id,
          title: newVideo.title,
          description: newVideo.description,
          category: newVideo.category,
          video_url: newVideo.video_url,
          thumbnail_url: newVideo.thumbnail_url,
          status: newVideo.status,
          views_count: newVideo.views_count,
          likes_count: newVideo.likes_count,
          comments_count: newVideo.comments_count,
        })
        .select()
        .single();

      if (!error && data) {
        set((state) => ({ videos: [{ ...mapVideoRowToVideo(data), gradient }, ...state.videos] }));
        return;
      }
    }

    set((state) => ({ videos: [newVideo, ...state.videos] }));
  },

  deleteVideo: async (videoId) => {
    const currentUser = useAuthStore.getState().user;

    if (currentUser && supabase) {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId)
        .eq("user_id", currentUser.id);

      if (error) return;
    }

    set((state) => ({
      videos: state.videos.filter((v) => v.id !== videoId),
    }));
  },

  updateVideo: async (videoId, updates) => {
    const currentUser = useAuthStore.getState().user;

    if (currentUser && supabase) {
      const { data, error } = await supabase
        .from("videos")
        .update({
          title: updates.title,
          description: updates.description,
          category: updates.category,
          status: updates.status,
          video_url: updates.video_url,
          thumbnail_url: updates.thumbnail_url,
        })
        .eq("id", videoId)
        .eq("user_id", currentUser.id)
        .select()
        .single();

      if (!error && data) {
        set((state) => ({
          videos: state.videos.map((video) =>
            video.id === videoId
              ? { ...video, ...mapVideoRowToVideo(data), gradient: video.gradient }
              : video
          ),
        }));
        return;
      }
    }

    set((state) => ({
      videos: state.videos.map((video) =>
        video.id === videoId
          ? {
              ...video,
              ...updates,
              title: updates.title ?? video.title,
              description: updates.description ?? video.description,
              category: updates.category ?? video.category,
              status: updates.status ?? video.status,
              video_url: updates.video_url ?? video.video_url,
              thumbnail_url: updates.thumbnail_url ?? video.thumbnail_url,
            }
          : video
      ),
    }));
  },

  toggleLike: async (videoId) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const isLiked = get().likedVideos.has(videoId);

    if (supabase) {
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .match({ user_id: currentUser.id, video_id: videoId });
        if (error) return;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: currentUser.id, video_id: videoId });
        if (error) return;
      }
    }

    set((state) => {
      const newLiked = new Set(state.likedVideos);
      const newVideos = [...state.videos];
      const videoIndex = newVideos.findIndex((v) => v.id === videoId);
      if (videoIndex === -1) return state;

      if (newLiked.has(videoId)) {
        newLiked.delete(videoId);
        newVideos[videoIndex] = {
          ...newVideos[videoIndex],
          likes_count: Math.max(0, newVideos[videoIndex].likes_count - 1),
        };
      } else {
        newLiked.add(videoId);
        newVideos[videoIndex] = {
          ...newVideos[videoIndex],
          likes_count: newVideos[videoIndex].likes_count + 1,
        };
      }
      return { likedVideos: newLiked, videos: newVideos };
    });
  },

  toggleSave: (videoId) => {
    set((state) => {
      const newSaved = new Set(state.savedVideos);
      if (newSaved.has(videoId)) {
        newSaved.delete(videoId);
      } else {
        newSaved.add(videoId);
      }
      return { savedVideos: newSaved };
    });
  },

  toggleFollow: async (userId) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const followedSet = get().followedUsers;
    const isAlreadyFollowing = followedSet.has(userId);

    if (supabase) {
      if (isAlreadyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .match({ follower_id: currentUser.id, following_id: userId });
        if (error) return;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUser.id, following_id: userId });
        if (error) return;
      }
    }

    set((state) => {
      const newFollowed = new Set(state.followedUsers);
      const newUsers = [...state.users];
      const currentUserIndex = newUsers.findIndex((u) => u.id === currentUser.id);
      const targetUserIndex = newUsers.findIndex((u) => u.id === userId);

      if (newFollowed.has(userId)) {
        newFollowed.delete(userId);
        if (currentUserIndex !== -1) {
          newUsers[currentUserIndex] = {
            ...newUsers[currentUserIndex],
            following_count: Math.max(0, newUsers[currentUserIndex].following_count - 1),
          };
        }
        if (targetUserIndex !== -1) {
          newUsers[targetUserIndex] = {
            ...newUsers[targetUserIndex],
            followers_count: Math.max(0, newUsers[targetUserIndex].followers_count - 1),
          };
        }
      } else {
        newFollowed.add(userId);
        if (currentUserIndex !== -1) {
          newUsers[currentUserIndex] = {
            ...newUsers[currentUserIndex],
            following_count: newUsers[currentUserIndex].following_count + 1,
          };
        }
        if (targetUserIndex !== -1) {
          newUsers[targetUserIndex] = {
            ...newUsers[targetUserIndex],
            followers_count: newUsers[targetUserIndex].followers_count + 1,
          };
        }
      }

      if (currentUserIndex !== -1) {
        const updatedCurrentUser = newUsers[currentUserIndex];
        useAuthStore.setState({ user: updatedCurrentUser });
      }

      return { followedUsers: newFollowed, users: newUsers };
    });
  },

  addComment: (videoId, content, parentId = null) => {
    const auth = useAuthStore.getState();
    if (!auth.user) return;
    const newComment: Comment = {
      id: generateId(),
      user_id: auth.user.id,
      video_id: videoId,
      content,
      parent_id: parentId,
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      comments: [...state.comments, newComment],
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, comments_count: v.comments_count + 1 } : v
      ),
    }));
  },

  sendMessage: async (receiverId, content) => {
    const auth = useAuthStore.getState();
    if (!auth.user || !supabase) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: auth.user.id,
        receiver_id: receiverId,
        content,
      })
      .select()
      .single();

    if (error || !data) return;

    const newMessage: Message = {
      id: data.id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      content: data.content,
      read: data.read,
      created_at: data.created_at,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  markNotificationRead: (notifId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  loadAppData: async () => {
    if (!supabase) return;

    const requestVersion = ++appDataRequestVersion;
    const [{ data: profileData, error: profileError }, { data: videoData, error: videoError }, { data: likesData, error: likesError }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, bio, avatar_url, favorite_humor_styles, posts_count, followers_count, following_count, created_at"),
      supabase
        .from("videos")
        .select("id, user_id, title, description, category, video_url, thumbnail_url, status, views_count, likes_count, comments_count, created_at")
        .eq("status", "public")
        .order("created_at", { ascending: false }),
      supabase.from("likes").select("video_id"),
    ]);

    if (!profileError && profileData) {
      set({ users: profileData.map((profile) => mapProfileToUser(profile as SupabaseProfile)) });
    }

    if (!videoError && videoData) {
      const likesCountByVideoId = new Map<string, number>();
      if (!likesError && likesData) {
        likesData.forEach((row: any) => {
          const videoId = row.video_id;
          likesCountByVideoId.set(videoId, (likesCountByVideoId.get(videoId) ?? 0) + 1);
        });
      }

      const normalizedVideos = videoData.map((row: any) => {
        const mappedVideo = mapVideoRowToVideo(row);
        return {
          ...mappedVideo,
          likes_count: likesCountByVideoId.get(mappedVideo.id) ?? mappedVideo.likes_count,
        };
      });

      set({ videos: normalizedVideos });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = useAuthStore.getState().user;
    const userId = currentUser?.id ?? sessionData?.session?.user?.id;
    if (userId) {
      const [followResponse, messageResponse, likesResponse] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase
          .from("messages")
          .select("id, sender_id, receiver_id, content, read, created_at")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: true }),
        supabase.from("likes").select("video_id").eq("user_id", userId),
      ]);

      if (requestVersion !== appDataRequestVersion) return;

      if (!followResponse.error && followResponse.data) {
        set({ followedUsers: new Set(followResponse.data.map((row: any) => row.following_id)) });
      }

      if (requestVersion !== appDataRequestVersion) return;

      if (!messageResponse.error && messageResponse.data) {
        set({ messages: messageResponse.data as Message[] });
      }

      if (requestVersion !== appDataRequestVersion) return;

      if (!likesResponse.error && likesResponse.data) {
        set({ likedVideos: new Set(likesResponse.data.map((row: any) => row.video_id)) });
      } else {
        set({ likedVideos: new Set<string>() });
      }
    } else {
      set({ likedVideos: new Set<string>() });
    }
  },

  incrementViews: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, views_count: v.views_count + 1 } : v
      ),
    }));
  },

  getVideoComments: (videoId) => {
    return get().comments.filter((c) => c.video_id === videoId);
  },

  getUserVideos: (userId) => {
    return get().videos.filter((v) => v.user_id === userId && v.status === "public");
  },

  getUserById: (userId) => {
    return get().users.find((u) => u.id === userId);
  },

  getConversations: (userId) => {
    const state = get();
    const messages = state.messages;
    const conversationMap = new Map<string, { lastMessage: Message; unreadCount: number }>();

    messages.forEach((msg) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (otherId === userId) return;
      const existing = conversationMap.get(otherId);
      if (!existing || new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
        conversationMap.set(otherId, {
          lastMessage: msg,
          unreadCount: (existing?.unreadCount || 0) + (msg.sender_id !== userId && !msg.read ? 1 : 0),
        });
      } else if (msg.sender_id !== userId && !msg.read) {
        existing.unreadCount += 1;
      }
    });

    const conversations: { user: User; lastMessage: Message; unreadCount: number }[] = [];
    conversationMap.forEach((value, key) => {
      const user = state.users.find((u) => u.id === key);
      if (user) {
        conversations.push({ user, lastMessage: value.lastMessage, unreadCount: value.unreadCount });
      }
    });

    return conversations.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  },

  getMessagesWith: (otherUserId) => {
    const auth = useAuthStore.getState();
    if (!auth.user) return [];
    return get()
      .messages.filter(
        (m) =>
          (m.sender_id === auth.user!.id && m.receiver_id === otherUserId) ||
          (m.sender_id === otherUserId && m.receiver_id === auth.user!.id)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
}));
