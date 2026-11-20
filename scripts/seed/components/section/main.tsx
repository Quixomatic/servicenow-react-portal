import { Region, useBlock } from '@portal/runtime';

/** A full-width band (give the instance a background in its styling); content can be width-capped. */
export default function Section() {
    const { rootProps } = useBlock();
    return (
        <section {...rootProps} className={['rp-section', rootProps.className].filter(Boolean).join(' ')}>
            <Region name="content" className="rp-section__inner" />
        </section>
    );
}
