import { useState } from 'react';
import { createNote } from '@/api/notes';
import { CancelNoteDialog } from '@/components/CancelNoteDialog';

export function ProtectedPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setEditorOpen(true);
    setContent('');
    setIsDirty(false);
    setMessage(null);
    setError(null);
  }

  function handleContentChange(value: string) {
    setContent(value);
    setIsDirty(true);
    setMessage(null);
    setError(null);
  }

  function closeEditor() {
    setEditorOpen(false);
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

  async function saveNote(): Promise<boolean> {
    if (!isDirty) {
      return true;
    }

    if (pending) {
      return false;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const note = await createNote(content);
      setIsDirty(false);
      setMessage(`Note saved (${note.id}).`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note.');
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    await saveNote();
  }

  async function handleSaveAndExit() {
    const saved = await saveNote();
    if (saved) {
      closeEditor();
    }
  }

  function handleDiscardAndExit() {
    closeEditor();
  }

  function handleReturnToNote() {
    setCancelDialogOpen(false);
  }

  const saveDisabled = !editorOpen || !isDirty || pending;

  return (
    <section className="page notes-page">
      <header className="notes-header">
        <h1>My Notes</h1>
        <div className="notes-toolbar">
          {!editorOpen && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={openEditor}
              disabled={pending}
            >
              Create
            </button>
          )}
          {editorOpen && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary notes-save-btn"
            onClick={() => void handleSave()}
            disabled={saveDisabled}
          >
            Save
          </button>
        </div>
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
        <label className="note-editor">
          <span className="note-editor-label">Note</span>
          <textarea
            className="note-editor-input"
            value={content}
            onChange={(event) => handleContentChange(event.target.value)}
            rows={12}
            placeholder="Start writing…"
            disabled={pending}
          />
        </label>
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
