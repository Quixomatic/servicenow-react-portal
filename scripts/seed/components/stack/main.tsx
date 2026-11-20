import { Region, useBlock } from '@portal/runtime';

/** A flex stack (vertical or horizontal); its items are direct flex children. */
export default function Stack() {
    const { rootProps } = useBlock();
    return (
        <div {...rootProps} className={['rp-stack', rootProps.className].filter(Boolean).join(' ')}>
            <Region name="items" contents />
        </div>
    );
}
