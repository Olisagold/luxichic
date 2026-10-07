/**
 * Reads an uploaded image and downsizes it to a compact JPEG data URL.
 * PROTOTYPE: production uploads go to object storage and return a CDN URL.
 */
export function readImageFile(file: File, maxSize = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error(`${file.name} isn’t an image.`));
    if (file.size > 15 * 1024 * 1024) return reject(new Error(`${file.name} is larger than 15 MB.`));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Couldn’t read ${file.name}.`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`Couldn’t open ${file.name}.`));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}
