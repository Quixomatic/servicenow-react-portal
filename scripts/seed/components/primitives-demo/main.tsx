/**
 * Widget app/primitives-demo: every design-system piece of the host kit (accordion, alert, avatar,
 * pill, breadcrumb, checkbox, label-value, stepper, progress, split button, toggle group,
 * resizable panes, tree, heading, image, date range picker, code editor) and the record
 * primitives built on them (app/code-field, app/date-range-field), on one page.
 * Pure demo: nothing is saved.
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'components:accordion';
import { Alert } from 'components:alert';
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, UserAvatar } from 'components:avatar';
import { Pill, PillList } from 'components:pill';
import { Breadcrumbs } from 'components:breadcrumb';
import { Checkbox, CheckboxLabel, useCheckboxGroupState } from 'components:checkbox';
import { LabelValue, LabelValueList } from 'components:label-value';
import { Stepper, useStepper } from 'components:stepper';
import { Progress, ProgressCircle } from 'components:progress';
import { SplitButton, ButtonGroup } from 'components:split-button';
import { ToggleGroup, ToggleGroupItem, useSingleToggle } from 'components:toggle-group';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'components:resizable';
import { Tree } from 'components:tree';
import { Heading } from 'components:heading';
import { Image } from 'components:image';
import { DateRangePicker, defaultRangePresets, formatRange } from 'components:date-range-picker';
import { CodeEditor } from 'components:code-editor';
import { HighlightedValue } from 'components:app/highlighted-value';
import { CodeField } from 'components:app/code-field';
import { DateRangeField } from 'components:app/date-range-field';

type Props = { options?: { title?: string } };

const PEOPLE = ['Beth Anglin', 'Abel Tuter', 'Fred Luddy', 'Charlie Whitherspoon', 'Bud Richman', 'Joe Employee'];

const TREE = [
    {
        id: 'hw',
        label: 'Hardware',
        icon: <Icon name="cpu" />,
        badge: 12,
        children: [
            { id: 'laptops', label: 'Laptops', badge: 7 },
            { id: 'monitors', label: 'Monitors', badge: 3 },
            {
                id: 'mobile',
                label: 'Mobile',
                children: [
                    { id: 'phones', label: 'Phones' },
                    { id: 'tablets', label: 'Tablets' },
                ],
            },
        ],
    },
    {
        id: 'sw',
        label: 'Software',
        icon: <Icon name="app-window" />,
        children: [
            { id: 'office', label: 'Office suite' },
            { id: 'dev', label: 'Developer tools', disabled: true },
        ],
    },
    { id: 'net', label: 'Network', icon: <Icon name="network" /> },
];

const SCRIPT = `(function executeRule(current, previous /*null when async*/) {
    // Copy the caller's location onto the incident.
    if (current.caller_id.location) {
        current.location = current.caller_id.location;
    }
    gs.info('Incident ' + current.getValue('number') + ' updated');
})(current, previous);`;

const JSON_VALUE = `{
    "portal": "sp",
    "theme": { "radius": "0.625rem", "dark": true },
    "pages": ["home", "catalog", "kb"]
}`;

function Section({ title, description, children }: { title: string; description?: string; children: any }) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">{children}</CardContent>
        </Card>
    );
}

function AvatarsDemo() {
    return (
        <Section
            title="Avatar"
            description="components:avatar: image, initials fallback, sizes, presence, group with +N"
        >
            <div className="flex flex-wrap items-end gap-3">
                <UserAvatar name="Beth Anglin" size="xs" />
                <UserAvatar name="Beth Anglin" size="sm" status="online" />
                <UserAvatar name="Abel Tuter" status="away" />
                <UserAvatar name="Fred Luddy" size="lg" status="busy" />
                <UserAvatar name="Joe Employee" size="xl" status="offline" labelled />
                <Avatar size="lg">
                    <AvatarImage src="/nonexistent-photo.png" alt="" />
                    <AvatarFallback>
                        <Icon name="user" className="size-4" />
                    </AvatarFallback>
                    <AvatarBadge>
                        <Icon name="check" />
                    </AvatarBadge>
                </Avatar>
            </div>
            <div className="flex flex-wrap items-center gap-6">
                <AvatarGroup max={4}>
                    {PEOPLE.map((p) => (
                        <UserAvatar key={p} name={p} />
                    ))}
                </AvatarGroup>
                <AvatarGroup max={3} size="sm">
                    {PEOPLE.map((p) => (
                        <UserAvatar key={p} name={p} />
                    ))}
                </AvatarGroup>
            </div>
        </Section>
    );
}

function PillsDemo() {
    const [watchers, setWatchers] = useState(PEOPLE);
    return (
        <Section
            title="Pill and pill list"
            description="components:pill: removable pills; +N overflow (expand, popover, count)"
        >
            <div className="flex flex-wrap items-center gap-2">
                <Pill>Hardware</Pill>
                <Pill variant="outline" icon={<Icon name="tag" />}>
                    Outline
                </Pill>
                <Pill variant="primary">Primary</Pill>
                <Pill variant="secondary" size="sm">
                    Small
                </Pill>
                <Pill variant="destructive" size="lg">
                    Large
                </Pill>
            </div>
            <PillList max={4} aria-label="Watch list">
                {watchers.map((p) => (
                    <Pill
                        key={p}
                        variant="outline"
                        icon={<UserAvatar name={p} size="xs" className="-ml-1.5" />}
                        onRemove={() => setWatchers((w) => w.filter((x) => x !== p))}
                    >
                        {p}
                    </Pill>
                ))}
            </PillList>
            <div className="flex flex-wrap items-center gap-4">
                <PillList max={3} overflow="popover" aria-label="Tags (popover)">
                    {['network', 'vpn', 'email', 'outage', 'p1'].map((t) => (
                        <Pill key={t}>{t}</Pill>
                    ))}
                </PillList>
                <PillList max={2} overflow="count" aria-label="Tags (count)">
                    {['alpha', 'beta', 'gamma', 'delta'].map((t) => (
                        <Pill key={t} variant="secondary">
                            {t}
                        </Pill>
                    ))}
                </PillList>
                {watchers.length < PEOPLE.length ? (
                    <Button size="xs" variant="ghost" onClick={() => setWatchers(PEOPLE)}>
                        Reset
                    </Button>
                ) : null}
            </div>
        </Section>
    );
}

function AlertsDemo() {
    const [dismissed, setDismissed] = useState(false);
    return (
        <Section title="Alert" description="components:alert: status variants, icon, action, dismiss">
            <Alert variant="info" title="Heads up" description="Changes publish when you save the page." />
            <Alert variant="success" title="Request submitted" description="REQ0010042 was created." live={false} />
            <Alert
                variant="warning"
                title="This record changed"
                live={false}
                action={
                    <>
                        <Button size="sm" variant="outline">
                            Reload
                        </Button>
                        <Button size="sm" variant="ghost">
                            Keep mine
                        </Button>
                    </>
                }
            >
                Abel Tuter updated it a minute ago.
            </Alert>
            <Alert
                variant="destructive"
                title="Couldn't save"
                description="Short description is mandatory."
                live={false}
            />
            {!dismissed ? (
                <Alert variant="tip" title="Tip" onDismiss={() => setDismissed(true)} live={false}>
                    Press / anywhere to search.
                </Alert>
            ) : (
                <Button size="sm" variant="outline" className="w-fit" onClick={() => setDismissed(false)}>
                    Show the tip again
                </Button>
            )}
            <Alert live={false}>
                <Icon name="info" />
                <div className="col-start-2 text-sm">A plain alert, composed from parts.</div>
            </Alert>
        </Section>
    );
}

function AccordionDemo() {
    return (
        <Section title="Accordion" description="components:accordion: single (default) or multiple; card variant">
            <Accordion defaultValue={['shipping']}>
                <AccordionItem value="shipping">
                    <AccordionTrigger>When will my laptop arrive?</AccordionTrigger>
                    <AccordionContent>Standard laptops ship in 2 business days after approval.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns">
                    <AccordionTrigger>How do I return old hardware?</AccordionTrigger>
                    <AccordionContent>Open a return request from the catalog; a courier collects it.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="disabled" disabled>
                    <AccordionTrigger>Disabled item</AccordionTrigger>
                    <AccordionContent>Hidden.</AccordionContent>
                </AccordionItem>
            </Accordion>
            <Accordion multiple variant="card" defaultValue={['a']}>
                <AccordionItem value="a">
                    <AccordionTrigger>Multiple: first</AccordionTrigger>
                    <AccordionContent>Several items can stay open.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="b">
                    <AccordionTrigger>Multiple: second</AccordionTrigger>
                    <AccordionContent>Up / Down / Home / End move between triggers.</AccordionContent>
                </AccordionItem>
            </Accordion>
        </Section>
    );
}

function NavigationDemo() {
    const steps = [
        { label: 'Details' },
        { label: 'Approval', description: 'Manager' },
        { label: 'Fulfilment' },
        { label: 'Done' },
    ];
    const wizard = useStepper(steps.length, 1);
    const [view, setView] = useState('list');
    const single = useSingleToggle(view, setView);
    const [formats, setFormats] = useState<string[]>(['bold']);
    const [last, setLast] = useState('');
    return (
        <Section
            title="Breadcrumb, stepper, progress, buttons"
            description="components:breadcrumb, stepper, progress, split-button, toggle-group"
        >
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '#', icon: <Icon name="house" /> },
                    { label: 'Service catalog', href: '#' },
                    { label: 'Hardware', href: '#' },
                    { label: 'Laptops', href: '#' },
                    { label: 'MacBook Pro 14"' },
                ]}
                maxItems={3}
            />
            <Stepper steps={steps} current={wizard.current} onStepClick={wizard.goTo} />
            <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={wizard.isFirst} onClick={wizard.prev}>
                    Back
                </Button>
                <Button size="sm" disabled={wizard.isLast} onClick={wizard.next}>
                    Next
                </Button>
            </div>
            <Progress value={((wizard.current + 1) / steps.length) * 100} label="Request progress" showValue />
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <Progress value={null} label="Loading attachments" size="sm" />
                <ProgressCircle value={65} label="Upload 65%" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <SplitButton
                    onClick={() => setLast('Save')}
                    items={[
                        {
                            label: 'Save and close',
                            onSelect: () => setLast('Save and close'),
                            icon: <Icon name="log-out" />,
                        },
                        { label: 'Save as draft', onSelect: () => setLast('Save as draft') },
                        { type: 'separator' },
                        {
                            label: 'Discard changes',
                            onSelect: () => setLast('Discard'),
                            variant: 'destructive',
                            icon: <Icon name="trash-2" />,
                        },
                    ]}
                >
                    Save
                </SplitButton>
                <SplitButton
                    variant="outline"
                    size="sm"
                    onClick={() => setLast('Export')}
                    items={[{ label: 'Export CSV', onSelect: () => setLast('CSV') }]}
                >
                    Export
                </SplitButton>
                <ButtonGroup aria-label="Pagination">
                    <Button variant="outline" size="sm">
                        Previous
                    </Button>
                    <Button variant="outline" size="sm">
                        Next
                    </Button>
                </ButtonGroup>
                {last ? <span className="text-xs text-muted-foreground">Clicked: {last}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <ToggleGroup {...single} aria-label="View">
                    <ToggleGroupItem value="list">
                        <Icon name="list" /> List
                    </ToggleGroupItem>
                    <ToggleGroupItem value="grid">
                        <Icon name="layout-grid" /> Grid
                    </ToggleGroupItem>
                    <ToggleGroupItem value="board">Board</ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                    multiple
                    variant="outline"
                    value={formats}
                    onValueChange={setFormats}
                    aria-label="Formatting"
                >
                    <ToggleGroupItem value="bold" aria-label="Bold">
                        <Icon name="bold" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Italic">
                        <Icon name="italic" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Underline">
                        <Icon name="underline" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </Section>
    );
}

function DataDisplayDemo() {
    const ids = ['inc1', 'inc2', 'inc3'];
    const [selected, setSelected] = useState<string[]>(['inc2']);
    const group = useCheckboxGroupState(ids, selected, setSelected);
    const [notify, setNotify] = useState(true);
    return (
        <Section
            title="Checkbox and label-value"
            description="components:checkbox (indeterminate), components:label-value (stacked, inline, grid)"
        >
            <div className="flex flex-col gap-2">
                <CheckboxLabel label={`Select all (${group.count} of ${ids.length})`}>
                    <Checkbox
                        checked={group.checked}
                        indeterminate={group.indeterminate}
                        onCheckedChange={group.toggleAll}
                    />
                </CheckboxLabel>
                <div className="flex flex-col gap-2 pl-6">
                    {ids.map((id) => (
                        <CheckboxLabel key={id} label={id.toUpperCase()}>
                            <Checkbox
                                checked={selected.indexOf(id) >= 0}
                                onCheckedChange={(on: boolean) =>
                                    setSelected((s) => (on ? s.concat([id]) : s.filter((x) => x !== id)))
                                }
                            />
                        </CheckboxLabel>
                    ))}
                </div>
                <CheckboxLabel label="Notify me" description="Email when this record changes">
                    <Checkbox checked={notify} onCheckedChange={setNotify} />
                </CheckboxLabel>
                <CheckboxLabel label="Disabled" disabled>
                    <Checkbox checked />
                </CheckboxLabel>
            </div>
            <LabelValueList layout="grid" minColumnWidth="10rem">
                <LabelValue label="Number">INC0010001</LabelValue>
                <LabelValue label="State">
                    <HighlightedValue label="In Progress" />
                </LabelValue>
                <LabelValue label="Caller" value="Beth Anglin" />
                <LabelValue label="Assigned to" />
                <LabelValue label="Short description" span="full">
                    Email server unreachable from the London office since this morning
                </LabelValue>
            </LabelValueList>
            <LabelValueList
                layout="inline"
                divided
                items={[
                    { label: 'Opened', value: '2026-11-20 09:14' },
                    { label: 'Priority', value: <HighlightedValue label="1 - Critical" field="priority" value="1" /> },
                    { label: 'Configuration item', value: '' },
                ]}
            />
            <LabelValueList layout="stacked">
                <LabelValue label="Stacked" value="Label above value" hint="With a hint" />
            </LabelValueList>
        </Section>
    );
}

function LayoutDemo() {
    const [selected, setSelected] = useState<string | null>('laptops');
    return (
        <Section
            title="Resizable panes and tree"
            description="components:resizable (drag, or focus the handle and use the arrow keys), components:tree"
        >
            <ResizablePanelGroup direction="horizontal" autoSaveId="primitives-demo" className="h-64 rounded-lg border">
                <ResizablePanel defaultSize={38} minSize={20} collapsible>
                    <div className="p-2">
                        <Tree
                            aria-label="Categories"
                            items={TREE}
                            defaultExpanded={['hw']}
                            selected={selected}
                            onSelect={(id: string) => setSelected(id)}
                        />
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle aria-label="Resize the category list" />
                <ResizablePanel defaultSize={62} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                        <ResizablePanel defaultSize={60}>
                            <div className="flex h-full flex-col gap-1 p-4">
                                <Heading level={3} size="md">
                                    {selected || 'Nothing selected'}
                                </Heading>
                                <p className="m-0 text-sm text-muted-foreground">
                                    Arrow keys move; type to jump. Enter on the handle collapses the list.
                                </p>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={40}>
                            <div className="p-4 text-sm text-muted-foreground">Nested vertical group</div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </Section>
    );
}

function TypographyDemo() {
    return (
        <Section
            title="Heading and image"
            description="components:heading (level and size apart), components:image (placeholder, fallback)"
        >
            <div className="flex flex-col gap-3">
                <Heading level={2} size="xl">
                    Heading level 2, size xl
                </Heading>
                <Heading level={3} size="xs" variant="muted">
                    Eyebrow (h3, xs)
                </Heading>
                <Heading
                    level={3}
                    description="Description under the heading"
                    action={
                        <Button size="sm" variant="outline">
                            View all
                        </Button>
                    }
                >
                    With description and action
                </Heading>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <Image
                    src="/images/logos/logo_service-now.png"
                    alt="ServiceNow logo"
                    aspectRatio="4 / 3"
                    fit="contain"
                    className="rounded-md border"
                />
                <Image src="/does-not-exist.png" alt="Broken image" aspectRatio="4 / 3" className="rounded-md border" />
                <Image
                    src=""
                    alt=""
                    aspectRatio="4 / 3"
                    fallback={<Icon name="user" />}
                    className="rounded-md border"
                />
            </div>
        </Section>
    );
}

function DatesDemo() {
    const [range, setRange] = useState({ start: '', end: '' });
    const [field, setField] = useState({ start: '', end: '' });
    return (
        <Section
            title="Date range"
            description="components:date-range-picker (presets) and app/date-range-field (the field version)"
        >
            <DateRangePicker
                value={range}
                onChange={setRange}
                presets={defaultRangePresets()}
                aria-label="Date range"
            />
            <span className="text-xs text-muted-foreground">Value: {formatRange(range) || 'none'}</span>
            <DateRangeField
                name="period"
                label="Reporting period"
                hint="In your date format"
                value={field}
                onRangeChange={setField}
            />
        </Section>
    );
}

function CodeDemo() {
    const [code, setCode] = useState(SCRIPT);
    return (
        <Section
            title="Code editor"
            description="components:code-editor (CodeMirror, loaded on first use) and app/code-field (script / json / xml / css fields)"
        >
            <CodeEditor value={code} onChange={setCode} language="javascript" aria-label="Script" minLines={6} />
            <CodeField name="payload" label="JSON (read-only field)" type="json" readOnly value={JSON_VALUE} />
            <CodeField
                name="template"
                label="XML field"
                type="xml"
                defaultValue={'<record>\n    <name>Example</name>\n</record>'}
                hint="Tab indents; Escape then Tab moves on"
            />
        </Section>
    );
}

export default function PrimitivesDemo({ options }: Props) {
    const title = (options && options.title) || 'Design-system primitives';
    return (
        <div className="@container flex min-w-0 flex-col gap-4">
            <Heading
                level={1}
                size="xl"
                description="Host kit pieces (components:<name>) and the record primitives built on them."
            >
                {title}
            </Heading>
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <AvatarsDemo />
                <PillsDemo />
                <AlertsDemo />
                <AccordionDemo />
                <NavigationDemo />
                <DataDisplayDemo />
                <LayoutDemo />
                <TypographyDemo />
                <DatesDemo />
                <CodeDemo />
            </div>
        </div>
    );
}
