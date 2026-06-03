using Epideixi.Api.Data;
using Epideixi.Api.Entities;
using Epideixi.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Epideixi.Api.Controllers;

[ApiController]
[Route("api/records")]
[Authorize]
public sealed class RecordsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RecordsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<RecordDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RecordDto>>>> List(CancellationToken cancellationToken)
    {
        var records = await _db.Records
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new RecordDto(r.Id, r.Name, r.Description))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<IReadOnlyList<RecordDto>>.Create(records, HttpContext.TraceIdentifier));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<RecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RecordDto>>> Get(Guid id, CancellationToken cancellationToken)
    {
        var record = await _db.Records
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new RecordDto(r.Id, r.Name, r.Description))
            .FirstOrDefaultAsync(cancellationToken);

        if (record is null)
        {
            return NotFound();
        }

        return Ok(ApiResponse<RecordDto>.Create(record, HttpContext.TraceIdentifier));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<RecordDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RecordDto>>> Create(
        [FromBody] CreateRecordRequest request,
        CancellationToken cancellationToken)
    {
        var entity = new Record
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
        };

        _db.Records.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new RecordDto(entity.Id, entity.Name, entity.Description);
        return CreatedAtAction(
            nameof(Get),
            new { id = entity.Id },
            ApiResponse<RecordDto>.Create(dto, HttpContext.TraceIdentifier));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<RecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RecordDto>>> Update(
        Guid id,
        [FromBody] UpdateRecordRequest request,
        CancellationToken cancellationToken)
    {
        var entity = await _db.Records.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Name = request.Name.Trim();
        entity.Description = request.Description?.Trim();
        await _db.SaveChangesAsync(cancellationToken);

        var dto = new RecordDto(entity.Id, entity.Name, entity.Description);
        return Ok(ApiResponse<RecordDto>.Create(dto, HttpContext.TraceIdentifier));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _db.Records.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        _db.Records.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
