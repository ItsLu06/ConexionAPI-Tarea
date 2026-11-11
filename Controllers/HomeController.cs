using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ConexionAPI.Models;

namespace ConexionAPI.Controllers;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        return LocalRedirect("/index.html");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
