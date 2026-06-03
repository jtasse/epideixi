using Amazon;
using Amazon.RDS.Util;
using Amazon.Runtime;
using Epideixi.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Epideixi.Api.Services;

public sealed class RdsIamAuthTokenProvider
{
    private readonly DatabaseSettings _settings;

    public RdsIamAuthTokenProvider(IOptions<DatabaseSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GenerateAuthToken()
    {
        if (string.IsNullOrWhiteSpace(_settings.Region))
        {
            throw new InvalidOperationException(
                "Database:Region is required when Database:UseIamAuth is true.");
        }

        var region = RegionEndpoint.GetBySystemName(_settings.Region);
        var credentials = FallbackCredentialsFactory.GetCredentials();

        return RDSAuthTokenGenerator.GenerateAuthToken(
            credentials,
            region,
            _settings.Host,
            _settings.Port,
            _settings.Username);
    }
}
