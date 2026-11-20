/**
 * components:app/attachments-card: a record's attachments as a placeable widget (Service Portal's
 * "Ticket Attachments" style), on app/attachment-panel.
 *
 * The record comes from the options, else the route params, else the URL params (table, sys_id),
 * so it can sit beside app/record-form on a generic form page. Presentation options only; what the
 * user may do follows the platform (create / delete / rename ACLs, read-only records).
 *
 * Options: { table, sysId, title, layout: 'list' | 'grid' | 'chips', dropzone: 'area' | 'compact' |
 * 'button' | 'none', downloadAll, emptyText }
 */
import { usePortal, usePortalLocation } from '@portal/runtime';
import { AttachmentPanel } from 'components:app/attachment-panel';
import { isAttachableSysId } from 'utilities:app/attachments';

type Options = {
    table?: string;
    sysId?: string;
    title?: string;
    layout?: 'list' | 'grid' | 'chips';
    dropzone?: 'area' | 'compact' | 'button' | 'none';
    downloadAll?: boolean;
    emptyText?: string;
};

const NAME = /^[a-z0-9_]+$/i;

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}

export default function AttachmentsCard({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {};
    const portal = usePortal() as any;
    const query = loc.params && typeof loc.params === 'object' ? loc.params : {};
    const route = (portal && portal.page && portal.page.params) || {};
    const rawTable = pick(options.table, route.table, loc.table, query.table);
    const table = NAME.test(rawTable) ? rawTable : '';
    const sysId = pick(options.sysId, route.sys_id, route.sysId, loc.sysId, query.sys_id);
    const layout = options.layout === 'grid' || options.layout === 'chips' ? options.layout : 'list';
    const dropzone =
        ['area', 'compact', 'button', 'none'].indexOf(String(options.dropzone)) >= 0
            ? options.dropzone
            : layout === 'chips'
              ? 'button'
              : 'area';

    if (!table || !isAttachableSysId(sysId)) {
        return (
            <section
                className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
                data-rp-attachments-card=""
            >
                {options.title || 'Attachments'}: open a saved record to see its attachments.
            </section>
        );
    }
    return (
        <div data-rp-attachments-card={`${table}:${sysId}`}>
            <AttachmentPanel
                table={table}
                sysId={sysId}
                title={options.title === '' ? null : options.title || 'Attachments'}
                layout={layout}
                dropzone={dropzone as any}
                downloadAll={options.downloadAll !== false}
                emptyText={options.emptyText || undefined}
                id={`rp-att-${sysId.slice(0, 8)}-${layout}`}
            />
        </div>
    );
}
