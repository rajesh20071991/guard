'use server';
import { guardReportSchema, imageUploadLocationsArray, GuardReportFormValues } from '@/lib/form-schema';
import { appendDataToSheet, uploadFileToDrive } from '@/lib/google-api';
import { Readable } from 'stream';

// Helper function to convert File to ReadableStream
function fileToReadableStream(file: File): Readable {
  // For Node.js environments, ArrayBuffer to Buffer to Readable stream
  const arrayBufferToBuffer = (arrayBuffer: ArrayBuffer) => {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
    }
    return buffer;
  };

  const readable = new Readable();
  readable._read = () => {}; // _read is required

  file.arrayBuffer().then(arrayBuffer => {
    readable.push(arrayBufferToBuffer(arrayBuffer));
    readable.push(null); // Signal end of stream
  }).catch(err => {
    readable.emit('error', err);
  });

  return readable;
}

const normalizeLocationNameServer = (name: string) => `image${name.replace(/[^a-zA-Z0-9]/g, '')}`;

export async function submitGuardReport(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }> {
  
  const rawData: Record<string, any> = {
    guardName: formData.get('guardName'),
    lightsOffLocation: formData.get('lightsOffLocation'),
    lockedLocation: formData.get('lockedLocation'),
    roundsCompleted: formData.get('roundsCompleted'),
  };

  imageUploadLocationsArray.forEach(location => {
    const normalizedName = normalizeLocationNameServer(location);
    const file = formData.get(normalizedName);
    if (file instanceof File && file.size > 0) {
      rawData[normalizedName] = file;
    } else {
      // Add a placeholder or handle missing file if validation allows optional
      // For now, assuming validation will catch this if required.
      // If file input is empty, react-hook-form might pass an empty string or null
      // Zod schema expects File instance.
      rawData[normalizedName] = undefined; // Or handle appropriately if files are optional
    }
  });
  
  const validationResult = guardReportSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    validationResult.error.errors.forEach(err => {
      fieldErrors[err.path.join('.')] = [err.message];
    });
    return { success: false, message: 'Validation failed.', errors: fieldErrors };
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
      const normalizedLocationName = normalizeLocationNameServer(location);
      const file = validatedData[normalizedLocationName as keyof typeof validatedData] as File;
      
      if (file && file.size > 0) {
        const fileName = `${timestamp}_${normalizedLocationName}.${file.name.split('.').pop()}`;
        const fileStream = fileToReadableStream(file);
        const uploadResult = await uploadFileToDrive(fileName, file.type, fileStream);
        reportDataForSheet[`${normalizedLocationName}Url`] = uploadResult.webViewLink || 'Upload Failed';
      } else {
         reportDataForSheet[`${normalizedLocationName}Url`] = 'No file uploaded';
      }
    }

    await appendDataToSheet(reportDataForSheet);

    return { success: true, message: 'Report submitted successfully!' };
  } catch (error: any) {
    console.error('Error submitting report:', error);
    return { success: false, message: error.message || 'Failed to submit report. Please try again.' };
  }
}
