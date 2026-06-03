using System.Security.Claims;
using Epideixi.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epideixi.Api.Controllers;

[ApiController]
[Route("api/sample")]
[Authorize]
public sealed class SampleController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<AuthenticatedSampleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorBody), StatusCodes.Status401Unauthorized)]
    public ActionResult<ApiResponse<AuthenticatedSampleDto>> Get()
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? "unknown";

        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email");

        var scopes = User.FindAll("scope")
            .SelectMany(c => c.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Distinct()
            .ToList();

        var payload = new AuthenticatedSampleDto(subject, email, scopes);
        return Ok(ApiResponse<AuthenticatedSampleDto>.Create(payload, HttpContext.TraceIdentifier));
    }
}
