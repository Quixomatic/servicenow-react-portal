import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: 'f4a9ca435690420bb66fd0a7f8a815c4'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '43b4ae1ecc7143fd86ea49f82c0050f1'
                    }
                }
                composite: [
                    {
                        table: 'sys_ui_page'
                        id: '16e218296bbe4a94995531af4a4376ee'
                        key: {
                            endpoint: 'x_312987_portal_incident_manager.do'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '20a184ca6305438d97ecb927ffe721fe'
                        key: {
                            name: 'x_312987_portal/main'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '31230aad63ce47e4bd58fd08fbfe2908'
                        key: {
                            name: 'x_312987_portal/main.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '52611dca0e0249519287fad822977128'
                        key: {
                            application_file: '16e218296bbe4a94995531af4a4376ee'
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '72494ad1504c440881435b92020d1eb5'
                        key: {
                            application_file: 'beabfd6834154c95998db2920bc50263'
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '7fe2ed0016954f118ae644565a49602d'
                        key: {
                            application_file: '20a184ca6305438d97ecb927ffe721fe'
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '8f930c66b90d4bb692b4f25e00965e99'
                        key: {
                            application_file: '31230aad63ce47e4bd58fd08fbfe2908'
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: 'a96ecfa85cec470db062f471b8facdba'
                        key: {
                            name: 'x_312987_portal_incident_manager.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'beabfd6834154c95998db2920bc50263'
                        key: {
                            name: 'x_312987_portal/vendor-react-dom--55da69dc'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'c30e8814f59b46a6bd5ca39741c1b446'
                        key: {
                            name: 'x_312987_portal/vendor-react-dom--55da69dc.js.map'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'dd11b8e3d1d141b8827552dcfede889a'
                        key: {
                            application_file: 'c30e8814f59b46a6bd5ca39741c1b446'
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba'
                        }
                    },
                ]
            }
        }
    }
}
