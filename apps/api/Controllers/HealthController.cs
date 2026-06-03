using Epideixi.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace Epideixi.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<HealthStatusDto>), StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<HealthStatusDto>> Get()
    {
        var payload = new HealthStatusDto("healthy", "epideixi-api");
        return Ok(ApiResponse<HealthStatusDto>.Create(payload, HttpContext.TraceIdentifier));
    }
}
