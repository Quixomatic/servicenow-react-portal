import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '4391b78850184a1dae9db676d159a970'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '8f15a97bf35f439da3868ce7a37e2d2c'
                    }
                    'script-include-react-portal-global': {
                        table: 'sys_script_include'
                        id: 'fc3a4657354e4897bbb9bfd18ead59b2'
                    }
                }
            }
        }
    }
}
