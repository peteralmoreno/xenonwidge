using AudioDeck;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var config=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AudioDeck");
Directory.CreateDirectory(config);
var keyFile=Path.Combine(config,"pairing-key.txt");
if(!File.Exists(keyFile))File.WriteAllText(keyFile,Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant());
var key=File.ReadAllText(keyFile).Trim();
if(key.Length!=64||!key.All(Uri.IsHexDigit))throw new InvalidDataException("Invalid pairing key. Delete pairing-key.txt and restart to generate a new key.");
var builder=WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:43821");
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=8192);
builder.Logging.ClearProviders();
var app=builder.Build();
var gate=new SemaphoreSlim(1,1);
var media=new WindowsMedia();
app.Use(async(context,next)=>{
    context.Response.Headers.AccessControlAllowOrigin="*";
    context.Response.Headers.AccessControlAllowHeaders="Authorization, Content-Type";
    context.Response.Headers.AccessControlAllowMethods="GET, POST, OPTIONS";
    context.Response.Headers["Access-Control-Allow-Private-Network"]="true";
    context.Response.Headers.CacheControl="no-store";
    if(context.Request.Host.Host!="127.0.0.1"){context.Response.StatusCode=403;return;}
    if(context.Request.Method=="OPTIONS"){context.Response.StatusCode=204;return;}
    var provided=context.Request.Headers.Authorization.ToString();
    if(!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(provided),Encoding.UTF8.GetBytes("Bearer "+key))) {context.Response.StatusCode=401;return;}
    await next();
});
app.MapGet("/state",async()=>{
    if(!await gate.WaitAsync(TimeSpan.FromSeconds(3)))return Results.Json(new{error="Audio busy. Try again."},statusCode:503);
    VolumeTarget? master;List<VolumeTarget> sessions;
    try {
        (master,sessions)=WindowsAudio.Read();
    }catch{return Results.Json(new{error="Windows audio unavailable. Check your output device."},statusCode:503);}
    finally{gate.Release();}
    List<Player> players=[];string? error=null;
    try{players=await media.Read();}catch{error="Media information unavailable. Reopen your music app.";}
    return Results.Json(new DeckState(master,sessions,players,error));
});
app.MapPost("/command",async(HttpContext context)=>{
    Command? command;
    try{command=await context.Request.ReadFromJsonAsync<Command>();}catch(JsonException){return Results.BadRequest(new{error="Invalid command."});}
    if(command==null||!command.IsValid())return Results.BadRequest(new{error="Invalid command."});
    if(command.Kind is not ("volume" or "mute")) {
        try{return await media.Apply(command)?Results.Ok(new{ok=true}):Results.Conflict(new{error="This player is no longer available or does not support that action."});}
        catch{return Results.Conflict(new{error="Music app did not respond. Check the player and try again."});}
    }
    if(!await gate.WaitAsync(TimeSpan.FromSeconds(3)))return Results.Json(new{error="Audio busy. Try again."},statusCode:503);
    try {
        bool ok=WindowsAudio.Apply(command);
        return ok?Results.Ok(new{ok=true}):Results.Conflict(new{error="This audio target is no longer available or does not support that action."});
    }catch{return Results.Conflict(new{error="Audio target changed. Refresh and try again."});}
    finally{gate.Release();}
});
Console.WriteLine("Audio Deck Companion\nListening on 127.0.0.1:43821\nPairing key file: "+keyFile+"\nPaste that key into Audio Deck's Connect panel. Close this window to stop.");
await app.RunAsync();
