type CancelNoteDialogProps = {
  open: boolean;
  pending: boolean;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
  onReturn: () => void;
};

export function CancelNoteDialog({
  open,
  pending,
  onSaveAndExit,
  onDiscardAndExit,
  onReturn,
}: CancelNoteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onReturn}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-note-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cancel-note-dialog-title" className="dialog-title">
          Unsaved changes
        </h2>
        <p className="dialog-body">
          You have unsaved changes on this note. Choose whether to save,
          discard, or keep editing.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-primary dialog-action-btn"
            onClick={onSaveAndExit}
            disabled={pending}
          >
            Save Changes and Exit
          </button>
          <button
            type="button"
            className="btn btn-ghost dialog-action-btn"
            onClick={onDiscardAndExit}
            disabled={pending}
          >
            Discard Changes and Exit
          </button>
          <button
            type="button"
            className="btn btn-ghost dialog-action-btn"
            onClick={onReturn}
            disabled={pending}
          >
            Return to Note
          </button>
        </div>
      </div>
    </div>
  );
}
