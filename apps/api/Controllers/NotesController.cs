using System.Security.Claims;
using Epideixi.Api.Data;
using Epideixi.Api.Entities;
using Epideixi.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epideixi.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public sealed class NotesController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<NoteDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<NoteDto>>> Create(
        [FromBody] CreateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var ownerUserId = GetOwnerUserId();
        if (ownerUserId is null)
        {
            return Unauthorized();
        }

        var content = request.Content.Trim();
        if (string.IsNullOrEmpty(content))
        {
            return BadRequest();
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new Note
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerUserId,
            Content = content,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Notes.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new NoteDto(entity.Id, entity.Content, entity.CreatedAt, entity.UpdatedAt);
        return Created(
            $"/api/notes/{entity.Id}",
            ApiResponse<NoteDto>.Create(dto, HttpContext.TraceIdentifier));
    }

    private string? GetOwnerUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub");
}
