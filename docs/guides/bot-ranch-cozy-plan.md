# Cozy Ranch and Ranch Desk

The Large ranch becomes a quiet pixel homestead: a reading nook, research station, writing bench, workshop, attention bell and corner charging docks. Bots retain whole-field roaming, stable identities and colors. Reading/research/writing use distinct destinations and props; questions/errors gather near the bell. Names gain small status labels. Completion celebrates briefly, and quiet mode reduces motion without hiding alerts.

The remaining Medium slot holds Ranch Desk: roster, selected resident, current visible conversation excerpt, timestamp and explicit terminal-open control. Both widgets use the same pairing key and companion. Authenticated in-memory selection state synchronizes taps between widgets; selecting never focuses a window. Unsupported old companions remain usable with local selection and an upgrade hint.

Implementation ownership: ranch art (index/CSS/sprites), desk widget (new sources/ranch-desk), root world/app/companion selection/build integration. Tests cover activity transitions, same-station destinations, quiet and reduced motion, selection authentication/validation, synchronization, missing previews and offline state. Build packages both widgets and includes their hosted files in the companion ZIP. No conversation data is persisted by these additions.

Verification: source tests, browser layouts at Large/Medium/portrait/reduced preview, screenshots, validated packages, private-file exclusion and secret scan before any publication. Existing user terminals and companion remain untouched during development.
