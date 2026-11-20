import { useState } from 'react';
import { useNavigate } from '@portal/runtime';
import { useGraphQL } from 'utilities:app/graphql';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { RecordCard, RecordPreview } from 'components:app/record-card';
import { ContactCard } from 'components:app/contact-card';
import { QuickForm, QuickFormDialog } from 'components:app/quick-form';

/**
 * Demo widget (sp ▸ Fields): the record primitives of wave 2 on a real incident.
 * app/record-card (compact card + reference preview), app/contact-card, app/quick-form (inline
 * edit and a "New incident" dialog). Open record goes to the portal's form page (option formPage).
 *
 * Options: { table = 'incident', formPage = 'form' }
 */
type Options = { table?: string; formPage?: string };

export default function RecordCardsDemo({ options = {} }: { options?: Options }) {
    const navigate = useNavigate();
    const formPage = options.formPage || 'form';
    const open = (table: string, sysId: string) => navigate(formPage, { table, sysId });
    const q = useGraphQL(
        `query rpCardsDemo { GlideRecord_Query { incident(queryConditions: "active=true^caller_idISNOTEMPTY^ORDERBYDESCsys_updated_on", pagination: { limit: 1 }) { _results { sys_id { value } number { displayValue } caller_id { value displayValue } assignment_group { value displayValue } } } } }`
    );
    const rows = q.data && q.data.GlideRecord_Query ? q.data.GlideRecord_Query.incident._results : [];
    const inc = rows && rows[0];
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState('');
    const [editing, setEditing] = useState(false);
    if (!inc)
        return (
            <Card>
                <CardContent className="text-sm text-muted-foreground">
                    {q.isLoading ? 'Loading an incident…' : 'No active incident with a caller to show.'}
                </CardContent>
            </Card>
        );
    const id = inc.sys_id.value;
    return (
        <div className="flex flex-col gap-4" data-rp-record-cards-demo="">
            <Card>
                <CardHeader>
                    <CardTitle>Record card, contact card, reference preview</CardTitle>
                    <CardDescription>
                        app/record-card and app/contact-card read as you (ACLs apply). References open a preview card
                        with Open record.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <RecordCard table="incident" sysId={id} onOpen={open} />
                    {inc.caller_id && inc.caller_id.value ? (
                        <div className="rounded-xl border border-border bg-card p-4">
                            <ContactCard userId={inc.caller_id.value} onOpen={open} />
                        </div>
                    ) : null}
                    <p className="m-0 text-sm md:col-span-2">
                        {inc.number.displayValue} was raised by{' '}
                        <RecordPreview
                            table="sys_user"
                            sysId={inc.caller_id.value}
                            label={inc.caller_id.displayValue}
                            onOpen={open}
                        />
                        {inc.assignment_group && inc.assignment_group.value ? (
                            <>
                                {' '}
                                for{' '}
                                <RecordPreview
                                    table="sys_user_group"
                                    sysId={inc.assignment_group.value}
                                    label={inc.assignment_group.displayValue}
                                    onOpen={open}
                                />
                            </>
                        ) : null}
                        .
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Quick form</CardTitle>
                    <CardDescription>
                        app/quick-form: a few fields on the full form runtime (UI policies, client scripts, the
                        platform&apos;s Save / Submit action).
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" onClick={() => setCreating(true)} data-rp-demo-new="">
                            <Icon name="plus" aria-hidden="true" /> New incident
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditing((e) => !e)}
                            aria-expanded={editing}
                            data-rp-demo-edit=""
                        >
                            <Icon name="pencil" aria-hidden="true" /> {editing ? 'Close' : 'Edit'}{' '}
                            {inc.number.displayValue}
                        </Button>
                        {created ? (
                            <span className="text-sm text-muted-foreground" role="status">
                                Created{' '}
                                <RecordPreview
                                    table="incident"
                                    sysId={created}
                                    label="the new incident"
                                    onOpen={open}
                                />
                            </span>
                        ) : null}
                    </div>
                    {editing ? (
                        <div className="max-w-xl rounded-xl border border-border p-4">
                            <QuickForm
                                table="incident"
                                sysId={id}
                                fields={['short_description', 'urgency', 'impact']}
                                onCancel={() => setEditing(false)}
                                onSaved={() => setEditing(false)}
                                onOpenRecord={open}
                            />
                        </div>
                    ) : null}
                    <QuickFormDialog
                        open={creating}
                        onOpenChange={setCreating}
                        title="New incident"
                        description="Caller and short description are required."
                        table="incident"
                        fields={['caller_id', 'short_description', 'urgency', 'category']}
                        onSaved={(newId) => setCreated(newId)}
                        onOpenRecord={open}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
