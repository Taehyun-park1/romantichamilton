export const MAX_REVIEW_IMAGE_COUNT = 6;
export const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/\/+$/, '');

export function validateReviewImageFiles(files: File[]) {
  if (files.length > MAX_REVIEW_IMAGE_COUNT) {
    return `사진은 최대 ${MAX_REVIEW_IMAGE_COUNT}장까지 첨부할 수 있습니다.`;
  }

  const invalidTypeFile = files.find((file) => !file.type.startsWith('image/'));
  if (invalidTypeFile) {
    return '이미지 파일만 첨부할 수 있습니다.';
  }

  const oversizedFile = files.find((file) => file.size > MAX_REVIEW_IMAGE_SIZE);
  if (oversizedFile) {
    return '사진은 한 장당 5MB 이하만 첨부할 수 있습니다.';
  }

  return null;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadReviewImages(
  files: File[],
  options: {
    inviteToken?: string;
    accessToken?: string;
  } = {}
) {
  const validationMessage = validateReviewImageFiles(files);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  if (files.length === 0) return [];

  const images = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type,
      base64: await readFileAsBase64(file),
    }))
  );
  const response = await fetch(`${apiBaseUrl ?? ''}/api/review-images/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    body: JSON.stringify({
      inviteToken: options.inviteToken,
      images,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || 'review_image_upload_failed');
  }

  const payload = (await response.json()) as { imageUrls?: string[] };
  return payload.imageUrls ?? [];
}
