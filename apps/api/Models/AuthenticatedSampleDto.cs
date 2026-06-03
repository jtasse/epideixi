namespace Epideixi.Api.Models;

public sealed record AuthenticatedSampleDto(
    string Subject,
    string? Email,
    IReadOnlyList<string> Scopes);
