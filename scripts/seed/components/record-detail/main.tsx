import { usePortal, RegionPortal, Link } from '@portal/runtime';
import { Card, CardHeader, CardTitle, CardContent } from 'components:card';
import { Badge } from 'components:badge';

type Props = { options?: { label?: string; back?: string } };

/** For routes like orders/:id — shows the params and contributes a breadcrumb to the header. */
export default function RecordDetail({ options = {} }: Props) {
    const { page } = usePortal();
    const params = page?.params || {};
    const id = params.id || params['*'] || '?';
    const label = options.label || 'Record';

    return (
        <Card>
            <RegionPortal region="header">
                <Badge className="mr-6">
                    Viewing {label} {id}
                </Badge>
            </RegionPortal>
            <CardHeader>
                <CardTitle>
                    {label} {id}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Route pattern: {page?.route}</p>
                <pre className="rounded-md bg-muted p-2 text-xs">{JSON.stringify(params, null, 2)}</pre>
                <Link to={options.back || ''} className="text-primary no-underline hover:underline">
                    ← Back
                </Link>
            </CardContent>
        </Card>
    );
}
