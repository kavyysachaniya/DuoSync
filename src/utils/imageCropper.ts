/**
 * DuoSync Image Cropper Utility
 * Automatically crops any uploaded image (portrait, landscape, or arbitrary aspect ratio)
 * to a clean 1:1 square centered around the focal center.
 */

export interface CroppedImageResult {
  dataUrl: string;
  filename: string;
  width: number;
  height: number;
}

/**
 * Reads a File and automatically center-crops it into a 1:1 aspect ratio square.
 * @param file The image file from an <input type="file">
 * @param maxDimension Maximum width & height of the output square (default 800px)
 * @param quality JPEG compression quality (0.0 to 1.0, default 0.88)
 */
export function cropImageToSquare(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.88
): Promise<CroppedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (loadEvt) => {
      const src = loadEvt.target?.result as string;
      if (!src) {
        reject(new Error('Empty image file'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));

      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!width || !height) {
          reject(new Error('Invalid image dimensions'));
          return;
        }

        // Calculate center square crop bounds
        const minSide = Math.min(width, height);
        const startX = Math.round((width - minSide) / 2);
        const startY = Math.round((height - minSide) / 2);

        // Constrain output size to at most maxDimension
        const outputSize = Math.min(minSide, maxDimension);

        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        // Fill background with subtle dark color in case of any sub-pixel gap
        ctx.fillStyle = '#12141C';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Draw center-cropped square
        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          outputSize,
          outputSize
        );

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          filename: file.name,
          width: outputSize,
          height: outputSize,
        });
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
