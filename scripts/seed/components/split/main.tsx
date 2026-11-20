import { Region, useBlock } from '@portal/runtime';

/** Two panes (start / end) with an optional divider; stacks on mobile by default. */
export default function Split() {
    const { rootProps, options } = useBlock();
    const cls = ['rp-split', options.divider ? 'rp-split--divider' : '', rootProps.className].filter(Boolean).join(' ');
    return (
        <div {...rootProps} className={cls}>
            <Region name="start" className="rp-split__pane" />
            <Region name="end" className="rp-split__pane" />
        </div>
    );
}
