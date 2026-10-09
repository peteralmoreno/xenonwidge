using Windows.Media.Control;
using Windows.Storage.Streams;
namespace AudioDeck;
public sealed class WindowsMedia
{
    private GlobalSystemMediaTransportControlsSessionManager? manager;
    private readonly Dictionary<GlobalSystemMediaTransportControlsSession,string> identities=new();
    private readonly Dictionary<string,(string Key,string? Data)> artwork=new();
    private readonly BoundedWork work=new(TimeSpan.FromSeconds(2.5));
    public Task<List<Player>> Read()=>work.Run(ReadCore);
    public Task<bool> Apply(Command command)=>work.Run(()=>ApplyCore(command));
    private async Task<GlobalSystemMediaTransportControlsSessionManager> Manager(CancellationToken token)=>manager??=await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask(token);
    private async Task<List<Player>> ReadCore()
    {
        using var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(2));
        var token=timeout.Token;
        var sessions=(await Manager(token)).GetSessions();
        foreach(var old in identities.Keys.Where(s=>!sessions.Contains(s)).ToList()){artwork.Remove(identities[old]);identities.Remove(old);}
        var players=new List<Player>();
        foreach(var s in sessions) {
            if(!identities.TryGetValue(s,out var id))identities[s]=id=Guid.NewGuid().ToString("N");
            var info=s.GetPlaybackInfo();
            var props=await s.TryGetMediaPropertiesAsync().AsTask(token);
            var key=props.Title+"\n"+props.Artist+"\n"+props.AlbumTitle;
            if(!artwork.TryGetValue(id,out var cover)||cover.Key!=key) {
                string? data=null;
                try {
                    if(props.Thumbnail!=null) {
                        using var stream=await props.Thumbnail.OpenReadAsync().AsTask(token);
                        if(stream.Size is >0 and <=1048576 && (stream.ContentType=="image/png"||stream.ContentType=="image/jpeg")) {
                            using var reader=new DataReader(stream);await reader.LoadAsync((uint)stream.Size).AsTask(token);
                            var bytes=new byte[(int)stream.Size];reader.ReadBytes(bytes);data="data:"+stream.ContentType+";base64,"+Convert.ToBase64String(bytes);
                        }
                    }
                } catch { /* Artwork is optional. */ }
                artwork[id]=cover=(key,data);
            }
            players.Add(new Player(id,s.SourceAppUserModelId,props.Title,props.Artist,info.PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,cover.Data,info.Controls.IsPlayPauseToggleEnabled,info.Controls.IsNextEnabled,info.Controls.IsPreviousEnabled));
        }
        return players;
    }
    private async Task<bool> ApplyCore(Command command)
    {
        using var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(2));
        var token=timeout.Token;
        var sessions=(await Manager(token)).GetSessions();
        var session=identities.FirstOrDefault(p=>p.Value==command.Target).Key;
        if(session==null||!sessions.Contains(session))return false;
        return command.Kind switch {
            "playPause"=>await session.TryTogglePlayPauseAsync().AsTask(token),
            "next"=>await session.TrySkipNextAsync().AsTask(token),
            "previous"=>await session.TrySkipPreviousAsync().AsTask(token),
            _=>false
        };
    }
}
