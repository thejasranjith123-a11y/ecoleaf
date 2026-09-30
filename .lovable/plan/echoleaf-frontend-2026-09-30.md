# EchoLeaf frontend

## Goal
Build a polished, mobile-first EchoLeaf biodiversity monitoring app inspired by the supplied dark recording interface, while making the experience clearer, richer, and presentation-ready.

## What I’ll build
- A compact dark environmental-tech interface with emerald accents, soft depth, rounded surfaces, and a leaf/sound-wave identity.
- A recording-first home screen with location status, live timer, animated waveform, microphone controls, and clear recording states.
- A complete demo flow: record audio, review playback, run clearly labeled simulated analysis, view species confidence, and save observations.
- Dashboard, history, and biodiversity map views with realistic demo observations and automatically updated detection counts.
- Mobile bottom navigation and a restrained desktop side rail, preserving the reference’s focused single-panel feel.
- Helpful permission and failure states for microphone, location, empty recordings, and analysis failures.

## Technical details
- Use browser MediaRecorder and Geolocation APIs where available.
- Keep demo analysis behind a dedicated `analyzeAudio` service boundary so a real classifier can replace it later.
- Persist observations locally for this frontend-only version; no login or cloud setup.
- Use semantic design tokens in the shared stylesheet and reusable controls/components.
- Add route metadata and verify the central flow at desktop and mobile widths.
