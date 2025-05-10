import { google } from 'googleapis';
import type { Readable } from 'stream';

// Ensure these environment variables are set in your .env.local file
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'); // Ensure newlines are correctly formatted
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

const SHEET_NAME = 'Sheet1'; // Or your specific sheet name

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

interface ReportData {
  timestamp: string;
  guardName: string;
  lightsOffLocation: string;
  lockedLocation: string;
  roundsCompleted: string;
  [key: string]: string; // For image URLs
}

export async function appendDataToSheet(data: ReportData): Promise<void> {
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("Google Sheets API credentials are not configured.");
    throw new Error("Google Sheets API credentials are not configured.");
  }
  
  // The order of values should match the order of columns in your sheet
  const headers = [
    "Timestamp", "Guard Name", "Lights Off Location", "Locked Location", "Rounds Completed",
    ...Object.keys(data).filter(k => k.startsWith("image") && k.endsWith("Url")) 
    // Assuming image keys in data are like 'imageFrontGeneratorRoomUrl'
  ];
  
  const values = headers.map(header => {
     // Convert header to data key (e.g. "Guard Name" -> "guardName") for most fields
     let dataKey = header.toLowerCase().replace(/\s+/g, '');
     if (header === "Guard Name") dataKey = "guardName";
     else if (header === "Lights Off Location") dataKey = "lightsOffLocation";
     else if (header === "Locked Location") dataKey = "lockedLocation";
     else if (header === "Rounds Completed") dataKey = "roundsCompleted";
     else if (header === "Timestamp") dataKey = "timestamp";
     else dataKey = header; // for image URLs like imageFrontGeneratorRoomUrl
     return data[dataKey] || '';
  });


  try {
    // Check if headers exist, if not, add them
    const getHeadersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    if (!getHeadersResponse.data.values || getHeadersResponse.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }
    
    // Append the new row of data
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1`, // A1 notation appends after the last row with data
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values],
      },
    });
    console.log('Data appended to Google Sheet successfully.');
  } catch (error) {
    console.error('Error appending data to Google Sheet:', error);
    throw new Error('Failed to submit data to Google Sheet.');
  }
}

export async function uploadFileToDrive(fileName: string, mimeType: string, fileStream: Readable): Promise<{ id: string | null | undefined; webViewLink: string | null | undefined }> {
  if (!GOOGLE_DRIVE_FOLDER_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("Google Drive API credentials are not configured.");
    throw new Error("Google Drive API credentials are not configured.");
  }
  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileStream,
      },
      fields: 'id, webViewLink', // Request specific fields to be returned
    });
    console.log(`File uploaded to Google Drive successfully. File ID: ${response.data.id}`);
    return { id: response.data.id, webViewLink: response.data.webViewLink };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw new Error('Failed to upload file to Google Drive.');
  }
}
