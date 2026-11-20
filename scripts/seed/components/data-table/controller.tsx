import { createContext, useContext } from 'react';
import type { ListPage, ListRow } from 'utilities:app/list-data';

/**
 * What a RecordList exposes to its extension slots (toolbarActions, selectionActions, rowActions,
 * contextMenuItems), to `controllerRef` and to `useListController()` inside those slots. A fresh
 * object each render; read it, don't keep it.
 */
export type ListController = {
    table: string;
    view?: string;
    /** The user's filter (no ORDERBY / GROUPBY). */
    filter: string;
    fixedQuery?: string;
    /** Active quick filter ids. */
    quickFilters: string[];
    /** The effective encoded query the server ran: fixed ^ filter ^ quick filters ^ keywords ^ GROUPBY ^ ORDERBY. */
    query: string;
    keywords: string;
    orderBy: string;
    /** Grouped column ('' = not grouped). */
    groupBy: string;
    /** Rows on screen (every group's rows when grouped). */
    rows: ListRow[];
    count: number;
    page?: ListPage;
    selectedIds: string[];
    /** Selected rows the list has seen (selection spans pages). */
    selectedRows: ListRow[];
    setSelection: (ids: string[]) => void;
    clearSelection: () => void;
    /** Refetch every list of this table. */
    refresh: () => void;
    setFilter: (encoded: string) => void;
    setGroupBy: (column: string) => void;
};

export const ListControllerContext = createContext<ListController | null>(null);

/** The nearest RecordList's controller (inside its slots); null outside a list. */
export function useListController(): ListController | null {
    return useContext(ListControllerContext);
}
