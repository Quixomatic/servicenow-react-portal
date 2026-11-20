/**
 * React Portal demo catalog item (catalog wave 2), idempotent. GLOBAL scope: the catalog tables
 * (sc_cat_item, item_option_new_set, io_set_item, question_choice, catalog_ui_policy[_action],
 * catalog_script_client) refuse creates and updates from other application scopes, so this can't
 * run inside the x_312987_portal seed. Run once (re-running updates in place, never deletes):
 *   now-sdk exec --scope global --file scripts/seed/catalog-demo-global.js --reason "React Portal demo catalog item"
 * The x_312987_portal seed then finds the item by name for the sp catalog picker.
 */
(function () {
    var log = [];
    // logged and the rest of the seed carries on (the catalog page then just lacks the demo item).
    function upsertGlobal(table, query, fields) {
        var gr = new GlideRecord(table);
        gr.addEncodedQuery(query);
        gr.setLimit(1);
        gr.query();
        var isNew = !gr.next();
        if (isNew) gr.initialize();
        var dirty = isNew;
        for (var k in fields) {
            var s = fields[k] === null || fields[k] === undefined ? '' : String(fields[k]);
            if (isNew || String(gr.getValue(k) || '') !== s) {
                gr.setValue(k, s);
                dirty = true;
            }
        }
        var id = isNew ? gr.insert() : dirty ? (gr.update(), gr.getUniqueValue()) : gr.getUniqueValue();
        if (!id) throw new Error('Could not write ' + table + ' ' + query);
        return id;
    }

    function seedDemoCatalog() {
        var SC_CATALOG = 'e0d08b13c3330100c8b837659bba8fb4'; // Service Catalog
        var SC_HARDWARE = 'd258b953c611227a0146101fb1be7c31'; // Hardware category
        var itemId = upsertGlobal('sc_cat_item', 'name=React Portal demo: Team equipment', {
            name: 'React Portal demo: Team equipment',
            short_description:
                'Order equipment for your team: one row per device. Rows run their own catalog UI policies and client scripts.',
            description:
                '<p>Demo item for React Portal (catalog wave 2). Each equipment row has its own UI policy (laptop model only for laptops) and client scripts (deliver-to from the request, a monitor tip, laptops need a justification).</p>',
            sc_catalogs: SC_CATALOG,
            category: SC_HARDWARE,
            price: '25',
            active: 'true',
        });
        var vars = {};
        function variable(key, owner, fields) {
            var q = (owner.set ? 'variable_set=' + owner.set : 'cat_item=' + owner.item) + '^name=' + key;
            var f = { name: key, active: 'true' };
            if (owner.set) f.variable_set = owner.set;
            else f.cat_item = owner.item;
            for (var k in fields) f[k] = fields[k];
            vars[key] = upsertGlobal('item_option_new', q, f);
            return vars[key];
        }
        function choices(questionId, list) {
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                upsertGlobal('question_choice', 'question=' + questionId + '^value=' + c.value, {
                    question: questionId,
                    text: c.text,
                    value: c.value,
                    order: (i + 1) * 100,
                    misc: c.price || '0',
                    inactive: 'false',
                });
            }
        }
        var item = { item: itemId };
        variable('rp_requested_for', item, {
            type: '31',
            question_text: 'Requested for',
            order: '100',
            mandatory: 'true',
            default_value: 'javascript:gs.getUserID()',
            reference: 'sys_user',
        });
        variable('rp_delivery_location', item, {
            type: '6',
            question_text: 'Delivery location',
            order: '200',
            default_value: 'Building A, 3rd floor',
            help_text:
                'Each equipment row starts with this location (a row onLoad script reads it through g_service_catalog.parent).',
            show_help: 'true',
        });
        variable('rp_importance', item, {
            type: '17',
            question_text: 'How important is this to your work?',
            order: '300',
            attributes:
                'rp_component=app/star-rating-variable,rp_options={"max":5,"labels":["Nice to have","Helpful","Important","Very important","Blocking my work"]}',
        });
        variable('rp_notes', item, { type: '2', question_text: 'Anything else we should know?', order: '500' });

        var setId = upsertGlobal('item_option_new_set', 'internal_name=rp_demo_equipment', {
            title: 'Equipment',
            internal_name: 'rp_demo_equipment',
            type: 'one_to_many',
            layout: '2down',
            display_title: 'true',
            order: '400',
            set_attributes: 'max_rows=5',
            description: 'React Portal demo: equipment rows with set-level UI policies and client scripts.',
        });
        upsertGlobal('io_set_item', 'sc_cat_item=' + itemId + '^variable_set=' + setId, {
            sc_cat_item: itemId,
            variable_set: setId,
            order: '400',
        });
        var set = { set: setId };
        choices(
            variable('equipment_type', set, {
                type: '5',
                question_text: 'Equipment',
                order: '100',
                mandatory: 'true',
                include_none: 'true',
                pricing_implications: 'true',
            }),
            [
                { text: 'Laptop', value: 'laptop', price: '1200' },
                { text: 'Monitor', value: 'monitor', price: '250' },
                { text: 'Docking station', value: 'dock', price: '180' },
                { text: 'Headset', value: 'headset', price: '90' },
            ]
        );
        choices(
            variable('laptop_model', set, {
                type: '5',
                question_text: 'Laptop model',
                order: '200',
                include_none: 'true',
                pricing_implications: 'true',
            }),
            [
                { text: 'MacBook Pro 14"', value: 'mbp14', price: '300' },
                { text: 'ThinkPad X1 Carbon', value: 'x1', price: '0' },
            ]
        );
        variable('justification', set, { type: '6', question_text: 'Justification', order: '300' });
        variable('deliver_to', set, { type: '6', question_text: 'Deliver to', order: '400' });

        // Set-level catalog UI policy: the laptop model shows (and is required) only for laptops.
        var policyId = upsertGlobal(
            'catalog_ui_policy',
            'variable_set=' + setId + '^short_description=RP demo: laptop model only for laptops',
            {
                short_description: 'RP demo: laptop model only for laptops',
                applies_to: 'set',
                variable_set: setId,
                catalog_conditions: 'IO:' + vars.equipment_type + '=laptop^EQ',
                on_load: 'true',
                reverse_if_false: 'true',
                active: 'true',
                applies_catalog: 'true',
                applies_req_item: 'true',
                run_scripts: 'true',
                ui_type: '10',
                order: '100',
                script_true:
                    "function onCondition() {\n    g_form.showFieldMsg('laptop_model', 'Laptops ship with a charger and a sleeve.', 'info');\n}",
                script_false: "function onCondition() {\n    g_form.hideFieldMsg('laptop_model', true);\n}",
            }
        );
        upsertGlobal(
            'catalog_ui_policy_action',
            'ui_policy=' + policyId + '^catalog_variable=IO:' + vars.laptop_model,
            {
                ui_policy: policyId,
                variable_set: setId,
                catalog_variable: 'IO:' + vars.laptop_model,
                visible: 'true',
                mandatory: 'true',
                disabled: 'ignore',
                cleared: 'false',
            }
        );

        // Set-level catalog client scripts (onLoad / onChange / onSubmit), run in each row editor.
        function script(name, fields) {
            var f = {
                name: name,
                applies_to: 'set',
                variable_set: setId,
                active: 'true',
                applies_catalog: 'true',
                applies_req_item: 'false',
                ui_type: '10',
                isolate_script: 'true',
            };
            for (var k in fields) f[k] = fields[k];
            return upsertGlobal('catalog_script_client', 'variable_set=' + setId + '^name=' + name, f);
        }
        script('RP demo row: deliver to the request location', {
            type: 'onLoad',
            script: "function onLoad() {\n    // g_service_catalog.parent: the item form this row belongs to.\n    if (!g_form.getValue('deliver_to')) {\n        var where = g_service_catalog.parent.getValue('rp_delivery_location');\n        if (where) g_form.setValue('deliver_to', where);\n    }\n}",
        });
        script('RP demo row: monitor tip', {
            type: 'onChange',
            cat_variable: 'IO:' + vars.equipment_type,
            script: "function onChange(control, oldValue, newValue, isLoading) {\n    if (isLoading) return;\n    g_form.hideFieldMsg('equipment_type', true);\n    if (newValue == 'monitor') g_form.showFieldMsg('equipment_type', 'Monitors ship with an HDMI and a USB-C cable.', 'info');\n}",
        });
        script('RP demo row: laptops need a justification', {
            type: 'onSubmit',
            script: "function onSubmit() {\n    if (g_form.getValue('equipment_type') == 'laptop' && !g_form.getValue('justification')) {\n        g_form.showFieldMsg('justification', 'Tell us why you need a laptop.', 'error');\n        g_form.addErrorMessage('A laptop row needs a justification.');\n        return false;\n    }\n}",
        });
        log.push(
            'demo catalog item ' +
                itemId +
                ': variable set ' +
                setId +
                ', ' +
                Object.keys(vars).length +
                ' variables, 1 set UI policy, 3 set client scripts'
        );
        return itemId;
    }

    try {
        seedDemoCatalog();
    } catch (e) {
        log.push('demo catalog item: FAILED ' + e);
    }
    gs.info(log.join(' | '));
})();
