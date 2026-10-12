import { createClient } from '@/lib/supabase/client';
import { MEDIA_BUCKET } from '@/lib/media/urls';
import { finishImageUpload, startImageUpload } from '@/lib/media/admin-upload';

type Purpose = Parameters<typeof startImageUpload>[0];
type Folder = Parameters<typeof finishImageUpload>[2]['folder'];

/** Uploads an image from the admin (see lib/media/admin-upload.ts) and returns its URL. Throws with a message. */
export async function uploadAdminImage(file: File, purpose: Purpose, folder: Folder): Promise<string> {
  const start = await startImageUpload(purpose, file.type, file.size);
  if (!start.ok || !start.path || !start.token) throw new Error(start.error ?? 'Could not start the upload.');
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
  if (error) throw new Error('The upload failed. Please check your connection and try again.');
  const done = await finishImageUpload(purpose, start.path, { name: file.name, folder });
  if (!done.ok || !done.url) throw new Error(done.error ?? 'Could not process the image.');
  return done.url;
}
