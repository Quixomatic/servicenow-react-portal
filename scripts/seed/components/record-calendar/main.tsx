import { useNavigate } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { CalendarView } from 'components:app/calendar-view';
import type { CalendarViewName } from 'components:app/calendar-view';

/**
 * components:app/record-calendar: a placeable calendar of any table's records (app/calendar-view).
 *
 * Options: { title, description, table, query, startField, endField, titleField, colorField, view,
 *            views, date, reschedule, recordPage, limit, height, agendaDays, cardFields }
 * views / cardFields are comma lists; date '' = today. Events open on `recordPage` (table / sys-id
 * params), else the classic form in a new tab. reschedule = drag (and keyboard drag) writes the
 * start / end fields as the user through the record's form save, with an Undo toast.
 */
type Options = {
    title?: string;
    description?: string;
    table?: string;
    query?: string;
    startField?: string;
    endField?: string;
    titleField?: string;
    colorField?: string;
    view?: string;
    views?: string;
    date?: string;
    reschedule?: boolean;
    recordPage?: string;
    limit?: number;
    height?: number;
    agendaDays?: number;
    cardFields?: string;
};

const NAME = /^[a-z0-9_]+$/i;
const VIEWS: CalendarViewName[] = ['month', 'week', 'day', 'agenda'];

function list(v: unknown): string[] {
    return String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
function field(v: unknown): string | undefined {
    const s = String(v || '').trim();
    return NAME.test(s) ? s : undefined;
}

export default function RecordCalendar({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const table = field(options.table) || 'change_request';
    const startField = field(options.startField) || 'start_date';
    const views = list(options.views).filter((v) => VIEWS.indexOf(v as CalendarViewName) >= 0) as CalendarViewName[];
    const view = VIEWS.indexOf(options.view as CalendarViewName) >= 0 ? (options.view as CalendarViewName) : undefined;
    const recordPage = options.recordPage === undefined ? 'form' : options.recordPage;
    const onOpen = recordPage ? (t: string, sysId: string) => navigate(recordPage, { table: t, sysId }) : undefined;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || '')) ? options.date : undefined;
    return (
        <Card data-rp-record-calendar={table}>
            {options.title || options.description ? (
                <CardHeader className="gap-1">
                    {options.title ? <h2 className="m-0 text-base font-semibold">{options.title}</h2> : null}
                    {options.description ? (
                        <p className="m-0 text-sm text-muted-foreground">{options.description}</p>
                    ) : null}
                </CardHeader>
            ) : null}
            <CardContent>
                <CalendarView
                    table={table}
                    query={options.query || ''}
                    startField={startField}
                    endField={field(options.endField)}
                    titleField={field(options.titleField)}
                    colorField={field(options.colorField)}
                    defaultView={view}
                    views={views.length ? views : undefined}
                    defaultDate={date}
                    reschedule={!!options.reschedule}
                    onOpen={onOpen}
                    limit={options.limit || undefined}
                    height={options.height || undefined}
                    agendaDays={options.agendaDays || undefined}
                    cardFields={list(options.cardFields).length ? list(options.cardFields) : undefined}
                />
            </CardContent>
        </Card>
    );
}
