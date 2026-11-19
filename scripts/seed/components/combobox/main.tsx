/**
 * components:app/combobox: accessible list controls for field primitives.
 *
 *   <Combobox inputValue onInputChange items onSelect … />   editable combobox + listbox (references, lists)
 *   <Select value items onChange … />                        select-only combobox (choices)
 *   <Listbox />, <Popup anchor open />, usePopupPosition()    building blocks (top-layer popup)
 */
import { useState } from 'react'
import { Combobox, Select } from './combobox'
import type { ComboItem } from './combobox'

export { Combobox, Select, Listbox } from './combobox'
export type { ComboItem, ComboboxProps, SelectProps } from './combobox'
export { Popup, usePopupPosition } from './popup'
export type { PopupProps } from './popup'

const FRUIT: ComboItem[] = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Orange', 'Pear'].map((f) => ({ value: f.toLowerCase(), label: f }))

/** Preview (Studio). */
export default function ComboboxPreview() {
    const [text, setText] = useState('')
    const [value, setValue] = useState('cherry')
    return (
        <div className="flex max-w-sm flex-col gap-4 p-4">
            <Select aria-label="Fruit" value={value} items={FRUIT} onChange={(i) => setValue(i.value)} />
            <Combobox
                aria-label="Search fruit"
                inputValue={text}
                onInputChange={setText}
                items={FRUIT.filter((f) => f.label.toLowerCase().includes(text.toLowerCase()))}
                onSelect={(i) => setText(i.label)}
            />
        </div>
    )
}
