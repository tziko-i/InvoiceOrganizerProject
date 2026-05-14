using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class UserUpdateDto
{
    [Required]
    public string FullName { get; set; } = "";
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = "";
    
    public string Phone { get; set; } = "";
    
    public string Address { get; set; } = "";
}
