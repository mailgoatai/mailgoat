# Recording Session Checklist (Execution)

Use this during the live recording session.

## Preflight (T-15 minutes)

- Desktop clean, notifications disabled
- Microphone input level peaks around -12 dB
- OBS/ScreenFlow set to 1080p, 30fps
- Browser tabs prepared:
  - README
  - `docs/video-demo-and-screencast.md`
  - Admin panel URL
- Terminal font at 20pt minimum
- Demo `.env` loaded with non-sensitive test keys

## Video 1 (3:00) Run Order

1. Start recording
2. Hook + problem statement (45s)
3. Run install/config/send/admin flow
4. Show template and scheduler commands
5. CTA and stop recording

## Video 2 (5:00) Run Order

1. Start recording
2. Hook + problem statement (45s)
3. Show local setup and targeted Jest test
4. Demonstrate template rendering + security scan
5. CTA and stop recording

## Video 3 (7:00) Run Order

1. Start recording
2. Hook + production problem statement (45s)
3. Docker + relay config walkthrough
4. Smoke test send + monitoring commands
5. CTA and stop recording

## Immediate QA (per video)

- Verify final runtime within target window (+/-15s)
- Confirm no secret leaked in terminal/browser
- Confirm cursor is readable and pacing is fast
- Export file name format: `mailgoat-video-<n>-<slug>-v1.mp4`

## Caption Pass

- Load base `.srt` from `docs/video/captions`
- Align timestamps to final edit
- Spell-check technical terms
- Export UTF-8 `.srt`
