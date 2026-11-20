/**
 * components:app/variable-editor-demo: the variable editor (app/variable-editor) on a requested
 * item you pick, read-only or editable. Options: { table, sysId } (default: RITM0010002, the bulk
 * mobile devices request with one MRVS row).
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card';
import { Button } from 'components:button';
import { ReferenceField } from 'components:app/reference-field';
import { VariableEditor } from 'components:app/variable-editor';
import { DialogOutlet } from 'components:app/confirm-dialog';

type Props = { options?: { table?: string; sysId?: string } };

const DEFAULT_RITM = 'a51c0d5b83681310e8fbc9a6feaad39d'; // RITM0010002

export default function VariableEditorDemo({ options = {} }: Props) {
    const table = options.table || 'sc_req_item';
    const [ritm, setRitm] = useState({
        value: options.sysId || DEFAULT_RITM,
        displayValue: options.sysId ? '' : 'RITM0010002',
    });
    const [readOnly, setReadOnly] = useState(true);
    return (
        <Card>
            <DialogOutlet />
            <CardHeader>
                <CardTitle className="text-lg">Variable editor</CardTitle>
                <CardDescription>
                    A submitted request item's variables, from the platform's form layout, through the same variable
                    primitives as the catalog.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-64 flex-1">
                        {/* sc_task.request_item references sc_req_item: its search serves as a RITM picker. */}
                        <ReferenceField
                            name="request_item"
                            table="sc_task"
                            label="Requested item"
                            readOnly={false}
                            value={ritm.value}
                            displayValue={ritm.displayValue}
                            onChange={(value, displayValue) => setRitm({ value, displayValue })}
                        />
                    </div>
                    <div role="group" aria-label="Mode" className="inline-flex rounded-md border border-border p-0.5">
                        <Button
                            type="button"
                            size="sm"
                            variant={readOnly ? 'secondary' : 'ghost'}
                            aria-pressed={readOnly}
                            onClick={() => setReadOnly(true)}
                        >
                            Read-only
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={!readOnly ? 'secondary' : 'ghost'}
                            aria-pressed={!readOnly}
                            onClick={() => setReadOnly(false)}
                            data-rp-ve-editable=""
                        >
                            Editable
                        </Button>
                    </div>
                </div>
                {ritm.value ? (
                    <VariableEditor
                        key={`${ritm.value}|${readOnly}`}
                        table={table}
                        sysId={ritm.value}
                        readOnly={readOnly}
                    />
                ) : (
                    <p className="text-sm text-muted-foreground">Pick a requested item.</p>
                )}
            </CardContent>
        </Card>
    );
}
