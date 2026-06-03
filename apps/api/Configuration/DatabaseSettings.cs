namespace Epideixi.Api.Configuration;

public sealed class DatabaseSettings
{
    public const string SectionName = "Database";

    public string Host { get; init; } = "localhost";

    public int Port { get; init; } = 5432;

    public string Name { get; init; } = "epideixi";

    public string Username { get; init; } = "epideixi";

    public string? Password { get; init; }

    public bool UseIamAuth { get; init; }

    public string? Region { get; init; }

    public bool ApplyMigrations { get; init; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(Name)
        && !string.IsNullOrWhiteSpace(Username)
        && (!UseIamAuth || !string.IsNullOrWhiteSpace(Region));
}
