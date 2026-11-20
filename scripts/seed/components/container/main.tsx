import { Region, useBlock } from '@portal/runtime';

/** A centred, max-width container; its items stack with a gap. */
export default function Container() {
    const { rootProps } = useBlock();
    return (
        <div {...rootProps} className={['rp-container', rootProps.className].filter(Boolean).join(' ')}>
            <Region name="content" contents />
        </div>
    );
}
