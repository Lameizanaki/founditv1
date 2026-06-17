"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  type ChangeEvent,
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiRequest, toErrorMessage } from "@/lib/api";
import {
  clearStoredEkycDraft,
  ekycStatusClass,
  ekycStatusLabel,
  normalizeBackendEkycStatus,
  readStoredEkycDraft,
  readStoredEkycStatus,
  readStoredEkycSubmitted,
  type EkycRole,
  type EkycStoredStatus,
  writeStoredEkycDraft,
  writeStoredEkycStatus,
  writeStoredEkycSubmitted,
} from "@/lib/ekyc";

type VerificationState = "idle" | "processing" | "completed" | "failed";

type GenderValue = "" | "M" | "F";

type EkycDraft = {
  currentStep: number;
  fullName: string;
  dob: string;
  nationality: string;
  gender: GenderValue;
  phone: string;
  selectedIdType: string;
  idNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  livenessStatus: VerificationState;
  ocrStatus: VerificationState;
  ekycStatus: EkycStoredStatus;
  submitted: boolean;
};

type EkycReviewResponse = {
  fullName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  status?: string;
  failureReason?: string | null;
  ocrVerified?: boolean | null;
  faceVerified?: boolean | null;
};

type OcrResponse = {
  ocr_match?: boolean;
  mismatch_field?: string;
  expected?: string;
  actual?: string;
  failure_reason?: string;
  sent_to_admin_review?: boolean;
};

const totalSteps = 6;
const phoneCountryCode = "+855";
const maxIdBytes = 2 * 1024 * 1024;

const cambodianCities = [
  "Phnom Penh",
  "Siem Reap",
  "Battambang",
  "Sihanoukville",
  "Kampong Cham",
  "Kampot",
  "Kep",
  "Poipet",
  "Ta Khmau",
  "Pursat",
  "Takeo",
  "Svay Rieng",
  "Kratie",
  "Stung Treng",
  "Sen Monorom",
  "Banlung",
];

const cambodianProvinces = [
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratie",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Phnom Penh",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takeo",
  "Tboung Khmum",
];

const statusLabel = (status: VerificationState) => {
  switch (status) {
    case "completed":
      return "Completed";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
};

const statusBadgeClass = (status: VerificationState) => {
  switch (status) {
    case "completed":
      return "inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800";
    case "processing":
      return "inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
    case "failed":
      return "inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600";
  }
};

const dashboardRoute = (role: EkycRole) =>
  role === "FREELANCER" ? "/freelancer/dashboard" : "/client/dashboard";

const clampStep = (step: number) => Math.max(1, Math.min(totalSteps, step));

const normalizePhoneInput = (value: string) =>
  value
    .replace(/^\s*(?:\+?855|0)\s*/, "")
    .replace(/[^\d\s-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

const normalizeCity = (value: string) => (cambodianCities.includes(value) ? value : "");

const normalizeProvince = (value: string) =>
  cambodianProvinces.includes(value) ? value : "";

const getCambodianPhoneNumber = (value: string) => {
  const localNumber = normalizePhoneInput(value).trim();
  return localNumber ? `${phoneCountryCode} ${localNumber}` : phoneCountryCode;
};

const isValidCambodianPhoneNumber = (value: string) => {
  const digits = normalizePhoneInput(value).replace(/\D/g, "");
  return /^\d{8,9}$/.test(digits);
};

const formatDateOfBirth = (date: string) => {
  if (!date) {
    return "";
  }

  if (date.includes("-") && date.split("-")[0]?.length === 4) {
    return date;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isImageFile = (file: File) => file.type.toLowerCase().startsWith("image/");

const convertGenderForBackend = (gender: GenderValue) => {
  if (gender === "M") return "MALE";
  if (gender === "F") return "FEMALE";
  return gender;
};

const verificationPassed = (response: unknown) => {
  if (!response || typeof response !== "object") {
    return false;
  }

  const record = response as Record<string, unknown>;
  if (String(record.status ?? "").toLowerCase() === "success") {
    return true;
  }

  const verification = record.verification_result;
  if (
    verification &&
    typeof verification === "object" &&
    (verification as Record<string, unknown>).verification_passed === true
  ) {
    return true;
  }

  const faceMatch = record.face_match;
  if (
    faceMatch &&
    typeof faceMatch === "object" &&
    (faceMatch as Record<string, unknown>).matched === true
  ) {
    return true;
  }

  return false;
};

const verificationFailureReason = (response: unknown) => {
  if (!response || typeof response !== "object") {
    return null;
  }

  const record = response as Record<string, unknown>;
  const directReason = record.failure_reason ?? record.failureReason;
  if (typeof directReason === "string" && directReason.trim()) {
    return directReason.trim();
  }

  const verification = record.verification_result;
  if (verification && typeof verification === "object") {
    const reason = (verification as Record<string, unknown>).reason;
    if (typeof reason === "string" && reason.trim()) {
      return reason.trim();
    }
  }

  return null;
};

export function EkycFlowClient({ role }: { role: EkycRole }) {
  const router = useRouter();
  const { session } = useAuth();
  const identity = session?.user.email ?? null;
  const token = session?.token ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [identityVerificationRequired, setIdentityVerificationRequired] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality] = useState("Cambodia");
  const [gender, setGender] = useState<GenderValue>("");
  const [phone, setPhone] = useState("");

  const [selectedIdType] = useState("National ID");
  const [idNumber, setIdNumber] = useState("");
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country] = useState("Cambodia");

  const [livenessStatus, setLivenessStatus] = useState<VerificationState>("idle");
  const [ocrStatus, setOcrStatus] = useState<VerificationState>("idle");
  const [ekycStatus, setEkycStatus] = useState<EkycStoredStatus>("not_started");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [liveFaceFile, setLiveFaceFile] = useState<File | null>(null);
  const [liveFacePreviewUrl, setLiveFacePreviewUrl] = useState<string | null>(null);

  const progress = Math.round((currentStep / totalSteps) * 100);

  const saveStatus = (status: EkycStoredStatus, submitted: boolean) => {
    setEkycStatus(status);
    setHasSubmitted(submitted);
    if (identity) {
      writeStoredEkycStatus(role, identity, status);
      writeStoredEkycSubmitted(role, identity, submitted);
    }
  };

  const releasePreviewUrl = (ref: MutableRefObject<boolean>, url: string | null) => {
    if (url && ref.current) {
      URL.revokeObjectURL(url);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    const videoElement = videoRef.current;
    if (!videoElement || streamRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;
      await videoElement.play();
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to access the camera. Please allow camera permission.",
        );
      }
    }
  };

  const captureLiveFace = async () => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (!videoElement || !canvasElement) {
      throw new Error("Camera is not ready.");
    }

    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;
    canvasElement.width = width;
    canvasElement.height = height;

    const context = canvasElement.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is not available.");
    }

    context.drawImage(videoElement, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvasElement.toBlob(
        (value) => {
          if (value) {
            resolve(value);
            return;
          }
          reject(new Error("Failed to capture the live face image."));
        },
        "image/jpeg",
        0.9,
      );
    });

    const file = new File([blob], "live_face.jpg", { type: "image/jpeg" });
    setLiveFaceFile(file);
    releasePreviewUrl(mountedRef, liveFacePreviewUrl);
    setLiveFacePreviewUrl(URL.createObjectURL(blob));
    return file;
  };

  const syncCurrentStatus = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await apiRequest<EkycReviewResponse | null>("/ekyc/current", { token });
      if (!response) {
        saveStatus("not_started", false);
        setFailureReason("");
        return;
      }

      const normalized = normalizeBackendEkycStatus(response.status);
      const submitted =
        normalized === "in_review" ||
        normalized === "verified" ||
        normalized === "failed" ||
        readStoredEkycSubmitted(role, identity);

      saveStatus(normalized, submitted);
      setFailureReason(response.failureReason ?? "");
      setOcrStatus(response.ocrVerified ? "completed" : "idle");
      setLivenessStatus(response.faceVerified ? "completed" : "idle");

      if (response.fullName) setFullName(response.fullName);
      if (response.dateOfBirth) setDob(response.dateOfBirth);
      if (response.nationality) {
        // Kept for completeness even though the form is Cambodia-only.
      }
      if (response.gender === "MALE") setGender("M");
      if (response.gender === "FEMALE") setGender("F");
      if (response.phoneNumber) setPhone(normalizePhoneInput(response.phoneNumber));
      if (response.addressLine1) setAddressLine1(response.addressLine1);
      if (response.addressLine2) setAddressLine2(response.addressLine2);
      if (response.city) setCity(normalizeCity(response.city) || response.city);
      if (response.state_province) {
        setStateProvince(normalizeProvince(response.state_province) || response.state_province);
      }
      if (response.country) {
        // Country stays fixed to Cambodia in the UI.
      }

      if (submitted) {
        setCurrentStep(6);
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(toErrorMessage(error));
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const timer = window.setTimeout(() => {
      if (!identity) {
        setLoadingSettings(false);
        return;
      }

      const storedDraft = readStoredEkycDraft<EkycDraft>(role, identity);
      const storedStatus = readStoredEkycStatus(role, identity) ?? "not_started";
      const storedSubmitted = readStoredEkycSubmitted(role, identity);

      if (storedDraft) {
        setCurrentStep(clampStep(storedDraft.currentStep));
        setFullName(storedDraft.fullName);
        setDob(storedDraft.dob);
        setGender(storedDraft.gender);
        setPhone(normalizePhoneInput(storedDraft.phone));
        setIdNumber(storedDraft.idNumber);
        setAddressLine1(storedDraft.addressLine1);
        setAddressLine2(storedDraft.addressLine2);
        setCity(normalizeCity(storedDraft.city));
        setStateProvince(normalizeProvince(storedDraft.state));
        setPostalCode(storedDraft.postalCode);
        setLivenessStatus(storedDraft.livenessStatus);
        setOcrStatus(storedDraft.ocrStatus);
        setEkycStatus(storedDraft.ekycStatus);
        setHasSubmitted(storedDraft.submitted);
      } else {
        setEkycStatus(storedStatus);
        setHasSubmitted(storedSubmitted);
      }

      void (async () => {
        try {
          const settings = await apiRequest<{ identityVerificationRequired?: boolean }>(
            "/ekyc/settings",
            { token: token ?? undefined, method: "GET" },
          );
          if (!mountedRef.current) {
            return;
          }

          setIdentityVerificationRequired(settings.identityVerificationRequired !== false);
          if (settings.identityVerificationRequired === false) {
            setErrorMessage(
              "Identity verification is currently disabled by the administrator.",
            );
          }
        } catch {
          if (mountedRef.current) {
            setIdentityVerificationRequired(true);
          }
        } finally {
          if (mountedRef.current) {
            setLoadingSettings(false);
          }
        }
      })();

      void syncCurrentStatus();
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(timer);
      stopCamera();
      releasePreviewUrl(mountedRef, liveFacePreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, role, token]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    writeStoredEkycDraft(role, identity, {
      currentStep,
      fullName,
      dob,
      nationality,
      gender,
      phone,
      selectedIdType,
      idNumber,
      addressLine1,
      addressLine2,
      city,
      state: stateProvince,
      postalCode,
      country,
      livenessStatus,
      ocrStatus,
      ekycStatus,
      submitted: hasSubmitted,
    });
  }, [
    addressLine1,
    addressLine2,
    city,
    country,
    currentStep,
    dob,
    ekycStatus,
    fullName,
    gender,
    hasSubmitted,
    idNumber,
    identity,
    livenessStatus,
    nationality,
    ocrStatus,
    phone,
    postalCode,
    role,
    selectedIdType,
    stateProvince,
  ]);

  useEffect(() => {
    if (currentStep !== 3) {
      stopCamera();
      return;
    }

    const timer = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
  }, [currentStep]);

  const validatePersonalStep = () => {
    if (!fullName.trim()) return "Full legal name is required.";
    if (!dob) return "Date of birth is required.";

    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) return "Enter a valid date of birth.";
    if (parsed > new Date()) return "Date of birth cannot be in the future.";
    if (nationality !== "Cambodia") return "Nationality must be Cambodia.";
    if (!gender) return "Sex is required.";
    if (!isValidCambodianPhoneNumber(phone)) {
      return "Enter a valid Cambodian phone number with 8 or 9 digits after +855.";
    }
    return null;
  };

  const validateIdStep = () => {
    if (!idNumber.trim()) return "ID number is required.";
    if (!idFrontFile) return "Front ID image is required.";
    if (!idBackFile) return "Back ID image is required.";
    if (!isImageFile(idFrontFile)) return "Front ID must be a JPG or PNG image.";
    if (!isImageFile(idBackFile)) return "Back ID must be a JPG or PNG image.";
    if (idFrontFile.size > maxIdBytes) return "Front ID must be 2MB or smaller.";
    if (idBackFile.size > maxIdBytes) return "Back ID must be 2MB or smaller.";
    return null;
  };

  const validateAddressStep = () => {
    if (!addressLine1.trim()) return "Address line 1 is required.";
    if (!normalizeCity(city)) return "Select a city in Cambodia.";
    if (!normalizeProvince(stateProvince)) return "Select a province in Cambodia.";
    if (country !== "Cambodia") return "Country must be Cambodia.";
    return null;
  };

  const submitStep1 = async () => {
    if (!token) throw new Error("Please sign in again.");

    await apiRequest("/ekyc/create", {
      method: "POST",
      token,
      body: {
        fullName,
        dateOfBirth: formatDateOfBirth(dob),
        nationality: "Cambodia",
        gender: convertGenderForBackend(gender),
        phoneNumber: getCambodianPhoneNumber(phone),
      },
    });
  };

  const submitStep2 = async () => {
    if (!token) throw new Error("Please sign in again.");
    if (!idFrontFile || !idBackFile) throw new Error("Front and back ID images are required.");

    const formData = new FormData();
    formData.append("frontId", idFrontFile);
    formData.append("backId", idBackFile);

    await apiRequest("/ekyc/create/id-card", {
      method: "PUT",
      token,
      body: formData,
    });
  };

  const submitLiveness = async () => {
    if (!token) throw new Error("Please sign in again.");
    const file = liveFaceFile ?? (await captureLiveFace());

    setLivenessStatus("processing");

    try {
      const response = await apiRequest<unknown>("/ekyc/verify/liveness", {
        method: "PUT",
        token,
        body: (() => {
          const formData = new FormData();
          formData.append("live_face_image", file);
          return formData;
        })(),
      });

      setLivenessStatus("completed");
      if (!verificationPassed(response)) {
        saveStatus("pending", true);
        setFailureReason(
          verificationFailureReason(response) ??
            "Automatic liveness verification did not pass. Your eKYC was sent for admin review.",
        );
      }
    } catch (error) {
      setLivenessStatus("completed");
      saveStatus("pending", true);
      setFailureReason(toErrorMessage(error));
    }
  };

  const submitOcr = async () => {
    if (!token) throw new Error("Please sign in again.");
    setOcrStatus("processing");

    try {
      const response = await apiRequest<OcrResponse>("/ekyc/verify/ocr", {
        method: "PUT",
        token,
      });

      setOcrStatus("completed");
      if (response.ocr_match === false || response.sent_to_admin_review) {
        saveStatus("pending", true);
        setFailureReason(
          response.mismatch_field
            ? `OCR mismatch on ${response.mismatch_field}. Expected "${response.expected ?? ""}" but got "${response.actual ?? ""}".`
            : response.failure_reason ?? "OCR verification needs manual review.",
        );
      }
    } catch (error) {
      setOcrStatus("completed");
      saveStatus("pending", true);
      setFailureReason(toErrorMessage(error));
    }
  };

  const submitStep5 = async () => {
    if (!token) throw new Error("Please sign in again.");

    await apiRequest("/ekyc/create/address", {
      method: "PUT",
      token,
      body: {
        addressLine1,
        addressLine2,
        city,
        state_province: stateProvince,
        postal_code: postalCode,
        country: "Cambodia",
      },
    });
  };

  const submitForReview = async () => {
    if (!token) throw new Error("Please sign in again.");

    const response = await apiRequest<EkycReviewResponse>("/ekyc/review", {
      method: "GET",
      token,
    });

    const normalized = normalizeBackendEkycStatus(response.status);
    saveStatus(normalized, normalized !== "failed");
    setFailureReason(response.failureReason ?? "");
    clearStoredEkycDraft(role, identity);

    setSuccessMessage(
      normalized === "verified"
        ? "eKYC verification completed. Redirecting to your dashboard..."
        : "eKYC submitted for review. Redirecting to your dashboard...",
    );

    window.setTimeout(() => {
      router.push(dashboardRoute(role));
    }, 900);
  };

  const goToStep = (step: number) => {
    setCurrentStep(clampStep(step));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const onContinue = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!identityVerificationRequired) {
      setErrorMessage("Identity verification is currently disabled by the administrator.");
      return;
    }

    const validationError =
      currentStep === 1
        ? validatePersonalStep()
        : currentStep === 2
          ? validateIdStep()
          : currentStep === 5
            ? validateAddressStep()
            : null;

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (currentStep === 1) await submitStep1();
      if (currentStep === 2) await submitStep2();
      if (currentStep === 3) await submitLiveness();
      if (currentStep === 4) await submitOcr();
      if (currentStep === 5) await submitStep5();

      setCurrentStep((value) => clampStep(value + 1));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitReview = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validatePersonalStep() || validateIdStep() || validateAddressStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await submitForReview();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onIdFrontUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (!isImageFile(file)) {
      setErrorMessage("Front ID must be a JPG or PNG image.");
      event.target.value = "";
      return;
    }
    setErrorMessage("");
    setIdFrontFile(file);
  };

  const onIdBackUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (!isImageFile(file)) {
      setErrorMessage("Back ID must be a JPG or PNG image.");
      event.target.value = "";
      return;
    }
    setErrorMessage("");
    setIdBackFile(file);
  };

  const reviewLocked =
    hasSubmitted && (ekycStatus === "pending" || ekycStatus === "in_review" || ekycStatus === "verified");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex justify-center bg-white py-3">
        <div className="flex h-16 w-32 items-center">
          <Image
            alt="FOUNDIT"
            className="h-full w-full object-contain"
            height={64}
            priority
            src="/assets/images/logo.png"
            width={128}
          />
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <button
              className="mt-1 rounded-md p-1 text-slate-700 transition hover:bg-slate-100"
              onClick={() => router.push(dashboardRoute(role))}
              type="button"
            >
              Back
            </button>

            <div>
              <h1 className="text-[32px] font-semibold leading-none text-slate-900">
                Identity Verification
              </h1>
              <p className="mt-2 text-[14px] text-slate-500">
                Verify your identity to unlock all features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={ekycStatusClass(ekycStatus)}>{ekycStatusLabel(ekycStatus)}</span>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-700">
              Secure and encrypted
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl">
          <div className="mb-2 flex items-center justify-between text-[14px]">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-slate-500">{progress}% Complete</span>
          </div>

          <div className="h-2 w-full rounded-full bg-emerald-100">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {!loadingSettings && !identityVerificationRequired ? (
        <div className="mx-auto mt-6 max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Identity verification is currently disabled by the administrator. The eKYC form is unavailable until this setting is enabled again.
        </div>
      ) : null}

      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 md:gap-8">
          {[
            "Personal Info",
            "ID Verification",
            "Liveness Check",
            "OCR Verification",
            "Address",
            "Review",
          ].map((label, index) => {
            const step = index + 1;
            const active = currentStep === step;
            const done = currentStep > step;
            return (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-slate-100 text-slate-500"
                  }`}
                >
                  {done ? "OK" : step}
                </div>
                <span className={currentStep >= step ? "text-[14px] text-slate-900" : "text-[14px] text-slate-500"}>
                  {label}
                </span>
                {step < totalSteps ? <span className="text-slate-400">/</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-4xl">
          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-[14px] text-green-800">
              {successMessage}
            </div>
          ) : null}

          {reviewLocked ? (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-[14px] text-blue-700">
              Your eKYC has already been submitted. You can review the details here while waiting for the final admin decision.
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">Personal Information</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Please provide your personal details as they appear on your government-issued ID
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[14px] font-medium text-slate-900">Full Legal Name *</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="John Doe"
                    type="text"
                    value={fullName}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Date of Birth *</label>
                    <input
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                      onChange={(event) => setDob(event.target.value)}
                      type="date"
                      value={dob}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Nationality *</label>
                    <input
                      className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-[14px] text-slate-700 outline-none"
                      readOnly
                      type="text"
                      value={nationality}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Sex *</label>
                    <div className="relative">
                      <select
                        className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-[14px] font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        onChange={(event) => setGender(event.target.value as GenderValue)}
                        value={gender}
                      >
                        <option value="">Select sex</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Phone Number *</label>
                    <div className="flex h-12 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[14px] focus-within:border-emerald-500">
                      <span className="flex items-center border-r border-slate-200 bg-slate-100 px-4 text-slate-700">
                        {phoneCountryCode}
                      </span>
                      <input
                        className="h-full min-w-0 flex-1 bg-transparent px-4 outline-none"
                        inputMode="tel"
                        onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
                        placeholder="12 345 678"
                        type="text"
                        value={phone}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-[14px] font-medium text-blue-700">Why do we need this information?</p>
                <p className="mt-1 text-[14px] leading-6 text-blue-800">
                  We verify your identity to ensure platform safety and comply with legal requirements. Your data is encrypted and secure.
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">Government-Issued ID</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Upload a clear photo of your government-issued identification document
              </p>

              <div className="mt-6">
                <label className="mb-2 block text-[14px] font-medium text-slate-900">Choose ID Type *</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button className="h-12 rounded-xl border border-emerald-500 bg-emerald-500 text-[14px] font-medium text-white" type="button">
                    {selectedIdType}
                  </button>
                  <button className="h-12 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 text-[14px] font-medium text-slate-400 opacity-70" disabled type="button">
                    Driver&apos;s License
                  </button>
                  <button className="h-12 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 text-[14px] font-medium text-slate-400 opacity-70" disabled type="button">
                    Passport
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-[14px] font-medium text-slate-900">ID Number *</label>
                <input
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                  onChange={(event) => setIdNumber(event.target.value)}
                  placeholder="Enter your ID number"
                  type="text"
                  value={idNumber}
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-[14px] font-medium text-slate-900">Upload Front of ID *</label>
                <label className="flex min-h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center transition hover:bg-slate-50">
                  <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onIdFrontUpload} type="file" />
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-900">
                    Upload ID Front
                  </div>
                  <p className="mt-3 text-[12px] text-slate-500">JPG or PNG / Max 2MB</p>
                  <p className="text-[12px] text-slate-500">Make sure all corners are visible</p>
                  {idFrontFile ? (
                    <p className="mt-3 text-[13px] font-medium text-emerald-500">{idFrontFile.name}</p>
                  ) : null}
                </label>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-[14px] font-medium text-slate-900">Upload Back of ID *</label>
                <label className="flex min-h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center transition hover:bg-slate-50">
                  <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onIdBackUpload} type="file" />
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-900">
                    Upload ID Back
                  </div>
                  <p className="mt-3 text-[12px] text-slate-500">JPG or PNG / Max 2MB</p>
                  <p className="text-[12px] text-slate-500">Make sure all corners are visible</p>
                  {idBackFile ? (
                    <p className="mt-3 text-[13px] font-medium text-emerald-500">{idBackFile.name}</p>
                  ) : null}
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[14px] font-medium text-amber-700">Tips for a clear photo:</p>
                <ul className="mt-2 space-y-1 text-[14px] text-amber-800">
                  <li>Use good lighting</li>
                  <li>Place ID on a plain background</li>
                  <li>Ensure all text is readable</li>
                  <li>No glare or shadows</li>
                </ul>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">Liveness Verification</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Align your face in the frame and click Continue to verify.
              </p>

              <div className="mt-6">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="aspect-video w-full">
                    <video ref={videoRef} autoPlay className="h-full w-full object-cover" muted playsInline />
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-56 rounded-full border-4 border-white/70" />
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {liveFacePreviewUrl ? (
                  <p className="mt-3 text-[13px] font-medium text-emerald-500">
                    Face image captured.
                  </p>
                ) : null}

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-medium text-slate-900">Liveness status</p>
                      <p className="text-[12px] text-slate-500">
                        This stage verifies that you are present in front of the camera.
                      </p>
                    </div>
                    <span className={statusBadgeClass(livenessStatus)}>{statusLabel(livenessStatus)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">OCR Verification</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                We will compare your ID image against the personal information you entered.
              </p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-slate-900">OCR status</p>
                    <p className="text-[12px] text-slate-500">
                      ID extraction and matching will run when you continue.
                    </p>
                  </div>
                  <span className={statusBadgeClass(ocrStatus)}>{statusLabel(ocrStatus)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">Address Verification</h2>
              <p className="mt-1 text-[14px] text-slate-500">Provide your address in Cambodia</p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[14px] font-medium text-slate-900">Address Line 1 *</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                    onChange={(event) => setAddressLine1(event.target.value)}
                    placeholder="123 Main Street"
                    type="text"
                    value={addressLine1}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-medium text-slate-900">Address Line 2 (optional)</label>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                    onChange={(event) => setAddressLine2(event.target.value)}
                    placeholder="Apt 4B"
                    type="text"
                    value={addressLine2}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">City *</label>
                    <div className="relative">
                      <select
                        className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-[14px] font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        onChange={(event) => setCity(event.target.value)}
                        value={city}
                      >
                        <option value="">Select city</option>
                        {cambodianCities.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Province *</label>
                    <div className="relative">
                      <select
                        className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-[14px] font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                        onChange={(event) => setStateProvince(event.target.value)}
                        value={stateProvince}
                      >
                        <option value="">Select province</option>
                        {cambodianProvinces.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Postal Code (optional)</label>
                    <input
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] outline-none focus:border-emerald-500"
                      onChange={(event) => setPostalCode(event.target.value)}
                      placeholder="12000"
                      type="text"
                      value={postalCode}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-medium text-slate-900">Country</label>
                    <input
                      className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-[14px] text-slate-700 outline-none"
                      readOnly
                      type="text"
                      value={country}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[24px] font-medium text-slate-900">Review Your Information</h2>
              <p className="mt-1 text-[14px] text-slate-500">
                Please review all information before submitting
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[14px]">
                  <p className="text-slate-500">Overall KYC</p>
                  <p className="mt-1 font-medium text-slate-900">{ekycStatusLabel(ekycStatus)}</p>
                  <span className={`mt-2 ${ekycStatusClass(ekycStatus)}`}>{ekycStatusLabel(ekycStatus)}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[14px]">
                  <p className="text-slate-500">Liveness</p>
                  <p className="mt-1 font-medium text-slate-900">{statusLabel(livenessStatus)}</p>
                  <span className={`mt-2 ${statusBadgeClass(livenessStatus)}`}>{statusLabel(livenessStatus)}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[14px]">
                  <p className="text-slate-500">OCR</p>
                  <p className="mt-1 font-medium text-slate-900">{statusLabel(ocrStatus)}</p>
                  <span className={`mt-2 ${statusBadgeClass(ocrStatus)}`}>{statusLabel(ocrStatus)}</span>
                </div>
              </div>

              {failureReason ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800">
                  {failureReason}
                </div>
              ) : null}

              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[18px] font-medium text-slate-900">Personal Information</h3>
                    {!reviewLocked ? (
                      <button className="text-[14px] text-slate-700 hover:underline" onClick={() => goToStep(1)} type="button">
                        Edit
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5 text-[14px]">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="text-slate-500">Full Name:</div>
                      <div className="text-right text-slate-900">{fullName || "-"}</div>

                      <div className="text-slate-500">Date of Birth:</div>
                      <div className="text-right text-slate-900">{dob || "-"}</div>

                      <div className="text-slate-500">Sex:</div>
                      <div className="text-right text-slate-900">
                        {gender === "M" ? "Male" : gender === "F" ? "Female" : "-"}
                      </div>

                      <div className="text-slate-500">Nationality:</div>
                      <div className="text-right text-slate-900">{nationality}</div>

                      <div className="text-slate-500">Phone:</div>
                      <div className="text-right text-slate-900">{getCambodianPhoneNumber(phone)}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[18px] font-medium text-slate-900">ID Verification</h3>
                    {!reviewLocked ? (
                      <button className="text-[14px] text-slate-700 hover:underline" onClick={() => goToStep(2)} type="button">
                        Edit
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5 text-[14px] text-slate-900">
                    <p><span className="text-slate-500">ID Type:</span> {selectedIdType}</p>
                    <p className="mt-2"><span className="text-slate-500">ID Number:</span> {idNumber || "-"}</p>
                    <p className="mt-2"><span className="text-slate-500">Front:</span> {idFrontFile?.name || "-"}</p>
                    <p className="mt-2"><span className="text-slate-500">Back:</span> {idBackFile?.name || "-"}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[18px] font-medium text-slate-900">Address Verification</h3>
                    {!reviewLocked ? (
                      <button className="text-[14px] text-slate-700 hover:underline" onClick={() => goToStep(5)} type="button">
                        Edit
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5 text-[14px] text-slate-900">
                    <p>{addressLine1 || "-"}{addressLine2 ? `, ${addressLine2}` : ""}</p>
                    <p className="mt-2">{city || "-"}{stateProvince ? `, ${stateProvince}` : ""} {postalCode}</p>
                    <p className="mt-2">{country}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-[14px] font-medium text-blue-700">What happens next?</p>
                <p className="mt-1 text-[14px] leading-6 text-blue-800">
                  Our team will review your documents. You can return to your dashboard while the verification decision is processed.
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between">
            <button
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentStep === 1 || submitting || !identityVerificationRequired}
              onClick={() => setCurrentStep((value) => clampStep(value - 1))}
              type="button"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {currentStep < totalSteps ? (
                <button
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  disabled={submitting || loadingSettings || !identityVerificationRequired || reviewLocked}
                  onClick={() => void onContinue()}
                  type="button"
                >
                  {submitting ? "Working..." : "Continue"}
                </button>
              ) : null}

              {currentStep === totalSteps ? (
                <button
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  disabled={submitting || loadingSettings || !identityVerificationRequired || reviewLocked}
                  onClick={() => void onSubmitReview()}
                  type="button"
                >
                  {reviewLocked ? "Already Submitted" : submitting ? "Submitting..." : "Submit for Review"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
