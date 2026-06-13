using System.ComponentModel.DataAnnotations;

namespace Epideixi.Api.Models;

public sealed record NoteDto(
    Guid Id,
    string Content,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed class CreateNoteRequest
{
    [Required]
    [MaxLength(10000)]
    public string Content { get; init; } = string.Empty;
}
