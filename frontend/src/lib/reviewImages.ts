import type { SupabaseClient } from '@supabase/supabase-js';

export const REVIEW_IMAGE_BUCKET = 'review-images';
export const MAX_REVIEW_IMAGE_COUNT = 6;
export const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;

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

function getSafeReviewImageName(file: File, index: number) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `reviews/${randomId}-${index}.${extension}`;
}

export async function uploadReviewImages(
  supabase: SupabaseClient,
  files: File[]
) {
  const validationMessage = validateReviewImageFiles(files);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const uploadedUrls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const filePath = getSafeReviewImageName(file, index);
    const { error } = await supabase.storage
      .from(REVIEW_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from(REVIEW_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}
