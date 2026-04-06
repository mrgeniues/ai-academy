import { Router, type IRouter } from "express";
import multer from "multer";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/ogg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets ?? []).some(b => b.name === "media");
  if (!exists) {
    await supabase.storage.createBucket("media", { public: true, fileSizeLimit: 52428800 });
  }
}

router.post("/upload", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    await ensureBucket();
  } catch { /* bucket may already exist */ }

  const ext = req.file.originalname.split(".").pop() ?? "bin";
  const filePath = `${req.userId!}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (error) {
    res.status(500).json({ error: "Upload failed: " + error.message });
    return;
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filePath);
  res.json({ url: data.publicUrl });
});

export default router;
