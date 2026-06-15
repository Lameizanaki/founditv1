"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { appConfig } from "@/lib/config";
import type { ChatMessageResponse } from "@/types/chat";

export function useChatRealtime({
  token,
  roomId,
  enabled,
  onMessage,
}: {
  token: string | null;
  roomId: number | null;
  enabled: boolean;
  onMessage: (message: ChatMessageResponse) => void;
}) {
  const [status, setStatus] = useState<"offline" | "connecting" | "live">("offline");
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const client = new Client({
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: () => {},
      reconnectDelay: 4000,
      webSocketFactory: () => new SockJS(appConfig.webSocketUrl),
    });

    client.onConnect = () => {
      setStatus("live");

      client.subscribe("/user/queue/messages", (frame) => {
        try {
          onMessageRef.current(JSON.parse(frame.body) as ChatMessageResponse);
        } catch {
          // Ignore malformed frames so the socket stays usable.
        }
      });

      if (roomId) {
        client.subscribe(`/topic/chat/rooms/${roomId}`, (frame) => {
          try {
            onMessageRef.current(JSON.parse(frame.body) as ChatMessageResponse);
          } catch {
            // Ignore malformed frames so the socket stays usable.
          }
        });
      }
    };

    client.onStompError = () => {
      setStatus("offline");
    };

    client.onWebSocketClose = () => {
      setStatus("offline");
    };

    void Promise.resolve().then(() => setStatus("connecting"));
    void client.activate();

    return () => {
      setStatus("offline");
      void client.deactivate();
    };
  }, [enabled, roomId, token]);

  return enabled && token ? status : "offline";
}
