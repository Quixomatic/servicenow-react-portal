/** A catalog variable as the AppCatalog GraphQL schema returns it (fields we use). */
export type CatalogVariable = {
    __typename: string
    /** Glide-like UI type: string, multi_two_lines, choice, multiple_choice, numeric_scale, yes_no,
     *  reference, requested_for, glide_list, boolean, glide_date, glide_date_time, masked, email,
     *  url, ip_address, glide_duration, html, label, rich_text_label, break, attachment, macro,
     *  ui_page, container, … */
    type: string
    id: string
    /** Form field name: 'variables.<variableName>' (containers: 'variables.<sys_id>'). */
    name: string
    variableName: string | null
    label: string
    order?: number
    mandatory?: boolean
    readOnly?: boolean
    visible?: boolean
    variableAttributes?: string
    defaultValue?: string
    showHelp?: boolean
    helpText?: string
    instructions?: string | null
    exampleText?: string
    useConfirmation?: boolean
    regExp?: string
    hasPriceImplecations?: boolean
    // choice
    choices?: { displayValue: string; value: string }[]
    includeNone?: boolean
    choiceDirection?: string
    lookupTable?: string
    dependentField?: string
    // reference
    reference?: string
    referenceQual?: string
    useReferenceQualifier?: string
    listTable?: string
    refAcOrderBy?: string
    referringTable?: string
    referringRecordId?: string
    // container / sets
    containerType?: string
    displayTitle?: boolean
    layout?: string
    maxRows?: number
    fields?: { name: string; id: string; label: string; type: string; unique?: boolean; hideOnGrid?: boolean }[]
    rowData?: { row: { id: string; value: string; displayValue: string }[] }[]
    // attachment
    allowedFileExtensions?: string
    maxAttachmentSize?: string
    // macro
    macroponentId?: string
}

/** Layout node: a field, or a container with columns of fields (nested by `parent`). */
export type CatalogLayoutNode = {
    name: string
    type: 'field' | 'container' | 'checkbox_container' | 'multi_row_container' | string
    parent: string
    caption?: string
    captionDisplay?: string
    layout?: string
    columns?: { fields: { name: string; type: string }[] }[]
}

export type CatalogItem = {
    sysId: string
    name: string
    shortDescription: string
    description: string
    picture: string
    /** 'catalog_item' | 'record_producer' | … */
    type: string
    /** 'order' | 'request' | 'submit' (button label for items). */
    requestMethod: string
    mandatoryAttachment: boolean
    hideQuantity: boolean
    hideAttachment: boolean
    quantity: { label: string; value: string }[]
    /** Draft record the platform reserved for this form (attachments go there). */
    targetRecordTable: string
    targetRecordSysId: string
    pricing: {
        price: number
        displayPrice: string
        recurringPrice: number
        recurringDisplayPrice: string
        recurringFrequencyDisplay: string | null
        showPrices: boolean
        currencyCode: string
        currencySymbol: string
    } | null
    variables: CatalogVariable[]
    layout: CatalogLayoutNode[]
    values: Record<string, { value: string; displayValue: string }>
}

export type PriceResult = { price: string; recurringPrice: string; priceValue: number; recurringValue: number; frequency: string; subtotal: string; recurringSubtotal: string }

export type SubmitResult = {
    /** Created record (request for items, target record for producers). */
    table: string
    sysId: string
    number: string
    /** Item orders: the sc_request. */
    requestNumber?: string
    requestId?: string
    raw: Record<string, unknown>
}

/** MRVS row field as the platform's row form returns it. */
export type MrvsRowField = {
    name: string
    sysId: string
    label: string
    type: string
    mandatory: boolean
    readOnly: boolean
    visible: boolean
    value: string
    displayValue: string
    order: number
    unique: boolean
    choices?: { value: string; label: string }[]
    reference?: string
    referenceQual?: string
    attributes?: string
    helpText?: string
    placeholder?: string
}

export type MrvsRowForm = {
    fields: MrvsRowField[]
    /** Column layout of the row form. */
    columns: string[][]
}
