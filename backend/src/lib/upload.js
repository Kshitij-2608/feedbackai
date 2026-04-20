import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
const uploadsDir = isVercel 
  ? path.join("/tmp", "uploads")
  : path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn(`[Upload] Could not create uploads directory at ${uploadsDir}:`, err.message);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "-");
    cb(null, `${Date.now()}-${basename}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});
