# Audio Deck Companion

Local Windows backend for [Audio Deck](../audio-deck/README.md). ASP.NET Core listens only at 127.0.0.1:43821. Every data/control request requires the per-user random key in `%LOCALAPPDATA%\AudioDeck\pairing-key.txt` as a Bearer token. CORS supports iCUE's file/custom origin; possession of the key is required regardless of origin. Requests are limited to audio operations and 8 KB bodies.

CoreAudio via NAudio reads the current default multimedia endpoint and live sessions. Full endpoint plus session-instance IDs prevent target reuse. Windows media sessions provide metadata and playback. Media work has a separate exclusive gate and bounded caller wait, so a stuck provider cannot monopolize the mixer. Media operations request cancellation after two seconds.

Build from root with `npm run build:companion`. The release is self-contained for Windows x64. Run it as the ordinary desktop user. No admin access, recording, service registration or autostart is needed. Close the console to stop.

Dependencies: NAudio.Wasapi / NAudio.Core 2.2.1 (MIT), Microsoft .NET and Windows SDK projections. NAudio source and license: https://github.com/naudio/NAudio/tree/v2.2.1 . Runtime license files are included by publish. The lock file records resolved dependencies.
