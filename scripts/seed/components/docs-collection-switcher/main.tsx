/**
 * components:app/docs-collection-switcher — switch between the portal's docs collections
 * (settings.docsCollections). It looks and behaves like app/docs-sidebar's portal switcher (fumadocs'
 * sidebar tabs dropdown): a trigger with the current collection's icon tile and title, then one row
 * per collection with icon, title and description, the current one checked. Picking a collection opens
 * its first page with the URL's `c` param (none for the portal's default).
 *
 *   import DocsCollectionSwitcher from 'components:app/docs-collection-switcher'
 *   <DocsCollectionSwitcher />                  renders nothing when the portal has one collection
 *   <DocsCollectionSwitcher collection="x" />   the current collection forced (a widget's option)
 *
 * The logic is useDocsCollections() from utilities:app/docs, so a widget can build its own switcher.
 */
import { Icon } from 'components:icon';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu';
import { cn } from 'utilities:cn';
import { useDocsCollections } from 'utilities:app/docs';
import type { DocsCollection } from 'utilities:app/docs';

// The same chart tints as the portal switcher's tiles, by position.
const TINTS = [
    'bg-chart-1/15 text-chart-1',
    'bg-chart-2/15 text-chart-2',
    'bg-chart-3/15 text-chart-3',
    'bg-chart-4/15 text-chart-4',
    'bg-chart-5/15 text-chart-5',
];

function Tile({ item, index, className }: { item: DocsCollection; index: number; className?: string }) {
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md',
                TINTS[index % TINTS.length],
                className
            )}
        >
            <Icon name={item.icon || 'book-open'} className="size-3.5" />
        </span>
    );
}

export default function DocsCollectionSwitcher({ collection, className }: { collection?: string; className?: string }) {
    const { collections, currentKey, switchTo } = useDocsCollections(collection);
    if (collections.length < 2) return null;
    const index = Math.max(
        0,
        collections.findIndex((c) => c.key === currentKey)
    );
    const current = collections[index];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                data-docs-collection-switcher=""
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg border bg-secondary/50 p-2 text-start text-secondary-foreground transition-colors hover:bg-accent data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground',
                    className
                )}
            >
                <Tile item={current} index={index} className="size-5" />
                <span className="min-w-0 truncate text-sm font-medium">{current.title}</span>
                <Icon name="chevrons-up-down" className="ms-auto size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--anchor-width)] min-w-56 p-1">
                {collections.map((item, i) => (
                    <DropdownMenuItem
                        key={item.key}
                        onClick={() => item.key !== currentKey && switchTo(item.key)}
                        data-docs-collection={item.key}
                        className="flex items-center gap-2 rounded-lg p-1.5"
                    >
                        <Tile item={item} index={i} className="mb-auto size-5" />
                        <span className="flex min-w-0 flex-col">
                            <span className="text-sm leading-none font-medium">{item.title}</span>
                            {item.description ? (
                                <span className="mt-1 text-[0.8125rem] text-muted-foreground">{item.description}</span>
                            ) : null}
                        </span>
                        <Icon
                            name="check"
                            className={cn(
                                'ms-auto size-3.5 shrink-0 text-primary',
                                item.key !== currentKey && 'invisible'
                            )}
                        />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
