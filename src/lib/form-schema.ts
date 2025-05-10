import { z } from 'zod';

export const lightsOffLocationsArray = ["Back Office", "Sales Office", "Pipe Stock Yard"] as const;
export const lockedLocationsArray = ["Front Office", "Back Office", "Kitchen", "Meeting Room"] as const;
export const roundsCompletedOptionsArray = Array.from({ length: 9 }, (_, i) => (i + 1).toString()) as [string, ...string[]];


export const imageUploadLocationsArray = [
  "Front Generator Room",
  "Office Reception",
  "Pipe Stock",
  "Mill No. 1",
  "Mill No. 5 Helper",
  "Mill No. 7 Helper",
  "Slitting",
  "Slitting Paper Side",
  "Polish Section",
  "Parking",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Helper for a single image field
// Ensure File is polyfilled or handled for environments where it might not exist (SSR checks)
const imageFileSchema = (fieldName: string) => 
  z.custom<File>((val) => typeof window === 'undefined' || val instanceof File, `${fieldName} image is required.`)
    .refine((file) => typeof window === 'undefined' || file.size <= MAX_FILE_SIZE, `${fieldName}: Max image size is 5MB.`)
    .refine(
      (file) => typeof window === 'undefined' || ACCEPTED_IMAGE_TYPES.includes(file.type),
      `${fieldName}: Only .jpg, .jpeg, .png, and .webp formats are accepted.`
    );
    
// Generates a unique key for each location to be used in the schema
const normalizeLocationName = (name: string) => `image${name.replace(/[^a-zA-Z0-9]/g, '')}`;

// Create an object schema for image uploads
const imageUploadsSchema = z.object(
  Object.fromEntries(
    imageUploadLocationsArray.map((location) => [
      normalizeLocationName(location),
      imageFileSchema(location),
    ])
  )
);

export const guardReportSchema = z.object({
  guardName: z.string().min(1, { message: "Guard Name is required." }).min(2, { message: "Name must be at least 2 characters." }),
  lightsOffLocation: z.enum(lightsOffLocationsArray, {
    required_error: "Lights Off Location is required.",
    invalid_type_error: "Please select a valid location for Lights Off.",
  }),
  lockedLocation: z.enum(lockedLocationsArray, {
    required_error: "Locked Location is required.",
    invalid_type_error: "Please select a valid location for Locked Location.",
  }),
  roundsCompleted: z.enum(roundsCompletedOptionsArray, {
    required_error: "Rounds Completed is required.",
    invalid_type_error: "Please select a valid number of rounds.",
  }),
}).and(imageUploadsSchema);


export type GuardReportFormValues = z.infer<typeof guardReportSchema>;
