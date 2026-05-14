using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class CategoryCreateDto
{
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }
}
