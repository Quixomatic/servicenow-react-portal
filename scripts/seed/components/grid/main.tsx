import { Region, useBlock } from '@portal/runtime'

/**
 * A real CSS grid. Its children are direct grid items (the "items" zone renders with
 * display: contents), so each one's grid layout (span, start, order) applies, and a Grid placed
 * inside a Grid can turn on subgrid to line up on its parent's tracks.
 */
export default function Grid() {
    const { rootProps, options } = useBlock()
    const subgrid = String(options.subgrid || 'none')
    const cls = ['rp-grid', subgrid !== 'none' ? `rp-grid--sub-${subgrid}` : '', rootProps.className].filter(Boolean).join(' ')
    return (
        <div {...rootProps} className={cls}>
            <Region name="items" contents />
        </div>
    )
}
