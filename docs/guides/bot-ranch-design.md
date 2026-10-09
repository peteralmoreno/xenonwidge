# Bot Ranch

Design for review, 2026-10-08. Evolves the existing OMP Bot widget and companion.

## Agreed direction

A Medium iCUE widget with a small, side-view pixel-art ranch and up to four robot residents. Each robot represents a real Oh My Pi terminal. Robots use distinct colors and show whether their terminal is ready, reading, researching, writing, running, thinking, waiting for input, done, or disconnected. Tapping a robot should bring its linked Bash terminal forward when a supported window binding exists.

The user chose the name Bot Ranch and a maximum of four differently colored bots. The visual reference is Super Mario World: chunky silhouettes, crisp pixels, limited palettes, simple shading and bouncy movement. Create original robot and landscape artwork.

## Scene and interaction

- A quiet sky, low fence, grass and soil platform keep the robots easy to read. Use code-native pixel artwork with nearest-neighbor rendering and no external asset dependency.
- Four stable resident colors: coral, cyan, gold and violet. Project labels and slot numbers identify robots independently of color.
- Ready bots take short walks, pause and turn around within the scene. Keep spacing between robots and reserve room for labels and activity props. Animation is decorative; it never invents terminal activity.
- Working bots stop wandering. Reading uses a book, researching a magnifying glass, writing a pencil, running a tiny terminal, and thinking a small thought bubble. Generic working gets a gear. Waiting shows a raised hand and question bubble; errors show an exclamation mark. Done gets one short celebration and a persistent completion badge. Offline bots sleep.
- Tapping selects the bot, updates a compact project/status/time strip, and requests focus of its bound terminal. The bot briefly stops moving while pressed so it remains a reliable touch target. Keyboard activation has the same behavior.
- Keep connection settings and the animation pause control. Reduced motion uses stationary poses and status badges. Maintain touch targets of at least 44 CSS pixels without overlapping activation areas.
- Display the exact activity in the status strip; bubbles are supplementary. Long project names truncate in the scene and remain available in the selected bot's detail.

## Four residents

The existing companion already receives separate terminal identities. Keep that multi-session transport and render at most four chosen residents, rather than switching a single robot through a dropdown.

Fill empty slots with active sessions in a stable order. Persist slot assignments and colors by terminal instance ID in widget storage. Do not reshuffle existing residents when another terminal arrives. A fifth session is available through a compact Manage bots panel but does not appear until the user replaces a resident. Show the additional-session count.

Stale heartbeats use the existing 12-second offline threshold. Retain an offline resident until its server entry expires after five minutes or the user removes it. Then its slot may accept another active session. OMP session changes within the same terminal preserve its resident identity. A restarted terminal is a new instance.

## Terminal activation

This extends the companion beyond its current read-only status role with exactly one action: focus an already linked terminal window. It does not submit prompts or type commands.

Target the user's native Windows Git Bash/mintty setup first. Updated launchers and the extension associate a session with its OMP process identity. A Windows helper resolves and verifies the owning terminal window; the companion stores this mapping privately. Bindings must use process identity and process creation time, not a guessed window title. If the process/window relationship cannot be established unambiguously, leave focus unavailable.

The widget sends an authenticated POST containing only the resident's session ID. The companion checks that the session and binding are still live, then asks the helper to restore and activate that window. Reject arbitrary process IDs, window handles, paths and commands from widget requests. Serialize and rate-limit focus requests so repeated taps cannot create an unbounded queue.

Windows may deny foreground activation. Return a clear result such as focused, attention requested, terminal closed, or focus unavailable; do not claim success merely because a helper ran. Show an actionable message in the selected bot's strip. The bot remains useful for status even when activation is unavailable.

Existing terminals continue reporting status. Relaunching through an updated launcher may be required to establish a reliable window binding. Windows Terminal tabs, WSL and IDE-integrated terminals are not initial focus targets; report unsupported hosts explicitly. Do not open a replacement terminal when the original is closed.

## Integration and compatibility

- Display name becomes Bot Ranch. Preserve the existing widget ID and pairing-key location so upgrades retain pairing where iCUE permits it.
- Keep the loopback-only service and authenticated status/snapshot transport. Add versioned focus capability information so an older companion can still supply status without pretending it supports terminal activation.
- Maintain source under the existing OMP Bot directories for this upgrade; publish clearly named Bot Ranch widget and matching companion artifacts together. Preserve previous artifacts.
- Document iCUE Settings > Software Settings > Widget Access and permission for 127.0.0.1:43822. Both the packaged and companion-hosted views remain subject to iCUE access permissions. Never describe hosted navigation as a permission bypass.
- OMP prompts, output, reasoning, command arguments and credentials remain excluded from status payloads. Process binding metadata stays local to the companion and is not exposed by the public UI routes.

## Verification and acceptance

1. Zero through four sessions render correctly in Medium, portrait and reduced previews, without clipping or overlapping touch targets.
2. Four residents retain distinct colors and slot assignments across polling, session changes and page reloads. A fifth never silently displaces one.
3. Every activity has the correct pose, badge and readable label. Offline, pause and reduced-motion behavior remain correct. Completion celebration happens once per completion event.
4. Authenticated focus requests target only the selected live binding; unknown sessions, stale processes, ambiguous windows and malformed requests fail safely. Existing status-only companions remain usable.
5. Verify actual Git Bash focus with two independently linked terminals, including a minimized window and a closed/reused process case. Browser mocks alone do not establish terminal focus support.
6. Validate and package through the official iCUE CLI. Run meaningful Node/browser regressions, then separately verify iCUE permission, four-bot touch selection and focus on the physical setup. Report any checks that require the user's observation.

## Deliberate exclusions

No chatbot text entry, automatic approval, shell command endpoint, automatic terminal creation on tap, game controls, farming mechanics, or more than four visible residents. The ranch is a readable view of real OMP activity.

## References

- Microsoft foreground activation restrictions: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow
- Windows Terminal's separate window/tab targeting model: https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments
- Corsair widget permission management: https://www.corsair.com/ww/en/explorer/release-notes/icue/icue-55287/

Self-review: the four-bot limit, overflow behavior, identity/color persistence, focus failures, compatibility and verification boundaries are specified. Real mintty window binding and focus are implementation risks that must pass integration testing before being advertised as working.
