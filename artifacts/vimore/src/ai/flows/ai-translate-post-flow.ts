'use server';

import { aiTranslatePostAction } from '@/app/actions/ai';

export async function aiTranslatePost(input: { postContent: string; targetLanguage?: string }) {
  const result = await aiTranslatePostAction({
    postContent: input.postContent,
    targetLanguage: input.targetLanguage,
  });
  return { translation: result.translation };
}
