using Epideixi.Api.Configuration;
using Epideixi.Api.Data;
using Epideixi.Api.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Epideixi.Api.Extensions;

public static class DatabaseServiceExtensions
{
    public static IServiceCollection AddEpideixiDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var settings = configuration
            .GetSection(DatabaseSettings.SectionName)
            .Get<DatabaseSettings>() ?? new DatabaseSettings();

        if (!settings.IsConfigured)
        {
            throw new InvalidOperationException(
                "Database settings are incomplete. See apps/api/README.md.");
        }

        services.Configure<DatabaseSettings>(
            configuration.GetSection(DatabaseSettings.SectionName));

        if (settings.UseIamAuth)
        {
            services.AddSingleton<RdsIamAuthTokenProvider>();
            services.AddSingleton<IamAuthenticationDbConnectionInterceptor>();
        }

        var connectionString = BuildConnectionString(settings);

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            if (settings.UseIamAuth)
            {
                options.AddInterceptors(
                    sp.GetRequiredService<IamAuthenticationDbConnectionInterceptor>());
            }
        });

        return services;
    }

    private static string BuildConnectionString(DatabaseSettings settings)
    {
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = settings.Host,
            Port = settings.Port,
            Database = settings.Name,
            Username = settings.Username,
            SslMode = settings.UseIamAuth ? SslMode.Require : SslMode.Prefer,
        };

        if (!settings.UseIamAuth)
        {
            if (string.IsNullOrWhiteSpace(settings.Password))
            {
                throw new InvalidOperationException(
                    "Database:Password is required when Database:UseIamAuth is false.");
            }

            builder.Password = settings.Password;
        }

        return builder.ConnectionString;
    }

    public static void ApplyDatabaseMigrationsIfRequested(this WebApplication app)
    {
        var settings = app.Configuration
            .GetSection(DatabaseSettings.SectionName)
            .Get<DatabaseSettings>();

        if (settings?.ApplyMigrations != true)
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
    }
}
