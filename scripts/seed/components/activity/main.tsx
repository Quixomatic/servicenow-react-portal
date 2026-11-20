/**
 * utilities:app/activity: a record's activity stream and journal posting, headless (no UI).
 *
 * Platform calls (the ones Workspace's now-activity-stream makes; GraphQL, no REST wrapper of ours):
 *   GlideActivity_Query.getEvents        journal entries, field changes (audit), attachments, emails,
 *                                        relationship changes, the table's activity filter
 *                                        configuration, authors and the stream's AMB channels
 *   GlideActivity_Mutation.putJournal    post a work note / comment
 *   GlideActivity_Query.getEmailBodies   an email's body, on demand
 *   GET /api/now/ui/stream_entry/full_entry   a truncated journal entry in full
 *   GlideRecord_Query.<table> { <journal> { canWrite } }   which journal fields the user may write
 * Live: AMB /activity/events/<sys_id> (each new / changed / removed event, applied in place).
 *
 * Hooks
 *   useActivity(table, sysId, { filters?, view?, live? })   → { entries, allEntries, filterFields, loading, error, arrived, liveStatus, refetch }
 *   useActivityFilters(table, sysId, { initial? })            → filter state seeded from the platform's configuration
 *   usePostJournal(table, sysId)                             → { post(field, value), posting, error }
 *   useJournalFields(table, sysId, { only? })                → journal fields + whether the user may write them
 *   useEmailBody(emailSysId), useFullJournalEntry(eventSysId), useInvalidateActivity(), useNow(ms)
 * Plain functions
 *   fetchActivity, postJournal, fetchEmailBody, fetchFullJournalEntry, fetchJournalAccess,
 *   normalizeActivity, normalizeEvent, applyActivityMessage, applyActivityFilters,
 *   defaultFiltersFrom, countActivity, groupByDay, dayLabel, relativeTime, formatBytes, initialsOf
 */
export {
    ACTIVITY_QUERY,
    PUT_JOURNAL_MUTATION,
    EMAIL_BODY_QUERY,
    fetchActivity,
    postJournal,
    fetchEmailBody,
    fetchFullJournalEntry,
    fetchJournalAccess,
    normalizeActivity,
    normalizeEvent,
    normalizeUser,
    applyActivityMessage,
    kindOfEventTable,
    sortEntries,
    initialsOf,
} from './documents';
export { ACTIVITY_KINDS, applyActivityFilters, kindOfFilterField, defaultFiltersFrom, countActivity } from './filters';
export { dayKey, dayLabel, relativeTime, groupByDay, useNow, formatBytes } from './time';
export type { ActivityDayGroup } from './time';
export {
    activityKeys,
    useActivity,
    useActivityFilters,
    usePostJournal,
    useJournalFields,
    useEmailBody,
    useFullJournalEntry,
    useInvalidateActivity,
    isInternalJournal,
} from './hooks';
export type {
    UseActivityOptions,
    ActivityResult,
    ActivityFilterState,
    ActivityFilterOption,
    PostJournalState,
} from './hooks';
export type {
    ActivityKind,
    ActivityUser,
    ActivityChange,
    ActivityAttachment,
    ActivityEmail,
    ActivityEntry,
    ActivityFilterField,
    ActivityData,
    ActivityFilters,
    JournalFieldInfo,
} from './types';
