import { google } from "googleapis";
import type { Readable } from "stream";

const SHEET_NAME = "Guard"; // Or your specific sheet name
const GOOGLE_SHEET_ID = "1W40jiflg6kmUVwDEL5HEInsmjvonRAKHpV-hxTBY7SI";
const GOOGLE_SERVICE_ACCOUNT_EMAIL =
  "guard-918@ramsons-1234.iam.gserviceaccount.com";
const googlePrivateKeyFromEnv =
  "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCwdno+lWqePHar\\nvNpMLPiTH5+oOG6FdqAHZTXxpr0JyOCfm8rxPTUBnIqcVBNVIB9PvniQ+iJh4oBa\\nIzygPH4H9hEJ+ncg8TRDPWI+sdQOlAsBVS78umuRlECzxdSwsmuaFIL+JVlvZdZG\\n8iIcPAyif62GwgVnHN8y4Uy8PaI3Nt3bmIwJqY251DPhc+DGj2A+i9v84r1cQga7\\ninuh7m634XEt5erFcFv4zlWdTYouSx8a/RUHe8oR0+FLTr1VgelJY4hP2IE9wVcT\\na9I6gR2kfU9avO14naov8L66+8ug8nKY9c19+VljEa4+yOVh54uxAlDLNiBmiS+C\\nw2Uzarv3AgMBAAECggEARxpGIYeFIWNNkd+TulP4iReZ9mdeqSpmSvSOKuO7kgC9\\n+bIFsPSvsgmIlHsQGyHJXBFsdUZEqlpgy3EdUZduVPjiXrnsXHq0S0+lkYuH3aPr\\nV0silrTq+Qrak1VoYRZTYw9WxN75zXgkQgv4kJXlpWh63Cy7jpPEn7TGfab8APDO\\nqikOmvK0HQr6BHVYpcgzDWfS2NSJv74EFh6wDiTDGdMOb3RjF0pabOwXbWMtZoXJ\\ni5GvsK6OhTIjzpf03boSnP1r8c38iEC+db1cObNilgSsBCycxSD8Ojt1Smow1jM8\\nP0gZSNFS1uZ9jc2tNjHkxzjp4Pw2OSKKSrPWyVhDYQKBgQD1AIImGZJV1ttEVVnZ\\nlwfVlQVI0Ie+DafV73sUjNryKHhjDGVBgzuJIIECN2iQH2tBDIBw5foiJpCvd6rQ\\nyvybBQlAvkigR9inTGeBqycx431ZF3OuciJyZ9wZWhDrTzq5k03epBWdTKAwFPML\\nfMeMUyvVGosqIq+ZUAzuqpKoZwKBgQC4YlY1gSyQlUfWfiNh07mYbp0wgcxUMruy\\nNNHtxKwrxWWe8NuZWm2nqdTv9TrfCHR44ePxMCb98JaHFPQrdfgc+uXZuBuNaXQs\\nJGUiC6+KAFmp9a+hGKueWxvkcR8xyYK6k+/0+BdowKAUZ4TB4hvoIMGjpEcKLwTb\\nvk0XARBV8QKBgDccdCpJ2kcA27XVVS7C8Ho02Ul1zvMLc1OGWTNYM/AA9oOhSC2i\\nbYP9EcgD2ruAtcmeHE5JDSkdb7Jowr3Qy127lkdABmo3fx6y6x2Z+GkaeRnPUrBM\\n8D636iSxw9iKq/UOk5efZVVK5UWrkLhmyyRfmR6IqAFEaCeegCo3qGHFAoGAZCqv\\n8MMrBaTDcQf3isattdypsldhPICPLSG6xfOpIOJM8Yqhke7pUUNW9cEAaXe7Zow4\\n+6cQF7Zi4CGHADFHR98ZjSySc0FNpkljU5qLk2nbTBS3g8nWOeH/BhxaOP7i8R87\\nJZa9iN/UVyFhor6GMJXS/GZbXXHrrsD0OkIOsNECgYBWmWaJ3t4tIHgkQq6pNkLV\\nvXV7S2LB9AwdJT4YCwJIeyPbKIiTkMk+TIKaVzkr+lCXWDpAV6PmKv2RrT92zwPl\\nawUY2USCq4ovh4KXul3KbjxxmIAFz835zPi2G8mVqMKJqp/o/R99XRkA8HX8DhMj\\nMdyZD7PsdBIX+Tm9pbe2Rw==\\n-----END PRIVATE KEY-----\\n";
const GOOGLE_DRIVE_FOLDER_ID = "1mfdMDFhxrEjsTOrpJB_0c5F-hV7EdXjQ";

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
  console.log("GOOGLE_SHEET_ID:", GOOGLE_SHEET_ID);
  console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log("GOOGLE_DRIVE_FOLDER_ID:", GOOGLE_DRIVE_FOLDER_ID);
  console.log("GOOGLE_PRIVATE_KEY:", !!googlePrivateKeyFromEnv);

  const missingVars: string[] = [];
  if (!GOOGLE_SHEET_ID) missingVars.push("GOOGLE_SHEET_ID");
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL)
    missingVars.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!googlePrivateKeyFromEnv) missingVars.push("GOOGLE_PRIVATE_KEY");
  if (!GOOGLE_DRIVE_FOLDER_ID) missingVars.push("GOOGLE_DRIVE_FOLDER_ID");

  if (missingVars.length > 0) {
    const errorMessage = `Google API environment variables are not set: ${missingVars.join(
      ", "
    )}.`;
    console.error(`CRITICAL: ${errorMessage}`);
    return {
      error:
        "Server configuration error: Required API credentials are not set. Please contact an administrator.",
    };
  }

  const GOOGLE_PRIVATE_KEY = googlePrivateKeyFromEnv?.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const sheetsClient = google.sheets({ version: "v4", auth });
    const driveClient = google.drive({ version: "v3", auth });

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
    return {
      error:
        "Server configuration error: Failed to initialize Google API clients. Please contact an administrator.",
    };
  }
}

export interface ApiResultSuccessUpload {
  id: string | null | undefined;
  webViewLink: string | null | undefined;
}
export type ApiResult<TSuccessData = {}> =
  | ({ success: true } & TSuccessData)
  | { success: false; message: string };

export async function appendDataToSheet(
  data: ReportData
): Promise<ApiResult<{}>> {
  const authResult = internalGetAuthenticatedClients();
  if (authResult.error || !authResult.auth) {
    return {
      success: false,
      message:
        authResult.error ||
        "Authentication components are missing for appending data to sheet.",
    };
  }

  const { sheetsClient, GOOGLE_SHEET_ID } = authResult.auth;

  // ✅ Define exact sheet headers with readable names
  const headerKeyMap: Record<string, string> = {
    Timestamp: "timestamp",
    "Guard Name": "guardName",
    "Lights Switched Off Location": "lightsOffLocation",
    "Locked Location": "lockedLocation",
    "Rounds Completed": "roundsCompleted",
    "Front Generator Room": "imageFrontGeneratorRoomUrl",
    "Office Reception": "imageOfficeReceptionUrl",
    "Pipe Stock": "imagePipeStockUrl",
    "Mill No. 1": "imageMillNo1Url",
    "Mill No. 5 Helper": "imageMillNo5HelperUrl",
    "Mill No. 7 Helper": "imageMillNo7HelperUrl",
    Slitting: "imageSlittingUrl",
    "Slitting Paper Side": "imageSlittingPaperSideUrl",
    "Polish Section": "imagePolishSectionUrl",
    Parking: "imageParkingUrl",
  };

  const headers = Object.keys(headerKeyMap);

  // ✅ Create values row matching the headers
  const values = headers.map((header) => {
    const dataKey = headerKeyMap[header];
    const value = data[dataKey] || "";

    if (
      dataKey.toLowerCase().includes("url") &&
      typeof value === "string" &&
      value.startsWith("https://")
    ) {
      return `=HYPERLINK("${value}", "View Image")`;
    }

    return value;
  });

  try {
    // ✅ Check if headers already exist
    const getHeadersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    let sheetHeaders = getHeadersResponse.data.values?.[0];
    if (!sheetHeaders || sheetHeaders.length === 0) {
      // Insert headers into the sheet
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
    }

    // ✅ Append actual values
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [values],
      },
    });

    console.log("✅ Data appended to Google Sheet successfully.");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error appending data to Google Sheet:", error.message);
    return {
      success: false,
      message: "Failed to submit data to Google Sheet.",
    };
  }
}

export async function uploadFileToDrive(
  fileName: string,
  mimeType: string,
  fileStream: Buffer
): Promise<ApiResult<ApiResultSuccessUpload>> {
  const authResult = internalGetAuthenticatedClients();
  if (authResult.error || !authResult.auth) {
    return {
      success: false,
      message:
        authResult.error ||
        "Authentication components are missing for file upload.",
    };
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
      fields: "id, webViewLink",
    });
    console.log({
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      mimeType: mimeType,
    });

    console.log(
      `File uploaded to Google Drive successfully. File ID: ${response.data.id}`
    );
    return {
      success: true,
      id: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error: any) {
    console.error("Error uploading file to Google Drive:", error);
    return {
      success: false,
      message: "Failed to upload file to Google Drive.",
    };
  }
}
