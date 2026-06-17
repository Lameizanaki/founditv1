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
      return "inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800";
    case "in_review":
      return "inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700";
    case "pending":
      return "inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
    case "failed":
      return "inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600";
  }
};

const isStoredStatus = (value: string | null): value is EkycStoredStatus =>
  value === "not_started" ||
  value === "pending" ||
  value === "in_review" ||
  value === "verified" ||
  value === "failed";
