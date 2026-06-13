import { fetchAuthSession } from 'aws-amplify/auth';
import { env } from '@/config/env';

export type NoteDto = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PagedNotesDto = {
  items: NoteDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type NoteSortOption =
  | 'title-asc'
  | 'title-desc'
  | 'createdAt-desc'
  | 'createdAt-asc';

export const NOTES_PAGE_SIZE = 10;

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

function sortParams(sort: NoteSortOption): { sortBy: string; sortDirection: string } {
  switch (sort) {
    case 'title-asc':
      return { sortBy: 'title', sortDirection: 'asc' };
    case 'title-desc':
      return { sortBy: 'title', sortDirection: 'desc' };
    case 'createdAt-asc':
      return { sortBy: 'createdAt', sortDirection: 'asc' };
    case 'createdAt-desc':
    default:
      return { sortBy: 'createdAt', sortDirection: 'desc' };
  }
}

export async function listNotes(
  page: number,
  sort: NoteSortOption,
  pageSize = NOTES_PAGE_SIZE,
): Promise<PagedNotesDto> {
  const token = await getAccessToken();
  const { sortBy, sortDirection } = sortParams(sort);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDirection,
  });

  const response = await fetch(`${env.apiBaseUrl}/api/notes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load notes (${response.status}).`);
  }

  const body = (await response.json()) as ApiResponse<PagedNotesDto>;
  return body.data;
}

export async function createNote(
  title: string,
  content: string,
): Promise<NoteDto> {
  const token = await getAccessToken();
  const response = await fetch(`${env.apiBaseUrl}/api/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, content }),
  });

  if (!response.ok) {
    throw new Error(`Could not save note (${response.status}).`);
  }

  const body = (await response.json()) as ApiResponse<NoteDto>;
  return body.data;
}

export function displayNoteTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed || 'Untitled';
}

export function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function notePreview(content: string, maxLength = 140): string {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}
