import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'acl-build-asset-create': {
                        table: 'sys_security_acl'
                        id: '7581dafdf83f4aacbbf767d37e87282c'
                    }
                    'acl-build-asset-delete': {
                        table: 'sys_security_acl'
                        id: 'b3189e89b00a480696031b1135729bec'
                    }
                    'acl-build-asset-read': {
                        table: 'sys_security_acl'
                        id: '52c75446fa0148a4b4eee82e402f7973'
                    }
                    'acl-build-asset-write': {
                        table: 'sys_security_acl'
                        id: 'a645680168c44e31b9fe32f56be688fc'
                    }
                    'acl-build-create': {
                        table: 'sys_security_acl'
                        id: 'b81a135a56104bf2869c86049b840d52'
                    }
                    'acl-build-delete': {
                        table: 'sys_security_acl'
                        id: '32cabea3751c4e1ca7370ae85989eefc'
                    }
                    'acl-build-dep-create': {
                        table: 'sys_security_acl'
                        id: '0b5ea8c1491a4ae38adf8a5e34a89145'
                    }
                    'acl-build-dep-delete': {
                        table: 'sys_security_acl'
                        id: '086652282c414903b3618bcc0e1160f2'
                    }
                    'acl-build-dep-read': {
                        table: 'sys_security_acl'
                        id: '3d53050dcf76450b9c987a1465561a1b'
                    }
                    'acl-build-dep-write': {
                        table: 'sys_security_acl'
                        id: '19a741c62f7d4080848b1d9a4f6e1204'
                    }
                    'acl-build-read': {
                        table: 'sys_security_acl'
                        id: '39d6579701aa4e18b2a3364e680eadc2'
                    }
                    'acl-build-write': {
                        table: 'sys_security_acl'
                        id: '909bef3da11a4f5f9fe04eac0312236f'
                    }
                    'acl-component-create': {
                        table: 'sys_security_acl'
                        id: '4294fad8926541a69639f8a63553afaa'
                    }
                    'acl-component-delete': {
                        table: 'sys_security_acl'
                        id: 'a86e2fc5d50247dcb5635a5d60d3243d'
                    }
                    'acl-component-read': {
                        table: 'sys_security_acl'
                        id: '5580ad75cd004e7c90d8dbfc9710f56e'
                    }
                    'acl-component-write': {
                        table: 'sys_security_acl'
                        id: '081452fbbc5b4e06902085d8db092ef4'
                    }
                    'acl-execution-log-create': {
                        table: 'sys_security_acl'
                        id: '650c74a0983843c992449f76bbf47c39'
                    }
                    'acl-execution-log-delete': {
                        table: 'sys_security_acl'
                        id: '7fb117d138ed444ab6b388d9b74e0065'
                    }
                    'acl-execution-log-read': {
                        table: 'sys_security_acl'
                        id: '843a538cf2cf44c1a852b2e07cd7f9c9'
                    }
                    'acl-execution-log-write': {
                        table: 'sys_security_acl'
                        id: 'f93d47786d3e478b85faf4496af41f56'
                    }
                    'acl-page-create': {
                        table: 'sys_security_acl'
                        id: '08acd90e2ec8411dbef374c24df824e1'
                    }
                    'acl-page-delete': {
                        table: 'sys_security_acl'
                        id: 'a968f2f685684c3f9c333f4804ffddc1'
                    }
                    'acl-page-read': {
                        table: 'sys_security_acl'
                        id: '0a6eb7db3ce047a281cf08837a99f8a7'
                    }
                    'acl-page-write': {
                        table: 'sys_security_acl'
                        id: '14ce2fb94b2f4e9c9de7e77a61d54e6d'
                    }
                    'acl-placement-create': {
                        table: 'sys_security_acl'
                        id: '9be74f906e7245deb7b17e445ac123f1'
                    }
                    'acl-placement-delete': {
                        table: 'sys_security_acl'
                        id: 'd39aac86f7da40b59041e2f799839894'
                    }
                    'acl-placement-read': {
                        table: 'sys_security_acl'
                        id: 'f71c8ea2927947d1b72d7415a7dc78f6'
                    }
                    'acl-placement-write': {
                        table: 'sys_security_acl'
                        id: '81a2595e06584145a83dcf6977d8d896'
                    }
                    'acl-portal-create': {
                        table: 'sys_security_acl'
                        id: '97c1933e4e68477bbe7a7344b586f173'
                    }
                    'acl-portal-delete': {
                        table: 'sys_security_acl'
                        id: 'a7e9b3ad4bac4b538030eadf2f862d25'
                    }
                    'acl-portal-read': {
                        table: 'sys_security_acl'
                        id: '543b56590732464ca3cc70000041a909'
                    }
                    'acl-portal-write': {
                        table: 'sys_security_acl'
                        id: '8f9d5597c87e4136af8004bb92e14dd0'
                    }
                    'acl-release-create': {
                        table: 'sys_security_acl'
                        id: 'fac866c5dc3e400095bd95e31f9ea60f'
                    }
                    'acl-release-delete': {
                        table: 'sys_security_acl'
                        id: '28c7990032314b35bd6c82172125e949'
                    }
                    'acl-release-entry-create': {
                        table: 'sys_security_acl'
                        id: '2ef0535aee074fdea1410792a401f2a4'
                    }
                    'acl-release-entry-delete': {
                        table: 'sys_security_acl'
                        id: 'a204d4a2329a4f51b250c79eea17420a'
                    }
                    'acl-release-entry-read': {
                        table: 'sys_security_acl'
                        id: '1d63e1720194444d91a068533b24d940'
                    }
                    'acl-release-entry-write': {
                        table: 'sys_security_acl'
                        id: 'bf3ff613b9e44f8cb9eacbf62aec8735'
                    }
                    'acl-release-read': {
                        table: 'sys_security_acl'
                        id: '7d3f69ad5e5a493a93399fe64dd52e3e'
                    }
                    'acl-release-write': {
                        table: 'sys_security_acl'
                        id: '1c1b2b9df1c043b7bb1c4c9fd807cf08'
                    }
                    'acl-rest-runtime': {
                        table: 'sys_security_acl'
                        id: '40852c68c470488e8c77507d804a15bd'
                    }
                    'acl-rest-studio': {
                        table: 'sys_security_acl'
                        id: 'd9e4c6be8b3e4f32a83403e6464f2f55'
                    }
                    'acl-source-file-create-designer': {
                        table: 'sys_security_acl'
                        id: '0cd5ed8391d34a479c628b55994338f0'
                    }
                    'acl-source-file-create-developer': {
                        table: 'sys_security_acl'
                        id: '1beee74bfbf34fa9b464677744540146'
                    }
                    'acl-source-file-delete-designer': {
                        table: 'sys_security_acl'
                        id: 'f06a0ff7d27c4f52930231dd38ab2664'
                    }
                    'acl-source-file-delete-developer': {
                        table: 'sys_security_acl'
                        id: '2ad6f262425749079f4605043234cf32'
                    }
                    'acl-source-file-read-designer': {
                        table: 'sys_security_acl'
                        id: 'bfb72e9906af471092dccc2979f3be78'
                    }
                    'acl-source-file-read-developer': {
                        table: 'sys_security_acl'
                        id: 'fb6d306abdda4f2c97ba3481b26f56a6'
                    }
                    'acl-source-file-write-designer': {
                        table: 'sys_security_acl'
                        id: 'dcc7ac8b198844e58ac5dd036a6b4f4f'
                    }
                    'acl-source-file-write-developer': {
                        table: 'sys_security_acl'
                        id: '81e01cd299ba451d819a85cc90b7bcc1'
                    }
                    'acl-theme-create': {
                        table: 'sys_security_acl'
                        id: 'ca512051fd344ac09e8cbf0c92b82c5b'
                    }
                    'acl-theme-delete': {
                        table: 'sys_security_acl'
                        id: '3bc184270e8440ffbad686ba02cf3ab1'
                    }
                    'acl-theme-read': {
                        table: 'sys_security_acl'
                        id: 'b27901b4bc2b483c899b68e8764a9120'
                    }
                    'acl-theme-write': {
                        table: 'sys_security_acl'
                        id: 'be337baca61f417fb58ab93188b955d5'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: 'f4a9ca435690420bb66fd0a7f8a815c4'
                    }
                    'br-build-asset-scope': {
                        table: 'sys_script'
                        id: '2be3cce065714344bd3f8ae1e5f4ec79'
                    }
                    'br-build-dep-scope': {
                        table: 'sys_script'
                        id: 'a0e67b03c02842d891b1afc0db12e843'
                    }
                    'br-build-normalize': {
                        table: 'sys_script'
                        id: '6823b0c57ff94cd89754251e4bd443bf'
                    }
                    'br-compile-component': {
                        table: 'sys_script'
                        id: '6d0fe8f752da4bd994c83a8b0bbae9df'
                    }
                    'br-compile-source': {
                        table: 'sys_script'
                        id: 'c311300793e145ae95e3d70a2e81c56c'
                    }
                    'br-compile-theme': {
                        table: 'sys_script'
                        id: '3f6dc599ef1d46b48d22b3e9150a8e11'
                    }
                    'br-component-normalize': {
                        table: 'sys_script'
                        id: 'c62d4129b42246efaff66ab5275d874c'
                    }
                    'br-page-validate': {
                        table: 'sys_script'
                        id: '0962fbb02e4c466783c0db4daed48a24'
                    }
                    'br-placement-instance-style': {
                        table: 'sys_script'
                        id: 'c1597a53918c44a2a887276fc305e9e2'
                    }
                    'br-placement-validate': {
                        table: 'sys_script'
                        id: '76eaeabe8981495fae13ec2d8de6539b'
                    }
                    'br-portal-normalize': {
                        table: 'sys_script'
                        id: '5323e638b6ba4b92a294083a07a9c874'
                    }
                    'br-portal-single-default': {
                        table: 'sys_script'
                        id: '0cd9152d791643559bfc45bf40916dd5'
                    }
                    'br-release-entry-scope': {
                        table: 'sys_script'
                        id: '4ef6df1145db4d128e0187025c8d96ab'
                    }
                    'br-release-normalize': {
                        table: 'sys_script'
                        id: 'bb76a3802c1048259fc0d7c179fe30e4'
                    }
                    'br-reprocess-component': {
                        table: 'sys_script'
                        id: '90590485f4524e689fbc7610e1455261'
                    }
                    'br-reprocess-page': {
                        table: 'sys_script'
                        id: '53cd3400e5f0477cb9b420cef0629f41'
                    }
                    'br-reprocess-placement': {
                        table: 'sys_script'
                        id: '431405de9b0f4fb49b363f13353a323f'
                    }
                    'br-reprocess-portal': {
                        table: 'sys_script'
                        id: 'd17ea4ceaacf41c68e40d1018666a47b'
                    }
                    'br-reprocess-theme': {
                        table: 'sys_script'
                        id: '1540ee1208f44eb997530518c4adfe6c'
                    }
                    'br-source-track': {
                        table: 'sys_script'
                        id: '294153cc28a348c9813a827807f779b4'
                    }
                    'br-source-validate': {
                        table: 'sys_script'
                        id: '843686a20cbe486ab683ea0539b4bc8f'
                    }
                    'br-theme-normalize': {
                        table: 'sys_script'
                        id: 'cd319d8c8ee04a77901adc5ae12d300a'
                    }
                    'job-maintenance': {
                        table: 'sysauto_script'
                        id: '99a34f209f814f79be1f89afc0b46ea6'
                    }
                    'menu-react-portal': {
                        table: 'sys_app_application'
                        id: 'bf748e02a92242daad3fc0b8f04dd50a'
                    }
                    'module-all-components': {
                        table: 'sys_app_module'
                        id: '8d4cd177ee224f7b83734229ebfb2516'
                    }
                    'module-blocks': {
                        table: 'sys_app_module'
                        id: 'd9592f79fcec4e549bd0427f506f3434'
                    }
                    'module-builds': {
                        table: 'sys_app_module'
                        id: 'edb108de93e54eb2820fbb939a707778'
                    }
                    'module-execution-log': {
                        table: 'sys_app_module'
                        id: '17aafc70ae6242b8b089e2ddd50a613c'
                    }
                    'module-layouts': {
                        table: 'sys_app_module'
                        id: 'd956ee6836134b9080e15fa7864afa43'
                    }
                    'module-pages': {
                        table: 'sys_app_module'
                        id: '0d0b070684b648879cea8e00971b3ecd'
                    }
                    'module-placements': {
                        table: 'sys_app_module'
                        id: '0fa69c69e5a14c899966d426a04e6b3a'
                    }
                    'module-portals': {
                        table: 'sys_app_module'
                        id: '60c8307b91454c86918e3e14781fa880'
                    }
                    'module-primitives': {
                        table: 'sys_app_module'
                        id: 'd9d7e8c1c6c5452d82199ff800bbcceb'
                    }
                    'module-properties': {
                        table: 'sys_app_module'
                        id: 'f84744ffface4b58b766db6cff80332c'
                    }
                    'module-releases': {
                        table: 'sys_app_module'
                        id: '4ccef0ad8b9c4a57bfd615bd66be00c3'
                    }
                    'module-sep-admin': {
                        table: 'sys_app_module'
                        id: '613067293fa849a7b497338edaa111f1'
                    }
                    'module-sep-components': {
                        table: 'sys_app_module'
                        id: '65f61478956c4e60a952a290aff58baf'
                    }
                    'module-sep-delivery': {
                        table: 'sys_app_module'
                        id: 'cbebe3a230924039b7e126673d6e4203'
                    }
                    'module-sep-portals': {
                        table: 'sys_app_module'
                        id: '99fe950b434045109ced0890ba28168d'
                    }
                    'module-source-files': {
                        table: 'sys_app_module'
                        id: '03bb3e1db8bf4defa523dea73581e11a'
                    }
                    'module-themes': {
                        table: 'sys_app_module'
                        id: '8e8fe15740c54528b5990f37d06faba0'
                    }
                    'module-utilities': {
                        table: 'sys_app_module'
                        id: '27dba5732025437ab5088b7b42277c91'
                    }
                    'module-widgets': {
                        table: 'sys_app_module'
                        id: '008f68b729fd4445b4d7bf568e9ca04b'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '43b4ae1ecc7143fd86ea49f82c0050f1'
                    }
                    'prop-build-abandon': {
                        table: 'sys_properties'
                        id: 'd2405e9099584afa8e3d5cc80b540e63'
                    }
                    'prop-build-max-bytes': {
                        table: 'sys_properties'
                        id: '292781a2a4484d18a15fdeaddc7ab4d2'
                    }
                    'prop-build-retention': {
                        table: 'sys_properties'
                        id: 'b28c2593a2ca422da6bd75bdf9eb423b'
                    }
                    'prop-log-executions': {
                        table: 'sys_properties'
                        id: 'febb9abb16624b6c9968cb4edebf5224'
                    }
                    'prop-log-retention': {
                        table: 'sys_properties'
                        id: 'e3c24687bd5a480a8b24f5e364d75da1'
                    }
                    'prop-max-files': {
                        table: 'sys_properties'
                        id: '3451e5aa3ff242258677f196fb08789b'
                    }
                    'prop-public-welcome': {
                        table: 'sys_properties'
                        id: 'bf9a2b2a07bf42099e4fa33a5fab007b'
                    }
                    'prop-runtime-abi': {
                        table: 'sys_properties'
                        id: '248269eee91945d5a4d5bf19e2772753'
                    }
                    'prop-source-max-file': {
                        table: 'sys_properties'
                        id: '6b677239ad6c46a09679c424eb3b0976'
                    }
                    'rest-runtime': {
                        table: 'sys_ws_definition'
                        id: 'b126850f03724a08ae48bf8a75b8dd6a'
                    }
                    'rest-runtime-asset': {
                        table: 'sys_ws_operation'
                        id: '6e623eb5ebe34a828bb58963b9220672'
                    }
                    'rest-runtime-bootstrap': {
                        table: 'sys_ws_operation'
                        id: '6ea50810834c44a39d5ec0f70f6268e1'
                    }
                    'rest-runtime-execute': {
                        table: 'sys_ws_operation'
                        id: '0e6d99c88afb449e8b21ee7404855898'
                    }
                    'rest-runtime-initialize': {
                        table: 'sys_ws_operation'
                        id: '79db1f11b20d4906b1d36087ef3745c4'
                    }
                    'rest-runtime-messages': {
                        table: 'sys_ws_operation'
                        id: '6dcb418bd9c84d0e9153a8a98a3af024'
                    }
                    'rest-runtime-properties': {
                        table: 'sys_ws_operation'
                        id: '17e5684834b24b1b99264deee3f2fac2'
                    }
                    'rest-runtime-properties-names': {
                        table: 'sys_ws_query_parameter'
                        id: 'e89d4a5daeab4b2398fa5ee8601cf671'
                    }
                    'rest-runtime-properties-portal': {
                        table: 'sys_ws_query_parameter'
                        id: '5c5541b9ef65499d85b0e93256fdad09'
                    }
                    'rest-runtime-resolve': {
                        table: 'sys_ws_operation'
                        id: '9a9ee74b62d24dc2b02c5a92e7e9b3c2'
                    }
                    'rest-runtime-v1': {
                        table: 'sys_ws_version'
                        id: 'd10fc676c7fc4d36a3e8d52d5e26a408'
                    }
                    'rest-studio': {
                        table: 'sys_ws_definition'
                        id: '2f3cb475219b40a6acc6aa46e71b89b8'
                    }
                    'rest-studio-build-complete': {
                        table: 'sys_ws_operation'
                        id: '14973f90038d4af7b1b4f6f25ab055f2'
                    }
                    'rest-studio-build-preview': {
                        table: 'sys_ws_operation'
                        id: 'cc913ab2d2ec47ceaa9464e8359ea7f7'
                    }
                    'rest-studio-component-check': {
                        table: 'sys_ws_operation'
                        id: '1d78c004180b466280ef4e8355c9647f'
                    }
                    'rest-studio-component-create': {
                        table: 'sys_ws_operation'
                        id: '0b32481988664a949a6359794c1b07ae'
                    }
                    'rest-studio-component-project': {
                        table: 'sys_ws_operation'
                        id: '51bdc3ddf71d4bb7a2b5f8c65e6f265c'
                    }
                    'rest-studio-component-save': {
                        table: 'sys_ws_operation'
                        id: 'cf3b72bd3d484aa5bac07e2573ac4287'
                    }
                    'rest-studio-components': {
                        table: 'sys_ws_operation'
                        id: '1ca038e1821845bc993198aa4b1c29ec'
                    }
                    'rest-studio-design-target': {
                        table: 'sys_ws_operation'
                        id: 'e7acd31cea8e4f16a5f50708cd62b2ca'
                    }
                    'rest-studio-page-create': {
                        table: 'sys_ws_operation'
                        id: 'a6248644ecce4ef78a882f3f222152fd'
                    }
                    'rest-studio-page-delete': {
                        table: 'sys_ws_operation'
                        id: '1bfb0385ea0945acba8aea60b634e5c8'
                    }
                    'rest-studio-page-design': {
                        table: 'sys_ws_operation'
                        id: '780a22356b0b449f8ee0cbabf24c202d'
                    }
                    'rest-studio-page-update': {
                        table: 'sys_ws_operation'
                        id: 'e8c59d64aaee4a768949d4512328c395'
                    }
                    'rest-studio-placement-create': {
                        table: 'sys_ws_operation'
                        id: '5fe8938016234ab980a99486092d9ddf'
                    }
                    'rest-studio-placement-delete': {
                        table: 'sys_ws_operation'
                        id: '0f8af23756f84ba0a15826b39269d29e'
                    }
                    'rest-studio-placement-update': {
                        table: 'sys_ws_operation'
                        id: '1c065d0b8c1141b7a5640b084e253f0c'
                    }
                    'rest-studio-portal-design': {
                        table: 'sys_ws_operation'
                        id: '7451eaa5f30547f3ba95fb99f536bec0'
                    }
                    'rest-studio-portal-update': {
                        table: 'sys_ws_operation'
                        id: 'e256b7b4dbe842ae9d8c25ce10bec2a0'
                    }
                    'rest-studio-portals': {
                        table: 'sys_ws_operation'
                        id: '0cdcf9aeafaa445fa5c74d94a8e89b10'
                    }
                    'rest-studio-process': {
                        table: 'sys_ws_operation'
                        id: '8872a213362841558019422dbda5085c'
                    }
                    'rest-studio-theme-project': {
                        table: 'sys_ws_operation'
                        id: 'd53d2d9c782d4817b828c0fe34875839'
                    }
                    'rest-studio-theme-save': {
                        table: 'sys_ws_operation'
                        id: 'cda072ba902f4fa7a38ebaa4b6bd511c'
                    }
                    'rest-studio-themes': {
                        table: 'sys_ws_operation'
                        id: 'd7bd6fc43a314deaa8acc0072ae8410a'
                    }
                    'rest-studio-v1': {
                        table: 'sys_ws_version'
                        id: 'e86a826add0f4d26a4ba76930005fe24'
                    }
                    'script-include-react-portal': {
                        table: 'sys_script_include'
                        id: '165f45dcc2944475ab7448b10fe426c9'
                    }
                    src_server_api_http_ts: {
                        table: 'sys_module'
                        id: '5de04d7595244495bc88a19c8d1cee80'
                    }
                    'src_server_api_runtime-api_ts': {
                        table: 'sys_module'
                        id: '5a92d85b0c48456d9636b9d4a96a8b58'
                    }
                    'src_server_api_studio-api_ts': {
                        table: 'sys_module'
                        id: '10bcff2823324257807ab7329ad0aab2'
                    }
                    'src_server_automation_build-rules_ts': {
                        table: 'sys_module'
                        id: 'dc0823f2c2e04b1ea2bcdee4c6e8275d'
                    }
                    'src_server_automation_compile-rules_ts': {
                        table: 'sys_module'
                        id: '966e146d0bfe41f6b55dd34e84c50e53'
                    }
                    'src_server_automation_component-rules_ts': {
                        table: 'sys_module'
                        id: 'a5bdc71481f94b5390f42fa8d96a79c9'
                    }
                    src_server_automation_guards_ts: {
                        table: 'sys_module'
                        id: '2c6ee7bff4794fd4a6a2274fe56c5abd'
                    }
                    'src_server_automation_instance-style-rules_ts': {
                        table: 'sys_module'
                        id: '0a8505d7c90c40848ffe4c28141daf3e'
                    }
                    'src_server_automation_page-rules_ts': {
                        table: 'sys_module'
                        id: 'd30679e67b304ff69b3052c27e69ad3d'
                    }
                    'src_server_automation_portal-rules_ts': {
                        table: 'sys_module'
                        id: 'cb9daf2115be461dab05f3f1544e4aa9'
                    }
                    'src_server_automation_reprocess-rules_ts': {
                        table: 'sys_module'
                        id: '746117a850b04a0a8b34278053e69993'
                    }
                    'src_server_automation_source-file-rules_ts': {
                        table: 'sys_module'
                        id: '0da99972b8954341a38335447d8abba2'
                    }
                    'src_server_automation_theme-rules_ts': {
                        table: 'sys_module'
                        id: '29358250f0084eec8ee57d165b944414'
                    }
                    'src_server_build_build-service_ts': {
                        table: 'sys_module'
                        id: '49915d03a9634fd2b00ff45eb6965160'
                    }
                    'src_server_build_dependency-service_ts': {
                        table: 'sys_module'
                        id: '129b9e003f0943668d4e20c8029e1b86'
                    }
                    src_server_compiler_compiler_ts: {
                        table: 'sys_module'
                        id: 'cc60548c79ad47bab7da2b55749d78db'
                    }
                    src_server_compiler_vendor_sucrase_js: {
                        table: 'sys_module'
                        id: '74abcbbc1479414e8833c22babffd054'
                    }
                    src_server_compiler_vendor_tailwind_js: {
                        table: 'sys_module'
                        id: '10c615a8d3884fc39c6f7ba3540bc446'
                    }
                    'src_server_design_design-service_ts': {
                        table: 'sys_module'
                        id: '3b7b2fd8ad8442439ee73a308df35660'
                    }
                    'src_server_design_instance-style_ts': {
                        table: 'sys_module'
                        id: 'c53ee18ad83f481b81f895cdc23d760a'
                    }
                    'src_server_lib_css-safe_ts': {
                        table: 'sys_module'
                        id: '52cca34ae4ec497cb5103a15eadab06e'
                    }
                    src_server_lib_errors_ts: {
                        table: 'sys_module'
                        id: '189dccb60f084c5396dc2a521145d0ba'
                    }
                    src_server_lib_gr_ts: {
                        table: 'sys_module'
                        id: '3dc2759c1ec1488ba5f55b130a556da0'
                    }
                    src_server_lib_paths_ts: {
                        table: 'sys_module'
                        id: '167b743946854574b1c5729af38f6c64'
                    }
                    'src_server_lib_session-flags_ts': {
                        table: 'sys_module'
                        id: '104389a4d9214291b73b7cb4da938c82'
                    }
                    src_server_lib_tables_ts: {
                        table: 'sys_module'
                        id: '59b187e1485b4e0398625049f80e66a1'
                    }
                    src_server_lib_util_ts: {
                        table: 'sys_module'
                        id: '5701354c7d6340109c46bd7a0904d412'
                    }
                    src_server_maintenance_maintenance_ts: {
                        table: 'sys_module'
                        id: '4e03c481343447118f0f4fc5b62132b7'
                    }
                    'src_server_registry_block-regions_ts': {
                        table: 'sys_module'
                        id: '454ba62a7057480aa07703dbcc976ad1'
                    }
                    src_server_registry_catalog_ts: {
                        table: 'sys_module'
                        id: '6f53903ec1df4eb7afc1599aa0f51b81'
                    }
                    src_server_registry_registry_ts: {
                        table: 'sys_module'
                        id: '91726c31c83f4cdb8cab4700c931d685'
                    }
                    'src_server_release_release-service_ts': {
                        table: 'sys_module'
                        id: 'f033fed4bbbd4486b8d6a16a5c7a722a'
                    }
                    'src_server_runtime_asset-service_ts': {
                        table: 'sys_module'
                        id: 'ffd487c0b2be4018b2a15e3abc923e73'
                    }
                    'src_server_runtime_component-executor_ts': {
                        table: 'sys_module'
                        id: 'f6daba3ff7a544cd9150114ab7218084'
                    }
                    src_server_runtime_diagnostics_ts: {
                        table: 'sys_module'
                        id: '08de0edf05c04e1b83771a756e4df165'
                    }
                    'src_server_runtime_portal-service_ts': {
                        table: 'sys_module'
                        id: '9522dac3a3f549f99e73fd0ae51a74aa'
                    }
                    'src_server_runtime_server-api_ts': {
                        table: 'sys_module'
                        id: '06f529a050f54f1e9dd691c9c5e2cb21'
                    }
                    src_server_security_access_ts: {
                        table: 'sys_module'
                        id: 'b6221819fd20457eb3ae01e87f0b0ed7'
                    }
                    src_server_security_user_ts: {
                        table: 'sys_module'
                        id: 'd00cc69203d44f2585be6a1f782a220d'
                    }
                    src_server_source_owner_ts: {
                        table: 'sys_module'
                        id: '4301e04482774d87a08a36705a136dd3'
                    }
                    'src_server_source_project-files_ts': {
                        table: 'sys_module'
                        id: '71120d16a50b46ceb755ef6420eb1ccf'
                    }
                    'src_server_source_source-service_ts': {
                        table: 'sys_module'
                        id: 'a385f5d5659b4d56bcf422f85e93bc4b'
                    }
                }
                composite: [
                    {
                        table: 'sys_documentation'
                        id: '004aa82afebe44f7af80f84b136ef9d6'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '004e756a9a7744cfbe6eec4fcb39be75'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'slug'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '00d112976a4f4bbfa15ed3c8c8d4147b'
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '00fee8c2ecc64b0286b349edd91153d2'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'input_hash'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '010b425dcc73495d929654d47a9511e3'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '01d37c639e994c219de14ef004d9d76f'
                        key: {
                            sys_ui_section: {
                                id: '753810b5dde6481dbc947085132a637d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '12M.x_312987_portal_theme.x_312987_portal_build.theme'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '0217f7f32c624316975f815e2f643621'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'path'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '028a0b3895db4c5197ecf15c00438a47'
                        key: {
                            name: 'x_312987_portal_build_dep'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '02cd09ef5778401ba1218f0591c60aae'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '033b4dcf3103463fbe9da2d5fdebc020'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            value: 'utility'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '036fe0ea4c444cb0a686f614f057947a'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'placeable'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '03a0913331e14e2eb20dd41aba4fbbbe'
                        key: {
                            name: 'x_312987_portal_placement'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '04e615d63e0242f2af01274170a8541d'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '0508857bfec748bb8f5d082026791fb0'
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '051cd10974c34435859a3bc738351677'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'build'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '057a6346c6044d158c49690ff0bab7e7'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'layout_json'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '057de3520b2f4b7897bb0194a5599e9f'
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '062b8fe6b22e45aa947eb91d1c0b9d9e'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'state'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '0660d804734c4a3f88573fa8a92853c7'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            value: 'map'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0678d4f7a8e64f50821faed5d6cc3430'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'theme'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '06b26a19a3214f3896acc18761876d70'
                        key: {
                            name: 'x_312987_portal_release'
                            caption: 'Release'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '071f6d9139434459ade79d695c5f0c35'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '09315789c8484a81ac28aaa7d82b6911'
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '093265daf0884b59873b56263b90b0f7'
                        key: {
                            name: 'x_312987_portal_portal'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '094069f49a3a439c8874e8b8f4524fa2'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'tokens_json'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '09fedb3ce7234da8b5928656bea1f645'
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0a944fe1ccb1480c8e9b9940355c0b11'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'is_default'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0aaf7449d5d04e09942bd9f9d5b7df87'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'visibility_config_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0ad3bf3fc5bb4c8e97d768af734d216a'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'theme'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0aff4919eeff43a782cf1f374c58f61e'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'owner_key'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '0b3982ec329448bfbce96a85f56420dc'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'options_schema_json'
                            position: '18'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '0b4d019a59dc49109f80e5a0f7651f50'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'unique_id'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '0bac5cd0c7ff43c4904b3c92f50a79d7'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'exports_json'
                            position: '20'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: '0bcb18cd6f9446c9948693509ae51e26'
                        key: {
                            logical_table_name: 'x_312987_portal_source_file'
                            col_name_string: 'owner_key,path'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0ce473c560964b97ba8019801b419d68'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'package_version'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0d560d3389414cdda993e8991addac7d'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'theme'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '0e68b59a31034e218493d222eb4b0e39'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '0e8e441c07914a749e6bb7690e334121'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            value: 'css'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0ec937c588e84678829fcbcec8149bb6'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'encoding'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '0f0b796bef7d46bd8e9e0691bb7679b3'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'component'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '102404c50cb54a16a2f9425d43f06c93'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '10a2582f9a8b4a1dadae06a502789a3d'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'placement'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '10ae5dbd3aa5487da5ec87b707d6e003'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'default_options_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '10b4a7e1d67c4a6c8b45e80cc0c5305f'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'component'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '110ee07ad520465f9844f9b56b161025'
                        key: {
                            sys_security_acl: '086652282c414903b3618bcc0e1160f2'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1173cd6bad294ee6a3713b026aa2a81a'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'style_tokens_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '11d7e95fe8e14e2eb76afb5c8f9479ec'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'action'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '11db7e501c9a49f8a15b9eaa45139747'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'page'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '122c2db209774673bf4d1f03612e611e'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'description'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1289bba49b754f1faa53d9646005e6e7'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'content'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '13413dd563a84924930e00150393393e'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'visibility_config_json'
                            position: '15'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '13b18a0210184bf7a869cfcad6edfb9b'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '14f101b6e1c74eac8eb0187319b17514'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'needs_rebuild'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '16285f382a2349c58bcea36eaf1f9dc9'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                            value: 'failed'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '16317e35201548589bba662eb12e91c2'
                        key: {
                            sys_ui_section: {
                                id: 'bc19d47a62b840bf9521ec865d2c25bc'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Assets'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '12M.x_312987_portal_build.x_312987_portal_build_asset.build'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '164df4eb290449c2bdf0eadd38ba80e0'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'diagnostics_json'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '16632f86aceb47099c2df3e41ddf9dee'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'host_export'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '16e218296bbe4a94995531af4a4376ee'
                        key: {
                            endpoint: 'x_312987_portal_incident_manager.do'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '176636f729be40d4b392acd1062a581b'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'content_text'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1775c881975a45a490644c050108d63d'
                        key: {
                            sys_security_acl: 'fac866c5dc3e400095bd95e31f9ea60f'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '178f4dc3b194404292f8ce2e494272f4'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'parent'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '18ace13f89f54e9197ef24f186dd45e0'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'problems_json'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '18f8d840ddd2441db35df96b6ae4ecaf'
                        key: {
                            sys_ui_form: {
                                id: '49b2f355a8124a5cb40aed47582e959b'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '753810b5dde6481dbc947085132a637d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '192c011fc49c4519937faae7584cee75'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '19e86a5060d5491c9b9f736522c8b293'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'order'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '19fab2c986ff436fb3c86ae8172bd1b3'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'regions_json'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '1a1df7f61b4b4cc4a5089e647fcf56db'
                        key: {
                            name: 'x_312987_portal_component'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1a3aaf7314f34fbda1f71c09a7d8b938'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'settings_json'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1a4667160f75427db847bfcc5581f585'
                        key: {
                            sys_security_acl: '2ad6f262425749079f4605043234cf32'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '1a8534742bb141f69f4cf46fa7e67184'
                        key: {
                            name: 'x_312987_portal_execution_log'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1ad2190fa2664511a49765ee67ab15cb'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'portal'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1b8429910d014e0cbaf751c16de5431a'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1b9fa917e674405ca011994bd2c36526'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'client_script'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1bce3802c3c64c6a85fa39b1a80efec7'
                        key: {
                            sys_security_acl: 'a968f2f685684c3f9c333f4804ffddc1'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1bf2526e2b92495fbeb14a9b56ad064c'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'name'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1c365bfab0ff485c9db06cb1fb4e1e8a'
                        key: {
                            sys_security_acl: 'be337baca61f417fb58ab93188b955d5'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1c7220f97b044627b97d6600ba16aa80'
                        key: {
                            sys_security_acl: '28c7990032314b35bd6c82172125e949'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '1c8e1881f89841a29aaccee9a6a96c94'
                        key: {
                            name: 'x_312987_portal_source_file'
                            caption: 'Source File'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1d1087d589da4afc96f6b23494ad8c1a'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'description'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1d80949e9b2c459e990023124f9fe5bd'
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '1e012a3d7c7747c388da4340b0f3d998'
                        key: {
                            name: 'x_312987_portal_source_file'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1e0fb66b585d43c8b42f0e11fa6616e3'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'revision'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1e3c9aeab1e244ef82fafb2ada6d1182'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '1e625a67ad6f4571854af8a53c4eaf81'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'home_page'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '1f4c03414d4b4a50848d92b3adea5ed9'
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1f55d8795da246e68ccfcc9c56ccb01e'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'portal'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '1fadae7c833945de9eb82c39854fd006'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'key'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1fde28e3e2744288a9f71620492f1fc5'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'mime_type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '20626024692b48259ec4473ba5c046a9'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '209943e7bd764b3f95ebedf135bcf000'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'revision'
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
                        table: 'sys_security_acl_role'
                        id: '21484ac3f53948e2a4dca3a6e91ef553'
                        key: {
                            sys_security_acl: '0b5ea8c1491a4ae38adf8a5e34a89145'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '216273ce3c2e48739348d22ff30a77de'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'namespace'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '22fe43c14aed451cbce2587b687150c6'
                        key: {
                            sys_security_acl: 'bf3ff613b9e44f8cb9eacbf62aec8735'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_user_role_contains'
                        id: '244c12f542b44ff98803a0b1e4b8f01f'
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                            contains: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '24ddf50052f04c5eb1cc46bcb93def41'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'theme'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2547c119aeca4fa1bfaf8275a6b694d4'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'layout_override'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '25c99e3fef4445369f7cb2f8bfda1006'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'build'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '25ca4931fe424289b2af9a57afcea985'
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '2730d4775c734c2d9ce8e1fa18485ce5'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '27beb25a48bd4e0193926690596a7ece'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'mime_type'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                        key: {
                            name: 'x_312987_portal.admin'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '281e5db1453b495cab575721f4a07d8a'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'build'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '28aac522f058462dbcc1326f9319cd0b'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'theme'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '297f1082a8b445928b79b63439d74795'
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '2983a67f3e774961b7a085053372c39b'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            caption: 'Execution'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '29d2baca02e54afd84fc08dcbb1445a4'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'build'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '29e3f61a958f4a97a136856693175ddd'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'built_revision'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2af616dba7564eada67659181d169390'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'runtime_abi_version'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2b3b97edb395492ba37fb73fe1a0490e'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'processed_at'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2c1fab4da270455b86b4adf776fc6115'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'server_mode'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: '2cf18aa95b8247538c01b350aede8242'
                        key: {
                            logical_table_name: 'x_312987_portal_release_entry'
                            col_name_string: 'build'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '2d3aa916bfbf4b65846b11b9cde9ebdd'
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2d4e400e19814dcd866a2cd52388ae08'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'mime_type'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2d4eef51c4a846148866b5f8226a2840'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'mime_type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '2d940a38a2f4403b9ee31b76684f96f5'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                            value: 'relative'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '2db709988fd84f6aab28297bb01b936d'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'namespace'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2dd6d08898734f299122b8b8f7eca98c'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '2e71f906c5b54d109e50fb281ce13a65'
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711'
                                key: {
                                    name: 'x_312987_portal_component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '2e7e32b032a242e3b64e4f641e21b3d3'
                        key: {
                            sys_ui_form: {
                                id: '093265daf0884b59873b56263b90b0f7'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '2eb1aba11c3948559506c1fb43234e2c'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'stable_key'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '2ed9c42f798d4f4d841c31caab15eeb5'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2f0504cd4be54b7592a56c9665341de9'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'css'
                            position: '15'
                        }
                    },
                    {
                        table: 'sys_user_role_contains'
                        id: '2f2531b9b94f4cab9f3821015820706f'
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                            contains: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '2f8b38d33e5c4d4fa64802670dc4f6df'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '2f929cc75a114ddbb88c4aeaacea09f9'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'component'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '2fadc499f2a04fb9ba997a8a56c46af3'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'region'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '30310c059d6c40889f4e7885550cc676'
                        key: {
                            sys_security_acl: 'b81a135a56104bf2869c86049b840d52'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3055b4f9eb5047fa88430f21b9d4288e'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'instance_css'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3092f7b711a44e3cb6d1cadbc0473241'
                        key: {
                            sys_security_acl: '81a2595e06584145a83dcf6977d8d896'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '310a335112de4805a4154c87dfe1f881'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'route_pattern'
                            position: '3'
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
                        table: 'sys_ui_element'
                        id: '3167c388dca8405483c7a8283d258645'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '14'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '31a731d4424e43a8934101c4dc3bdc99'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            value: 'js'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '31f146a3ae9c45c99f1a332a753bef62'
                        key: {
                            sys_security_acl: '650c74a0983843c992449f76bbf47c39'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '325a70130d464742bdf1a28e89d19ec4'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                            value: 'theme'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '328026a41a7347fe92db421700bf7134'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'encoding'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '32a0b4baca034242975d73c3b2989eea'
                        key: {
                            sys_security_acl: 'bfb72e9906af471092dccc2979f3be78'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '32a14cb413ce4ebab2f63f830b5d2090'
                        key: {
                            sys_security_acl: 'ca512051fd344ac09e8cbf0c92b82c5b'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3392ea3f0f7e47baabbf4d54dff9ca95'
                        key: {
                            sys_security_acl: '909bef3da11a4f5f9fe04eac0312236f'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '33c526b355e14304bcaf3e6e104ed612'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'byte_length'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '33e7407d9afc48c4ba3e65192d040e91'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'component'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '345661bb019a4591898ac9fc854616ca'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'host_abi'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '345f1328bcbb4588a0b62a6c9fa34a0a'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '3499700d11a6405782ff326d9ce7bdfe'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'name'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '35b63b5b9b10434aaa71bad48adc48d6'
                        key: {
                            sys_security_acl: '843a538cf2cf44c1a852b2e07cd7f9c9'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '35c0033140ff4fadae652269599dc386'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'options_schema_json'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '36309b8852b840c18ea8c4ef95ba348c'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'title'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '364a0589fa7a48969b292e9b2d94fe34'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'built_revision'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3833de5277a54269910e6be7ca06671d'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'settings_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '38b88c08af1949138ec817f0a508745b'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'options_snapshot'
                            position: '18'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '38ccbe64bdb044f991ac77d6fc4e34e2'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'navigation_json'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '390ebcad723649669bb277bf4ce80082'
                        key: {
                            sys_security_acl: 'd39aac86f7da40b59041e2f799839894'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3938c9cf92eb4a61a2bcbe16a93a7de8'
                        key: {
                            sys_security_acl: 'a86e2fc5d50247dcb5635a5d60d3243d'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3939514612fb4bbebe0f2e9bc000a8b7'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                            value: 'component'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '39399a57851c4b88b60d1b883c8d8c1e'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'last_error'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '39a68c89c34a48fa8a5fa27e17a0385b'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'theme'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '39fc61d984b24ababc0e99d091f81831'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3a60e78eff384d52b60832479137477d'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3a85d8e4e1154c2cb126b79abd96f3d0'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'tailwind'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3a8cf1f138fd48eabcc9f0f28160d4f2'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '3aa5950bec1449f9b0c5059edeec155d'
                        key: {
                            name: 'x_312987_portal_theme'
                            caption: 'Theme'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3adcf1cc016f48e289dba5b47a5273bb'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'manifest_hash'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3b41b36966144ec394f5b5a697496700'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                            value: 'style'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3c2865e1d25f46fe8ea04919b9d1e6c0'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'layout_override'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3c5ceb6547844cb4bad9b3140e449d4e'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'correlation_id'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3c9732b945e94e828ae7c1de72e32e58'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'action'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '3cb3b70c48d5485aa6c36e19807648e6'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3cd29d3774634fdfa3ced2bf57568c98'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'content_hash'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3ced23968689409dba6dd91113ec1f2a'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'path'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3d2eedc2e9344bd0a03f89139ce3dc80'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'build'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '3d4c15c3d17740fbb639868d874dc90f'
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3d7d019598a54dd2bf58d90b549417bc'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'server_script'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '3d9838045c004288884749f581cc986a'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'server_mode'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '3df779a2f1934e04bb9c276573fd9e5b'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'manifest_json'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3f07f42156c94f3a95862bc415e56ce2'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'parent'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3f903851799c4f8b90965ca059d64167'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                            value: 'none'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '3fe1ed00f19244fda1ae89250ec68c8c'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '401aa69a0d504a69af58682b873d1a40'
                        key: {
                            sys_security_acl: 'ca512051fd344ac09e8cbf0c92b82c5b'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '406ff12a68cd42ebb0b5903683b300fb'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '40abd39639c74d388af02adff3cfe28f'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'access_config_json'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '411fb358845a40f980fa8f1fa63a2ebd'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '415238db5b8f4fb99e6589934580c043'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'manifest_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '42662b9711ec4d4a8e65364154425b86'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            caption: 'Release Entry'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '42b07042358441138107060e666a5ca5'
                        key: {
                            web_service_operation: '17e5684834b24b1b99264deee3f2fac2'
                            web_service_query_parameter: '5c5541b9ef65499d85b0e93256fdad09'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '42bd30efe29f4aea94d465e8ae546371'
                        key: {
                            sys_security_acl: 'be337baca61f417fb58ab93188b955d5'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '437c2e5ef3e348fe923d4bdffab0e673'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'content_hash'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '4453d78c00b84e52b7adb40c8e4cc09f'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'description'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '449c2cd360fe4ff4b048ae756a3d6bcb'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'resolved_entry'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '44dabfb9e8214bb2905560a030ae0afb'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '461652b8812d427793dabc5ecdaeb1a5'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'theme'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '470721a52f6441e0bb89df70abb4d47a'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                            value: 'error'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '47087543901248f6a8edd526f77e2166'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4747ef2bd96b4d2eb0b4143ed216e3e1'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '477b07640d114f70a1a8672ccf59c694'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'path'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '483ced20c38d4f4cabaa36705639fde0'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'tokens_json'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '484f54b364ef408cb9f0069d191913f8'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'correlation_id'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4851ffff65b64b1fbc56e28f633d74d6'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '488dfa51294049e5ab9c2df9561a2395'
                        key: {
                            name: 'x_312987_portal_build'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '48aa180a660d424a969cba2558faaa4e'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '48b1effba70048d98541b30a2802201b'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '494ee19e367e4b83824ee408a14c015c'
                        key: {
                            name: 'x_312987_portal_placement'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '49794e80708446f1963061cce45c44c3'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'component'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '498121458c57474b85b8a7e0cb99c6ba'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '498b8cbbbb6841a2a1cacc2fcc954c3f'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'hash'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '49b2f355a8124a5cb40aed47582e959b'
                        key: {
                            name: 'x_312987_portal_theme'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '49f3c8099db24ab9b3158c5d8cff00e4'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '49f82fc2ae7b4b23a110ef19f5e3bc35'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'region'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4a0b6128ac6c49de8f1e78abc7aa8561'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'placement'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '4a188dc5468141d19996273f25b47cb6'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'description'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4a57fd59143449229c4bf18a29e53e74'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'owner_key'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '4a65f3493e8041e0b8d418c471a0b750'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '4ad09794c0644fefb70be784dbdef667'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'processed_at'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '4afe0998318148208d30806cbdb51e96'
                        key: {
                            name: 'x_312987_portal_portal'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '4b7a07ac38184ebbadc79e922478b022'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'layout_override'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4ba763c754704c26a4831913416a715e'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4bbb3c8b6377498983ab498b989612df'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'is_default'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4c00e44c4576401b9ba17aec0711309d'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '4c8f09d1691e4a349d5cfbe7613b98da'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                            value: 'success'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4cb0142449944cdf97f793c4ca4da65c'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'instance_css'
                            position: '16'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4d04e78d436549bfad17053911cb0bd9'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'build'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '4d73417a0a064f009d445d6f836cb5a7'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'client_script'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4e54c08d3d674656992241f4f5351522'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'needs_rebuild'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '4e870c260234407b86fefecbbc4e7cec'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '4e8ddd578d5444d4a73d7bcbcf9e1711'
                        key: {
                            name: 'x_312987_portal_component'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '4f819739b97843f287ae6e3b5d10903f'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '4fc7babfe5ca4bcba792050db14dc2f3'
                        key: {
                            name: 'x_312987_portal_release'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '4fcc771cec2b4518a3ae26d56b8b1a22'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            value: 'other'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '502192f2d6a1479d8e0c39e1640296a1'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'name'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '508c842a5a3142b7b97c66634e582ebb'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'dependency_spec_json'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5096d6b4893a4f60b82a45d19ef2ddde'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'component'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '50e97394f57f4e2a84f489b1c4bdd910'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '51316b0956ce4ff08145c37cecfdc047'
                        key: {
                            sys_ui_form: {
                                id: '4fc7babfe5ca4bcba792050db14dc2f3'
                                key: {
                                    name: 'x_312987_portal_release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '695d39a55b224a10803955b5aeebdc65'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Entries'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
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
                        table: 'sys_ui_element'
                        id: '53649c9f86e5483d91d2b71756f45167'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'regions_json'
                            position: '17'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '537d3f7ce9d24efd9a8532511f1a94b9'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'owner_key'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '54076dd5ebaf4b5eaf7a3388c7d84fd6'
                        key: {
                            sys_ui_section: {
                                id: '81668d6febee46d19f6a654c24228910'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '12M.x_312987_portal_component.x_312987_portal_build.component'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '544d29ed0f66413c8810db5361a7a8c9'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'duration_ms'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '54b18dca0072436fb1dd325ea8814a50'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'theme'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '565aef3aab33444fa120a44b49580f7d'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'placement'
                            position: '8'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '5686d8f46c5d4415a03d93bfb1b54ef6'
                        key: {
                            name: 'x_312987_portal_placement'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '56ecac922fe443c2a3a5537be5fa7971'
                        key: {
                            sys_security_acl: '7fb117d138ed444ab6b388d9b74e0065'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '573e1442a1814c13ab048fcf6b3c23e4'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '57b32a3bbfeb459b917d49b09d197d63'
                        key: {
                            name: 'x_312987_portal_build_dep'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '58150f2ecce6431fae18523c85292543'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'sanitized_error'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '584151b422d1449dacfdef16f968a227'
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '589f2de236854cb4aac44769b0cc5e69'
                        key: {
                            sys_security_acl: 'dcc7ac8b198844e58ac5dd036a6b4f4f'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '58d121f89b104c91802ce6cdde5d27f7'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'server_script'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '59bf6da30bac4815be37182db811d3b2'
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5b89d5894dc14f5aa6374eb25bb6bf94'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'page'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '5bc6dba4799f401784f371c2fb702cde'
                        key: {
                            name: 'x_312987_portal_component'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5be2b8eb60e24808988922d4fd10b9bb'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'release'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '5bf1e8e5fc9649f1980b92bcfe09f545'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '5d513b91085349c5bc47070cdfbe2dfb'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'package_version'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5da3379369544d1b88ca0d9d674eec1c'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'portal'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5db377c63bff41edb947d7e9f74e4810'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'byte_length'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '5e1e8e204516460a9dbf448ab836569a'
                        key: {
                            sys_security_acl: '1beee74bfbf34fa9b464677744540146'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '6057bfcb33904de7bcc4c5d5748a5553'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'css'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '606d7b58a92f41a4a0732837178a2c1d'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'manifest_hash'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '609b46150a514b2c9432cda57d9f51a1'
                        key: {
                            sys_security_acl: '97c1933e4e68477bbe7a7344b586f173'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '60a8be68e6bb4e8296026c0026042411'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'compiler_version'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '60bf73fbc32943d7975fbfcbdf760c9b'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'region'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '60dc6993b5cc489db567aac94b78ffab'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'byte_length'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '60fbe69a0ea14a549a21bd75c9e14437'
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6168fa2bc43d4689a2ed66fa4422188f'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '6191feff51bb4c7db1373417b3e54aaa'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'default_layout'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '61bfba57e2784ce18437373e637f870d'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'hash'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '61cb4dbac5f44f8a840587ffb57f70f7'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'mime_type'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '6311786257744be1b9aab9d2019a205e'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'description'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6345a955695d408c8dd40b80c4b05b58'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            value: 'layout'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '640334f9dea948b3aed273f808316b99'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'theme'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '64149aa3dfa14e05ad74cbacf25a081e'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'default_options_json'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6443438d45384c73a3ae41dd9a11fa52'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'slug'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '64b97f7e3f72453ea08cf2ee1118a103'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'dependency_spec_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '64c0b19a76b24e36a511ca8b7e7f5463'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'problems_json'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '64c7b77497e94f438cc5b40a65294666'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'client_script'
                            position: '14'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '64dbbceb3cef4d2285a83f1e176e61c5'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'style_tokens_json'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '650f92fa8fbe43cca7b24eac2d9a0863'
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '65986f727c284bc5a48904b813be985e'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '65d599cd28bc44a09d60b0d4dbefa85f'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'revision'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '65eb9a3df5a44a3f9d047dc0ae396155'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '65f3be0c755e46f0833fa47bfeb82b31'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                            value: 'layout'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '6629cdb211db4591a4c70688914af15b'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'portal'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '6668c19f593a4174b89ab4b9b7fb274f'
                        key: {
                            sys_ui_form: {
                                id: '5bf1e8e5fc9649f1980b92bcfe09f545'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '669664ff244a47a8a79f17772f3cae89'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'classes'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '66b8f431d7e4463b82541346223c5ea6'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'owner_key'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '66db5d2360ac4c67b305d29ac33c7857'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'portal'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '66f1d3a33e1741519e9613754095daea'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'runtime_abi_version'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '675ede009a11436eb906384196b2f1ff'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'layout_json'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '67f326a6d5554137b175260cd236826b'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'content'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '67feb24a23fc4c0287a740bd3eed901c'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '685da8b27e984e89935ef87c7d991eec'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '68ffb767c80d40afa988fe9ffb4610fb'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'component'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '695965bd80004a37b3b545a99277c982'
                        key: {
                            sys_security_acl: 'a204d4a2329a4f51b250c79eea17420a'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '695d39a55b224a10803955b5aeebdc65'
                        key: {
                            name: 'x_312987_portal_release'
                            caption: 'Entries'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                        key: {
                            name: 'x_312987_portal_build'
                            caption: 'Build'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6ab6853317444744926973c6041f4374'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '6b4d719baaba49228f8ceb1330323c2e'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'manifest_hash'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6cb6d60ff6e64a36a840c027c7e0a814'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6d3fdbbb5e5b4fb2bcf200d6cf478777'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'script'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6d8b0486b4084764b8ed320e6390e021'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'source_revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '6d910b4ed3b8472b917a3912ad899694'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'roles'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6ddf1eee7d454a738713144341b663a8'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'source_snapshot_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '6efbaa44462e45b5a7d328827954d544'
                        key: {
                            name: 'x_312987_portal_portal'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6f7abf041a9c4255a7016a2547fd08bc'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'package_version'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '6ffaa891cbb54428b7110c03b7aa25ca'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'active'
                            position: '8'
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
                        table: 'sys_ui_section'
                        id: '7270bae8abb24f4192bc7a194c400135'
                        key: {
                            name: 'x_312987_portal_portal'
                            caption: 'Portal'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '732a386a36184e77997190c918a5b1a0'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '73f0bd1146be47a0944c9dd646f93aeb'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '74aba4ae0b2940419b6687dfeb50deee'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '74d510c01417484cb3fb0fa90c086913'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'default_layout'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '74edd62069ec4d589bd09b9e30bba411'
                        key: {
                            sys_security_acl: '3bc184270e8440ffbad686ba02cf3ab1'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '752e2a80149a41e2b349209291289abe'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'visibility_config_json'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '753810b5dde6481dbc947085132a637d'
                        key: {
                            name: 'x_312987_portal_theme'
                            caption: 'Build'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '762b9182146f4f9e991ea9764e93a96f'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'path'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '76539af56ae74d2c899c659bd12512fe'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '76fe1296b6764783aa8a970212111d15'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '774ee38f975342afb3f51f97a3066c52'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'portal'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '778e99bd850b435eb3202c571b5e4beb'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'placeable'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '77e18e71f67a401ea6395270421b0381'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'specifier'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '784834075793477386b68bd428dcc9ad'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '785ccf36b16e4cc78b7c3647e31a70ad'
                        key: {
                            sys_security_acl: '7581dafdf83f4aacbbf767d37e87282c'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '786b4d3297244724af7ad3465071100d'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'key'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: '78bc5ce5debb447ea2ecb3eb5c9bc2f0'
                        key: {
                            logical_table_name: 'x_312987_portal_placement'
                            col_name_string: 'owner_key,region,order'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '78e0bd7bae274255bab357dfd7a5eaf5'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '790a2954b2e24d35953227d142683245'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'compiler_version'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '79290bfb8105470d8f388b04a982fa94'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'stable_key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7982d9998e7e42c4b15b00e3176fe273'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'specifier'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '798443616a09413d8765219ac7d4b751'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7a1e2d444135497b849f7e143a62b0fb'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'exports_snapshot'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '7ad591d0d12b4055ba0d38bdf725ea45'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7b18ed4d1c99417db6419c9b2d597663'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'encoding'
                            value: 'base64'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '7bad5b9265b54166ab7a8923b2627cf5'
                        key: {
                            sys_security_acl: 'f93d47786d3e478b85faf4496af41f56'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '7c3a9a6c417241ce862dddadfd5143be'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'exports_snapshot'
                            position: '19'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '7c783052626a49689d1c89a98fdf0759'
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7ca42e13a7134d189c88389f04df39a1'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                            value: 'ready'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '7caca9137e724454ab68ba49328a0b44'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '7d24da03e7ad46ee89f86621b5c75eb8'
                        key: {
                            sys_security_acl: '1c1b2b9df1c043b7bb1c4c9fd807cf08'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7da84ea5642f4d49b98afa8b6ccd8c5c'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '7dcbe0cf665a4377a0a477b2d13bbfed'
                        key: {
                            name: 'x_312987_portal_release_entry'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '7ddb6e65d0f4426e8c2c279138976bea'
                        key: {
                            sys_ui_form: {
                                id: '488dfa51294049e5ab9c2df9561a2395'
                                key: {
                                    name: 'x_312987_portal_build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '7ed96064269a40d6a69a523c98deb992'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'home_page'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '7f126be6ee934df7a519334d5247bbe0'
                        key: {
                            sys_security_acl: 'b3189e89b00a480696031b1135729bec'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '7f35352ce3e24efda829f409da7901d7'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '7f5ec92ebbe546a1a2c67662974f5b4d'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'resolved_entry'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7f6e713169804927874db8117bac8ba4'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'stylesheet'
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
                        table: 'sys_documentation'
                        id: '803fc661a17f40549e77183152e57079'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'exports_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '80981d0a5467429ebc43dd7540e2a7fe'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'pending_revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '80cd006dec984a6fa86fd05b52ecaada'
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '81668d6febee46d19f6a654c24228910'
                        key: {
                            name: 'x_312987_portal_component'
                            caption: 'Build'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '818b1b6737a049a7a1c393c14b07ca04'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'resolved_entry'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '819a286d8df94fcda9e676f1937baba7'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'release'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '81a30ae236f54bca8d7a08013600ca4a'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'needs_rebuild'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '81a9f8546d504cf78bfb8633075a80cd'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            caption: 'Build Asset'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '81ad4df5d619405895a41e75b0a9ba5b'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'correlation_id'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '81be897775434d73bdaf3c03aa388b29'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'content'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '820f8bacaf7e4bd782d10fc2375f22dc'
                        key: {
                            name: 'x_312987_portal_page'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '821a36b68cb04adeb15ad26063d1df5a'
                        key: {
                            sys_ui_form: {
                                id: 'b41c2dc04029474f911335a9051a8e20'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '8261d3244abc46e3b132588c3b959838'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'encoding'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8265485db4c24bce89efc4eb48c01953'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'notes'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '829c1d4d5cb14c7e96daa017ec3b2681'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'component'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '82ba1cfae74d4037bd5c0fe10c0d0d10'
                        key: {
                            sys_security_acl: 'a645680168c44e31b9fe32f56be688fc'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '82d055dd29c84beca4e328dc0d6cdd5b'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'build'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '82f800d1494c439690c71cf535e1e0c9'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '83328297558c4872a0ceb433aec2844a'
                        key: {
                            sys_security_acl: '081452fbbc5b4e06902085d8db092ef4'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '836ae2725e564678a2494a010b29e3c4'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'owner_key'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '840b8701178f4a3486407a6f382ded21'
                        key: {
                            name: 'x_312987_portal_source_file'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '84aedf8ec42a4f5281115fe4a7c33420'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'notes'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '84da8d0f90c24ad4a7b370f9a89761ba'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '8593cd9149c441289cf91e4d5bd3d265'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'navigation_json'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '85b6281ab2994aa188eb44ad915a9360'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'diagnostics_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '86267e56241740c8ab93aec9c3e095b9'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'component'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '864bff858f8149f58ab534552a53f6c4'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            value: 'wasm'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '86d59248d50e4717bd1116870b445292'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '8758a8221584472fabf085adc8da9c8d'
                        key: {
                            name: 'x_312987_portal_component'
                            caption: 'Extra Files'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '882405ca1e4f495b9df7b0fe076aeee3'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'notes'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '884d598fa29f4dde83503d056d4e3da3'
                        key: {
                            name: 'x_312987_portal_release'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '88a3e6bfaf1e4de9a8e17dbe60a442f8'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'placement'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '88de2f9f9c4b403796825c088d21a3ba'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'key'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '89a18000174741b6808fa762ace91856'
                        key: {
                            name: 'x_312987_portal_theme'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '89c25a57893b47f4ab27685eb1b435f6'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'pending_revision'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '8b58db7ba55e4b2585585fe0e1bde36b'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '8b795c656a0d4261ab42df379ad85c47'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                            value: 'on-load'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8d02d0029e8f4e2983e008ce23d64eb5'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8d07bbcfd76541b3abbbe4f8bb944417'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'sanitized_error'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '8d144ae77c0e449f9e8d806104b0a571'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                            value: 'asset'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '8d44aac17dfb431fa187ff125e4eb363'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'source_revision'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '8d8a8181e9734e3e9f823f8cae1b62bc'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'diagnostics_json'
                            position: '16'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '8dbc940b576548d48330c985d5f42868'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'target'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8dc47b243031446aabd7b16b516400d4'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'script'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '8de377c1496e4a078986891ef5a1c39b'
                        key: {
                            name: 'x_312987_portal_execution_log'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '8efc9fa1e6044778a72ea39fc40bffd1'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'processed_by'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '8f5ccd56b994496c8bdb07f9f41e73f5'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'outcome'
                            position: '3'
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
                        table: 'sys_ui_element'
                        id: '900c5721ff8c41bca2da1131ad978707'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '905736279aec4025a390098b85a19842'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'duration_ms'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '907fc8f5312144b5bb0184c0e2ed2b45'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                            value: 'placement'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '914108b0ae5b483cbc5c5078c03fddb1'
                        key: {
                            name: 'x_312987_portal_page'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '916fbfec1457495fabfcf93031389885'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '918187f735bd453cb780cfb6a8da717d'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'placeable'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '91ed8ef20e4b49439a7da99fdc3b3871'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'is_default'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '924a99b0bdff4c17a0af36e1c2f08edf'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'namespace'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '933c3c290cc64dc396ce51cd0ba7278a'
                        deleted: true
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'visibility_config_json'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '93bd4f465c174c84a9ea3be202b43877'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'pending_revision'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '9400f464a61d46e2a89a4083bad2cdd3'
                        key: {
                            name: 'x_312987_portal_build'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9465e4a8c1684e22adcf9037b8d7e927'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: '948d706d21d04c7eb1a71fc5421b1fae'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '94db9ac8d0ce440b8c455328caee2e33'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'source_revision'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '95c1bef07ce1466193cf80db067e9cad'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'stylesheet'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: '95d2fd117a3049d396667ef0ccb34240'
                        key: {
                            name: 'x_312987_portal_component'
                            caption: 'Component'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '974c0e2ea4c14732847d57071a0def04'
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '98c621cf3ac246dfac99b61d7fca6372'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: '99829aba95104d96a00705160609fc38'
                        key: {
                            sys_ui_form: {
                                id: '03a0913331e14e2eb20dd41aba4fbbbe'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '99a26310765c4572a7c917be74aec683'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'tailwind'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '9a60db73a4684935a5677e282a16c02d'
                        key: {
                            sys_ui_section: {
                                id: '8758a8221584472fabf085adc8da9c8d'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Extra Files'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '12M.x_312987_portal_component.x_312987_portal_source_file.component'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '9b97cb62f33b43e2bd64298cfd5d1193'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'stylesheet'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9b9f26c9f07643cdb1fed32c2bab8e13'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'processed_at'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '9bc5b5922b044666b200b31731a7b044'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '9c589ec7721f4bc3b8d1534315f9ac7f'
                        key: {
                            sys_security_acl: '0cd5ed8391d34a479c628b55994338f0'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '9d2e58dcea3f4b6bad0aa08d9f3aa0e7'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                            value: 'denied'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: '9d3e36a895e9498082208485c83923e0'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '9dd014fc544545ac892a795d213ed112'
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9e89030b647f450584edf1ea5f4b776f'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'completed_at'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a04d3f803f614cab80561b7ac2d1a81a'
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a0564bb789dc4065a055c23fce92e25c'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'classes'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a126537454c5481abdb9010a411a814b'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'build'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'a16749a741784f66be2646d047b85c67'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'encoding'
                            value: 'utf8'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a1d745f24fae49ea999dff1c98d8cb05'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'host_export'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a2c45e967df845cca85a389cd1884a79'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'server_script'
                            position: '17'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a2e6000b12c64ea8ba8d8a853e84cccf'
                        key: {
                            sys_security_acl: '52c75446fa0148a4b4eee82e402f7973'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a39be4e0886b467598ce36c0c8c3363c'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a3cc0dbf24ef40e7ab0e2948106cb43c'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'requested_at'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a4057686c8464f598ea10109bfc7de26'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a496d2e8d31c4d5ebf9e2e20b04e9fd4'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'byte_length'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a4d2e96b5af84bb18d99acf38093cf24'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'runtime_abi_version'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'a64cd65f623f4d1799b7beab336f7624'
                        key: {
                            name: 'x_312987_portal_theme'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a657f048cbc246cb8cfc3b560f235f72'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'options_json'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a70bf3223cf047d6887950541f4c0452'
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a757efcd053e4a4ba880521ba5479da3'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'requested_at'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a75ced3a5240481bac726a55036604aa'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'title'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a77707ef02a745249c55f135366398f9'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'key'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a81364c137a643d687c81ad0b2509fdd'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'encoding'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a8269538d53a4019b649435ccb7628da'
                        key: {
                            sys_ui_section: {
                                id: '695d39a55b224a10803955b5aeebdc65'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Entries'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '12M.x_312987_portal_release.x_312987_portal_release_entry.release'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a83a2372dcb9461bb8cd70a17e39f86f'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a855f1667aaa4e8bac5dc68f02f760f5'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'target_build'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a8b5ad685f4240a9be0e759ccdaf828d'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'last_error'
                            position: '15'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'a94db737025742eea2e75459e04e144d'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'a95fd5834712431988a63e3d20e34fe3'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'host_abi'
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
                        table: 'sys_ui_form_section'
                        id: 'aa1a5a35eaeb456f958c2f8b6e23763f'
                        key: {
                            sys_ui_form: {
                                id: '820f8bacaf7e4bd782d10fc2375f22dc'
                                key: {
                                    name: 'x_312987_portal_page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_index'
                        id: 'aa8a4029daeb4bcdb149305e3fa12381'
                        key: {
                            logical_table_name: 'x_312987_portal_build_asset'
                            col_name_string: 'build,path'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'aa90cce60adf4728b5877f5897edac70'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'instance_css'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'aaa2081e06224abe849c478faaf3ed16'
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'aaff259f0aa54d43b45dbce14a6012d1'
                        key: {
                            name: 'x_312987_portal.designer'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ab23927d7df542e991919ac69f9728d5'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'abfccee6e5df45edbc29e71591c2c9e3'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'host_export'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'ac043c58ccb841bdbe9657f69d986fa6'
                        key: {
                            name: 'x_312987_portal_release_entry'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ac988673ed8543bf9cc6a91be44a5f93'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ac9e144763bb4fc99cad40017b087963'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'last_error'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ad2dd2d526f54d58be607d991385a39e'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'adb4285a502a4c31a0df4fb3db213aae'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'active'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'ae11d101a2fb473a80679cbe5ed60916'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ae2f16f3accd4f04a17a9fbfa44bc9df'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'source_snapshot_json'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'aea8882cb17c409693d103fa0c8094e7'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'script'
                            position: '16'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'aea9ac5535f147e7bab0dc6dc175c0ac'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'kind'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'aecb3b8fd1b94381a306ddbaacb96c20'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'sanitized_error'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'aee5c81b3d5f4484a0d02bf7bc948025'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'tokens_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'af10a92d95ca4d52bc65ad852ac7db12'
                        key: {
                            name: 'x_312987_portal.publisher'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'af8b88d120b24a60919ea06e98246f40'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'problems_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'afad0ef4e85447ab8f96686903a8594a'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'portal'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'afcb02a011e84f8f9a467a5702acb6e5'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'exports_json'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'b0724b34d13d4a7b860f2fbb9ee271b8'
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'b15caec56a794f8084cc7b9d3ec1ad68'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'host_abi'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b20aa2079bb14cf7908961ca5fa5530c'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'kind'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b226da593e7d4a7cad90085953fdc544'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'title'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'b2dbe53d8d6a425dae074d0fc0b216ca'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b38bc88707a948b8af80e8a9976da1d9'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'kind'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_ui_form'
                        id: 'b41c2dc04029474f911335a9051a8e20'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b4bb0cd4d16d47adbcc73b2c298dc4c5'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: 'b50a87b809b948a689c5d365385cfda7'
                        key: {
                            logical_table_name: 'x_312987_portal_execution_log'
                            col_name_string: 'correlation_id'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b629a6f9fba147e681acb5e7a1fd9172'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'duration_ms'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'b718428c938e49c9a18f54b34dadf70f'
                        key: {
                            name: 'x_312987_portal_build'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'b7429df95e9a489e929b6e8eae714db9'
                        key: {
                            sys_ui_form: {
                                id: '86d59248d50e4717bd1116870b445292'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b7773f6118dd47dd95eb30aaa1e79ded'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'dependency_spec_json'
                            position: '21'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'b7ee01445ab8409694ee2839289c0905'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b82aede02b024677944f6ff67594ff89'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'theme'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'b87a4c80983b4ede960e212180da2c30'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'server_mode'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: 'b9327800b78e420190266c1f9302d372'
                        key: {
                            logical_table_name: 'x_312987_portal_page'
                            col_name_string: 'portal,route_pattern'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'b96b5ea3fff7434882b86164f0d68c1b'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'default_options_json'
                            position: '19'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'b9bc4033d9c845fd8110c6dcf00b349e'
                        key: {
                            sys_ui_form: {
                                id: '948d706d21d04c7eb1a71fc5421b1fae'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'b9d19afdee1a4d44b678b8ab921f22b3'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'owner_key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ba234e57c19f40e7939a9070dcb70752'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'baf5119460ac4658aa44901b89266ebc'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'name'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'bb0d5f6b27044597a388e855e8154d92'
                        key: {
                            name: 'x_312987_portal.developer'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'bb5d20389efc459a847fd4c251b54daf'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'description'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: 'bbba98e4853240cfabf013ecb5a6662f'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            caption: 'Build Dependency'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: 'bc19d47a62b840bf9521ec865d2c25bc'
                        key: {
                            name: 'x_312987_portal_build'
                            caption: 'Assets'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'bcc41f4e5ae24cfeb53e34714ab6c63b'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'options_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'bd57bf0a3b3046b8bf199775a36b642f'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'unique_id'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'bdb44171feae4aa78c16a5ed14585838'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'portal'
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
                        table: 'sys_documentation'
                        id: 'becc73893f39499085616f672e3c9fb1'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'path'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'bf4bcef8178f486394c24fad4fd40be3'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '8'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'bf720a631fa84a58852613d684279ec3'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'processed_by'
                            position: '6'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'bfb600de83af4f019d21711750a44e4f'
                        key: {
                            name: 'x_312987_portal_source_file'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'bfbd8a72723b4683be4f8b673661daf3'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                            value: 'host'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'bfc2b3e565dc47b6a0b9f262186e4215'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'entry_type'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c02802f1d275464ead51d4887367af31'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'description'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'c175d4930e6e417db162230344a98191'
                        key: {
                            name: 'x_312987_portal_build_asset'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'c1bc4cf0aed04d709cf1da5cf9bb967c'
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'c1be0f227381410bb3025062cc2d7ea6'
                        key: {
                            sys_ui_form: {
                                id: '4fc7babfe5ca4bcba792050db14dc2f3'
                                key: {
                                    name: 'x_312987_portal_release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c255da48c61041ec958fd8376109e762'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c2ab9dacc38a4b1692e42fde37b8103f'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'NULL'
                            language: 'en'
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
                        table: 'sys_dictionary'
                        id: 'c3526e3bc8cd477a98c4d8a704f6ab9d'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'mime_type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c367a31d971645fbba70834c7898d76e'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'theme'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c373b0c5ae424ac6a33ebcfdbd85dce4'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'component'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c4d227a077d7434088c6a1d64eeb74ec'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'placement'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c5b571c573ab489e9291715c96bcdad8'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c6109724522c4b4e862d179284948dc3'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'specifier'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c69a00efdb61454c8a1956e11a110c64'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'layout_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c69e6db9f87b4c0fa2765949efbdd39a'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'input_hash'
                            position: '12'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c74b56e1641d4b35b582153d60b8b409'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'release'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: 'c764c9bf81c24b1fbcaa29a782d66074'
                        key: {
                            name: 'x_312987_portal_placement'
                            caption: 'Placement'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c76ea745acec48fe94f3c3e54f264f33'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'requested_at'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c8057657dafd42d68c2ae791620e4299'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c80cdd5ebf9e40289cf8277900038c3b'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'page'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_index'
                        id: 'c8ab825a08744b02ad1844dae6f34bd2'
                        key: {
                            logical_table_name: 'x_312987_portal_release_entry'
                            col_name_string: 'release,stable_key'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c8e5e0b1cb0a43aa8eff94fa22cb1abe'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'target_build'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c9114f708496435795fde7a98bd29b19'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c96fda851e8e4e6f953916fc15f08605'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'options_snapshot'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'c9c9add173634d64962916565baea4a8'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'source_revision'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c9f445b1acfe4ff6bfeb46b350739756'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'source_revision'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ca10bbeee86344e68586bc49a3909c4a'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'content_text'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ca1c8f8e46ca4fd89241e1aaa94e08cd'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                            value: 'package'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_user_role_contains'
                        id: 'ca374cd0a0114cc2a388f9dfbe72e136'
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                            contains: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'caee44061d024d75a6bd44194270df9c'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'path'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'cafb98b06dfd44efb022c5208afc3ac6'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'action'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'cb06e68a3c4f4da98605e3ce86006ed7'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            value: 'widget'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'cb2aa4f55ae14c77b3ee57a2f607997d'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'build'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'cb4cf00805d64f10b868d243d7b56ee4'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                            value: 'client'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'cb738c3bdfef428a8e1f78f64decef2e'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'server_mode'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cb9f6bfb87d84e279d22afe0602ec698'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'style_tokens_json'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'cc211e141b2d4aed99a5ce2dbca7fa44'
                        key: {
                            sys_security_acl: '14ce2fb94b2f4e9c9de7e77a61d54e6d'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ccf95a85a0b6440698319c59c6044778'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'owner_key'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'cd03346c3900436fa0a98ca785b5412a'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'build'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'cdab6c8e31124042b55a208a3c74b161'
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ce1744269aac40528e6a30f661828cfa'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'ce5a8422693845f7b264cc30a6cdbd00'
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cea99e1a78394269aee8d67a5ea2456f'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'build'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'cee154cfafe54ac0b0daddcf03be6d88'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'description'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'cf56f8bf3c74439bb49be1ea5d22978c'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'classes'
                            position: '14'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cf7fca82d4744c72903d064d9ef0c8bc'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'release'
                        }
                    },
                    {
                        table: 'sys_ui_section'
                        id: 'cfde6ccc55e249938a8122a8285015bf'
                        key: {
                            name: 'x_312987_portal_page'
                            caption: 'Page'
                            view: {
                                id: 'Default view'
                                key: {
                                    name: 'NULL'
                                }
                            }
                            sys_domain: 'global'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd09c0d127514480d8355ba80968caf25'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd0a19ad88170468f81931e72e268c9e2'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'built_revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'd0f25c1b3e414151a808fb4f6f1eed62'
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f'
                                key: {
                                    name: 'x_312987_portal_build_dep'
                                    caption: 'Build Dependency'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.end_split'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'd152a93bbeb944f3a941edc764a4868d'
                        key: {
                            sys_security_acl: '19a741c62f7d4080848b1d9a4f6e1204'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'd169260f5d0f4557a7ae7d0c49c4a4ac'
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711'
                                key: {
                                    name: 'x_312987_portal_component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '81668d6febee46d19f6a654c24228910'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd1c845f984d64ced8121c68ba3700181'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd209439035f44270ad3bc3fb07afe5b8'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd23e66ecad604ec082c5d816aeea7332'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'options_schema_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd30e20322a08455aa62f904d87c19e7b'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'component'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd31681c13773428cbed4e2be869ac770'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'component'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'd356a2b86d3d4b908a9c873fb8715d38'
                        key: {
                            sys_security_acl: '81e01cd299ba451d819a85cc90b7bcc1'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd37f621c832f4425b7caa2b9e9fd3eff'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd439d92fd4a246379b53158a00c48612'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'd561280b330e463aa7b6cff7fd127ab3'
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711'
                                key: {
                                    name: 'x_312987_portal_component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '8758a8221584472fabf085adc8da9c8d'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Extra Files'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'd5627f6b03e94243a5911c9821c084be'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'byte_length'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd6836193d83e40f69babc646c5221899'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'route_pattern'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'd68de0d4ea954e57ac7d53bd4c5a9e5f'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'active'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd87af397c79c45ef9045adc3120942b7'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'compiler_version'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'd8881bff0d1144a3a50946cd8d9af328'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'd8c39b1f710c489ea08cd5611c023896'
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b'
                                key: {
                                    name: 'x_312987_portal_execution_log'
                                    caption: 'Execution'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'release'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd8db610d351943cf9614cbc9d4da7f14'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'parent'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd8fec3984ebb4d1c944e6e7d348e70b7'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'entry_type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd9191cc6123c4784881bfdb2b586b393'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'description'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'd927308b53424c5da765ec2ea7a91b40'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'options_snapshot'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd9a70ad75d284b0fa762a40db6a13676'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'unique_id'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'da9d776d23e34ab48c33a731886e1706'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'source_revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'dac5ff081456476c9bacb9fc6c515d79'
                        key: {
                            name: 'x_312987_portal_release'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'db3f37665d46476293f1f27c8800380c'
                        key: {
                            name: 'x_312987_portal_theme'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'dc00ffb6c1a64d47830051771a235195'
                        key: {
                            sys_ui_form: {
                                id: '488dfa51294049e5ab9c2df9561a2395'
                                key: {
                                    name: 'x_312987_portal_build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: 'bc19d47a62b840bf9521ec865d2c25bc'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Assets'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'dc2e5bd25e624d9f90c56b822d5d283b'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'kind'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'dc34143253ee4e83adcc57ce419c2d15'
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'dcb4f34d5c324e769700d59f34c436fc'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'dd06c6ab05a5432c96359eefd1cda161'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'portal'
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
                    {
                        table: 'sys_ui_element'
                        id: 'dd4278b0261a40d8be4d2f76d292d179'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'hash'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'dde72d79f9ba45bb81e9ad7bf5d41f16'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            value: 'block'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'de14378012884fa9bd71a6a599f82f1e'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'de96ebd8fcd147b7b79091c1e47f7cdf'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'component'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'df3472753bcc479b9eef270a92251fc0'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'css'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'df3507a3aca7436fb46c115e6cc0335d'
                        key: {
                            web_service_operation: '17e5684834b24b1b99264deee3f2fac2'
                            web_service_query_parameter: 'e89d4a5daeab4b2398fa5ee8601cf671'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'df74b7bef3d541b7ab81496fb5249233'
                        key: {
                            sys_ui_form: {
                                id: '49b2f355a8124a5cb40aed47582e959b'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'dfd51494ff40410cb7f1f13fde861261'
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e03c898f3f724575ac59128b99ba7579'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'settings_json'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e05baa495d824c6d8225ae0cbee935c4'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'component'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e1099609c74d4059be3144df00ea3ad0'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'roles'
                            position: '5'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e11b5c022240488c9ad051f0ba5a6bb5'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'active'
                            position: '6'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e365fecb24f946aaa3d79dd9cdd364ab'
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70'
                                key: {
                                    name: 'x_312987_portal_release'
                                    caption: 'Release'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'revision'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'e38b1c393636406a9cea0973512b126c'
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e3b415d7b57d4d43bff3533dec7b16a1'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'roles'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e4206d779fae4782a2f048bc6f316dc7'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'manifest_json'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'e4b68fd03acd4351a6b98127a2ac08eb'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'server_mode'
                            value: 'on-demand'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e504299245374ba89ee71907724a81da'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'slug'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e6018a6dfa4d487893f3e0785e31e7dc'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'options_json'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: 'e62b9c85a5b446e093c4dc5db673dd16'
                        key: {
                            name: 'x_312987_portal_build_asset'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e7435f1c5b67427fa420a2bf1d39ffc6'
                        key: {
                            name: 'x_312987_portal_placement'
                            element: 'portal'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e774ad2f465b4228b9fddcb6c1f2f89f'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'access_config_json'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'e81d9b1c8bfd492c89cd6c66b7e97a8e'
                        key: {
                            sys_security_acl: 'a7e9b3ad4bac4b538030eadf2f862d25'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e85958c4379f4c71bfe75b1b8442653f'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'regions_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'e87d68aef7664093b259bf7278dd11a2'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e8d700ced3bd462a95c45d219961c080'
                        key: {
                            name: 'x_312987_portal_build_dep'
                            element: 'target_build'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e90ac525fb424ca48d72def2f448a7a1'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'e973639aef374715a6c111cd4638a429'
                        key: {
                            sys_security_acl: '9be74f906e7245deb7b17e445ac123f1'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'e97b7499b75e4e99a274bd97c23ba659'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.begin_split'
                            position: '0'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'ea06ed2c8a374f758461a229c7cb38c8'
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ea1c960173994f85a6540b897f1bbd65'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'route_pattern'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ea4b77bcc12945f19d9797876c183b7a'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'content_hash'
                            position: '10'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'eab5448ba8e74fffbf3fb6b7c6b19715'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'active'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ebf272027e02430a96ad8e4af31b4392'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'target'
                            value: 'server'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ec2418c2a4b44cbcbb49fab62ba84918'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'tailwind'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ec46e893cef6473b947614b294c3c5ad'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ec58678b589a45d0821d7ff4327c349b'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'placement'
                        }
                    },
                    {
                        table: 'sys_ui_form_section'
                        id: 'ec897c1b05f540b68c41e9a6be74f53b'
                        key: {
                            sys_ui_form: {
                                id: '1e012a3d7c7747c388da4340b0f3d998'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ed4419665500473db09747fb63170f16'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'completed_at'
                            position: '11'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'ed803f30f33c464f943172a4ee9df29c'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'release'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ee18b9d572d24ce59893ffc5228d0344'
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074'
                                key: {
                                    name: 'x_312987_portal_placement'
                                    caption: 'Placement'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'portal'
                            position: '1'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'ee2a642ea9e34b569f8782e9c9f8a40b'
                        key: {
                            sys_security_acl: '4294fad8926541a69639f8a63553afaa'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ee34b219436443d3bd3a4611e02cb6a0'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'state'
                            value: 'pending'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ee3af723171847039dd947435e25ae24'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'completed_at'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ee48da3439804d6287a0a3702ace6a86'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'input_hash'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ee4fc43abfb3451b966768f453f868f3'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'exports_snapshot'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ee7c520733d0432db3374a6ddc48753d'
                        key: {
                            name: 'x_312987_portal_component'
                            element: 'kind'
                            value: 'primitive'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'ef5cc1af22ab42e380de9152c19d2ce1'
                        key: {
                            sys_security_acl: 'f06a0ff7d27c4f52930231dd38ab2664'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f076bd24aae84c0d956d56cef7087db6'
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94'
                                key: {
                                    name: 'x_312987_portal_source_file'
                                    caption: 'Source File'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'content_text'
                            position: '13'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: 'f10f6874bca34f13a9acf5e58cb37ae1'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'outcome'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f1895631d3314cd6984b27ab17568beb'
                        key: {
                            sys_security_acl: 'fb6d306abdda4f2c97ba3481b26f56a6'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f1d84d1c6a224fb69bbfaf89d6cae4b8'
                        key: {
                            sys_security_acl: '8f9d5597c87e4136af8004bb92e14dd0'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f1ea2cebec9540d498dbb57133d0a8a7'
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12'
                                key: {
                                    name: 'x_312987_portal_build'
                                    caption: 'Build'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'source_snapshot_json'
                            position: '20'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f20ef94951444467a9c0791fe7ce0b0f'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'theme'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f2bd8c6ccaad40df8fdf8c0e57f2fa06'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'default_layout'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f2c10e7eeebb458ea41a0adb035b2b49'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '4'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f2cfaf22b5904ea9b98f9bf50e31af57'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'access_config_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f3cc4b1dd186465aa8a794602cbea856'
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d'
                                key: {
                                    name: 'x_312987_portal_theme'
                                    caption: 'Theme'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'active'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f42419f4b26d4dedbbbfa8323489632b'
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf'
                                key: {
                                    name: 'x_312987_portal_page'
                                    caption: 'Page'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'order'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f55475f34c6a4d799bb90c94fa9163e4'
                        key: {
                            name: 'x_312987_portal_build'
                            element: 'owner_key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f5b504acebf14d24a9631ca7a90cde14'
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135'
                                key: {
                                    name: 'x_312987_portal_portal'
                                    caption: 'Portal'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'home_page'
                            position: '9'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f5f460816eee44f981093136169fd324'
                        key: {
                            name: 'x_312987_portal_build_asset'
                            element: 'byte_length'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f601f013c8d640c0a9f8e488b9d4e471'
                        key: {
                            sys_security_acl: '32cabea3751c4e1ca7370ae85989eefc'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f63bca9e52374db2b16b3e874c1abe34'
                        key: {
                            name: 'x_312987_portal_page'
                            element: 'portal'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f6579262d72d4c7fb2906f588b6080c7'
                        key: {
                            sys_security_acl: '843a538cf2cf44c1a852b2e07cd7f9c9'
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12'
                                key: {
                                    name: 'x_312987_portal.publisher'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'f6fdb8285e84438b8fc07356a0ca6006'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'processed_by'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'f7693acb1b854eb5b10869bf8546817c'
                        key: {
                            sys_security_acl: '52c75446fa0148a4b4eee82e402f7973'
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92'
                                key: {
                                    name: 'x_312987_portal.developer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f7a7ef145dbb4b44a20303d27f84aadf'
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd'
                                key: {
                                    name: 'x_312987_portal_build_asset'
                                    caption: 'Build Asset'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'kind'
                            position: '3'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'f91e4b08e28240a78b6fc44d10d9d4d7'
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240'
                                key: {
                                    name: 'x_312987_portal_component'
                                    caption: 'Component'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: '.split'
                            position: '7'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'fa73c590f6f44759837babec7e0f8be2'
                        key: {
                            name: 'x_312987_portal_release'
                            element: 'revision'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'fa7785cab9c04e4fafae1acfbdc08c63'
                        key: {
                            sys_security_acl: '08acd90e2ec8411dbef374c24df824e1'
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1'
                                key: {
                                    name: 'x_312987_portal.designer'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'fae6b86bc01144498833e159503d7b67'
                        key: {
                            name: 'x_312987_portal_release_entry'
                            element: 'component'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'fc42ffe6d4db46ad8bf684f4ce3fc1d0'
                        key: {
                            name: 'x_312987_portal_source_file'
                            element: 'owner_key'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'fd20d8bd897d498aa19a55d727c82026'
                        key: {
                            name: 'x_312987_portal_execution_log'
                            element: 'build'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'fd686ac3fa3b44f7bfac842e0a910ce8'
                        key: {
                            name: 'x_312987_portal_page'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'fd76f1b916604ab9945294d22edb538e'
                        key: {
                            name: 'x_312987_portal_portal'
                            element: 'navigation_json'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_element'
                        id: 'ff26a2865f5c480eb73c41ca11e78e2b'
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86'
                                key: {
                                    name: 'x_312987_portal_release_entry'
                                    caption: 'Release Entry'
                                    view: {
                                        id: 'Default view'
                                        key: {
                                            name: 'NULL'
                                        }
                                    }
                                    sys_domain: 'global'
                                }
                            }
                            element: 'stable_key'
                            position: '2'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'ff7c5a64d3334148ac46737174dbfe7a'
                        key: {
                            sys_security_acl: '2ef0535aee074fdea1410792a401f2a4'
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b'
                                key: {
                                    name: 'x_312987_portal.admin'
                                }
                            }
                        }
                    },
                ]
            }
        }
    }
}
