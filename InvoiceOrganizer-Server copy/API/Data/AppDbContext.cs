using System;
using Microsoft.EntityFrameworkCore;
using API.Entities;

namespace API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Supplier> Suppliers { set; get; }
    public DbSet<Invoice> Invoices { set; get; }
    public DbSet<InvoiceItem> InvoiceItems { set; get; } 
    public DbSet<Category> Categories { set; get; }
    public DbSet<Users> Users { set; get; }
    public DbSet<UploadedDocument> UploadedDocuments { set; get; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "ציוד משרדי" },
            new Category { Id = 2, Name = "מזון וכיבוד" },
            new Category { Id = 3, Name = "חשמל ואלקטרוניקה" },
            new Category { Id = 4, Name = "תחזוקה וניקיון" },
            new Category { Id = 5, Name = "שונות" },
            new Category { Id = 6, Name = "office" },
            new Category { Id = 7, Name = "food" },
            new Category { Id = 8, Name = "electric" },
            new Category { Id = 9, Name = "cleaning" },
            new Category { Id = 10, Name = "maintenance" },
            new Category { Id = 11, Name = "others" }
        );
    }
}
