import { Region, useBlock } from '@portal/runtime'

/**
 * Columns: one drop zone per track (½+½, ⅓+⅔, ⅓×3, ¼×4, or custom sizes). Widgets stack inside
 * each column. On mobile the default tracks collapse to one column, so the columns stack.
 */
export default function Columns() {
    const { rootProps, regions } = useBlock()
    return (
        <div {...rootProps} className={['rp-cols', rootProps.className].filter(Boolean).join(' ')}>
            {regions.map((r) => (
                <Region key={r.name} name={r.name} className="rp-cols__col" />
            ))}
        </div>
    )
}
