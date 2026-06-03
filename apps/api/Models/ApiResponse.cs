namespace Epideixi.Api.Models;

public sealed record ApiMeta(DateTimeOffset Timestamp, string? RequestId = null);

public sealed record ApiResponse<T>(T Data, ApiMeta Meta)
{
    public static ApiResponse<T> Create(T data, string? requestId = null) =>
        new(data, new ApiMeta(DateTimeOffset.UtcNow, requestId));
}

public sealed record ApiErrorBody(string Code, string Message, ApiMeta Meta);
