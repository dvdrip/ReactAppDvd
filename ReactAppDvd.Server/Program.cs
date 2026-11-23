using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactAppDvd.Server;
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=app.db"));
builder.Services
    .AddIdentityCore<IdentityUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager();
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.Cookie.Name = "ReactAppDvd.Auth";
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddValidation();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();
}

app.UseDefaultFiles();
app.MapStaticAssets();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/auth/status", (HttpContext httpContext) =>
    TypedResults.Ok(new AuthStatusResponse(httpContext.User.Identity?.IsAuthenticated == true)))
    .WithName("GetAuthenticationStatus")
    .WithSummary("Gets the current authentication status");

app.MapPost("/register", async Task<Results<Ok, BadRequest<ValidationProblemDetails>>> (
    RegisterRequest request,
    UserManager<IdentityUser> userManager,
    SignInManager<IdentityUser> signInManager,
    CancellationToken cancellationToken) =>
{
    var user = new IdentityUser
    {
        UserName = request.Username,
        Email = request.Email
    };
    var result = await userManager.CreateAsync(user, request.Password);
    if (!result.Succeeded)
    {
        var problem = new ValidationProblemDetails(
            result.Errors.ToDictionary(
                error => error.Code,
                error => new[] { error.Description }));
        return TypedResults.BadRequest(problem);
    }

    await signInManager.SignInAsync(user, isPersistent: true);
    return TypedResults.Ok();
})
    .WithName("Register")
    .WithSummary("Creates a new server-backed user account");

app.MapPost("/login", async Task<Results<Ok, UnauthorizedHttpResult>> (
    LoginRequest request,
    SignInManager<IdentityUser> signInManager) =>
{
    var result = await signInManager.PasswordSignInAsync(
        request.Username,
        request.Password,
        isPersistent: true,
        lockoutOnFailure: true);

    return result.Succeeded
        ? TypedResults.Ok()
        : TypedResults.Unauthorized();
})
    .WithName("Login")
    .WithSummary("Signs in an existing server-backed user account");

app.MapPost("/logout", async (SignInManager<IdentityUser> signInManager) =>
{
    await signInManager.SignOutAsync();
    return TypedResults.Ok();
})
    .WithName("Logout")
    .WithSummary("Signs out the current user");

app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Payload for signing in to an existing account.</summary>
public sealed record LoginRequest(
    [property: Required] string Username,
    [property: Required] string Password);

/// <summary>Payload for creating a server-backed account.</summary>
public sealed record RegisterRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Username,
    [property: Required] string Password);

/// <summary>Describes whether the current request is authenticated.</summary>
public sealed record AuthStatusResponse(bool IsAuthenticated);
