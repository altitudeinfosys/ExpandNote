---
description: Kill Next.js dev server on port 3003 and restart it.
allowed-tools: >
  Bash(lsof:*), Bash(kill -9:*),
  Bash(npm run dev:*), Bash(nohup:*), Bash(tail:*), Bash(grep:*)
model: anthropic/claude-3.5-haiku
---
## Objective
Restart the Next.js dev server on port 3003, by killing the process and restarting it in the background.
And also to ensure that the latest changes are reflected in the server.

## Task
Restart the Next.js dev server bound to port **3003**:

1. Kill any process currently using port 3003.
2. Restart the server with `npm run dev` in the background.
3. Confirm it’s running.

## Execution

### Stop
- `lsof -ti:3003 | xargs kill -9 || true`

### Start
- `nohup npm run dev -- -p 3003 > dev.log 2>&1 &`

### Verify
- `ps aux | grep -v grep | grep "npm run dev"`
- `tail -n 20 dev.log || true`

## Output
Show which process was killed, confirm the server restarted, and display the last few log lines.
