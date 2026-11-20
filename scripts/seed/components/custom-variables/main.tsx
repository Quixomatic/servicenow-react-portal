/**
 * utilities:app/custom-variables: the custom-variable registry record.
 *
 * Custom catalog variables (types 14 / 17, UI page) render one of our components when their
 * attributes say `rp_component=app/<key>` (optional `rp_options={…json…}` → props). app/variable
 * imports this record, so every component listed here loads wherever catalog variables render
 * (catalog items, MRVS rows, the variable editor). To add one: import the component record and add
 * it to CUSTOM_VARIABLES under 'app/<key>'. It must not import components:app/variable (it gets
 * everything through CustomVariableProps), or the imports would form a cycle.
 *
 * Code can also register at runtime: registerCustomVariable('app/<key>', Component) from
 * components:app/variable.
 */
import { CustomVariable as StarRating } from 'components:app/star-rating-variable';

export const CUSTOM_VARIABLES: Record<string, any> = {
    'app/star-rating-variable': StarRating,
};

export default CUSTOM_VARIABLES;
