using System.Diagnostics;
using NAudio.CoreAudioApi;
using NAudio.CoreAudioApi.Interfaces;
namespace AudioDeck;
public static class WindowsAudio
{
    public static (VolumeTarget?,List<VolumeTarget>) Read()
    {
        var rows=new List<VolumeTarget>();
        using var devices=new MMDeviceEnumerator();
        if(!devices.HasDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia))return (null,rows);
        using var device=devices.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia);
        var master=new VolumeTarget(device.ID,device.FriendlyName,device.AudioEndpointVolume.MasterVolumeLevelScalar,device.AudioEndpointVolume.Mute);
        var manager=device.AudioSessionManager;
        try {
            var sessions=manager.Sessions;
            for(int i=0;i<sessions.Count;i++) {
                using var session=sessions[i];
                try {
                    if(session.State==AudioSessionState.AudioSessionStateExpired)continue;
                    string name=session.IsSystemSoundsSession ? "System sounds" : session.DisplayName;
                    if(string.IsNullOrWhiteSpace(name)||name.StartsWith('@')) {
                        try {using var process=Process.GetProcessById((int)session.GetProcessID);name=process.ProcessName;}
                        catch {name="Application "+session.GetProcessID;}
                    }
                    rows.Add(new VolumeTarget(device.ID+"|"+session.GetSessionInstanceIdentifier,name,session.SimpleAudioVolume.Volume,session.SimpleAudioVolume.Mute));
                } catch(System.Runtime.InteropServices.COMException) { /* A session closed while enumerating. */ }
            }
        } finally {manager.Dispose();}
        return(master,rows);
    }
    public static bool Apply(Command command)
    {
        using var devices=new MMDeviceEnumerator();
        if(!devices.HasDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia))return false;
        using var device=devices.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia);
        if(command.Target==device.ID) {
            if(command.Kind=="volume")device.AudioEndpointVolume.MasterVolumeLevelScalar=command.Value!.Value;
            else device.AudioEndpointVolume.Mute=command.Muted!.Value;
            return true;
        }
        var manager=device.AudioSessionManager;
        try {
            var sessions=manager.Sessions;
            for(int i=0;i<sessions.Count;i++) {
                using var session=sessions[i];
                if(session.State==AudioSessionState.AudioSessionStateExpired||device.ID+"|"+session.GetSessionInstanceIdentifier!=command.Target)continue;
                if(command.Kind=="volume")session.SimpleAudioVolume.Volume=command.Value!.Value;
                else session.SimpleAudioVolume.Mute=command.Muted!.Value;
                return true;
            }
        } finally {manager.Dispose();}
        return false;
    }
}
