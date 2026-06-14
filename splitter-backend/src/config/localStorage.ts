import fs from "fs";
import path from "path";

// Root directory where locally-stored uploads (e.g. avatars) live during
// development when Cloudflare R2 is not configured.
export const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

// Public path prefix used to serve the local uploads via express.static.
export const LOCAL_UPLOAD_ROUTE = "/static";

/**
 * Persists a file buffer to the local uploads directory.
 *
 * @param key Object key, e.g. "avatars/123/v1696070000/avatar.webp"
 * @returns the relative public path, e.g. "/static/avatars/123/v.../avatar.webp"
 */
export async function saveLocalObject(
  key: string,
  body: Buffer
): Promise<{ key: string; publicPath: string }> {
  const safeKey = key.replace(/^\/+/, "");
  const absolutePath = path.join(LOCAL_UPLOAD_ROOT, safeKey);
  const dir = path.dirname(absolutePath);

  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(absolutePath, body);

  return {
    key: safeKey,
    publicPath: `${LOCAL_UPLOAD_ROUTE}/${safeKey}`,
  };
}
