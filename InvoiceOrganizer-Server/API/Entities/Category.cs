using System;
using System.Text.Json.Serialization;

namespace API.Entities;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? UserId { get; set; }
    
    [JsonIgnore]
    public virtual Users? User { get; set; }
}
