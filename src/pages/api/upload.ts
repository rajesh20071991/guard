import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { uploadFileToDrive } from "@/lib/google-api"; // uses Buffer

// ⛔ disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err)
      return res.status(500).json({ success: false, message: "Parse error" });

    const fileList = Array.isArray(files.files) ? files.files : [files.files];
    const imageUrls: string[] = [];

    for (const file of fileList) {
      const buffer = fs.readFileSync(file.filepath);
      const result = await uploadFileToDrive(
        file.originalFilename!,
        file.mimetype || "image/jpeg",
        buffer
      );

      if (result.success && result.webViewLink) {
        imageUrls.push(result.webViewLink);
      }
    }

    // 🔁 Append to Google Sheet (optional)
    // await appendDataToSheet({ ...fields, ...imageUrls });

    return res.status(200).json({ success: true, imageUrls });
  });
}
