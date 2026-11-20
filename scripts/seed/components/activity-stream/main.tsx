/**
 * components:app/activity-stream: a record's activity, as Workspace's activity stream shows it.
 *
 *   <ActivityStream table="incident" sysId={id} />       the feed: filters, day groups, Show more, live
 *   <RecordActivity table="incident" sysId={id} form? />  journal composer (app/journal-composer) + stream, stacked
 *   <ActivityConversation table sysId />                 chat-style conversation (Ticket conversations), composer at the bottom
 *   activityElementRenderer({ form, mode, renderElement }) / <ActivityBelowForm>   RecordForm's opt-in activity ('notes' | 'below')
 *
 * - Data: utilities:app/activity (GlideActivity getEvents, the platform's filter configuration,
 *   live via AMB /activity/events/<sys_id>).
 * - Journal entries: work notes tinted (the platform's yellow) and labelled internal; comments
 *   plain; HTML sanitised through components:rich-text; truncated entries load in full on demand.
 * - Field changes: label, old → new (the creation entry lists initial values). Attachments: a
 *   minimal entry (name, size, icon, image thumbnail, download) until utilities:app/attachments
 *   registers a renderer (registerActivityAttachmentRenderer / the renderAttachment prop).
 *   Emails: subject, from / to, the body on demand.
 * - Accessible feed (role=feed, articles with aria-posinset / -setsize): Page Down / Page Up (and
 *   arrows on an article), Home / End, Ctrl+Home / Ctrl+End to leave the feed; new entries are
 *   highlighted and announced politely.
 *
 * Exports: ActivityStream, ActivityFilterBar, ActivityEntryView, ActivityAvatar, FieldChanges,
 * AttachmentBody, entryLabel, RecordActivity, activityElementRenderer, ACTIVITY_FORMATTER,
 * registerActivityAttachmentRenderer.
 */
import { RecordActivity } from './record-activity';

export { ActivityStream, ActivityFilterBar } from './stream';
export type { ActivityStreamProps } from './stream';
export {
    ActivityEntryView,
    ActivityAvatar,
    FieldChanges,
    AttachmentBody,
    entryLabel,
    registerActivityAttachmentRenderer,
} from './entry';
export type { ActivityEntryProps, AttachmentRenderer } from './entry';
export {
    RecordActivity,
    activityElementRenderer,
    activityAnchor,
    ActivityBelowForm,
    formActivityMode,
    ACTIVITY_FORMATTER,
} from './record-activity';
export type { RecordActivityProps, FormActivityMode } from './record-activity';
export { ActivityConversation } from './conversation';
export type { ActivityConversationProps } from './conversation';

/** Preview (Studio): INC0000031 (demo data with journal entries, an image attachment and field changes). */
export default function ActivityStreamPreview() {
    return (
        <div className="max-w-2xl p-4">
            <RecordActivity table="incident" sysId="47064b68a9fe19810186793eefffc9b7" composer={false} />
        </div>
    );
}
