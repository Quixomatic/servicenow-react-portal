import { useNavigate } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { VisualBoard } from 'components:app/visual-board';

/**
 * components:app/record-board: a placeable kanban of any table's records (app/visual-board).
 *
 * Options: { title, description, table, field, query, lanes, laneQuery, hideEmpty, emptyLabel, wip,
 *            cardFields, orderBy, perLane, movable, search, recordPage }
 * lanes / cardFields are comma lists of values / fields ('' in lanes = the empty lane, write it as
 * '(empty)'); wip is 'value:limit,…'; orderBy is a field, '-' prefix = descending. Moving a card
 * writes `field` as the user through the record's form save (UI policies, BRs, ACLs) with Undo.
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
            <CardContent>
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
                    onOpen={onOpen}
                />
            </CardContent>
        </Card>
    );
}
