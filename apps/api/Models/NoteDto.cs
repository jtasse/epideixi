using System.ComponentModel.DataAnnotations;

namespace Epideixi.Api.Models;

public sealed record NoteDto(
    Guid Id,
    string Title,
    string Content,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PagedNotesDto(
    IReadOnlyList<NoteDto> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed class CreateNoteRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10000)]
    public string Content { get; init; } = string.Empty;
}
