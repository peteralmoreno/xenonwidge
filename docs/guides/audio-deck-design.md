# Audio Deck: player and mixer

Research date: 2026-10-08. Status: 0.1.0 preview implemented after user authorization. Medium tabs selected by default; Windows companion is the single media/mixer backend. See the implementation plan and release build record for verification limits.

## Goal

Combine the useful behavior of iCUE's music player and volume mixer in one touch widget: see what is playing, control playback, and adjust the volume of music and other running applications.

This is a separate project under `sources/audio-deck/`, with releases under `artifacts/audio-deck/`.

## What is available

- The official [Media Data Provider](https://docs.elgato.com/icue/widgets/references/plugins/media-data-provider/) documents song/artist information and play/pause, previous, and next commands.
- Corsair describes its built-in Volume widget as a mixer for audio sources, including games, in the [EDGE widget guide](https://www.corsair.com/uk/en/explorer/gamer/monitors/things-you-can-do-in-icue-with-the-xeneon-edge/).
- The published [custom-widget provider catalog](https://docs.elgato.com/icue/widgets/references/plugins/) does not list a volume-mixer provider. A built-in feature does not establish a supported custom-widget API.
- Local inspection of installed iCUE 5.52.93 found a `mediasession` HTML widget targeting keyboard LCDs, not an EDGE mixer source. Its local wrapper additionally references album, thumbnail, and playing-state methods. These are observed capabilities of this installation, not a verified portable contract. Feature-test them before relying on them.

No Corsair implementation code has been copied into this project.

## Proposed interface

- Now playing: title, artist, artwork when available, and large previous/play-pause/next buttons.
- Master output: device label, volume slider, percentage, and mute button.
- Applications: a scrollable list of live audio sessions with names, independent volume sliders, percentages, and mute buttons.
- Session updates preserve row order while dragging; a disappearing application becomes unavailable without redirecting a command to another row.
- External volume changes update the controls. Mute preserves the previous volume; unmute does not unexpectedly jump to 100%.
- Empty player, no active audio sessions, missing artwork, disconnected device, and companion-offline states are explicit.

Implemented layout: Medium (840 x 696) with Player/Mixer tabs and persistent master volume; portrait and reduced-size previews also fit. Large side-by-side is not part of this release.

## Integration approaches

1. **Widget plus a local Windows companion — recommended for the complete mixer.** Use supported Windows APIs for session enumeration and volume changes. The iCUE media provider can supply the basic player; use one coherent media backend per operation so commands and displayed state refer to the same player.
2. **iCUE provider only.** Fewer moving parts, but per-application mixing remains unproven. Use this route only if a supported, callable mixer API is established; do not ship decorative sliders in place of working controls.

A standalone Windows display application is another possible route, but would change the requested iCUE-widget delivery model. Corsair's experimental [Widget Runner](https://github.com/Corsair-Labs/iCUE-widget-runner-windows) demonstrates a separate host with optional native bridges; it does not prove those bridges are available inside iCUE.

## Companion basis

Windows [ISimpleAudioVolume](https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nn-audioclient-isimpleaudiovolume) provides session volume and mute. [IAudioEndpointVolume](https://learn.microsoft.com/en-us/windows/win32/api/endpointvolume/nn-endpointvolume-iaudioendpointvolume) controls the output endpoint. Session controls apply to shared-mode streams; exclusive-mode behavior needs separate treatment.

For richer media metadata or explicit player selection, evaluate [GlobalSystemMediaTransportControlsSessionManager](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager?view=winrt-26100). Availability depends on whether the source application publishes a media session.

Do not assume media sessions map one-to-one to audio sessions. In particular, browser tabs may not have independent Windows mixer rows. Identify volume targets explicitly, using stable session identities and clear labels.

If needed, the helper will expose only narrowly defined audio operations on loopback with authentication. Verify the widget can connect under actual iCUE restrictions before committing to that transport. Starting or reconnecting must read current state without changing volumes. An audio mixer does not require recording microphone or system audio.

## First implementation checks

1. Import a minimal Audio Deck package into iCUE before building the full interface. Preserve the uppercase DOCTYPE, valid metadata title, translations, and XML-compatible head learned from Doodle Pad.
2. Prove media read/control, then actual per-session volume read/control, using the intended transport.
3. Implement touch controls and synchronization, with Windows as the source of truth.
4. Verify volume changes affect only the chosen target, and test session disappearance, output-device changes, mute/unmute, and reconnection.
5. Package the widget and companion separately, with explicit install/start/stop instructions and a test record distinguishing browser simulation from real iCUE behavior.

Track seeking, equalizers, visualizers, lyrics, and output-routing changes are not part of the initial proposed scope.
