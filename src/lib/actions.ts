export async function submitGuardReport(_: any, formData: FormData) {
  try {
    const res = await fetch("/api/guard-upload", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    console.log("🟢 API response:", json);
    return json;
  } catch (error) {
    console.error("🔴 Upload error:", error);
    return {
      success: false,
      message: "Unexpected error occurred during upload.",
    };
  }
}
