import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, requireAuth } from './auth';

export const uploadRouter = Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const hasSupabaseStorage = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseKey.length > 20
);

const storageClient = hasSupabaseStorage ? createClient(supabaseUrl, supabaseKey) : null;

// POST /api/upload
uploadRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, filename = 'wardrobe.jpg', workspaceId } = req.body;
    const targetWsId = workspaceId || req.user?.workspaceId || 'shared';

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 string is required.' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // 1. Check if Supabase Storage is configured
    if (storageClient) {
      const bucket = 'wardrobe-images';
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${targetWsId}/${Date.now()}_${cleanName}`;

      const { data, error } = await storageClient.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        });

      if (!error && data) {
        const { data: urlData } = storageClient.storage.from(bucket).getPublicUrl(data.path);
        res.json({
          imageUrl: urlData.publicUrl,
          thumbnailUrl: urlData.publicUrl,
          provider: 'supabase',
        });
        return;
      } else if (error) {
        console.warn('Supabase storage upload failed, checking fallback:', error.message);
      }
    }

    // 2. Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && uploadPreset) {
      const formData = new URLSearchParams();
      formData.append('file', `data:image/jpeg;base64,${cleanBase64}`);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `duosync/${targetWsId}`);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (cloudRes.ok) {
        const cloudData = (await cloudRes.json()) as { secure_url: string; public_id: string };
        const thumbUrl = cloudData.secure_url.replace('/upload/', '/upload/c_fill,w_300,h_300,q_auto,f_auto/');
        res.json({
          imageUrl: cloudData.secure_url,
          thumbnailUrl: thumbUrl,
          provider: 'cloudinary',
        });
        return;
      }
    }

    // 3. Fallback: Return data URL with optimization metadata so app never blocks the user
    // (In production, adding SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY or CLOUDINARY_* activates direct CDN storage)
    res.json({
      imageUrl: imageBase64,
      thumbnailUrl: imageBase64,
      provider: 'embedded_fallback',
      notice: 'Configure SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in Vercel to store image binaries in CDN object storage instead of inline strings.',
    });
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    const msg = error instanceof Error ? error.message : 'Image upload failed.';
    res.status(500).json({ error: msg });
  }
});

