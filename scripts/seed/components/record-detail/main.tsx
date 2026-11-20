import { usePortal, RegionPortal } from '@portal/runtime';
import { BackButton } from 'components:app/back-button';
import { Card, CardHeader, CardTitle, CardContent } from 'components:card';
import { Badge } from 'components:badge';

type Props = { options?: { label?: string; back?: string } };

/** For routes like orders/:id: shows the params, contributes a header badge, and offers Back (app/back-button). */
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
                {/* Back: this tab's history, else the `back` page (declared parent), else home. */}
                <BackButton parent={options.back ? { to: options.back } : null} variant="outline" display="label" />
            </CardContent>
        </Card>
    );
}
