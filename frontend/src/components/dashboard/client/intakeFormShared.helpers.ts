import type { IntakeForm } from "@/api";

export type FormState = {
  allergies: string;
  medications: string;
  medicalConditions: string;
  skinConditions: string;
  bloodThinners: boolean;
  pregnant: boolean;
  recentSurgery: boolean;
  recentSurgeryDetails: string;
  placement: string;
  size: string;
  style: string;
  description: string;
  isCoverUp: boolean;
  isTouchUp: boolean;
  ageVerification: boolean;
  healthDisclosure: boolean;
  aftercareInstructions: boolean;
  photoRelease: boolean;
  depositPolicy: boolean;
  cancellationPolicy: boolean;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  additionalNotes: string;
};

export const EMPTY_INTAKE: FormState = {
  allergies: "",
  medications: "",
  medicalConditions: "",
  skinConditions: "",
  bloodThinners: false,
  pregnant: false,
  recentSurgery: false,
  recentSurgeryDetails: "",
  placement: "",
  size: "",
  style: "",
  description: "",
  isCoverUp: false,
  isTouchUp: false,
  ageVerification: false,
  healthDisclosure: false,
  aftercareInstructions: false,
  photoRelease: false,
  depositPolicy: false,
  cancellationPolicy: false,
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  additionalNotes: "",
};

export const REQUIRED_CONSENT: (keyof FormState)[] = [
  "ageVerification",
  "healthDisclosure",
  "aftercareInstructions",
  "depositPolicy",
  "cancellationPolicy",
];

export function intakeIsComplete(form: FormState): boolean {
  return REQUIRED_CONSENT.every((k) => form[k] === true);
}

export function fromIntake(d: IntakeForm): FormState {
  return {
    allergies: d.healthInfo?.allergies ?? "",
    medications: d.healthInfo?.medications ?? "",
    medicalConditions: d.healthInfo?.medicalConditions ?? "",
    skinConditions: d.healthInfo?.skinConditions ?? "",
    bloodThinners: !!d.healthInfo?.bloodThinners,
    pregnant: !!d.healthInfo?.pregnant,
    recentSurgery: !!d.healthInfo?.recentSurgery,
    recentSurgeryDetails: d.healthInfo?.recentSurgeryDetails ?? "",
    placement: d.tattooDetails?.placement ?? "",
    size: d.tattooDetails?.size ?? "",
    style: d.tattooDetails?.style ?? "",
    description: d.tattooDetails?.description ?? "",
    isCoverUp: !!d.tattooDetails?.isCoverUp,
    isTouchUp: !!d.tattooDetails?.isTouchUp,
    ageVerification: !!d.consent?.ageVerification,
    healthDisclosure: !!d.consent?.healthDisclosure,
    aftercareInstructions: !!d.consent?.aftercareInstructions,
    photoRelease: !!d.consent?.photoRelease,
    depositPolicy: !!d.consent?.depositPolicy,
    cancellationPolicy: !!d.consent?.cancellationPolicy,
    emergencyName: d.emergencyContact?.name ?? "",
    emergencyPhone: d.emergencyContact?.phone ?? "",
    emergencyRelationship: d.emergencyContact?.relationship ?? "",
    additionalNotes: d.additionalNotes ?? "",
  };
}

export function toPayload(f: FormState): Partial<IntakeForm> {
  return {
    healthInfo: {
      allergies: f.allergies.trim() || undefined,
      medications: f.medications.trim() || undefined,
      medicalConditions: f.medicalConditions.trim() || undefined,
      skinConditions: f.skinConditions.trim() || undefined,
      bloodThinners: f.bloodThinners,
      pregnant: f.pregnant,
      recentSurgery: f.recentSurgery,
      recentSurgeryDetails: f.recentSurgery ? f.recentSurgeryDetails.trim() || undefined : undefined,
    },
    tattooDetails: {
      placement: f.placement.trim() || undefined,
      size: f.size.trim() || undefined,
      style: f.style.trim() || undefined,
      description: f.description.trim() || undefined,
      isCoverUp: f.isCoverUp,
      isTouchUp: f.isTouchUp,
    },
    consent: {
      ageVerification: f.ageVerification,
      healthDisclosure: f.healthDisclosure,
      aftercareInstructions: f.aftercareInstructions,
      photoRelease: f.photoRelease,
      depositPolicy: f.depositPolicy,
      cancellationPolicy: f.cancellationPolicy,
    },
    emergencyContact: {
      name: f.emergencyName.trim() || undefined,
      phone: f.emergencyPhone.trim() || undefined,
      relationship: f.emergencyRelationship.trim() || undefined,
    },
    additionalNotes: f.additionalNotes.trim() || undefined,
  };
}
