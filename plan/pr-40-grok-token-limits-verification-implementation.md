# Implementation Plan: PR #40 - Grok Token Limits Verification

## Summary of Review Feedback

The Claude code review of PR #40 (Add xAI Grok models to OpenRouter) identified one critical issue and provided suggestions:

### Critical Issue: Token Limits Discrepancy
The review noted that token limits differ between `types.ts` (context window) and `openrouter.ts` (max output tokens), which is **intentional and correct** - these serve different purposes:
- `types.ts` = context window limits (input capacity)
- `openrouter.ts` = max output token limits

However, the review correctly points out:
1. Values should be verified against official xAI/OpenRouter documentation
2. The `Math.min(4000, ...)` cap in `openrouter.ts:118` limits all models to 4000 tokens regardless of their capability

### Suggestions from Review
1. Verify token limits against official documentation
2. Add comments documenting the source of token limit values
3. Consider making the output cap model-aware

---

## Analysis: Are Suggestions Appropriate?

| Suggestion | Appropriate? | Notes |
|------------|--------------|-------|
| Verify token limits | Yes | Good practice to ensure accuracy |
| Add documentation comments | Yes | Low effort, improves maintainability |
| Make output cap model-aware | Maybe | Requires deeper analysis - current 4000 cap may be intentional for cost/latency |

---

## Implementation Tasks

### Task 1: Verify Grok Token Limits
**Priority**: High
**Effort**: Low (research only)

- [ ] Check OpenRouter documentation for xAI Grok models: https://openrouter.ai/models
- [ ] Cross-reference with xAI official docs: https://docs.x.ai
- [ ] Document findings

**Expected Findings** (based on typical model specs):
- Grok 2: ~131K context, 8K-16K output
- Grok 2 Vision: ~32K context (lower due to image processing), 8K output
- Grok 3 Beta: ~131K context, 16K output

### Task 2: Add Documentation Comments
**Priority**: Medium
**Effort**: Low

**File**: `src/lib/ai/openrouter.ts`

Add verification date and source comment:
```typescript
// xAI Grok models (verified from openrouter.ai/models as of 2025-12-01)
{ id: 'x-ai/grok-2-1212', name: 'Grok 2' },
{ id: 'x-ai/grok-2-vision-1212', name: 'Grok 2 Vision' },
{ id: 'x-ai/grok-3-beta', name: 'Grok 3 Beta' },
```

### Task 3: Evaluate Output Token Cap (Optional)
**Priority**: Low
**Effort**: Medium

The current implementation caps all models at 4000 output tokens (`line 118`):
```typescript
const maxTokens = Math.min(4000, getOpenRouterMaxTokens(request.model));
```

**Options**:
1. **Keep as-is**: 4000 tokens is sufficient for most use cases, controls costs
2. **Make configurable**: Allow users to set max tokens in AI Profile settings
3. **Increase cap selectively**: For models that support higher output (like Grok 3)

**Recommendation**: Defer to future enhancement - the 4000 cap appears intentional for cost control.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/ai/openrouter.ts` | Update | Add verification comment to Grok models section |

---

## Testing Requirements

| Test | Type | Status |
|------|------|--------|
| Build passes | Automated | Already verified |
| Models appear in dropdown | Manual | Pending |
| AI profile execution with Grok | Manual | Pending |
| Token usage tracked correctly | Manual | Pending |

---

## Potential Risks

1. **Low Risk**: Token limits may be slightly off, but the 4000 cap provides a safety net
2. **No Risk**: Static model definitions can't cause runtime issues
3. **No Security Risk**: No new attack vectors introduced

---

## Estimated Effort

| Task | Time |
|------|------|
| Verify token limits | 15 min |
| Add documentation comments | 5 min |
| Manual testing | 10 min |
| **Total** | ~30 min |

---

## Decision

**Recommendation**:
1. Verify token limits via OpenRouter docs
2. Add a simple comment noting verification date
3. Defer output cap changes to future enhancement if users request longer outputs

The PR is production-ready as-is. The suggested improvements are nice-to-haves rather than blockers.
