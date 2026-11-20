import '@servicenow/sdk/global';
import { GraphQLApi, Acl } from '@servicenow/sdk/core';
import { recordFieldsResolver } from '../../server/views/record-fields';

/**
 * Record header fields over GraphQL: { x312987Portal { recordFields { resolve(table, portal, sysId) { … } } } }.
 *
 * app/record-header asks for it in the SAME request as the platform header
 * (GlideHeaderQuery_Query.headerItems), so a form load makes no extra request. The answer is the
 * resolved configuration (x_312987_portal_record_field) for the user, plus the record's values for
 * those fields read as the user.
 *
 * Roleless customers can call it: the internal-role gate is off and the schema gate is the
 * user_is_authenticated security attribute (an empty ACL denies on this release).
 */
const recordFieldsGate = Acl({
    $id: Now.ID['acl-gql-record-fields'],
    type: 'graphql',
    name: 'recordFields',
    operation: 'execute',
    securityAttribute: 'user_is_authenticated',
    description: 'React Portal: record header fields GraphQL API (any authenticated user)',
});

GraphQLApi({
    $id: Now.ID['gql-record-fields'],
    name: 'React Portal record header fields',
    namespace: 'recordFields',
    requiresAuthentication: true,
    requiresAclAuthorization: true,
    requiresSncInternalRole: false,
    enforceAcl: [recordFieldsGate],
    schema: `
schema {
    query: Query
}

type Query {
    resolve(table: String!, portal: String, sysId: String): RecordFields
}

type RecordFields {
    table: String
    slots: [String]
    fields: [RecordField]
}

type RecordField {
    slot: String
    field: String
    label: String
    type: String
    refTable: String
    value: String
    displayValue: String
    sourceTable: String
    scope: String
    order: Int
    rowId: String
}
`,
    resolvers: [
        {
            $id: Now.ID['gql-record-fields-resolve'],
            name: 'recordFieldsResolve',
            paths: ['Query:resolve'],
            script: recordFieldsResolver,
        },
    ],
});
