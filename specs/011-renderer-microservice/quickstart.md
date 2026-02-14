# Quickstart: Renderer Microservice (F011)

**Goal**: Get the ReelZero-Renderer running locally and process a test render job.

---

## Prerequisites

- Node.js 20+
- `ffmpeg` installed locally (`brew install ffmpeg` on macOS)
- Chromium/Chrome installed locally (or set `PUPPETEER_EXECUTABLE_PATH`)
- Supabase project with `videos`, `images`, `audio` buckets
- Main app running at `http://localhost:3000` (or use a mock callback server)

---

## 1. Setup `renderer/` Project

```bash
# From the monorepo root
cd renderer

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

Edit `renderer/.env`:
```env
PORT=3001
RENDER_WEBHOOK_SECRET=dev-secret-123
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # service role key from Supabase dashboard
MAIN_APP_URL=http://localhost:3000
REMOTION_CONCURRENCY=1
REMOTION_OUTPUT_DIR=/tmp/renders
# For macOS: PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
# For Linux: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## 2. Copy Shared Files from Main App

The renderer needs copies of shared types and Remotion compositions:

```bash
# From monorepo root — run once when setting up or after changes to src/remotion/
npm run renderer:sync-files
```

This copies:
- `src/remotion/` → `renderer/src/remotion/`
- `src/types/remotion.ts`, `src/types/render.ts`, `src/types/scene.ts` → `renderer/src/types/`
- `src/lib/constants/video.ts` → `renderer/src/lib/constants/video.ts`

---

## 3. Start the Renderer

```bash
cd renderer
npm run dev
# Server starts on http://localhost:3001
```

You should see:
```
[renderer] Starting ReelZero-Renderer on port 3001
[renderer] Remotion bundle will be created on first render job
[renderer] Server ready
```

---

## 4. Verify Health Check

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"2026-02-14T..."}
```

---

## 5. Send a Test Render Job

First, upload test assets to your Supabase Storage buckets and get signed URLs. Then:

```bash
curl -X POST http://localhost:3001/render \
  -H "Content-Type: application/json" \
  -H "x-render-secret: dev-secret-123" \
  -d '{
    "videoId": "test-video-001",
    "userId": "test-user",
    "audioUrl": "https://YOUR-PROJECT.supabase.co/.../audio.mp3?token=...",
    "scenes": [
      {
        "sceneNumber": 1,
        "imageUrl": "https://YOUR-PROJECT.supabase.co/.../scene1.jpg?token=...",
        "durationInFrames": 150,
        "startFrame": 0,
        "wordTimings": [{"word":"Hello","startFrame":0,"endFrame":30}]
      },
      {
        "sceneNumber": 2,
        "imageUrl": "https://YOUR-PROJECT.supabase.co/.../scene2.jpg?token=...",
        "durationInFrames": 150,
        "startFrame": 150,
        "wordTimings": [{"word":"World","startFrame":150,"endFrame":180}]
      },
      {
        "sceneNumber": 3,
        "imageUrl": "https://YOUR-PROJECT.supabase.co/.../scene3.jpg?token=...",
        "durationInFrames": 150,
        "startFrame": 300,
        "wordTimings": [{"word":"Done","startFrame":300,"endFrame":330}]
      }
    ],
    "captionStyle": "word-by-word",
    "transitionType": "fade",
    "showWatermark": false,
    "callbackUrl": "http://localhost:3000/api/video/render/complete",
    "stageCallbackUrl": "http://localhost:3000/api/video/render/stage"
  }'
# Expected: {"jobId":"..."}
```

---

## 6. Poll Status

```bash
JOB_ID="<jobId from above>"

curl http://localhost:3001/status/$JOB_ID \
  -H "x-render-secret: dev-secret-123"
# Expected: {"jobId":"...","status":"processing","stage":"render","progress":42}
```

Poll every few seconds until `"status":"completed"`.

---

## 7. End-to-End with Main App

With the main app running at `http://localhost:3000`:
1. Set `RENDERER_SERVICE_URL=http://localhost:3001` in main app's `.env.local`
2. Complete the video wizard in the browser
3. Click "Generate Video" — the main app calls `POST /render` on the renderer
4. Watch progress in the generation progress UI
5. Video appears in dashboard when complete

---

## Docker Build (Local Test)

```bash
# From monorepo root (dockerContext is .)
docker build -f renderer/Dockerfile -t reelzero-renderer .

docker run -p 3001:3001 \
  -e RENDER_WEBHOOK_SECRET=dev-secret \
  -e SUPABASE_URL=https://... \
  -e SUPABASE_SERVICE_KEY=eyJ... \
  -e MAIN_APP_URL=http://host.docker.internal:3000 \
  reelzero-renderer
```

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| `Error: Could not find Chromium` | `PUPPETEER_EXECUTABLE_PATH` not set | Set path to your local Chrome/Chromium |
| `gl: 'swiftshader'` warnings | Normal in macOS | Ignore — required only in Docker/Linux |
| Bundle takes 30s on first job | Remotion Webpack bundling | Normal — subsequent jobs use cached bundle |
| `403` on asset download | Signed URL expired | Re-generate signed URLs (1hr expiry) |
| Port 3001 already in use | Another process | `lsof -ti:3001 | xargs kill` |
