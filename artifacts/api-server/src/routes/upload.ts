import { Router, type IRouter } from "express";
import multer from "multer";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
];

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed: images, PDF, DOC, DOCX, TXT, ZIP"));
    }
  },
});

async function ensureBucket(): Promise<{ ok: boolean; reason?: string }> {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    logger.warn({ err: listErr.message }, "[upload] Could not list storage buckets");
    return { ok: false, reason: "storage_list_failed: " + listErr.message };
  }
  const exists = (buckets ?? []).some(b => b.name === "media");
  if (exists) return { ok: true };

  const { error: createErr } = await supabase.storage.createBucket("media", {
    public: true,
    fileSizeLimit: 52428800,
  });
  if (createErr) {
    logger.warn({ err: createErr.message }, "[upload] Could not create media bucket");
    return { ok: false, reason: "bucket_create_failed: " + createErr.message };
  }
  logger.info("[upload] Created media storage bucket");
  return { ok: true };
}

router.post("/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const bucketResult = await ensureBucket();
  if (!bucketResult.ok) {
    logger.error({ reason: bucketResult.reason }, "[upload] Storage bucket not available");
    res.status(500).json({
      error: "Storage not available. Please create a public 'media' bucket in your Supabase dashboard → Storage.",
      detail: bucketResult.reason,
    });
    return;
  }

  const ext = req.file.originalname.split(".").pop() ?? "bin";
  const filePath = `${req.userId!}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    logger.error({ err: error.message, filePath }, "[upload] Supabase storage upload failed");
    res.status(500).json({ error: "Upload failed: " + error.message });
    return;
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filePath);
  res.json({ url: data.publicUrl, fileType: req.file.mimetype });
});

export default router;
