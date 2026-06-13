using Epideixi.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Epideixi.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Record> Records => Set<Record>();

    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Record>(entity =>
        {
            entity.ToTable("records");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Name).HasMaxLength(200).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(2000);
        });

        modelBuilder.Entity<Note>(entity =>
        {
            entity.ToTable("notes");
            entity.HasKey(n => n.Id);
            entity.Property(n => n.OwnerUserId).HasMaxLength(128).IsRequired();
            entity.Property(n => n.Content).HasMaxLength(10000).IsRequired();
            entity.HasIndex(n => n.OwnerUserId);
        });
    }
}
