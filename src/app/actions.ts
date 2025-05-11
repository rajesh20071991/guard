"use server";

import {
  guardReportSchema,
  imageUploadLocationsArray,
  GuardReportFormValues,
} from "@/lib/form-schema";
import {
  appendDataToSheet,
  uploadFileToDrive,
  ApiResultSuccessUpload,
  ApiResult,
} from "@/lib/google-api";
import { Readable } from "stream";

function isValidFile(file: unknown): file is Blob {
  return (
    typeof file === "object" &&
    file !== null &&
    "arrayBuffer" in file &&
    "size" in file &&
    typeof (file as any).size === "number"
  );
}

function fileToReadableStream(file: Blob): Readable {
  const arrayBufferToBuffer = (arrayBuffer: ArrayBuffer) => {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
    }
    return buffer;
  };

  const readable = new Readable();
  readable._read = () => {};

  file
    .arrayBuffer()
    .then((arrayBuffer) => {
      readable.push(arrayBufferToBuffer(arrayBuffer));
      readable.push(null);
    })
    .catch((err) => {
      console.error("Error converting file to stream:", err);
      readable.emit("error", err);
    });

  return readable;
}

const normalizeLocationNameServer = (name: string) =>
  `image${name.replace(/[^a-zA-Z0-9]/g, "")}`;

export async function submitGuardReport(
  prevState: any,
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}> {
  console.log("🟡 Starting submitGuardReport...");

  const rawData: Record<string, any> = {
    guardName: formData.get("guardName"),
    lightsOffLocation: formData.get("lightsOffLocation"),
    lockedLocation: formData.get("lockedLocation"),
    roundsCompleted: formData.get("roundsCompleted"),
  };

  imageUploadLocationsArray.forEach((location) => {
    const normalizedName = normalizeLocationNameServer(location);
    const file = formData.get(normalizedName);
    rawData[normalizedName] =
      isValidFile(file) && file.size > 0 ? file : undefined;
  });

  console.log("📥 Raw Form Data:", rawData);

  const validationResult = guardReportSchema.safeParse(rawData);
  if (!validationResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    validationResult.error.errors.forEach((err) => {
      fieldErrors[err.path.join(".")] = [err.message];
    });
    console.warn("❌ Validation failed:", fieldErrors);
    return {
      success: false,
      message: "Validation failed.",
      errors: fieldErrors,
    };
  }

  const validatedData = validationResult.data;
  const timestamp = new Date().toISOString();

  try {
    const reportDataForSheet: Record<string, string> = {
      timestamp,
      guardName: validatedData.guardName,
      lightsOffLocation: validatedData.lightsOffLocation,
      lockedLocation: validatedData.lockedLocation,
      roundsCompleted: validatedData.roundsCompleted,
    };

    for (const location of imageUploadLocationsArray) {
      const normalizedName = normalizeLocationNameServer(location);
      const file = validatedData[
        normalizedName as keyof typeof validatedData
      ] as Blob | undefined;

      if (file && file.size > 0) {
        const fileName = `${timestamp}_${normalizedName}.${
          file.name?.split(".").pop() || "jpg"
        }`;

        console.log(`📤 Uploading: ${fileName} (${file.type})`);

        const fileStream = fileToReadableStream(file);
        const uploadResult: ApiResult<ApiResultSuccessUpload> =
          await uploadFileToDrive(fileName, file.type, fileStream);

        if (!uploadResult.success) {
          console.error("❌ Upload failed:", uploadResult.message);
          return { success: false, message: uploadResult.message };
        }

        console.log("✅ Upload successful:", uploadResult.webViewLink);

        reportDataForSheet[`${normalizedName}Url`] =
          uploadResult.webViewLink || "Upload Failed";
      } else {
        reportDataForSheet[`${normalizedName}Url`] = "No file uploaded";
        console.log(`⚠️ No file uploaded for: ${normalizedName}`);
      }
    }

    console.log("📊 Final Data to Append to Sheet:", reportDataForSheet);

    const appendResult = await appendDataToSheet(reportDataForSheet);
    if (!appendResult.success) {
      console.error("❌ Sheet append failed:", appendResult.message);
      return { success: false, message: appendResult.message };
    }

    console.log("✅ Data appended to sheet successfully");
    return { success: true, message: "Report submitted successfully!" };
  } catch (error: any) {
    console.error("🔥 Unexpected error submitting report:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
