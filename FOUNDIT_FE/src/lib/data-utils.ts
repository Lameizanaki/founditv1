"use client";

import { appConfig } from "@/lib/config";

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const toText = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
};

export const toNumber = (value: unknown, fallback = 0) => {
  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0]);

  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeStatus = (value: unknown) =>
  toText(value).toLowerCase().replace(/[\s-]+/g, "_");

export const formatMoney = (value: unknown) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(toNumber(value));

export const formatCompactNumber = (value: unknown) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value));

export const formatDate = (value: unknown, fallback = "No date") => {
  const text = toText(value);
  if (!text) {
    return fallback;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getInitials = (value: unknown) => {
  const safe = toText(value, "FoundIt");
  return safe
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export const arrayFromField = (value: unknown) =>
  asArray(value)
    .map((item) => toText(item))
    .filter(Boolean);

const resolveImageUrl = (value: string) => {
  if (!value) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${appConfig.apiBaseUrl}${value}`;
  }

  return value;
};

export const buildImageSource = ({
  data,
  contentType,
  url,
  fallback = "/assets/images/whiteBg.png",
}: {
  data?: unknown;
  contentType?: unknown;
  url?: unknown;
  fallback?: string;
}) => {
  const rawUrl = toText(url);
  if (rawUrl) {
    return resolveImageUrl(rawUrl);
  }

  if (typeof data === "string" && data.trim()) {
    const imageData = data.trim();
    if (
      imageData.startsWith("data:") ||
      imageData.startsWith("http://") ||
      imageData.startsWith("https://") ||
      imageData.startsWith("/")
    ) {
      return resolveImageUrl(imageData);
    }

    return `data:${toText(contentType, "image/jpeg")};base64,${imageData}`;
  }

  if (data instanceof Uint8Array) {
    let binary = "";
    for (let index = 0; index < data.length; index += 1) {
      binary += String.fromCharCode(data[index]);
    }
    return `data:${toText(contentType, "image/jpeg")};base64,${btoa(binary)}`;
  }

  if (Array.isArray(data) && data.every((item) => typeof item === "number")) {
    let binary = "";
    for (let index = 0; index < data.length; index += 1) {
      binary += String.fromCharCode(data[index] as number);
    }
    return `data:${toText(contentType, "image/jpeg")};base64,${btoa(binary)}`;
  }

  return fallback;
};
