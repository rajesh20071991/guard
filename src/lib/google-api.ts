
import { google } from 'googleapis';
import type { Readable } from 'stream';

const SHEET_NAME = 'Sheet1'; // Or your specific sheet name

interface ReportData {
  timestamp: string;
  guardName: string;
  lightsOffLocation: string;
  lockedLocation: string;
  roundsCompleted: string;
  [key: string]: string; // For image URLs
}

interface AuthComponents {
  sheetsClient: ReturnType<typeof google.sheets>;
  driveClient: ReturnType<typeof google.drive>;
  GOOGLE_SHEET_ID: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
}

interface GetAuthResult {
  auth?: AuthComponents;
  error?: string;
}

function internalGetAuthenticatedClients(): GetAuthResult {
  const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const googlePrivateKeyFromEnv = process.env.GOOGLE_PRIVATE_KEY;
  const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const missingVars: string[] = [];
  if (!GOOGLE_SHEET_ID) missingVars.push("GOOGLE_SHEET_ID");
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) missingVars.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!googlePrivateKeyFromEnv) missingVars.push("GOOGLE_PRIVATE_KEY");
  if (!GOOGLE_DRIVE_FOLDER_ID) missingVars.push("GOOGLE_DRIVE_FOLDER_ID");

  if (missingVars.length > 0) {
    const errorMessage = `Google API environment variables are not set: ${missingVars.join(', ')}. This is required for this functionality.`;
    console.error(`CRITICAL: ${errorMessage}`);
    // Return a user-friendly message, logs have details
    return { error: 'Server configuration error: Required API credentials are not set. Please contact an administrator.' };
  }

  const GOOGLE_PRIVATE_KEY = googlePrivateKeyFromEnv!.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const driveClient = google.drive({ version: 'v3', auth });
    
    return {
      auth: {
        sheetsClient,
        driveClient,
        GOOGLE_SHEET_ID: GOOGLE_SHEET_ID!,
        GOOGLE_DRIVE_FOLDER_ID: GOOGLE_DRIVE_FOLDER_ID!,
      },
    };
  } catch (e: any) {
    console.error("Error initializing Google API clients:", e);
    return { error: "Server configuration error: Failed to initialize Google API clients. Please contact an administrator." };
  }
}

export interface ApiResultSuccessUpload {
  id: string | null | undefined;
  webViewLink: string | null | undefined;
}
export type ApiResult<TSuccessData = {}> = ({ success: true } & TSuccessData) | { success: false; message: string };


export async function appendDataToSheet(data: ReportData): Promise<ApiResult<{}>> {
  const authResult = internalGetAuthenticatedClients();
  if (authResult.error || !authResult.auth) {
    return { success: false, message: authResult.error || "Authentication components are missing for appending data to sheet." };
  }
  const { sheetsClient, GOOGLE_SHEET_ID } = authResult.auth;
  
  const headers = [
    "Timestamp", "Guard Name", "Lights Off Location", "Locked Location", "Rounds Completed",
    ...Object.keys(data).filter(k => k.startsWith("image") && k.endsWith("Url")) 
  ];
  
  const values = headers.map(header => {
     let dataKey = header.toLowerCase().replace(/\s+/g, '');
     if (header === "Guard Name") dataKey = "guardName";
     else if (header === "Lights Off Location") dataKey = "lightsOffLocation";
     else if (header === "Locked Location") dataKey = "lockedLocation";
     else if (header === "Rounds Completed") dataKey = "roundsCompleted";
     else if (header === "Timestamp") dataKey = "timestamp";
     else if (data.hasOwnProperty(header)) dataKey = header; 
     else {
        const possibleDataKey = Object.keys(data).find(k => k.toLowerCase().includes(header.replace(/\s+/g, '').toLowerCase()));
        if(possibleDataKey) dataKey = possibleDataKey;
     }
     return data[dataKey] || '';
  });

  try {
    const getHeadersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    let sheetHeaders = getHeadersResponse.data.values?.[0];
    if (!sheetHeaders || sheetHeaders.length === 0) {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }
    
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1`, 
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values],
      },
    });
    console.log('Data appended to Google Sheet successfully.');
    return { success: true };
  } catch (error: any) {
    console.error('Error appending data to Google Sheet:', error.message);
    return { success: false, message: 'Failed to submit data to Google Sheet.' };
  }
}

export async function uploadFileToDrive(fileName: string, mimeType: string, fileStream: Readable): Promise<ApiResult<ApiResultSuccessUpload>> {
  const authResult = internalGetAuthenticatedClients();
  if (authResult.error || !authResult.auth) {
     return { success: false, message: authResult.error || "Authentication components are missing for file upload." };
  }
  const { driveClient, GOOGLE_DRIVE_FOLDER_ID } = authResult.auth;

  try {
    const response = await driveClient.files.create({
      requestBody: {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileStream,
      },
      fields: 'id, webViewLink',
    });
    console.log(`File uploaded to Google Drive successfully. File ID: ${response.data.id}`);
    return { success: true, id: response.data.id, webViewLink: response.data.webViewLink };
  } catch (error: any) {
    console.error('Error uploading file to Google Drive:', error.message);
    return { success: false, message: 'Failed to upload file to Google Drive.'};
  }
}
