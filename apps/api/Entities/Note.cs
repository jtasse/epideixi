namespace Epideixi.Api.Entities;

public sealed class Note
{
    public Guid Id { get; set; }

    public string OwnerUserId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
