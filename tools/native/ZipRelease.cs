using System;
using System.IO;
using System.IO.Compression;
class ZipRelease {
    static int Main(string[] args) {
        try {
            if(args.Length!=2) throw new ArgumentException("Usage: ZipRelease.exe source destination");
            string source=Path.GetFullPath(args[0]),destination=Path.GetFullPath(args[1]);
            if(destination.StartsWith(source.TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Archive destination must be outside the input directory.");
            ZipFile.CreateFromDirectory(source,destination,CompressionLevel.Optimal,false);
            return 0;
        } catch(Exception error) { Console.Error.WriteLine(error.Message); return 1; }
    }
}
