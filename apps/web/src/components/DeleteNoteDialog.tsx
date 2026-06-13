type DeleteNoteDialogProps = {
  open: boolean;
  noteTitle: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteNoteDialog({
  open,
  noteTitle,
  pending,
  onConfirm,
  onCancel,
}: DeleteNoteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-note-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-note-dialog-title" className="dialog-title">
          Delete note?
        </h2>
        <p className="dialog-body">
          Are you sure you want to delete &ldquo;{noteTitle}&rdquo;? This
          action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-danger dialog-action-btn"
            onClick={onConfirm}
            disabled={pending}
          >
            Delete Note
          </button>
          <button
            type="button"
            className="btn btn-ghost dialog-action-btn"
            onClick={onCancel}
            disabled={pending}
          >
            Keep Note
          </button>
        </div>
      </div>
    </div>
  );
}
