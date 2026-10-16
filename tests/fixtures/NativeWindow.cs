using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
class NativeWindow : Form {
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    protected override bool ShowWithoutActivation { get { return true; } }
    [STAThread] static void Main(string[] args) {
        string capture=Environment.GetEnvironmentVariable("RANCH_NATIVE_ARGV");
        if(capture!=null) File.WriteAllLines(capture,args);
        if(capture==null && args[1]=="headless") { var current=Process.GetCurrentProcess(); File.WriteAllText(args[0],"{\"pid\":"+current.Id+",\"started\":\""+current.StartTime.ToUniversalTime().Ticks+"\"}"); System.Threading.Thread.Sleep(20000); return; }
        var form = new NativeWindow { Text="Bot Ranch isolated native test", Width=120, Height=70, ShowInTaskbar=true, Left=-20000, Top=-20000 };
        form.StartPosition=FormStartPosition.Manual;
        if(capture==null && args[1]=="minimized") form.WindowState=FormWindowState.Minimized;
        if(capture==null && args[1]=="ignore") form.FormClosing += (s,e)=> e.Cancel=true;
        var self=Process.GetCurrentProcess(); var timer=new Timer { Interval=40 };
        int elapsed=0;
        timer.Tick += (s,e)=> { if(capture!=null) { elapsed+=40; string binding=Environment.GetEnvironmentVariable("OMP_BOT_BINDING_FILE"); if(File.Exists(binding)) { File.Copy(binding,capture+".binding",true); form.Close(); } else if(elapsed>8000) form.Close(); return; } try { File.WriteAllText(args[0],"{\"pid\":"+self.Id+",\"started\":\""+self.StartTime.ToUniversalTime().Ticks+"\",\"foreground\":\""+GetForegroundWindow()+"\"}"); } catch(IOException) {} };
        timer.Start(); Application.Run(form);
    }
}
