#!/usr/bin/env bash
set -euo pipefail

# Purge all files matching .gitignore from the entire Git history and push to origin.
# - Creates a backup tag and branch before rewrite
# - Uses git-filter-repo if available (installs a local copy in .dev/venv if missing)
# - Falls back to git filter-branch if filter-repo cannot be installed
# - Optionally force-pushes to origin when --push is supplied
#
# Usage:
#   scripts/purge-ignored-history.sh          # rewrite locally only
#   scripts/purge-ignored-history.sh --push   # rewrite and force-push to origin
#
# WARNING: This rewrites history for all branches and tags. Coordinate with your team.

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${ROOT_DIR}" ]]; then
  echo "Error: not inside a Git repository." >&2
  exit 1
fi
cd "$ROOT_DIR"

if [[ ! -f .gitignore ]]; then
  echo "Error: .gitignore not found at repo root ($ROOT_DIR)." >&2
  exit 1
fi

PUSH=false
if [[ ${1:-} == "--push" ]]; then
  PUSH=true
fi

current_branch=$(git rev-parse --abbrev-ref HEAD)
status=$(git status --porcelain)
if [[ -n "$status" ]]; then
  echo "Error: working tree is dirty. Please commit or stash changes first." >&2
  exit 1
fi

# Detect if 'origin' remote exists
if git remote get-url origin >/dev/null 2>&1; then
  :
else
  echo "Note: no 'origin' remote found. Skipping push step." >&2
  PUSH=false
fi

timestamp=$(date +%Y%m%d-%H%M%S)
BACKUP_TAG="backup/pre-purge-$timestamp"
BACKUP_BRANCH="backup/pre-purge-$timestamp"

echo "[0/6] Fetching all refs and tags from origin (so they are included in the rewrite)"
git fetch --all --tags --prune

echo "[1/6] Creating backup tag $BACKUP_TAG and branch $BACKUP_BRANCH"
git tag -a "$BACKUP_TAG" -m "Backup before purging .gitignored files from history"
git branch "$BACKUP_BRANCH"

echo "[2/6] Building path-globs from .gitignore"
mapfile -t GLOBS < <(
  awk '
    BEGIN { FS="" }
    {
      line=$0
      # trim leading/trailing whitespace
      sub(/^\s+/, "", line); sub(/\s+$/, "", line)
      if (line=="" || line ~ /^#/) next
      if (line ~ /^!/) next    # ignore negations for safety

      # normalize leading ./ and /
      sub(/^\.\//, "", line)
      sub(/^\//, "", line)

      # skip explicit dot path that might empty
      if (line=="" || line=="/") next

      # convert directory patterns (ending in /) to dir/**
      if (line ~ /\/$/) {
        sub(/\/$/, "", line)
        print line "/**"
        next
      }

      # if no slash in pattern (e.g., *.db), make it match anywhere
      if (line !~ /\//) {
        print "**/" line
        next
      }

      # otherwise keep as-is
      print line
    }
  ' .gitignore
)

# Ensure uniqueness and drop obviously dangerous patterns (like ".*" alone)
declare -a FILTERED=()
declare -A seen
for p in "${GLOBS[@]}"; do
  [[ -z "$p" ]] && continue
  # safety: do not allow globs that could match everything
  if [[ "$p" == "**/*" || "$p" == "**/**" ]]; then
    continue
  fi
  if [[ -z "${seen[$p]:-}" ]]; then
    FILTERED+=("$p")
    seen[$p]=1
  fi
done

if [[ ${#FILTERED[@]} -eq 0 ]]; then
  echo "No .gitignore patterns found to purge. Exiting."
  exit 0
fi

echo "Patterns to purge from history (count=${#FILTERED[@]}):"
for p in "${FILTERED[@]}"; do echo "  - $p"; done

# Helper to run git-filter-repo if available or install locally
run_filter_repo() {
  local fr_bin
  if command -v git-filter-repo >/dev/null 2>&1; then
    fr_bin="$(command -v git-filter-repo)"
  elif [[ -x .dev/venv/bin/git-filter-repo ]]; then
    fr_bin=".dev/venv/bin/git-filter-repo"
  else
    echo "git-filter-repo not found. Attempting local install in .dev/venv..."
    mkdir -p .dev
    python3 -m venv .dev/venv
    . .dev/venv/bin/activate
    pip install --upgrade pip >/dev/null
    pip install git-filter-repo >/dev/null
    fr_bin=".dev/venv/bin/git-filter-repo"
  fi

  echo "Using git-filter-repo at: $fr_bin"

  # Build arguments
  args=("--force")
  for p in "${FILTERED[@]}"; do
    args+=("--path-glob" "$p")
  done
  args+=("--invert-paths")

  # Run filter-repo
  "$fr_bin" "${args[@]}"
}

run_filter_branch() {
  echo "git-filter-repo unavailable; falling back to git filter-branch (slower)..."
  # Build rm args for index-filter
  local rmargs=()
  for p in "${FILTERED[@]}"; do
    rmargs+=("$p")
  done
  # shellcheck disable=SC2016
  git filter-branch --force --prune-empty \
    --index-filter "git rm -r -f --cached --ignore-unmatch ${rmargs[*]}" \
    --tag-name-filter cat -- --all
}

echo "[3/6] Rewriting history across all branches and tags..."
if run_filter_repo; then
  :
else
  run_filter_branch
fi

echo "[4/6] Expiring reflogs and running aggressive GC..."
git reflog expire --expire-unreachable=now --all || true
 git gc --prune=now --aggressive || true

echo "[5/6] Size after cleanup:"
git count-objects -vH || true

if $PUSH; then
  echo "[6/6] Force-pushing cleaned history to origin (all branches and tags)..."
  git push origin --force --prune --all
  git push origin --force --tags
else
  echo "[6/6] Dry run complete. To push rewritten history to origin, rerun with --push"
fi

echo "Done. Backup tag: $BACKUP_TAG, branch: $BACKUP_BRANCH"
