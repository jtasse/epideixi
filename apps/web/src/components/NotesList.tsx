import {
  displayNoteTitle,
  formatNoteDate,
  notePreview,
  type NoteDto,
  type NoteSortOption,
} from '@/api/notes';

type NotesListProps = {
  notes: NoteDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort: NoteSortOption;
  loading: boolean;
  onSortChange: (sort: NoteSortOption) => void;
  onPageChange: (page: number) => void;
  onViewEdit: (note: NoteDto) => void;
};

const sortOptions: { value: NoteSortOption; label: string }[] = [
  { value: 'createdAt-desc', label: 'Date created (newest)' },
  { value: 'createdAt-asc', label: 'Date created (oldest)' },
  { value: 'title-asc', label: 'Title (A–Z)' },
  { value: 'title-desc', label: 'Title (Z–A)' },
];

export function NotesList({
  notes,
  page,
  pageSize,
  totalCount,
  sort,
  loading,
  onSortChange,
  onPageChange,
  onViewEdit,
}: NotesListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <section className="notes-list" aria-label="Your notes">
      <div className="notes-list-controls">
        <label className="notes-sort">
          <span className="notes-sort-label">Sort by</span>
          <select
            className="notes-sort-select"
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as NoteSortOption)
            }
            disabled={loading}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="notes-list-meta muted">
          {totalCount === 0
            ? 'No notes yet'
            : `Showing ${notes.length} of ${totalCount} note${totalCount === 1 ? '' : 's'}`}
        </p>
      </div>

      {loading && notes.length === 0 && (
        <p className="muted">Loading notes…</p>
      )}

      {!loading && notes.length === 0 && (
        <p className="muted">Create your first note to see it here.</p>
      )}

      {notes.length > 0 && (
        <ul className="notes-grid">
          {notes.map((note) => (
            <li key={note.id} className="note-tile">
              <div className="note-tile-body">
                <h2 className="note-tile-title">
                  {displayNoteTitle(note.title)}
                </h2>
                <p className="note-tile-date muted">
                  {formatNoteDate(note.createdAt)}
                </p>
                <p className="note-tile-preview">{notePreview(note.content)}</p>
              </div>
              <div className="note-tile-actions">
                <button
                  type="button"
                  className="btn btn-primary note-tile-action-btn"
                  onClick={() => onViewEdit(note)}
                >
                  View/Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalCount > pageSize && (
        <nav className="notes-pagination" aria-label="Notes pages">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || !hasPrevious}
          >
            Previous
          </button>
          <span className="notes-pagination-status">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || !hasNext}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
