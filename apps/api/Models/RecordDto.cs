using System.ComponentModel.DataAnnotations;

namespace Epideixi.Api.Models;

public sealed record RecordDto(Guid Id, string Name, string? Description);

public sealed class CreateRecordRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }
}

public sealed class UpdateRecordRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }
}
