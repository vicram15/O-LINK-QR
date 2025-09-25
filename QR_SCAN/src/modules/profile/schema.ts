import { z } from 'zod';

// Avatar schema
export const AvatarSchema = z.object({
  cid: z.string().optional(),
  mime: z.string().optional(),
});

// Link schema
export const LinkSchema = z.object({
  label: z.string().min(1).max(32),
  url: z.string().url(),
});

// Main profile schema
export const ProfileSchema = z.object({
  version: z.literal("1.0"),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  displayName: z.string().min(1).max(64),
  bio: z.string().max(512).optional(),
  aadhar: z.string().regex(/^\d{4}-\d{4}-\d{4}$/, "Aadhar must be in format 1234-5678-9012").optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional(),
  email: z.string().email().optional(),
  avatar: AvatarSchema.optional(),
  links: z.array(LinkSchema).max(10).optional(),
  timestamp: z.number(),
  cidPrev: z.string().optional(),
});

// Profile form schema (for UI validation)
export const ProfileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(64, "Display name too long"),
  bio: z.string().max(512, "Bio too long").optional(),
  aadhar: z.string().refine((val) => {
    if (!val || val === "") return true; // Allow empty
    // Allow partial formats while typing: 1234-, 1234-5678-, 1234-5678-9012
    return /^\d{4}(-\d{4}(-\d{4})?)?$/.test(val);
  }, "Aadhar must be in format 1234-5678-9012").optional().or(z.literal("")),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g., ABCDE1234F)").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  links: z.array(LinkSchema).max(10, "Too many links").optional(),
});

// DID Credential schema
export const ProfileCredentialSchema = z.object({
  iss: z.string().regex(/^did:pkh:eip155:\d+:[0-9a-fA-F]{40}$/),
  sub: z.string().regex(/^did:pkh:eip155:\d+:[0-9a-fA-F]{40}$/),
  profile_cid: z.string(),
  version: z.literal("1.0"),
  updated_at: z.number(),
});

// Profile storage schema (for localStorage)
export const ProfileStorageSchema = z.object({
  cid: z.string(),
  jwt: z.string(),
  did: z.string(),
  timestamp: z.number(),
});

// Type exports
export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileForm = z.infer<typeof ProfileFormSchema>;
export type ProfileCredential = z.infer<typeof ProfileCredentialSchema>;
export type ProfileStorage = z.infer<typeof ProfileStorageSchema>;
export type Avatar = z.infer<typeof AvatarSchema>;
export type Link = z.infer<typeof LinkSchema>;

// Helper functions
export function createEmptyProfile(wallet: string): Profile {
  return {
    version: "1.0",
    wallet,
    displayName: "",
    bio: "",
    aadhar: "",
    pan: "",
    email: "",
    avatar: {},
    links: [],
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export function sanitizeProfileInput(input: any): Partial<Profile> {
  // Clean Aadhar number - remove dashes and keep only digits
  const aadharValue = input.aadhar?.trim() || '';
  const cleanAadhar = aadharValue.replace(/\D/g, '');
  const finalAadhar = cleanAadhar.length === 12 ? cleanAadhar : '';
  
  return {
    displayName: input.displayName?.trim(),
    bio: input.bio?.trim(),
    aadhar: finalAadhar, // Store only digits or empty string
    pan: input.pan?.trim().toUpperCase(),
    email: input.email?.trim(),
    links: input.links?.filter((link: any) => 
      link.label?.trim() && link.url?.trim()
    ),
  };
}

export function validateProfile(profile: unknown): Profile {
  return ProfileSchema.parse(profile);
}

export function validateProfileForm(form: unknown): ProfileForm {
  return ProfileFormSchema.parse(form);
}

