namespace AudioDeck;
public record VolumeTarget(string Id,string Name,float Volume,bool Muted);
public record Player(string Id,string Name,string Title,string Artist,bool Playing,string? Artwork,bool CanToggle,bool CanNext,bool CanPrevious);
public record DeckState(VolumeTarget? Master,List<VolumeTarget> Sessions,List<Player> Players,string? MediaError);
public record Command(string Kind,string Target,float? Value,bool? Muted)
{
    public bool IsValid() => !string.IsNullOrWhiteSpace(Target) && Target.Length <= 4096 && Kind switch
    {
        "volume" => Value is >= 0 and <= 1 && Muted == null,
        "mute" => Muted != null && Value == null,
        "playPause" or "next" or "previous" => Value == null && Muted == null,
        _ => false
    };
}
