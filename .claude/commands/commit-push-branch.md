---
allowed-tools: Bash(git log:*), Bash(git branch:*), Bash(date:*), Bash(mkdir:*), Write, Read, Git
aliases: commit-push-branch
command: commit-push-branch
help:
argument-hint: [period]
description: creates a branch, commits all changes, and pushes to GitHub
---
## Task
Auto-create a branch, commit all changes, and push to GitHub with a descriptive branch name based on changed files.

## Implementation

Check if there are changes, generate a descriptive branch name, create branch, commit all changes, and push to GitHub.

```bash
# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "❌ No changes to commit"
  exit 1
fi

# Get changed files and create slug
CHANGED_FILES=$(git status --porcelain | awk '{print $2}' | head -n 3)
echo "📁 Changed files:"
echo "$CHANGED_FILES"

# Generate a descriptive slug from the first few changed files
SLUG=$(echo "$CHANGED_FILES" | head -n 2 | xargs basename -s .tsx -s .ts -s .js -s .jsx -s .md | tr '/' '-' | tr -cs 'a-zA-Z0-9-' '-' | tr '[:upper:]' '[:lower:]' | xargs | sed 's/ /-/g; s/^-*//; s/-*$//' | cut -c1-25)

# Add a meaningful suffix based on file types
if echo "$CHANGED_FILES" | grep -q "settings"; then
  SLUG="settings-page"
elif echo "$CHANGED_FILES" | grep -q "performance"; then
  SLUG="performance-optimization"
elif echo "$CHANGED_FILES" | grep -q "reports"; then
  SLUG="reports-lazy-loading"
else
  # Fallback to generic slug if no pattern matches
  SLUG=$(echo "$SLUG" | head -c 20)
fi

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M)

# Create branch name
BRANCH_NAME="auto-${SLUG}-${TIMESTAMP}"
echo "🌿 Creating branch: $BRANCH_NAME"

# Create and switch to new branch
git checkout -b "$BRANCH_NAME"

# Add all changes
git add .

# Create commit message based on changes
COMMIT_MSG="Auto update: $SLUG

Changes include:
$(git status --porcelain | sed 's/^/- /')"

# Commit changes
git commit -m "$COMMIT_MSG"

# Push to remote
git push -u origin "$BRANCH_NAME"

echo "✅ Successfully created and pushed branch: $BRANCH_NAME"
echo "🔗 Branch is ready for pull request"
```

## Usage
Run `/commit-push-branch` to automatically:
1. Detect changed files
2. Generate descriptive branch name (e.g., `auto-settings-page-20250902-1530`)
3. Create branch, commit changes, and push to GitHub
4. Report the new branch name for creating a pull request