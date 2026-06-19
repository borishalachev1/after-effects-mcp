#!/usr/bin/env node
/**
 * After Effects MCP server (afterAI cloud).
 *
 * Exposes afterAI's hosted After Effects pipeline as MCP tools so Claude — or
 * any MCP client — can turn a raw clip into a finished, ready-to-post video:
 * AI upscaling (Topaz), cinematic color grade, animated subtitles, zoom effects
 * and beat-synced phonk edits, rendered in After Effects with paid-tier plugins.
 *
 * Auth: set AFTERAI_API_KEY (get one at https://getafterai.eu/api-access — needs
 * an active plan). Base URL override: AFTERAI_BASE_URL (default getafterai.eu).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const BASE_URL = (process.env.AFTERAI_BASE_URL || "https://getafterai.eu").replace(/\/+$/, "")
const API_KEY = process.env.AFTERAI_API_KEY || ""

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] }
}

function requireKey(): string | null {
  if (!API_KEY) {
    return [
      "No AFTERAI_API_KEY is set.",
      "",
      "1. Sign in and subscribe to a plan at https://getafterai.eu/#pricing",
      "2. Create an API key at https://getafterai.eu/api-access",
      "3. Set it as the AFTERAI_API_KEY env var for this MCP server.",
    ].join("\n")
  }
  return null
}

const server = new McpServer({
  name: "after-effects-mcp",
  version: "1.0.0",
})

// ---- edit_video -----------------------------------------------------------
server.registerTool(
  "edit_video",
  {
    title: "Edit a video with afterAI",
    description:
      "Submit a raw clip to afterAI's After Effects cloud pipeline. Returns a job " +
      "id and a tracking URL. Spends one credit from your plan. The finished video " +
      "is emailed to the account that owns the API key. Use check_status to follow " +
      "progress. videoUrl must be a public, direct link to the raw clip.",
    inputSchema: {
      videoUrl: z.string().url().describe("Public, direct URL to the raw clip (Google Drive share link or direct mp4)."),
      colorCorrection: z.boolean().optional().describe("Apply a cinematic color grade."),
      colorCorrectionStyle: z.string().optional().describe("Color grade style id, e.g. '1', '2'."),
      subtitles: z.boolean().optional().describe("Add animated subtitles."),
      subtitleStyle: z.string().optional().describe("Subtitle style id, e.g. '1', '3'."),
      spokenLanguage: z.string().optional().describe("Language spoken in the clip, e.g. 'en', 'bg'."),
      subtitleLanguage: z.string().optional().describe("Subtitle output language: 'same' or a code like 'en', 'es'."),
      smoothZoom: z.boolean().optional().describe("Add a smooth zoom intro."),
      fullEdit: z.boolean().optional().describe("Beat-synced phonk edit with a beat-drop freeze climax (needs background music in your clip/notes)."),
      watermark: z.boolean().optional().describe("Burn in a watermark."),
      watermarkText: z.string().optional().describe("Watermark text (if watermark is true)."),
      notes: z.string().optional().describe("Free-text instructions for the editor agent."),
    },
  },
  async (args) => {
    const missing = requireKey()
    if (missing) return text(missing)

    let res: Response
    try {
      res = await fetch(`${BASE_URL}/api/v1/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(args),
      })
    } catch (e) {
      return text(`Could not reach afterAI: ${(e as Error).message}`)
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      const err = data.error || `HTTP ${res.status}`
      const hint =
        res.status === 401 ? " (check your AFTERAI_API_KEY)" :
        res.status === 402 ? " (out of credits — re-subscribe at https://getafterai.eu/#pricing)" :
        res.status === 403 ? " (no active plan — subscribe at https://getafterai.eu/#pricing)" : ""
      return text(`Edit not started: ${err}${hint}`)
    }

    return text(
      [
        "Edit job submitted to afterAI. ✅",
        `Job id:   ${data.jobId ?? data.taskId}`,
        `Track:    ${data.trackUrl}`,
        `Credits left: ${data.remaining}`,
        "",
        "The finished video will be emailed to your account. Use check_status with the job id to follow progress.",
      ].join("\n"),
    )
  },
)

// ---- check_status ---------------------------------------------------------
server.registerTool(
  "check_status",
  {
    title: "Check an afterAI render's status",
    description:
      "Look up the live status of a submitted edit by its job id (the id returned " +
      "by edit_video). Returns progress percent, the current stage and, when done, " +
      "the download link.",
    inputSchema: {
      jobId: z.string().describe("The job id returned by edit_video."),
    },
  },
  async ({ jobId }) => {
    let res: Response
    try {
      res = await fetch(`${BASE_URL}/api/render-status?order=${encodeURIComponent(jobId)}`)
    } catch (e) {
      return text(`Could not reach afterAI: ${(e as Error).message}`)
    }
    const data = await res.json().catch(() => ({}))
    if (!data.found) {
      return text(`No status yet for job ${jobId}. It may still be queued — try again shortly.`)
    }
    const lines = [
      `${data.headline} (${data.percent}%)`,
      data.sub ? data.sub : "",
      data.drive_link ? `Download: ${data.drive_link}` : "",
    ].filter(Boolean)
    return text(lines.join("\n"))
  },
)

// ---- afterai_info ---------------------------------------------------------
server.registerTool(
  "afterai_info",
  {
    title: "About afterAI and how to get access",
    description:
      "Explains what afterAI does, the available edit options and how to get an API key and plan.",
    inputSchema: {},
  },
  async () => {
    let api: unknown = {}
    try {
      const res = await fetch(`${BASE_URL}/api/v1/order`)
      api = await res.json()
    } catch {
      /* offline — fall back to static help */
    }
    return text(
      [
        "afterAI turns raw clips into finished, ready-to-post short videos:",
        "AI upscaling (Topaz), cinematic color grade, animated subtitles, zoom",
        "effects and beat-synced phonk edits, rendered in After Effects.",
        "",
        "Get started:",
        "1. Subscribe to a plan: https://getafterai.eu/#pricing",
        "2. Create an API key:   https://getafterai.eu/api-access",
        "3. Set AFTERAI_API_KEY for this MCP server, then use edit_video.",
        "",
        "Live API reference:",
        JSON.stringify(api, null, 2),
      ].join("\n"),
    )
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr so it doesn't corrupt the stdio JSON-RPC stream
  console.error("after-effects-mcp running (afterAI cloud) — base:", BASE_URL)
}

main().catch((e) => {
  console.error("after-effects-mcp fatal:", e)
  process.exit(1)
})
