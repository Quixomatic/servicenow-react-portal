import type { GlideType } from './types';

/**
 * The field factory's registry: glide type → field component. app/field-control registers the
 * built-in primitives; portals can override a type (or a dictionary attribute) with their own.
 *
 *   registerFieldType('string', MyStringField)
 *   registerFieldAttribute('rp_component', 'stars', StarRatingField)   // attribute rp_component=stars
 */
type FieldComponent = (props: any) => any;

const byType = new Map<string, FieldComponent>();
const byAttribute = new Map<string, FieldComponent>();
const listeners = new Set<() => void>();
let version = 0;

function changed() {
    version++;
    listeners.forEach((l) => l());
}

export function registerFieldType(type: GlideType | GlideType[], component: FieldComponent): () => void {
    const list = Array.isArray(type) ? type : [type];
    list.forEach((t) => byType.set(t, component));
    changed();
    return () => {
        list.forEach((t) => byType.get(t) === component && byType.delete(t));
        changed();
    };
}

export function registerFieldAttribute(attribute: string, value: string, component: FieldComponent): () => void {
    const key = `${attribute}=${value}`;
    byAttribute.set(key, component);
    changed();
    return () => {
        if (byAttribute.get(key) === component) byAttribute.delete(key);
        changed();
    };
}

/** The component for a field: attribute overrides first, then the type, else undefined. */
export function resolveFieldComponent(
    type: GlideType,
    attributes?: Record<string, string>
): FieldComponent | undefined {
    if (attributes) {
        for (const k of Object.keys(attributes)) {
            const hit = byAttribute.get(`${k}=${attributes[k]}`);
            if (hit) return hit;
        }
    }
    return byType.get(type);
}

export function registeredFieldTypes(): string[] {
    return Array.from(byType.keys()).sort();
}

export const fieldRegistry = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getVersion: () => version,
};
