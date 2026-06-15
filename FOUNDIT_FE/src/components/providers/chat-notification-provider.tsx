"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth } from "@/components/providers/auth-provider";
import { appConfig } from "@/lib/config";
import type { AppRole } from "@/types/auth";
import type { ChatMessageResponse } from "@/types/chat";

interface ChatNotificationContextValue {
  unreadCount: number;
  markChatRead: () => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextValue | undefined>(undefined);

const getStorageKey = (role: AppRole | null) =>
  role ? `foundit:${role.toLowerCase()}:chat:unread-count` : null;

const readStoredUnreadCount = (role: AppRole | null) => {
  const storageKey = getStorageKey(role);
  if (!storageKey || typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(storageKey);
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const isChatPathForRole = (pathname: string, role: AppRole | null) => {
  if (!role) {
    return false;
  }

  const prefix = `/${role.toLowerCase()}`;
  return pathname.startsWith(`${prefix}/`) && pathname.endsWith("/chat");
};

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const role = session?.user.role ?? null;
  const token = session?.token ?? null;
  const currentEmail = session?.user.email?.toLowerCase() ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const currentEmailRef = useRef(currentEmail);

  useEffect(() => {
    currentEmailRef.current = currentEmail;
  }, [currentEmail]);

  useEffect(() => {
    void Promise.resolve().then(() => setUnreadCount(readStoredUnreadCount(role)));
  }, [role]);

  useEffect(() => {
    const storageKey = getStorageKey(role);
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, String(unreadCount));
  }, [role, unreadCount]);

  useEffect(() => {
    if (!isChatPathForRole(pathname, role) || unreadCount === 0) {
      return;
    }

    void Promise.resolve().then(() => setUnreadCount(0));
  }, [pathname, role, unreadCount]);

  useEffect(() => {
    if (!token || !role) {
      return;
    }

    const client = new Client({
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: () => {},
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(appConfig.webSocketUrl),
    });

    client.onConnect = () => {
      client.subscribe("/user/queue/messages", (frame) => {
        try {
          const payload = JSON.parse(frame.body) as ChatMessageResponse;
          const senderEmail = payload.senderEmail?.toLowerCase() ?? null;

          if (!senderEmail || senderEmail === currentEmailRef.current) {
            return;
          }

          if (isChatPathForRole(window.location.pathname, role)) {
            return;
          }

          setUnreadCount((count) => count + 1);
        } catch {
          // Ignore malformed payloads so the provider stays active.
        }
      });
    };

    void client.activate();

    return () => {
      void client.deactivate();
    };
  }, [role, token]);

  const value = useMemo<ChatNotificationContextValue>(
    () => ({
      unreadCount,
      markChatRead: () => setUnreadCount(0),
    }),
    [unreadCount],
  );

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications() {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    throw new Error("useChatNotifications must be used within ChatNotificationProvider.");
  }

  return context;
}
