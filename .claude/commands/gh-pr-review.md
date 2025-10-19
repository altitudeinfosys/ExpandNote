## gh-pr-review

**Description**: Analyzes the latest Claude review comment on a GitHub PR and creates an implementation plan based on the review feedback. Can either check the most recent PR or a specific PR number.

**Allowed tools**: bash, read, write

**Command prompt**:
```
Review the latest Claude comment on GitHub PR {{PR_NUMBER:optional}} and create an implementation plan. If no PR number is provided, check the most recent PR. 

Steps:
1. Use bash with 'gh' CLI to fetch PR details and comments
2. Find the latest review comment by Claude (look for comments containing "Claude" or from Claude-related bot accounts)
3. Analyze if the review suggestions make sense for our codebase
4. Create the plan folder if it doesn't exist: ./plan/
5. Create a detailed implementation plan in ./plan/pr-{{PR_NUMBER}}-{{DESCRIPTIVE_NAME}}-implementation.md where DESCRIPTIVE_NAME reflects the main fix/feature being addressed

The implementation plan should include:
- Summary of the review feedback
- Analysis of whether the suggestions are appropriate for our codebase
- Step-by-step implementation tasks
- List of files that need to be modified
- Testing requirements
- Potential risks and considerations
- Estimated effort/complexity

For fetching PR info:
- If no PR number provided: gh pr list --limit 1 --json number
- Get PR details: gh pr view {{PR_NUMBER}} --json title,body,state
- Get comments: gh pr view {{PR_NUMBER}} --comments
```

**Usage examples**:
- `claude-code gh-pr-review` - Reviews the most recent PR
- `claude-code gh-pr-review 123` - Reviews specific PR #123

**Output example**:
```
./plan/pr-123-auth-validation-implementation.md
```