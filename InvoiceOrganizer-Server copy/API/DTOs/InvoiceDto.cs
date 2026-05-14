using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.DTOs;
public class InvoiceCreateDto
{
    public int InvoiceNumber { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public string FilePath { get; set; }
    public int SupplierId { get; set; }
    public string UserId { get; set; }
    public List<InvoiceItemCreateDto> Items { get; set; }
}

public class InvoiceItemCreateDto
{
    public string Name { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
}