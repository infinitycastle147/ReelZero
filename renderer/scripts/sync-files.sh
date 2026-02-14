#!/usr/bin/env bash
# sync-files.sh — Copy shared files from main app into renderer/src/
# Run from monorepo root: npm run renderer:sync-files
# Re-run whenever src/remotion/ or src/types/ files change.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RENDERER_SRC="${REPO_ROOT}/renderer/src"

echo "[sync-files] Syncing shared files from main app → renderer/src/"

# ── Remotion compositions ─────────────────────────────────────────────────────
echo "[sync-files]  src/remotion/ → renderer/src/remotion/"
mkdir -p "${RENDERER_SRC}/remotion/captions"
mkdir -p "${RENDERER_SRC}/remotion/transitions"
mkdir -p "${RENDERER_SRC}/remotion/utils"

cp "${REPO_ROOT}/src/remotion/Root.tsx"             "${RENDERER_SRC}/remotion/Root.tsx"
cp "${REPO_ROOT}/src/remotion/VideoComposition.tsx" "${RENDERER_SRC}/remotion/VideoComposition.tsx"
cp "${REPO_ROOT}/src/remotion/Scene.tsx"            "${RENDERER_SRC}/remotion/Scene.tsx"
cp "${REPO_ROOT}/src/remotion/captions/WordByWord.tsx"    "${RENDERER_SRC}/remotion/captions/WordByWord.tsx"
cp "${REPO_ROOT}/src/remotion/captions/FullSentence.tsx"  "${RENDERER_SRC}/remotion/captions/FullSentence.tsx"
cp "${REPO_ROOT}/src/remotion/transitions/Fade.tsx"       "${RENDERER_SRC}/remotion/transitions/Fade.tsx"
cp "${REPO_ROOT}/src/remotion/transitions/Crossfade.tsx"  "${RENDERER_SRC}/remotion/transitions/Crossfade.tsx"
cp "${REPO_ROOT}/src/remotion/utils/timing.ts"            "${RENDERER_SRC}/remotion/utils/timing.ts"

# ── Shared types ──────────────────────────────────────────────────────────────
echo "[sync-files]  src/types/{remotion,render,scene}.ts → renderer/src/types/"
mkdir -p "${RENDERER_SRC}/types"

cp "${REPO_ROOT}/src/types/remotion.ts" "${RENDERER_SRC}/types/remotion.ts"
cp "${REPO_ROOT}/src/types/render.ts"   "${RENDERER_SRC}/types/render.ts"
cp "${REPO_ROOT}/src/types/scene.ts"    "${RENDERER_SRC}/types/scene.ts"

# ── Constants ─────────────────────────────────────────────────────────────────
echo "[sync-files]  src/lib/constants/video.ts → renderer/src/lib/constants/"
mkdir -p "${RENDERER_SRC}/lib/constants"

cp "${REPO_ROOT}/src/lib/constants/video.ts" "${RENDERER_SRC}/lib/constants/video.ts"

echo "[sync-files] Done. renderer/src/ is up to date."
