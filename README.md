# After Effects MCP

**An MCP server that edits video in After Effects — from Claude, Cursor, or any MCP client.**

`after-effects-mcp` connects your AI assistant to [afterAI](https://getafterai.eu), a hosted After Effects pipeline. Send a raw clip and get back a finished, ready-to-post short video: AI upscaling (Topaz), a cinematic color grade, animated subtitles, smooth zoom effects, and beat-synced phonk edits — all rendered in After Effects with paid-tier plugins, on afterAI's machines. No After Effects install, no plugins, no render farm on your side.

> Built for creators automating YouTube Shorts, TikTok and Reels. If you found this searching for an "After Effects MCP", this is the fastest way to get real AE edits from an AI agent.

---

## What it does

| Tool | What it does |
|------|--------------|
| `edit_video` | Submit a raw clip for a full After Effects edit (upscale, color grade, subtitles, zoom, phonk edit). Returns a job id + tracking URL. |
| `check_status` | Follow a render's progress and get the download link when it's done. |
| `afterai_info` | What afterAI does, the edit options, and how to get a key. |

The finished video is emailed to the account that owns the API key, and is downloadable from the tracking URL.

---

## Quick start

### 1. Get an API key
- Subscribe to a plan: **https://getafterai.eu/#pricing**
- Create a key: **https://getafterai.eu/api-access**

The API is plan-gated: each `edit_video` call spends one credit. If a render fails, the credit is auto-refunded.

### 2. Add it to your MCP client

**Claude Code**

```bash
claude mcp add after-effects -e AFTERAI_API_KEY=ak_your_key -- npx -y after-effects-mcp
```

**Claude Desktop / Cursor** — add to your MCP config (`claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "after-effects": {
      "command": "npx",
      "args": ["-y", "after-effects-mcp"],
      "env": {
        "AFTERAI_API_KEY": "ak_your_key"
      }
    }
  }
}
```

### 3. Use it

> "Edit this clip with a cinematic color grade and subtitles: https://drive.google.com/…"

Claude calls `edit_video`, then you can ask it to `check_status` until the download link appears.

---

## Configuration

| Env var | Required | Default | Description |
|---------|----------|---------|-------------|
| `AFTERAI_API_KEY` | yes (for `edit_video`) | — | Your afterAI key from `/api-access`. |
| `AFTERAI_BASE_URL` | no | `https://getafterai.eu` | Override the API base URL. |

---

## `edit_video` options

| Option | Type | Notes |
|--------|------|-------|
| `videoUrl` | string (required) | Public, direct link to the raw clip. |
| `colorCorrection` | boolean | Cinematic color grade. |
| `colorCorrectionStyle` | string | Style id, e.g. `"1"`. |
| `subtitles` | boolean | Animated subtitles. |
| `subtitleStyle` | string | Style id, e.g. `"3"`. |
| `spokenLanguage` | string | e.g. `"en"`, `"bg"`. |
| `subtitleLanguage` | string | `"same"` or a code like `"en"`. |
| `smoothZoom` | boolean | Smooth zoom intro. |
| `fullEdit` | boolean | Beat-synced phonk edit with a beat-drop freeze climax. |
| `watermark` | boolean | Burn in a watermark. |
| `watermarkText` | string | Watermark text. |
| `notes` | string | Free-text instructions. |

---

## Run from source

```bash
git clone https://github.com/borishalachev1/after-effects-mcp.git
cd after-effects-mcp
npm install
npm run build
AFTERAI_API_KEY=ak_your_key node dist/index.js
```

---

## How it works

This MCP server is a thin client over afterAI's public automation API (`POST /api/v1/order`). afterAI runs the actual After Effects pipeline (Topaz upscaling, color grade, Whisper subtitles, beat detection, render) and delivers the finished file.

## License

MIT © [afterAI](https://getafterai.eu)
