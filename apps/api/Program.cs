using System.Text.Json.Serialization;
using Amazon.Lambda.AspNetCoreServer.Hosting;
using Epideixi.Api.Configuration;
using Epideixi.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

builder.Services.Configure<CognitoSettings>(
    builder.Configuration.GetSection(CognitoSettings.SectionName));

var cognito = builder.Configuration
    .GetSection(CognitoSettings.SectionName)
    .Get<CognitoSettings>() ?? new CognitoSettings();

if (!cognito.IsConfigured)
{
    throw new InvalidOperationException(
        "Cognito:Authority and Cognito:Audience must be configured. " +
        "See apps/api/README.md for local setup or deploy with SAM.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = cognito.Authority;
        // Cognito access tokens use client_id; ID tokens use aud. Issuer + signature validation
        // is enforced via Authority; client id is checked in OnTokenValidated.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateLifetime = true,
            ValidateAudience = false,
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var clientId = context.Principal?.FindFirst("client_id")?.Value;
                var audience = context.Principal?.FindFirst("aud")?.Value;
                var tokenUse = context.Principal?.FindFirst("token_use")?.Value;

                var matchesClient = string.Equals(clientId, cognito.Audience, StringComparison.Ordinal);
                var matchesAudience = string.Equals(audience, cognito.Audience, StringComparison.Ordinal);

                if (tokenUse == "access" && !matchesClient)
                {
                    context.Fail("JWT client_id does not match the configured Cognito app client.");
                }
                else if (tokenUse == "id" && !matchesAudience)
                {
                    context.Fail("JWT aud does not match the configured Cognito app client.");
                }
                else if (tokenUse is null && !matchesClient && !matchesAudience)
                {
                    context.Fail("JWT is not issued for the configured Cognito app client.");
                }

                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var body = new ApiErrorBody(
                    "unauthorized",
                    "A valid Cognito JWT is required.",
                    new ApiMeta(DateTimeOffset.UtcNow));

                return context.Response.WriteAsJsonAsync(body);
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                var body = new ApiErrorBody(
                    "forbidden",
                    "You do not have permission to access this resource.",
                    new ApiMeta(DateTimeOffset.UtcNow));

                return context.Response.WriteAsJsonAsync(body);
            },
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Epideixi API",
        Version = "v1",
        Description = "ASP.NET Core API secured with Amazon Cognito JWTs.",
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Cognito JWT. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

var corsConfig = builder.Configuration["Cors:AllowedOrigins"];
var corsOrigins = string.IsNullOrWhiteSpace(corsConfig)
    ? new[] { "http://localhost:5173" }
    : corsConfig.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(policy =>
{
    policy.AddPolicy("WebApp", corsPolicy =>
    {
        corsPolicy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("WebApp");
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Epideixi API v1");
    options.RoutePrefix = "swagger";
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
