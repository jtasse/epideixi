using System.Security.Claims;
using Epideixi.Api.Data;
using Epideixi.Api.Entities;
using Epideixi.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Epideixi.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public sealed class NotesController : ControllerBase
{
    private const int DefaultPageSize = 10;
    private const int MaxPageSize = 50;

    private readonly AppDbContext _db;

    public NotesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedNotesDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<PagedNotesDto>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortDirection = "desc",
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        if (ownerUserId is null)
        {
            return Unauthorized();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.Notes
            .AsNoTracking()
            .Where(n => n.OwnerUserId == ownerUserId);

        query = ApplySort(query, sortBy, sortDirection);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NoteDto(n.Id, n.Title, n.Content, n.CreatedAt, n.UpdatedAt))
            .ToListAsync(cancellationToken);

        var result = new PagedNotesDto(items, page, pageSize, totalCount);
        return Ok(ApiResponse<PagedNotesDto>.Create(result, HttpContext.TraceIdentifier));
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

        var title = request.Title.Trim();
        var content = request.Content.Trim();
        if (string.IsNullOrEmpty(title))
        {
            return BadRequest();
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new Note
        {
            Id = Guid.NewGuid(),
            OwnerUserId = ownerUserId,
            Title = title,
            Content = content,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Notes.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new NoteDto(
            entity.Id,
            entity.Title,
            entity.Content,
            entity.CreatedAt,
            entity.UpdatedAt);
        return Created(
            $"/api/notes/{entity.Id}",
            ApiResponse<NoteDto>.Create(dto, HttpContext.TraceIdentifier));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<NoteDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<NoteDto>>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var ownerUserId = GetOwnerUserId();
        if (ownerUserId is null)
        {
            return Unauthorized();
        }

        var note = await _db.Notes
            .AsNoTracking()
            .Where(n => n.Id == id && n.OwnerUserId == ownerUserId)
            .Select(n => new NoteDto(n.Id, n.Title, n.Content, n.CreatedAt, n.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        if (note is null)
        {
            return NotFound();
        }

        return Ok(ApiResponse<NoteDto>.Create(note, HttpContext.TraceIdentifier));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<NoteDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<NoteDto>>> Update(
        Guid id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken cancellationToken)
    {
        var ownerUserId = GetOwnerUserId();
        if (ownerUserId is null)
        {
            return Unauthorized();
        }

        var title = request.Title.Trim();
        var content = request.Content.Trim();
        if (string.IsNullOrEmpty(title))
        {
            return BadRequest();
        }

        var entity = await _db.Notes
            .FirstOrDefaultAsync(
                n => n.Id == id && n.OwnerUserId == ownerUserId,
                cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        entity.Title = title;
        entity.Content = content;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var dto = new NoteDto(
            entity.Id,
            entity.Title,
            entity.Content,
            entity.CreatedAt,
            entity.UpdatedAt);
        return Ok(ApiResponse<NoteDto>.Create(dto, HttpContext.TraceIdentifier));
    }

    private static IQueryable<Note> ApplySort(
        IQueryable<Note> query,
        string sortBy,
        string sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        return sortBy.ToLowerInvariant() switch
        {
            "title" => descending
                ? query.OrderByDescending(n => n.Title).ThenByDescending(n => n.CreatedAt)
                : query.OrderBy(n => n.Title).ThenByDescending(n => n.CreatedAt),
            _ => descending
                ? query.OrderByDescending(n => n.CreatedAt)
                : query.OrderBy(n => n.CreatedAt),
        };
    }

    private string? GetOwnerUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub");
}
