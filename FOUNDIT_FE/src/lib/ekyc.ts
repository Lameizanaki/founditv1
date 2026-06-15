import type { AppRole } from "@/types/auth";

export type EkycRole = Exclude<AppRole, "ADMIN">;

export type EkycStoredStatus =
  | "not_started"
  | "pending"
  | "in_review"
  | "verified"
  | "failed";

const ensureWindow = () => typeof window !== "undefined";

const storageIdentity = (identity: string | null | undefined) =>
  encodeURIComponent(identity?.trim() || "anonymous");

const keyPrefix = (role: EkycRole) => role.toLowerCase();

const buildKey = (role: EkycRole, key: string, identity: string | null | undefined) =>
  `${keyPrefix(role)}_${key}:${storageIdentity(identity)}`;

export const readStoredEkycStatus = (role: EkycRole, identity: string | null | undefined) => {
  if (!ensureWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(buildKey(role, "ekyc_status", identity));
  return isStoredStatus(raw) ? raw : null;
};

export const writeStoredEkycStatus = (
  role: EkycRole,
  identity: string | null | undefined,
  status: EkycStoredStatus,
) => {
  if (!ensureWindow()) {
    return;
  }

  window.localStorage.setItem(buildKey(role, "ekyc_status", identity), status);
};

export const readStoredEkycSubmitted = (role: EkycRole, identity: string | null | undefined) => {
  if (!ensureWindow()) {
    return false;
  }

  return window.localStorage.getItem(buildKey(role, "ekyc_submitted", identity)) === "true";
};

export const writeStoredEkycSubmitted = (
  role: EkycRole,
  identity: string | null | undefined,
  submitted: boolean,
) => {
  if (!ensureWindow()) {
    return;
  }

  if (submitted) {
    window.localStorage.setItem(buildKey(role, "ekyc_submitted", identity), "true");
  } else {
    window.localStorage.removeItem(buildKey(role, "ekyc_submitted", identity));
  }
};

export const readStoredEkycDraft = <T>(
  role: EkycRole,
  identity: string | null | undefined,
): T | null => {
  if (!ensureWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(buildKey(role, "ekyc_draft", identity));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeStoredEkycDraft = <T>(
  role: EkycRole,
  identity: string | null | undefined,
  draft: T,
) => {
  if (!ensureWindow()) {
    return;
  }

  window.localStorage.setItem(buildKey(role, "ekyc_draft", identity), JSON.stringify(draft));
};

export const clearStoredEkycDraft = (role: EkycRole, identity: string | null | undefined) => {
  if (!ensureWindow()) {
    return;
  }

  window.localStorage.removeItem(buildKey(role, "ekyc_draft", identity));
};

export const normalizeBackendEkycStatus = (value: unknown): EkycStoredStatus => {
  const status = String(value ?? "").trim().toUpperCase();

  switch (status) {
    case "VERIFIED":
      return "verified";
    case "FAILED":
      return "failed";
    case "IN_REVIEW":
      return "in_review";
    case "PENDING":
      return "pending";
    default:
      return "not_started";
  }
};

export const ekycStatusLabel = (status: EkycStoredStatus) => {
  switch (status) {
    case "verified":
      return "Verified";
    case "in_review":
      return "In Review";
    case "pending":
      return "Pending";
    case "failed":
      return "Needs Attention";
    default:
      return "Not Started";
  }
};

export const ekycStatusClass = (status: EkycStoredStatus) => {
  switch (status) {
    case "verified":
      return "inline-flex items-center rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-medium text-[#166534]";
    case "in_review":
      return "inline-flex items-center rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-medium text-[#1d4ed8]";
    case "pending":
      return "inline-flex items-center rounded-full bg-[#fffbeb] px-3 py-1 text-xs font-medium text-[#a16207]";
    case "failed":
      return "inline-flex items-center rounded-full bg-[#fef2f2] px-3 py-1 text-xs font-medium text-[#b91c1c]";
    default:
      return "inline-flex items-center rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-medium text-[#4b5563]";
  }
};

const isStoredStatus = (value: string | null): value is EkycStoredStatus =>
  value === "not_started" ||
  value === "pending" ||
  value === "in_review" ||
  value === "verified" ||
  value === "failed";
