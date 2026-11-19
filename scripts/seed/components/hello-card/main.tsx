import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { LinkList, type LinkItem } from './parts/LinkList'

type Props = { options?: { title?: string; body?: string; links?: LinkItem[] } }

/** Page widget: title, body and links from its placement's options. */
export default function HelloCard({ options = {} }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{options.title || 'Hello'}</CardTitle>
                {options.body ? <CardDescription>{options.body}</CardDescription> : null}
            </CardHeader>
            {options.links?.length ? (
                <CardContent>
                    <LinkList links={options.links} />
                </CardContent>
            ) : null}
        </Card>
    )
}
