using AudioDeck;
static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
Check(new Command("volume","device",0,null).IsValid(),"Zero volume must be valid");
Check(!new Command("volume","device",float.NaN,null).IsValid(),"NaN volume must be rejected");
Check(!new Command("volume","device",1.1f,null).IsValid(),"Out-of-range volume must be rejected");
Check(!new Command("mute","device",null,null).IsValid(),"Mute requires an explicit value");
Check(!new Command("launch","device",null,null).IsValid(),"Only audio operations are allowed");
var work=new BoundedWork(TimeSpan.FromMilliseconds(50));
var pending=new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously);
try{await work.Run(()=>pending.Task);throw new Exception("Hung provider did not time out");}catch(TimeoutException){}
bool entered=false;
try{await work.Run(()=>{entered=true;return Task.FromResult(2);});throw new Exception("Concurrent operation was accepted");}catch(InvalidOperationException){}
Check(!entered,"Timed out work must retain exclusive access until it actually finishes");
pending.SetResult(1);
int result=0;
for(int i=0;i<100;i++){try{result=await work.Run(()=>Task.FromResult(3));break;}catch(InvalidOperationException){await Task.Delay(10);}}
Check(result==3,"Provider must recover after abandoned work finishes");
try{await work.Run<int>(()=>throw new ArgumentException());}catch(ArgumentException){}
Check(await work.Run(()=>Task.FromResult(4))==4,"Provider exception must release the gate");
Console.WriteLine("Companion validation and bounded media work checks passed.");
