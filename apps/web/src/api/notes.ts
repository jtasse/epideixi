import { fetchAuthSession } from 'aws-amplify/auth';
import { env } from '@/config/env';

export type NoteDto = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  data: T;
};

async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new Error('No access token available. Sign in again.');
  }
  return token;
}

export async function createNote(content: string): Promise<NoteDto> {
  const token = await getAccessToken();
  const response = await fetch(`${env.apiBaseUrl}/api/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Could not save note (${response.status}).`);
  }

  const body = (await response.json()) as ApiResponse<NoteDto>;
  return body.data;
}
