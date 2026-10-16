using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

// All mutations validate the held process and HWND immediately before the call.
// Keeping its kernel handle open prevents a recycled PID from passing validation.
class TerminalControl {
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint owner);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr window, int command);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll", EntryPoint="PostMessageW", SetLastError=true)] static extern bool PostMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
    static bool Identity(Process process, string name, long ticks) {
        return !process.HasExited && process.ProcessName.Equals(name,StringComparison.OrdinalIgnoreCase) && process.StartTime.ToUniversalTime().Ticks==ticks;
    }
    static bool OwnsWindow(Process process, string name, long ticks, IntPtr window) {
        uint owner;
        return Identity(process,name,ticks) && window!=IntPtr.Zero && IsWindow(window) && GetWindowThreadProcessId(window,out owner)!=0 && owner==(uint)process.Id;
    }
    static string Execute(string[] args) {
        if(args.Length==1 && args[0]=="probe") { GetForegroundWindow(); return "ready:1"; }
        int pid; long ticks=0;
        if(args.Length<3 || !int.TryParse(args[2],out pid) || pid<=0 || (args[1]!="terminal" && args[1]!="launcher")) return "unavailable";
        string action=args[0],name=args[1]=="terminal"?"mintty":"powershell";
        if(action!="identity" && (args.Length!=4 || !long.TryParse(args[3],out ticks) || ticks<=0)) return "unavailable";
        if(action!="identity" && action!="status" && action!="raise" && action!="close") return "unavailable";
        Process process;
        try { process=Process.GetProcessById(pid); } catch(ArgumentException) { return "closed"; }
        using(process) {
            IntPtr handle=process.Handle; // Acquire before reading identity data; retain through mutation.
            if(action=="identity") {
                if(process.HasExited || !process.ProcessName.Equals(name,StringComparison.OrdinalIgnoreCase)) return "closed";
                return "{\"pid\":"+pid+",\"started\":\""+process.StartTime.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture)+"\"}";
            }
            if(!Identity(process,name,ticks)) return "closed";
            if(args[1]=="launcher") return action=="status"?"live":"unavailable";
            IntPtr window=process.MainWindowHandle;
            if(!OwnsWindow(process,name,ticks,window)) return "unavailable";
            if(action=="status") return "live";
            if(action=="close") {
                if(!OwnsWindow(process,name,ticks,window)) return "closed";
                if(!PostMessage(window,0x0010,IntPtr.Zero,IntPtr.Zero)) return "attention"; // WM_CLOSE only
                return process.WaitForExit(5000)?"closed":"attention";
            }
            // SW_SHOWNOACTIVATE restores without activation. HWND_TOP with
            // SWP_NOACTIVATE raises without topmost or foreground-policy changes.
            if(!OwnsWindow(process,name,ticks,window)) return "closed";
            if(!ShowWindowAsync(window,4)) return "attention";
            if(!OwnsWindow(process,name,ticks,window)) return "closed";
            if(!SetWindowPos(window,IntPtr.Zero,0,0,0,0,0x0010|0x0001|0x0002|0x0040)) return "attention";
            for(int i=0;i<10 && IsIconic(window);i++) Thread.Sleep(25);
            return OwnsWindow(process,name,ticks,window) && IsWindowVisible(window) && !IsIconic(window)?"raised":"attention";
        }
    }
    static int Main(string[] args) {
        try { Console.WriteLine(Execute(args)); return 0; }
        catch(Exception error) { Console.Error.WriteLine("Terminal helper: "+error.Message); Console.WriteLine("unavailable"); return 1; }
    }
}
