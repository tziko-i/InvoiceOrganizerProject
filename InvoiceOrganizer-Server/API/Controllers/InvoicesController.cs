using API.Data;
using API.DTOs;
using API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;


namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController(AppDbContext db) : ControllerBase
{
    private readonly AppDbContext db = db;
    private const int MaxPageSize = 200; // מגן על השרת

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var query = db.Categories.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(userId))
        {
             query = query.Where(c => c.UserId == userId || c.UserId == null);
        }
        else
        {
             query = query.Where(c => c.UserId == null);
        }

        var categories = await query.OrderBy(c => c.Name).ToListAsync();
        return Ok(categories);
    }

    [HttpPost("categories")]
    public async Task<ActionResult<Category>> CreateCategory(CategoryCreateDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var category = new Category
        {
            Name = dto.Name,
            UserId = userId
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync();

        return Ok(category);
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<ActionResult> DeleteCategory(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var category = await db.Categories.FindAsync(id);
        
        if (category == null) return NotFound();

        // Prevent deletion of global categories (UserId == null) or other users' categories
        if (category.UserId != userId)
        {
            return Forbid();
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync();

        return Ok();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Invoice>>> Get(
        [FromQuery] int? supplierId,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate
    )
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var q = db.Invoices.AsNoTracking().Include(i => i.Supplier).AsQueryable();
        
        // Filter by the current user
        if (!string.IsNullOrEmpty(userId))
        {
            q = q.Where(i => i.UserId == userId);
        }

        if (supplierId.HasValue)
            q = q.Where(i => i.SupplierId == supplierId.Value);

        if (fromDate.HasValue)
            q = q.Where(i => i.InvoiceDate >= fromDate.Value);

        if (toDate.HasValue)
            q = q.Where(i => i.InvoiceDate <= toDate.Value);

        q = q.OrderByDescending(i => i.InvoiceDate);

        return await q.ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Invoice>> GetOne(int id)
    {
        var invoice = await db.Invoices
            .AsNoTracking()
            .Include(i => i.Supplier)
            .Include(i => i.Items)
            .ThenInclude(item => item.Category)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
        {
            return NotFound();
        }

        return invoice;
    }

    [HttpGet("debug")]
    public async Task<IActionResult> DebugData()
    {
        var invoicesCount = await db.Invoices.CountAsync();
        var itemsCount = await db.InvoiceItems.CountAsync();
        var itemsData = await db.InvoiceItems.Select(x => new { x.Id, x.CategoryId, x.Price, x.Quantity }).Take(10).ToListAsync();
        var categories = await db.Categories.Select(c => new {c.Id, c.Name}).ToListAsync();

        return Ok(new { invoicesCount, itemsCount, itemsData, categories });
    }

    [HttpPost]
    public async Task<ActionResult<Invoice>> Create(InvoiceCreateDto dto)
    {
        // Validate User
        if (!string.IsNullOrEmpty(dto.UserId))
        {
            if (!await db.Set<Users>().AnyAsync(u => u.Id == dto.UserId))
                return BadRequest($"User with ID '{dto.UserId}' does not exist.");
        }

        // Validate Supplier
        if (dto.SupplierId > 0)
        {
            if (!await db.Set<Supplier>().AnyAsync(s => s.Id == dto.SupplierId))
                return BadRequest($"Supplier with ID {dto.SupplierId} does not exist.");
        }

        // Validate Categories
        var categoryIds = dto.Items.Select(i => i.CategoryId).Distinct().ToList();
        var existingCategories = await db.Categories.Where(c => categoryIds.Contains(c.Id)).Select(c => c.Id).ToListAsync();
        if (existingCategories.Count != categoryIds.Count)
            return BadRequest("One or more Category IDs are invalid.");

        // Map DTO to Entity
        var invoice = new Invoice
        {
            InvoiceNumber = dto.InvoiceNumber,
            InvoiceDate   = dto.InvoiceDate,
            FilePath      = dto.FilePath,
            SupplierId    = dto.SupplierId,
            UserId        = dto.UserId,
            Items = dto.Items.Select(item => new InvoiceItem
            {
                Name       = item.Name,
                Quantity   = item.Quantity,
                Price      = item.Price,
                CategoryId = item.CategoryId
            }).ToList()
        };

        invoice.ReCalculateTotal();

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = invoice.Id }, invoice);
    }

    
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Invoice dto)
    {
        if (id != dto.Id)
            return BadRequest("Id ב-URL לא תואם ל-Id בגוף הבקשה");

        var invoice = await db.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null)
            return NotFound();

        // עדכון שדות בסיסיים
        invoice.InvoiceNumber = dto.InvoiceNumber;
        invoice.InvoiceDate   = dto.InvoiceDate;
        invoice.FilePath      = dto.FilePath;
        invoice.SupplierId    = dto.SupplierId;
        invoice.UserId        = dto.UserId;

        // עדכון Items בצורה פשוטה: מוחקים ומכניסים מחדש
        invoice.Items.Clear();
        if (dto.Items is not null)
        {
            foreach (var item in dto.Items)
            {
                invoice.Items.Add(new InvoiceItem
                {
                    Name       = item.Name,
                    Price      = item.Price,
                    Quantity   = item.Quantity,
                    CategoryId = item.CategoryId
                    // InvoiceId יתמלא אוטומטית ע"י EF לפי הניווט
                });
            }
        }

        // חישוב Total מחדש
        invoice.ReCalculateTotal();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null)
            return NotFound();

        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("summary/months")]
    public async Task<ActionResult<IEnumerable<MonthSummaryDto>>> SummaryByYear(
        [FromQuery, Range(1, 9999)] int year,
        [FromQuery] int? supplierId
    )
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var start = new DateOnly(year, 1, 1);
        var end = start.AddYears(1);
        var q = db.Invoices.AsNoTracking().Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        if (!string.IsNullOrEmpty(userId))
        {
            q = q.Where(i => i.UserId == userId);
        }
        if (supplierId.HasValue)
            q = q.Where(i => i.SupplierId == supplierId.Value);
        var data = await q
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .Select(g => new MonthSummaryDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count(),
                Total = g.Sum(i => i.Total)
            })
            .OrderBy(ms => ms.Month)
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("summary/by-supplier")]
    public async Task<ActionResult<IEnumerable<SupplierSummaryDto>>> SummaryBySupplier(
        [FromQuery, Range(1, 9999)] int year,
        [FromQuery, Range(1, 12)] int month
    )
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var q = db.Invoices.AsNoTracking().Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        if (!string.IsNullOrEmpty(userId))
        {
            q = q.Where(i => i.UserId == userId);
        }
        var data = await q
            .GroupBy(i => i.SupplierId)
            .Select(g => new SupplierSummaryDto
            {
                SupplierId = g.Key,
                Count = g.Count(),
                Total = g.Sum(i => i.Total)
            })
            
            .ToListAsync();
            // 2. מיון הנתונים בזיכרון לפי Total
        var sortedData = data.OrderByDescending(ss => ss.Total).ToList();

        return Ok(sortedData);
    }

    [HttpGet("summary/by-category")]
    public async Task<ActionResult<IEnumerable<CategorySummaryDto>>> SummaryByCategory(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? supplierId
        )
    {
        DateOnly? start = null, end = null;
        if (year.HasValue && month.HasValue)
        {
            start = new DateOnly(year.Value, month.Value, 1);
            end = start.Value.AddMonths(1);
        }
        else if (year.HasValue)
        {
            start = new DateOnly(year.Value, 1, 1);
            end = start.Value.AddYears(1);
        }
        else if (from.HasValue || to.HasValue)
        {
            if (from.HasValue) start = from.Value;
            if (to.HasValue) end = to.Value;
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var q = db.InvoiceItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(userId))
        {
            q = q.Where(ii => ii.Invoice != null && ii.Invoice.UserId == userId);
        }

        if (supplierId.HasValue)
            q = q.Where(ii => ii.Invoice.SupplierId == supplierId.Value);

        if (start.HasValue)
            q = q.Where(ii => ii.Invoice.InvoiceDate >= start.Value);
        if (end.HasValue)
            q = q.Where(ii => ii.Invoice.InvoiceDate < end.Value);

        // 1. קודם כל מבצעים את השליפה והקיבוץ, ומביאים את הנתונים לזיכרון
        var data = await q
            .GroupBy(ii => new { ii.CategoryId, CategoryName = ii.Category.Name })
            .Select(g => new CategorySummaryDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName,
                Count = g.Count(),
                Total = g.Sum(x => x.Price * x.Quantity)
            })
            .ToListAsync(); // השליפה מתבצעת כאן

        // 2. עכשיו ממיינים את הנתונים שכבר נמצאים בזיכרון
        var sortedData = data.OrderByDescending(x => x.Total).ToList();

        return Ok(sortedData);
    }
    

    [HttpGet("summary/by-year")]
    public async Task<ActionResult<IEnumerable<YearSummaryDto>>> SummaryByYearRange(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to
        )
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var defaultStart = new DateOnly(today.Year - 4, 1, 1); // 5

        var start = from ?? defaultStart;
        var end = to ?? start.AddYears(5);
        var q = db.Invoices.AsNoTracking()
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end);
        var data = await q
            .GroupBy(i => i.InvoiceDate.Year)
            .Select(g => new YearSummaryDto
            {
                Year = g.Key,
                Count = g.Count(),
                Total = g.Sum(x => x.Total)
            }
            )
            .OrderBy(x => x.Year)
            .ToListAsync();
        return Ok(data);
    }
}
