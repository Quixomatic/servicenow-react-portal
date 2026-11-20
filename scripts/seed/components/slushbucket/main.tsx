/**
 * components:app/slushbucket: transfer lists (Service Portal / classic "slushbucket", Next
 * Experience `sn-record-list-select` / `sn-list-selector`).
 *
 *   <Slushbucket available selected onChange searchable? reorderable? … />
 *       generic: Available / Selected multi-select listboxes, Add / Remove / Add all / Remove all,
 *       search over Available (local, or server via search + onSearchChange), Alt+↑/↓ reordering.
 *   <RecordSlushbucket table field value displayValue onChange />
 *       a glide_list / reference field's list collector: Available from the field's reference search
 *       (qualifiers, as the user), value in the platform's comma format.
 */
import { useState } from 'react';
import { Slushbucket } from './slushbucket';
import { RecordSlushbucket } from './record-slushbucket';

export { Slushbucket } from './slushbucket';
export type { SlushbucketProps, TransferItem } from './slushbucket';
export { RecordSlushbucket } from './record-slushbucket';
export type { RecordSlushbucketProps } from './record-slushbucket';

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Kiwi', 'Lemon', 'Mango'].map(
    (label) => ({ id: label.toLowerCase(), label })
);

/** Preview (Studio): a local slushbucket and an incident's watch list collector (unsaved). */
export default function SlushbucketPreview() {
    const [ids, setIds] = useState<string[]>(['banana', 'fig']);
    const [watch, setWatch] = useState({ value: '', display: '' });
    return (
        <div className="flex flex-col gap-6 p-4">
            <Slushbucket
                label="Fruit"
                available={FRUIT}
                selected={ids.map((id) => FRUIT.find((f) => f.id === id)!).filter(Boolean)}
                onChange={setIds}
                reorderable
                height={200}
            />
            <RecordSlushbucket
                label="Watch list"
                table="incident"
                field="watch_list"
                value={watch.value}
                displayValue={watch.display}
                onChange={(value, display) => setWatch({ value, display })}
                height={200}
            />
            <code className="text-xs break-all text-muted-foreground">{watch.value || '(empty)'}</code>
        </div>
    );
}
