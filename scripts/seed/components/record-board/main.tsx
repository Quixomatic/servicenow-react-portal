import { useNavigate } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { HeaderSlot, useHeaderSlot } from 'utilities:app/header-slots';
import { VisualBoard } from 'components:app/visual-board';

/**
 * components:app/record-board: a placeable kanban of any table's records (app/visual-board).
 *
 * Options: { title, description, table, field, query, lanes, laneQuery, hideEmpty, emptyLabel, wip,
 *            cardFields, orderBy, perLane, movable, search, recordPage, chrome, toolbarPlacement }
 * lanes / cardFields are comma lists of values / fields ('' in lanes = the empty lane, write it as
 * '(empty)'); wip is 'value:limit,…'; orderBy is a field, '-' prefix = descending. Moving a card
 * writes `field` as the user through the record's form save (UI policies, BRs, ACLs) with Undo.
 *
 * chrome: 'card' (default) = a card with the title / description and lanes capped at 70vh;
 *         'plain' = no card, no title block, the lanes fill the page height (for Full bleed pages
 *         with the app-shell sub-header: the page title shows there, only the lanes scroll).
 * toolbarPlacement: 'auto' (default: the sub-header's right slot when the page has one and chrome is
 *         plain), 'header' (the slot whenever it exists), 'inline' (above the lanes).
 */
type Options = {
    title?: string;
    description?: string;
    table?: string;
    field?: string;
    query?: string;
    lanes?: string;
    laneQuery?: string;
    hideEmpty?: boolean;
    emptyLabel?: string;
    wip?: string;
    cardFields?: string;
    orderBy?: string;
    perLane?: number;
    movable?: boolean;
    search?: boolean;
    recordPage?: string;
    chrome?: 'card' | 'plain';
    toolbarPlacement?: 'auto' | 'header' | 'inline';
};

const NAME = /^[a-z0-9_.]+$/i;

function list(v: unknown): string[] {
    return String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function RecordBoard({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const table = NAME.test(String(options.table || '')) ? String(options.table) : 'incident';
    const field = NAME.test(String(options.field || '')) ? String(options.field) : 'state';
    const recordPage = options.recordPage === undefined ? 'form' : options.recordPage;
    const onOpen = recordPage ? (t: string, sysId: string) => navigate(recordPage, { table: t, sysId }) : undefined;
    const lanes = list(options.lanes).map((v) => (v === '(empty)' ? '' : v));
    const ob = String(options.orderBy || '').trim();
    const orderBy = NAME.test(ob.replace(/^-/, ''))
        ? [{ field: ob.replace(/^-/, ''), desc: ob[0] === '-' }]
        : undefined;
    const plain = options.chrome === 'plain';
    const rightSlot = useHeaderSlot('right');
    const placement = options.toolbarPlacement || 'auto';
    const toHeader = !!rightSlot && (placement === 'header' || (placement === 'auto' && plain));
    const board = (
        <VisualBoard
            table={table}
            field={field}
            query={options.query || ''}
            lanes={lanes.length ? lanes : undefined}
            laneQuery={options.laneQuery || undefined}
            hideEmpty={!!options.hideEmpty}
            emptyLabel={options.emptyLabel || undefined}
            wip={options.wip || undefined}
            cardFields={list(options.cardFields).length ? list(options.cardFields) : undefined}
            orderBy={orderBy}
            perLane={options.perLane || undefined}
            movable={options.movable !== false}
            search={options.search !== false}
            height={plain ? 'fill' : 'auto'}
            toolbarSlot={
                toHeader
                    ? (toolbar: any) => (
                          <HeaderSlot name="right">
                              <div className="flex min-w-0 items-center justify-end">{toolbar}</div>
                          </HeaderSlot>
                      )
                    : undefined
            }
            onOpen={onOpen}
        />
    );
    if (plain)
        return (
            <div className="min-w-0" data-rp-record-board={`${table}.${field}`} data-chrome="plain">
                {board}
            </div>
        );
    return (
        <Card data-rp-record-board={`${table}.${field}`}>
            {options.title || options.description ? (
                <CardHeader className="gap-1">
                    {options.title ? <h2 className="m-0 text-base font-semibold">{options.title}</h2> : null}
                    {options.description ? (
                        <p className="m-0 text-sm text-muted-foreground">{options.description}</p>
                    ) : null}
                </CardHeader>
            ) : null}
            <CardContent>{board}</CardContent>
        </Card>
    );
}
