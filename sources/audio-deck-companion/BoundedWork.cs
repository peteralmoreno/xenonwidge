namespace AudioDeck;
// Returning a timeout does not release ownership of work still running in Windows.
// Other requests fail promptly until that work finishes, preventing concurrent state writes.
public sealed class BoundedWork(TimeSpan timeout)
{
    private readonly SemaphoreSlim gate=new(1,1);
    public Task<T> Run<T>(Func<Task<T>> action)=>Exclusive(action).WaitAsync(timeout);
    private async Task<T> Exclusive<T>(Func<Task<T>> action)
    {
        if(!await gate.WaitAsync(0))throw new InvalidOperationException("Media provider is busy.");
        try{return await action();}finally{gate.Release();}
    }
}
