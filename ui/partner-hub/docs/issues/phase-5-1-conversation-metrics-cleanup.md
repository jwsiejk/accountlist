# Phase 5.1 Cleanup: Conversation Engine Metrics Contract Alignment

## Goal
Align `lib/job-hunter/conversationMetrics.ts` and consuming UI types with the Phase 5 metrics contract before building additional workflow features.

## Scope
- Rename quota fields to `newOutreachTarget` and `followUpTarget`.
- Introduce `ConversationMetricsWindow` with:
  - `today`
  - `last7Days`
  - `allTime`
- Update `ConversationExecutionMetrics` to include:
  - `window`
  - `newOutreachSent`
  - `followUpsSent`
  - `skipped`
  - `replies`
  - `activeConversations`
  - `staleSentNoReply`
- Update `calculateConversationExecutionMetrics` signature to:
  - `calculateConversationExecutionMetrics({ sequences, today, window })`
- Add `calculateConversationDailyProgress` return shape:
  - `quota`
  - `newOutreachSent`
  - `followUpsSent`
  - `totalCompleted`
  - `totalTarget`
  - `progressPct`
  - `remainingNewOutreach`
  - `remainingFollowUps`
- Preserve current UI behavior while migrating `ConversationMetricsPanel` to consume the new object shape.
- Add tests for:
  - windows: `today`, `last7Days`, `allTime`
  - `skipped`
  - progress clamping
  - remaining counts
  - invalid/missing dates

## Constraints
- No auto-send behavior changes.
- No API integration changes.

## Validation
- `npm test`
- `npm run typecheck`
