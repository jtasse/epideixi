using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epideixi.Api.Data.Migrations
{
    public partial class AddNoteTitle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "notes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "notes");
        }
    }
}
