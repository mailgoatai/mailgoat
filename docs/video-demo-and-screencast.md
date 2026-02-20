# MailGoat Video Demo and Screencast Pack

This pack is designed to produce a 3-video series with consistent quality, pacing, and calls-to-action.

## Series Overview

1. **Video 1: Quick Start** (target: 3:00)
2. **Video 2: Developer Workflow** (target: 5:00)
3. **Video 3: Production Deployment** (target: 7:00)

## Production Standard

- Resolution: 1920x1080
- Frame rate: 30fps
- Audio: mono voice, normalized to -16 LUFS
- Terminal font: 18-22pt
- Cursor highlight enabled
- Same theme and wallpaper across all videos
- Captions required (`docs/video/captions/*.srt`)

## Recording Setup Checklist

- Close unrelated apps/tabs
- Disable desktop notifications
- Prepare clean demo inbox data
- Confirm API keys are masked
- Open script + shot list side by side
- Do one dry run at 1.25x speaking pace

## Timeline Template

- `00:00-00:15` Hook
- `00:15-00:45` Problem statement
- `00:45-<end-0:15>` Demo walkthrough
- `<end-0:15>-end` CTA / where to learn more

## Video 1: Quick Start (3:00)

Script: `docs/video/scripts/video-1-quick-start.md`
Captions: `docs/video/captions/video-1-quick-start.srt`

Demo path:

1. Install MailGoat (`npm install -g mailgoat`)
2. Show `mailgoat config init` + `mailgoat health`
3. Send first message (`mailgoat send --to ...`)
4. Open admin panel and verify message
5. Show quick feature scan (template, scheduler, debug)

## Video 2: Developer Workflow (5:00)

Script: `docs/video/scripts/video-2-developer-workflow.md`
Captions: `docs/video/captions/video-2-developer-workflow.srt`

Demo path:

1. Local dev setup (`npm install`, `npm run build`)
2. Run targeted tests (`npm run test:unit`)
3. Demonstrate email verification flow with templates
4. Show template rendering and variable overrides
5. Close with docs/test references

## Video 3: Production Deployment (7:00)

Script: `docs/video/scripts/video-3-production-deployment.md`
Captions: `docs/video/captions/video-3-production-deployment.srt`

Demo path:

1. Docker Compose setup
2. Relay provider config (SendGrid example)
3. Deploy workflow (container + env + health checks)
4. Monitoring and operational commands
5. Recovery and maintenance basics

## Publishing Checklist

- Export MP4 (H.264, high profile)
- Upload all 3 videos to YouTube (MailGoat channel)
- Titles include "MailGoat" + audience intent
- Descriptions include docs links and timestamps
- Add chapters + pinned comment + end screen
- Update links in:
  - `README.md`
  - `docs/guides/README.md`
  - `docs/video-demo-and-screencast.md`

## Social Distribution Checklist

- X/Twitter launch thread (3 posts + clips)
- LinkedIn post (problem/solution/outcome format)
- Discord community announcement with direct links
- Track metrics after 24h and 7d (views, watch time, CTR)

## Embed Section (replace placeholders)

```md
## Video Demos
- Quick Start (3 min): https://youtube.com/watch?v=VIDEO_1_ID
- Developer Workflow (5 min): https://youtube.com/watch?v=VIDEO_2_ID
- Production Deployment (7 min): https://youtube.com/watch?v=VIDEO_3_ID
```
