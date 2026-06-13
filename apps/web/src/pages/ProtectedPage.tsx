import { useCallback, useEffect, useState } from 'react';
import {
  createNote,
  listNotes,
  updateNote,
  type NoteDto,
  type NoteSortOption,
  NOTES_PAGE_SIZE,
} from '@/api/notes';
import { CancelNoteDialog } from '@/components/CancelNoteDialog';
import { NotesList } from '@/components/NotesList';

export function ProtectedPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NoteSortOption>('createdAt-desc');
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const result = await listNotes(page, sort, NOTES_PAGE_SIZE);
      setNotes(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load notes.');
      setNotes([]);
      setTotalCount(0);
    } finally {
      setListLoading(false);
    }
  }, [page, sort]);

  useEffect(() => {
    if (!editorOpen) {
      void loadNotes();
    }
  }, [editorOpen, loadNotes]);

  function openEditor() {
    setEditorOpen(true);
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setIsDirty(false);
    setMessage(null);
    setError(null);
  }

  function openEditorForNote(note: NoteDto) {
    setEditorOpen(true);
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setIsDirty(false);
    setMessage(null);
    setError(null);
  }

  function markDirty() {
    setIsDirty(true);
    setMessage(null);
    setError(null);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    markDirty();
  }

  function handleContentChange(value: string) {
    setContent(value);
    markDirty();
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setIsDirty(false);
    setCancelDialogOpen(false);
    setMessage(null);
    setError(null);
  }

  function handleCancel() {
    if (!isDirty) {
      closeEditor();
      return;
    }

    setCancelDialogOpen(true);
  }

  async function saveNote(): Promise<NoteDto | undefined> {
    if (!isDirty) {
      return undefined;
    }

    if (pending) {
      return undefined;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return undefined;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const note = editingNoteId
        ? await updateNote(editingNoteId, trimmedTitle, trimmedContent)
        : await createNote(trimmedTitle, trimmedContent);
      setIsDirty(false);
      if (!editingNoteId) {
        setPage(1);
      }
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note.');
      return undefined;
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    const note = await saveNote();
    if (!note) {
      return;
    }

    closeEditor();
    setMessage(`Note saved (${note.id}).`);
  }

  async function handleSaveAndExit() {
    const note = await saveNote();
    if (note) {
      closeEditor();
      setMessage(`Note saved (${note.id}).`);
    }
  }

  function handleDiscardAndExit() {
    closeEditor();
  }

  function handleReturnToNote() {
    setCancelDialogOpen(false);
  }

  function handleSortChange(nextSort: NoteSortOption) {
    setSort(nextSort);
    setPage(1);
  }

  const saveDisabled =
    !editorOpen || !isDirty || pending || !title.trim();

  return (
    <section className="page notes-page">
      <header className="notes-header">
        <h1>My Notes</h1>
        {editorOpen && (
          <div className="notes-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary notes-save-btn"
              onClick={() => void handleSave()}
              disabled={saveDisabled}
            >
              Save
            </button>
          </div>
        )}
      </header>

      {!editorOpen && (
        <button
          type="button"
          className="btn btn-primary notes-create-btn"
          onClick={openEditor}
          disabled={pending}
        >
          Create Note
        </button>
      )}

      {editorOpen && (
        <div className="note-editor-fields">
          <label className="note-editor">
            <span className="note-editor-label">Title</span>
            <input
              className="note-editor-title"
              type="text"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Note title"
              maxLength={200}
              disabled={pending}
            />
          </label>
          <label className="note-editor">
            <span className="note-editor-label">Content</span>
            <textarea
              className="note-editor-input"
              value={content}
              onChange={(event) => handleContentChange(event.target.value)}
              rows={12}
              placeholder="Start writing…"
              disabled={pending}
            />
          </label>
        </div>
      )}

      {!editorOpen && (
        <>
          {listError && <p className="message error">{listError}</p>}
          <NotesList
            notes={notes}
            page={page}
            pageSize={NOTES_PAGE_SIZE}
            totalCount={totalCount}
            sort={sort}
            loading={listLoading}
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onViewEdit={openEditorForNote}
          />
        </>
      )}

      {message && <p className="message success">{message}</p>}
      {error && <p className="message error">{error}</p>}

      <CancelNoteDialog
        open={cancelDialogOpen}
        pending={pending}
        onSaveAndExit={() => void handleSaveAndExit()}
        onDiscardAndExit={handleDiscardAndExit}
        onReturn={handleReturnToNote}
      />
    </section>
  );
}
