// components/ImageUpload.tsx
import React, { useState } from "react";
import imageCompression from "browser-image-compression";

const ImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // ✅ Compress the image before uploading
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("fileName", compressedFile.name);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setImageUrl(result.webViewLink);
        alert("Upload successful!");
      } else {
        alert("Upload failed.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
      />
      {uploading && <p>Uploading...</p>}
      {imageUrl && (
        <p>
          Uploaded:{" "}
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            View
          </a>
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
