import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';

// mode = "studio". Portal Studio arrives in M2 and will be lazy-loaded from here.
export default function StudioPlaceholder() {
	return (
		<div className="bg-background p-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						Portal Studio <Badge variant="secondary">M2</Badge>
					</CardTitle>
					<CardDescription>Studio: coming in M2.</CardDescription>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					This host is in <code>mode = studio</code>. Set Mode to <code>portal</code> to render a portal.
				</CardContent>
			</Card>
		</div>
	);
}
