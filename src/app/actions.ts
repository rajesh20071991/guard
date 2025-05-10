
'use server';
import { guardReportSchema, imageUploadLocationsArray, GuardReportFormValues } from '@/lib/form-schema';
import { appendDataToSheet, uploadFileToDrive, ApiResultSuccessUpload, ApiResult } from '@/lib/google-api';
import { Readable } from 'stream';

// Helper function to convert File to ReadableStream
function fileToReadableStream(file: File): Readable {
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

  file.arrayBuffer().then(arrayBuffer => {
    readable.push(arrayBufferToBuffer(arrayBuffer));
    readable.push(null); 
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
      rawData[normalizedName] = undefined; 
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
        const uploadResult: ApiResult<ApiResultSuccessUpload> = await uploadFileToDrive(fileName, file.type, fileStream);
        
        if (!uploadResult.success) {
          // If upload failed, return the error message from uploadFileToDrive
          return { success: false, message: uploadResult.message };
        }
        reportDataForSheet[`${normalizedLocationName}Url`] = uploadResult.webViewLink || 'Upload Failed, no link';
      } else {
         reportDataForSheet[`${normalizedLocationName}Url`] = 'No file uploaded';
      }
    }

    const appendResult = await appendDataToSheet(reportDataForSheet);
    if (!appendResult.success) {
      // If appending to sheet failed, return the error message
      return { success: false, message: appendResult.message };
    }

    return { success: true, message: 'Report submitted successfully!' };
  } catch (error: any) {
    // This catch block is for unexpected errors not handled by ApiResult pattern
    console.error('Unexpected error submitting report:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}
