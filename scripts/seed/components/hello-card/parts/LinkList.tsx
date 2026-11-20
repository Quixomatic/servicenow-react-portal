// An extra source file, imported from main.tsx with a relative path.
import { Link } from '@portal/runtime';
import { Button } from 'components:button';

export type LinkItem = { label: string; to?: string; recordId?: string; q?: string };

export function LinkList({ links }: { links: LinkItem[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {links.map((l) => (
                <Link key={l.label} to={l.to || ''} recordId={l.recordId} q={l.q}>
                    <Button variant="outline" size="sm">
                        {l.label}
                    </Button>
                </Link>
            ))}
        </div>
    );
}
