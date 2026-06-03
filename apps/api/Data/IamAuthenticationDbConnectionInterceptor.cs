using System.Data.Common;
using Epideixi.Api.Configuration;
using Epideixi.Api.Services;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Epideixi.Api.Data;

public sealed class IamAuthenticationDbConnectionInterceptor : DbConnectionInterceptor
{
    private readonly DatabaseSettings _settings;
    private readonly RdsIamAuthTokenProvider _tokenProvider;

    public IamAuthenticationDbConnectionInterceptor(
        IOptions<DatabaseSettings> settings,
        RdsIamAuthTokenProvider tokenProvider)
    {
        _settings = settings.Value;
        _tokenProvider = tokenProvider;
    }

    public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken cancellationToken = default)
    {
        ConfigureIamPassword(connection);
        return base.ConnectionOpeningAsync(connection, eventData, result, cancellationToken);
    }

    public override InterceptionResult ConnectionOpening(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        ConfigureIamPassword(connection);
        return base.ConnectionOpening(connection, eventData, result);
    }

    private void ConfigureIamPassword(DbConnection connection)
    {
        if (!_settings.UseIamAuth || connection is not NpgsqlConnection npgsql)
        {
            return;
        }

        npgsql.ProvidePasswordCallback = (_, _, _, _) => _tokenProvider.GenerateAuthToken();
    }
}
