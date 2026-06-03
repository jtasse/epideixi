namespace Epideixi.Api.Configuration;

public sealed class CognitoSettings
{
    public const string SectionName = "Cognito";

    public string Authority { get; init; } = string.Empty;

    public string Audience { get; init; } = string.Empty;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Authority) && !string.IsNullOrWhiteSpace(Audience);
}
