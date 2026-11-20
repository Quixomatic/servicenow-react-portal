import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { cn } from 'cn';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';

// components:breadcrumb: shadcn Breadcrumb (nav aria-label="Breadcrumb" > ol, the current page
// marked aria-current="page"), plus Breadcrumbs: an items-driven trail that collapses its middle
// into an ellipsis menu.
//
//   <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Incidents', render: <Link … /> },
//                        { label: 'INC0010001' }]} maxItems={3} />
//
//   <Breadcrumb><BreadcrumbList>
//       <BreadcrumbItem><BreadcrumbLink render={<Link to="kb" />}>Knowledge</BreadcrumbLink></BreadcrumbItem>
//       <BreadcrumbSeparator />
//       <BreadcrumbItem><BreadcrumbPage>Article</BreadcrumbPage></BreadcrumbItem>
//   </BreadcrumbList></Breadcrumb>
//
// BreadcrumbLink takes Base UI's `render` (e.g. the runtime's <Link>) instead of asChild.

function Breadcrumb({ className, ...props }) {
    return <nav aria-label="Breadcrumb" data-slot="breadcrumb" className={className} {...props} />;
}

function BreadcrumbList({ className, ...props }) {
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn(
                'flex min-w-0 flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2',
                className
            )}
            {...props}
        />
    );
}

function BreadcrumbItem({ className, ...props }) {
    return (
        <li
            data-slot="breadcrumb-item"
            className={cn('inline-flex min-w-0 items-center gap-1', className)}
            {...props}
        />
    );
}

function BreadcrumbLink({ className, render, ...props }) {
    return useRender({
        defaultTagName: 'a',
        props: mergeProps(
            {
                className: cn(
                    'truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    className
                ),
            },
            props
        ),
        render,
        state: { slot: 'breadcrumb-link' },
    });
}

function BreadcrumbPage({ className, ...props }) {
    return (
        <span
            data-slot="breadcrumb-page"
            role="link"
            aria-disabled="true"
            aria-current="page"
            className={cn('truncate font-normal text-foreground', className)}
            {...props}
        />
    );
}

function BreadcrumbSeparator({ children, className, ...props }) {
    return (
        <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            className={cn('[&>svg]:size-3.5', className)}
            {...props}
        >
            {children || <ChevronRightIcon />}
        </li>
    );
}

function BreadcrumbEllipsis({ className, ...props }) {
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            aria-hidden="true"
            className={cn('flex size-5 items-center justify-center [&>svg]:size-4', className)}
            {...props}
        >
            <MoreHorizontalIcon />
        </span>
    );
}

/**
 * Which items to show for a trail of `count` items with at most `maxItems` visible:
 * { head, hidden, tail } index arrays. The first `itemsBefore` (1) and last `itemsAfter`
 * (maxItems - itemsBefore - 1) stay; the middle collapses into one ellipsis. maxItems <= 0 or a
 * short trail: nothing hidden.
 */
function collapseBreadcrumbs(count, maxItems, itemsBefore = 1) {
    const all = Array.from({ length: count }, (_, i) => i);
    if (!maxItems || maxItems <= 0 || count <= maxItems) return { head: all, hidden: [], tail: [] };
    const before = Math.max(0, Math.min(itemsBefore, maxItems - 1));
    const after = Math.max(1, maxItems - before - 1);
    return { head: all.slice(0, before), hidden: all.slice(before, count - after), tail: all.slice(count - after) };
}

/**
 * Items-driven breadcrumbs. items: [{ label, href?, render? (an element such as <Link>),
 * onClick?, icon?, key? }]; the last item is the current page unless `lastIsPage={false}`.
 * maxItems collapses the middle into an ellipsis button with a menu of the hidden items;
 * itemsBefore keeps that many leading items (default 1). separator: a custom element.
 */
function Breadcrumbs({ items, maxItems = 0, itemsBefore = 1, separator, lastIsPage = true, className, ...props }) {
    const list = (items || []).filter(Boolean);
    const { head, hidden, tail } = collapseBreadcrumbs(list.length, maxItems, itemsBefore);
    const crumb = (index) => {
        const item = list[index];
        const isPage = lastIsPage && index === list.length - 1;
        const content = (
            <>
                {item.icon || null}
                {item.label}
            </>
        );
        return (
            <BreadcrumbItem key={item.key || index}>
                {isPage ? (
                    <BreadcrumbPage className="inline-flex items-center gap-1 [&_svg]:size-3.5">
                        {content}
                    </BreadcrumbPage>
                ) : (
                    <BreadcrumbLink
                        href={item.render ? undefined : item.href}
                        render={item.render}
                        onClick={item.onClick}
                        className="inline-flex items-center gap-1 [&_svg]:size-3.5"
                    >
                        {content}
                    </BreadcrumbLink>
                )}
            </BreadcrumbItem>
        );
    };
    const out = [];
    const sep = (key) => <BreadcrumbSeparator key={'sep-' + key}>{separator}</BreadcrumbSeparator>;
    head.forEach((i) => {
        if (out.length) out.push(sep(i));
        out.push(crumb(i));
    });
    if (hidden.length) {
        if (out.length) out.push(sep('ellipsis'));
        out.push(
            <BreadcrumbItem key="ellipsis">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label={`Show ${hidden.length} more`}
                        className="flex items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <BreadcrumbEllipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-auto min-w-40">
                        {hidden.map((i) => {
                            const item = list[i];
                            const el = item.render || (item.href ? <a href={item.href} /> : undefined);
                            return (
                                <DropdownMenuItem key={item.key || i} render={el} onClick={item.onClick}>
                                    {item.icon || null}
                                    {item.label}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </BreadcrumbItem>
        );
    }
    tail.forEach((i) => {
        if (out.length) out.push(sep(i));
        out.push(crumb(i));
    });
    return (
        <Breadcrumb className={className} {...props}>
            <BreadcrumbList>{out}</BreadcrumbList>
        </Breadcrumb>
    );
}

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
    Breadcrumbs,
    collapseBreadcrumbs,
};
