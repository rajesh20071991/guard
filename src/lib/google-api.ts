
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

// Helper function to get authenticated clients, checking for env vars at call time
function getAuthenticatedClients() {
  const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const googlePrivateKeyFromEnv = process.env.GOOGLE_PRIVATE_KEY;
  const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !googlePrivateKeyFromEnv || !GOOGLE_DRIVE_FOLDER_ID) {
    const missingVars = [
      !GOOGLE_SHEET_ID && "GOOGLE_SHEET_ID",
      !GOOGLE_SERVICE_ACCOUNT_EMAIL && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      !googlePrivateKeyFromEnv && "GOOGLE_PRIVATE_KEY",
      !GOOGLE_DRIVE_FOLDER_ID && "GOOGLE_DRIVE_FOLDER_ID",
    ].filter(Boolean).join(', ');
    
    const errorMessage = `CRITICAL: One or more Google API environment variables are not set: ${missingVars}. This is required for this functionality.`;
    console.error(errorMessage);
    throw new Error('Google API credentials or configuration are not set. Please check server logs for missing variables.');
  }

  const GOOGLE_PRIVATE_KEY = googlePrivateKeyFromEnv.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
  });

  const sheetsClient = google.sheets({ version: 'v4', auth });
  const driveClient = google.drive({ version: 'v3', auth });

  return { sheetsClient, driveClient, GOOGLE_SHEET_ID, GOOGLE_DRIVE_FOLDER_ID };
}


export async function appendDataToSheet(data: ReportData): Promise<void> {
  let clients;
  try {
    clients = getAuthenticatedClients();
  } catch (error: any) {
    console.error("Configuration error for appendDataToSheet:", error.message);
    throw error; 
  }
  const { sheetsClient, GOOGLE_SHEET_ID } = clients;
  
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
     // For image URLs, the key in `data` should directly match the header if it's like 'imageFrontGeneratorRoomUrl'
     // or you need a mapping if headers are "Image Front Generator Room URL"
     else if (data.hasOwnProperty(header)) dataKey = header; 
     else {
        // Attempt to find a matching key in data for complex headers if necessary.
        // This part might need adjustment based on actual keys in `data` vs `headers`.
        // For now, assume `dataKey` derived from `header` is sufficient or `header` itself is the key.
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
          values: [headers], // Use the dynamically generated headers
        },
      });
    } else {
      // Optional: Could compare `headers` with `sheetHeaders` and update if necessary
      // For simplicity, we assume headers are either absent or compatible
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
  } catch (error: any) {
    console.error('Error appending data to Google Sheet:', error.message);
    if (error.message.includes("Google API credentials or configuration are not set")) {
        throw error;
    }
    throw new Error('Failed to submit data to Google Sheet.');
  }
}

export async function uploadFileToDrive(fileName: string, mimeType: string, fileStream: Readable): Promise<{ id: string | null | undefined; webViewLink: string | null | undefined }> {
  let clients;
  try {
    clients = getAuthenticatedClients();
  } catch (error: any) {
    console.error("Configuration error for uploadFileToDrive:", error.message);
    throw error;
  }
  const { driveClient, GOOGLE_DRIVE_FOLDER_ID } = clients;

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
    return { id: response.data.id, webViewLink: response.data.webViewLink };
  } catch (error: any) {
    console.error('Error uploading file to Google Drive:', error.message);
     if (error.message.includes("Google API credentials or configuration are not set")) {
        throw error;
    }
    throw new Error('Failed to upload file to Google Drive.');
  }
}
