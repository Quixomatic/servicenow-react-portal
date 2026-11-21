import '@servicenow/sdk/global';

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'acl-build-asset-create': {
                        table: 'sys_security_acl';
                        id: '7581dafdf83f4aacbbf767d37e87282c';
                    };
                    'acl-build-asset-delete': {
                        table: 'sys_security_acl';
                        id: 'b3189e89b00a480696031b1135729bec';
                    };
                    'acl-build-asset-read': {
                        table: 'sys_security_acl';
                        id: '52c75446fa0148a4b4eee82e402f7973';
                    };
                    'acl-build-asset-write': {
                        table: 'sys_security_acl';
                        id: 'a645680168c44e31b9fe32f56be688fc';
                    };
                    'acl-build-create': {
                        table: 'sys_security_acl';
                        id: 'b81a135a56104bf2869c86049b840d52';
                    };
                    'acl-build-delete': {
                        table: 'sys_security_acl';
                        id: '32cabea3751c4e1ca7370ae85989eefc';
                    };
                    'acl-build-dep-create': {
                        table: 'sys_security_acl';
                        id: '0b5ea8c1491a4ae38adf8a5e34a89145';
                    };
                    'acl-build-dep-delete': {
                        table: 'sys_security_acl';
                        id: '086652282c414903b3618bcc0e1160f2';
                    };
                    'acl-build-dep-read': {
                        table: 'sys_security_acl';
                        id: '3d53050dcf76450b9c987a1465561a1b';
                    };
                    'acl-build-dep-write': {
                        table: 'sys_security_acl';
                        id: '19a741c62f7d4080848b1d9a4f6e1204';
                    };
                    'acl-build-read': {
                        table: 'sys_security_acl';
                        id: '39d6579701aa4e18b2a3364e680eadc2';
                    };
                    'acl-build-write': {
                        table: 'sys_security_acl';
                        id: '909bef3da11a4f5f9fe04eac0312236f';
                    };
                    'acl-component-create': {
                        table: 'sys_security_acl';
                        id: '4294fad8926541a69639f8a63553afaa';
                    };
                    'acl-component-delete': {
                        table: 'sys_security_acl';
                        id: 'a86e2fc5d50247dcb5635a5d60d3243d';
                    };
                    'acl-component-key-write': {
                        table: 'sys_security_acl';
                        id: '7bad199d4f024bde9134e9f5d5b81c50';
                    };
                    'acl-component-namespace-write': {
                        table: 'sys_security_acl';
                        id: 'e69a1f18309d42c49764de5d1428ccce';
                    };
                    'acl-component-read': {
                        table: 'sys_security_acl';
                        id: '5580ad75cd004e7c90d8dbfc9710f56e';
                    };
                    'acl-component-write': {
                        table: 'sys_security_acl';
                        id: '081452fbbc5b4e06902085d8db092ef4';
                    };
                    'acl-doc-collection-create': {
                        table: 'sys_security_acl';
                        id: '431b64c5716f457bbcd93a1f87d16d53';
                    };
                    'acl-doc-collection-delete': {
                        table: 'sys_security_acl';
                        id: '101358b57c33406691128e90d677953f';
                    };
                    'acl-doc-collection-read': {
                        table: 'sys_security_acl';
                        id: 'ea27ba84722b46308e8d6416b8e280a2';
                    };
                    'acl-doc-collection-write': {
                        table: 'sys_security_acl';
                        id: '1f6ad0afaacd4940a37dced18690164e';
                    };
                    'acl-doc-create': {
                        table: 'sys_security_acl';
                        id: 'f4775c8d06954c84897a98b6e86c37ee';
                    };
                    'acl-doc-delete': {
                        table: 'sys_security_acl';
                        id: '3570bfd8ae8c4359a74c82b0da632683';
                    };
                    'acl-doc-read': {
                        table: 'sys_security_acl';
                        id: 'e102b9603e484fda8fb263825246c3c8';
                    };
                    'acl-doc-section-create': {
                        table: 'sys_security_acl';
                        id: '0ae0f46bee4642d89169874bc3eac62e';
                    };
                    'acl-doc-section-delete': {
                        table: 'sys_security_acl';
                        id: 'a1526f5aee0d433aaabef12b7c40e7f9';
                    };
                    'acl-doc-section-read': {
                        table: 'sys_security_acl';
                        id: 'a3f237cf461b4761b23d8917a20d080f';
                    };
                    'acl-doc-section-write': {
                        table: 'sys_security_acl';
                        id: 'f0dd537bb0e2425499e8300d3e3a1bf2';
                    };
                    'acl-doc-write': {
                        table: 'sys_security_acl';
                        id: 'ad6897f0f6c34a61b69ee8e4add834f8';
                    };
                    'acl-execution-log-create': {
                        table: 'sys_security_acl';
                        id: '650c74a0983843c992449f76bbf47c39';
                    };
                    'acl-execution-log-delete': {
                        table: 'sys_security_acl';
                        id: '7fb117d138ed444ab6b388d9b74e0065';
                    };
                    'acl-execution-log-read': {
                        table: 'sys_security_acl';
                        id: '843a538cf2cf44c1a852b2e07cd7f9c9';
                    };
                    'acl-execution-log-write': {
                        table: 'sys_security_acl';
                        id: 'f93d47786d3e478b85faf4496af41f56';
                    };
                    'acl-gql-record-fields': {
                        table: 'sys_security_acl';
                        id: '6c70bac4c030416d9b05527ee5f8667c';
                    };
                    'acl-gql-view-rules': {
                        table: 'sys_security_acl';
                        id: 'a3a9eefac01e4a7c95d926259f282d82';
                    };
                    'acl-item-uc-create': {
                        table: 'sys_security_acl';
                        id: '1c4d2ed1ddf64ae29a2e98c7a714c5eb';
                    };
                    'acl-item-uc-delete': {
                        table: 'sys_security_acl';
                        id: 'b2d264b46ff449d3ab2eed11affd414a';
                    };
                    'acl-item-uc-no-create': {
                        table: 'sys_security_acl';
                        id: '4efcc57c4b1d4198bde8da6531bc327d';
                    };
                    'acl-item-uc-no-delete': {
                        table: 'sys_security_acl';
                        id: 'dd931d88774f4b27a71fcedabf62ac65';
                    };
                    'acl-item-uc-no-read': {
                        table: 'sys_security_acl';
                        id: '6d9a07a54ad04e5a8bc902b89bdacdf5';
                    };
                    'acl-item-uc-no-write': {
                        table: 'sys_security_acl';
                        id: '3c05001f9c9643aa87481c1dd2eda1ae';
                    };
                    'acl-item-uc-read': {
                        table: 'sys_security_acl';
                        id: '357bf49e0d104238956dcdeddbbeda85';
                    };
                    'acl-item-uc-write': {
                        table: 'sys_security_acl';
                        id: '7542b8f18b154a88aabacd239605fb0e';
                    };
                    'acl-menu-create': {
                        table: 'sys_security_acl';
                        id: 'e039a674fd6d411a912453227f97df8b';
                    };
                    'acl-menu-delete': {
                        table: 'sys_security_acl';
                        id: 'd4a45248c5294001be9078e3b46dcf1b';
                    };
                    'acl-menu-item-create': {
                        table: 'sys_security_acl';
                        id: 'b5c2628f5c384f4db46441cbbffc0605';
                    };
                    'acl-menu-item-delete': {
                        table: 'sys_security_acl';
                        id: '336a8bac1d0f4e74a394cf9ba177997d';
                    };
                    'acl-menu-item-read': {
                        table: 'sys_security_acl';
                        id: '90693bbc7bfd4da790de4ae8877da1b7';
                    };
                    'acl-menu-item-write': {
                        table: 'sys_security_acl';
                        id: '31adee037a7d499b84eeddcefaacaf57';
                    };
                    'acl-menu-read': {
                        table: 'sys_security_acl';
                        id: '2b94db142fa2440989ea98f6714e3382';
                    };
                    'acl-menu-write': {
                        table: 'sys_security_acl';
                        id: '2fe2a5f1dddc48d2b41ef58ccc91fd5e';
                    };
                    'acl-page-create': {
                        table: 'sys_security_acl';
                        id: '08acd90e2ec8411dbef374c24df824e1';
                    };
                    'acl-page-delete': {
                        table: 'sys_security_acl';
                        id: 'a968f2f685684c3f9c333f4804ffddc1';
                    };
                    'acl-page-read': {
                        table: 'sys_security_acl';
                        id: '0a6eb7db3ce047a281cf08837a99f8a7';
                    };
                    'acl-page-uc-create': {
                        table: 'sys_security_acl';
                        id: '3720d57546a84ea5b3d6dfa63541d89e';
                    };
                    'acl-page-uc-delete': {
                        table: 'sys_security_acl';
                        id: 'b2186a5a95764f56b5524eb4f7cb2af9';
                    };
                    'acl-page-uc-no-create': {
                        table: 'sys_security_acl';
                        id: '59eb7796fc114b869175f3103b1cb66c';
                    };
                    'acl-page-uc-no-delete': {
                        table: 'sys_security_acl';
                        id: '26e2747b9ae34adb9b5a54f6bfe6960f';
                    };
                    'acl-page-uc-no-read': {
                        table: 'sys_security_acl';
                        id: 'c1cf1de959324e448a1dd33708dc3e24';
                    };
                    'acl-page-uc-no-write': {
                        table: 'sys_security_acl';
                        id: '5ed8aed75f544fa096cedad920ff52e5';
                    };
                    'acl-page-uc-read': {
                        table: 'sys_security_acl';
                        id: '802c3065867e4ec59d389f09eb5a7201';
                    };
                    'acl-page-uc-write': {
                        table: 'sys_security_acl';
                        id: '85c324c768a84b7f8ab4ab84cac9b88e';
                    };
                    'acl-page-write': {
                        table: 'sys_security_acl';
                        id: '14ce2fb94b2f4e9c9de7e77a61d54e6d';
                    };
                    'acl-placement-create': {
                        table: 'sys_security_acl';
                        id: '9be74f906e7245deb7b17e445ac123f1';
                    };
                    'acl-placement-delete': {
                        table: 'sys_security_acl';
                        id: 'd39aac86f7da40b59041e2f799839894';
                    };
                    'acl-placement-read': {
                        table: 'sys_security_acl';
                        id: 'f71c8ea2927947d1b72d7415a7dc78f6';
                    };
                    'acl-placement-write': {
                        table: 'sys_security_acl';
                        id: '81a2595e06584145a83dcf6977d8d896';
                    };
                    'acl-portal-create': {
                        table: 'sys_security_acl';
                        id: '97c1933e4e68477bbe7a7344b586f173';
                    };
                    'acl-portal-delete': {
                        table: 'sys_security_acl';
                        id: 'a7e9b3ad4bac4b538030eadf2f862d25';
                    };
                    'acl-portal-read': {
                        table: 'sys_security_acl';
                        id: '543b56590732464ca3cc70000041a909';
                    };
                    'acl-portal-uc-create': {
                        table: 'sys_security_acl';
                        id: '48b2fcf706f94872bf4fe9c0ec2d8525';
                    };
                    'acl-portal-uc-delete': {
                        table: 'sys_security_acl';
                        id: '02e4cb5531bc4df5a252409229779238';
                    };
                    'acl-portal-uc-no-create': {
                        table: 'sys_security_acl';
                        id: 'ba60e358ace5472eaed179973fff36f8';
                    };
                    'acl-portal-uc-no-delete': {
                        table: 'sys_security_acl';
                        id: 'bd4470dbb8204073af688550bd4056d2';
                    };
                    'acl-portal-uc-no-read': {
                        table: 'sys_security_acl';
                        id: '0acab0516d474892ba4fb049fbc63f74';
                    };
                    'acl-portal-uc-no-write': {
                        table: 'sys_security_acl';
                        id: '0f2b57beef0f486bbfdbe40994136ae7';
                    };
                    'acl-portal-uc-read': {
                        table: 'sys_security_acl';
                        id: 'f464aadfb0a64eef85771a5fbeab53a3';
                    };
                    'acl-portal-uc-write': {
                        table: 'sys_security_acl';
                        id: '34a507dcd5214ccda88c18a7f2778a18';
                    };
                    'acl-portal-write': {
                        table: 'sys_security_acl';
                        id: '8f9d5597c87e4136af8004bb92e14dd0';
                    };
                    'acl-record-field-create': {
                        table: 'sys_security_acl';
                        id: 'b9940744220d46b28c6ecffdf791048b';
                    };
                    'acl-record-field-delete': {
                        table: 'sys_security_acl';
                        id: '180bed6bcf084d62b48d01893e78ab08';
                    };
                    'acl-record-field-read': {
                        table: 'sys_security_acl';
                        id: '0222346c090743c8b016218d6a7f2c74';
                    };
                    'acl-record-field-write': {
                        table: 'sys_security_acl';
                        id: '22b5d1b3a76a4ddbbab908bf5f3aa85d';
                    };
                    'acl-release-create': {
                        table: 'sys_security_acl';
                        id: 'fac866c5dc3e400095bd95e31f9ea60f';
                    };
                    'acl-release-delete': {
                        table: 'sys_security_acl';
                        id: '28c7990032314b35bd6c82172125e949';
                    };
                    'acl-release-entry-create': {
                        table: 'sys_security_acl';
                        id: '2ef0535aee074fdea1410792a401f2a4';
                    };
                    'acl-release-entry-delete': {
                        table: 'sys_security_acl';
                        id: 'a204d4a2329a4f51b250c79eea17420a';
                    };
                    'acl-release-entry-read': {
                        table: 'sys_security_acl';
                        id: '1d63e1720194444d91a068533b24d940';
                    };
                    'acl-release-entry-write': {
                        table: 'sys_security_acl';
                        id: 'bf3ff613b9e44f8cb9eacbf62aec8735';
                    };
                    'acl-release-read': {
                        table: 'sys_security_acl';
                        id: '7d3f69ad5e5a493a93399fe64dd52e3e';
                    };
                    'acl-release-write': {
                        table: 'sys_security_acl';
                        id: '1c1b2b9df1c043b7bb1c4c9fd807cf08';
                    };
                    'acl-rest-runtime': {
                        table: 'sys_security_acl';
                        id: '40852c68c470488e8c77507d804a15bd';
                    };
                    'acl-rest-studio': {
                        table: 'sys_security_acl';
                        id: 'd9e4c6be8b3e4f32a83403e6464f2f55';
                    };
                    'acl-source-file-create-designer': {
                        table: 'sys_security_acl';
                        id: '0cd5ed8391d34a479c628b55994338f0';
                    };
                    'acl-source-file-create-developer': {
                        table: 'sys_security_acl';
                        id: '1beee74bfbf34fa9b464677744540146';
                    };
                    'acl-source-file-delete-designer': {
                        table: 'sys_security_acl';
                        id: 'f06a0ff7d27c4f52930231dd38ab2664';
                    };
                    'acl-source-file-delete-developer': {
                        table: 'sys_security_acl';
                        id: '2ad6f262425749079f4605043234cf32';
                    };
                    'acl-source-file-read-designer': {
                        table: 'sys_security_acl';
                        id: 'bfb72e9906af471092dccc2979f3be78';
                    };
                    'acl-source-file-read-developer': {
                        table: 'sys_security_acl';
                        id: 'fb6d306abdda4f2c97ba3481b26f56a6';
                    };
                    'acl-source-file-write-designer': {
                        table: 'sys_security_acl';
                        id: 'dcc7ac8b198844e58ac5dd036a6b4f4f';
                    };
                    'acl-source-file-write-developer': {
                        table: 'sys_security_acl';
                        id: '81e01cd299ba451d819a85cc90b7bcc1';
                    };
                    'acl-theme-create': {
                        table: 'sys_security_acl';
                        id: 'ca512051fd344ac09e8cbf0c92b82c5b';
                    };
                    'acl-theme-delete': {
                        table: 'sys_security_acl';
                        id: '3bc184270e8440ffbad686ba02cf3ab1';
                    };
                    'acl-theme-read': {
                        table: 'sys_security_acl';
                        id: 'b27901b4bc2b483c899b68e8764a9120';
                    };
                    'acl-theme-write': {
                        table: 'sys_security_acl';
                        id: 'be337baca61f417fb58ab93188b955d5';
                    };
                    'acl-view-answer-create': {
                        table: 'sys_security_acl';
                        id: 'ec216a92934d487f951c1f108d844c43';
                    };
                    'acl-view-answer-delete': {
                        table: 'sys_security_acl';
                        id: '854c6b8f40674111bba541c27029d15d';
                    };
                    'acl-view-answer-read': {
                        table: 'sys_security_acl';
                        id: '56171848f0404c2b906ea38420790cae';
                    };
                    'acl-view-answer-read-fields': {
                        table: 'sys_security_acl';
                        id: '29d434a469814a44bb634e7d6235e1ef';
                    };
                    'acl-view-answer-write': {
                        table: 'sys_security_acl';
                        id: '3a6b630555304dba83e10b607bb0fb13';
                    };
                    'acl-view-rule-create': {
                        table: 'sys_security_acl';
                        id: '025e0a20832641e5a971fa21b820f8ea';
                    };
                    'acl-view-rule-delete': {
                        table: 'sys_security_acl';
                        id: 'e99f9ceced3f41c994d4c2e160a98944';
                    };
                    'acl-view-rule-read': {
                        table: 'sys_security_acl';
                        id: '49ce7530de4849948abbe5219a3a648c';
                    };
                    'acl-view-rule-script-write': {
                        table: 'sys_security_acl';
                        id: '49dc813b70924468acaf4df132354e61';
                    };
                    'acl-view-rule-write': {
                        table: 'sys_security_acl';
                        id: '4ca60a8bea8b490fa923cdf6e924d388';
                    };
                    'acl-vrule-uc-create': {
                        table: 'sys_security_acl';
                        id: 'e8b2a1f684274c60a0751f4e4e3ba4a6';
                    };
                    'acl-vrule-uc-delete': {
                        table: 'sys_security_acl';
                        id: '16b7ac2616fb484d850b6a1ccb0b661f';
                    };
                    'acl-vrule-uc-no-create': {
                        table: 'sys_security_acl';
                        id: '5544cc1b45cb44cfa07c54a57c76499a';
                    };
                    'acl-vrule-uc-no-delete': {
                        table: 'sys_security_acl';
                        id: '79be2e86119144a3b0af10affdac1374';
                    };
                    'acl-vrule-uc-no-read': {
                        table: 'sys_security_acl';
                        id: 'd9201a732f5c4208bf96da0b1d0ecd2e';
                    };
                    'acl-vrule-uc-no-write': {
                        table: 'sys_security_acl';
                        id: '453f4661479a4c23a3422ab787569dec';
                    };
                    'acl-vrule-uc-read': {
                        table: 'sys_security_acl';
                        id: '8c0871c1327d4f3c8155b5c0cb00b435';
                    };
                    'acl-vrule-uc-write': {
                        table: 'sys_security_acl';
                        id: '924854e1b6b84ed9add817f06e133f01';
                    };
                    bom_json: {
                        table: 'sys_module';
                        id: 'f4a9ca435690420bb66fd0a7f8a815c4';
                    };
                    'br-build-asset-scope': {
                        table: 'sys_script';
                        id: '2be3cce065714344bd3f8ae1e5f4ec79';
                    };
                    'br-build-dep-scope': {
                        table: 'sys_script';
                        id: 'a0e67b03c02842d891b1afc0db12e843';
                    };
                    'br-build-normalize': {
                        table: 'sys_script';
                        id: '6823b0c57ff94cd89754251e4bd443bf';
                    };
                    'br-compile-component': {
                        table: 'sys_script';
                        id: '6d0fe8f752da4bd994c83a8b0bbae9df';
                    };
                    'br-compile-source': {
                        table: 'sys_script';
                        id: 'c311300793e145ae95e3d70a2e81c56c';
                    };
                    'br-compile-theme': {
                        table: 'sys_script';
                        id: '3f6dc599ef1d46b48d22b3e9150a8e11';
                    };
                    'br-component-lock-identity': {
                        table: 'sys_script';
                        id: 'fee9bdefd5d74ff8b3b3012079cf1359';
                    };
                    'br-component-normalize': {
                        table: 'sys_script';
                        id: 'c62d4129b42246efaff66ab5275d874c';
                    };
                    'br-doc-collection-from-section': {
                        table: 'sys_script';
                        id: '04eacb64553f4f1a8df05168814cd4f3';
                    };
                    'br-menu-item-scripts': {
                        table: 'sys_script';
                        id: 'a71074a5cf4a46109c6f0622609f8571';
                    };
                    'br-menu-item-validate': {
                        table: 'sys_script';
                        id: '734abc1e05574273ad5c9c505cf1b941';
                    };
                    'br-menu-validate': {
                        table: 'sys_script';
                        id: '7a24f9d55f7847a9b27be530c401ae9f';
                    };
                    'br-page-validate': {
                        table: 'sys_script';
                        id: '0962fbb02e4c466783c0db4daed48a24';
                    };
                    'br-placement-instance-style': {
                        table: 'sys_script';
                        id: 'c1597a53918c44a2a887276fc305e9e2';
                    };
                    'br-placement-validate': {
                        table: 'sys_script';
                        id: '76eaeabe8981495fae13ec2d8de6539b';
                    };
                    'br-portal-normalize': {
                        table: 'sys_script';
                        id: '5323e638b6ba4b92a294083a07a9c874';
                    };
                    'br-portal-single-default': {
                        table: 'sys_script';
                        id: '0cd9152d791643559bfc45bf40916dd5';
                    };
                    'br-release-entry-scope': {
                        table: 'sys_script';
                        id: '4ef6df1145db4d128e0187025c8d96ab';
                    };
                    'br-release-normalize': {
                        table: 'sys_script';
                        id: 'bb76a3802c1048259fc0d7c179fe30e4';
                    };
                    'br-reprocess-component': {
                        table: 'sys_script';
                        id: '90590485f4524e689fbc7610e1455261';
                    };
                    'br-reprocess-menu': {
                        table: 'sys_script';
                        id: '02643d06743a4d44ac9762f4ca4fe136';
                    };
                    'br-reprocess-menu-item': {
                        table: 'sys_script';
                        id: '01fb7ee0028b4d8ebc0a6951126d5525';
                    };
                    'br-reprocess-page': {
                        table: 'sys_script';
                        id: '53cd3400e5f0477cb9b420cef0629f41';
                    };
                    'br-reprocess-placement': {
                        table: 'sys_script';
                        id: '431405de9b0f4fb49b363f13353a323f';
                    };
                    'br-reprocess-portal': {
                        table: 'sys_script';
                        id: 'd17ea4ceaacf41c68e40d1018666a47b';
                    };
                    'br-reprocess-theme': {
                        table: 'sys_script';
                        id: '1540ee1208f44eb997530518c4adfe6c';
                    };
                    'br-source-track': {
                        table: 'sys_script';
                        id: '294153cc28a348c9813a827807f779b4';
                    };
                    'br-source-validate': {
                        table: 'sys_script';
                        id: '843686a20cbe486ab683ea0539b4bc8f';
                    };
                    'br-theme-normalize': {
                        table: 'sys_script';
                        id: 'cd319d8c8ee04a77901adc5ae12d300a';
                    };
                    'br-view-rule-sync-view': {
                        table: 'sys_script';
                        id: 'b12c3cf1b4014217be38e17d6eaeef37';
                    };
                    'csp-graphql-get-arguments': {
                        table: 'sys_scope_privilege';
                        id: '01fec037f8b54528b025276fcdf475b3';
                    };
                    'csp-react-portal-global': {
                        table: 'sys_scope_privilege';
                        id: '03bbad5f83205310e8fbc9a6feaad3e8';
                    };
                    'csp-read-sys-ui-list': {
                        table: 'sys_scope_privilege';
                        id: '8149c4749c7c44bcbc64bb3a13daf72c';
                    };
                    'csp-read-sys-ui-section': {
                        table: 'sys_scope_privilege';
                        id: '3c5f3eb8bbd24b41a00696921d9ff111';
                    };
                    'csp-read-sys-ui-view': {
                        table: 'sys_scope_privilege';
                        id: 'c661440300974aa88f888573c0f2ec8c';
                    };
                    'event-portal-sheet-compile': {
                        table: 'sysevent_register';
                        id: '57064dce93f9474d941b62dc417631ec';
                    };
                    'formatter-menu-icon-picker': {
                        table: 'sys_ui_formatter';
                        id: 'f8e1398f05a540fdb8bb39d111d911bb';
                    };
                    'gql-record-fields': {
                        table: 'sys_graphql_schema';
                        id: '023ceb6d6e4146d99e92171cac9e8d25';
                    };
                    'gql-record-fields-resolve': {
                        table: 'sys_graphql_resolver';
                        id: 'f3cd29e6fbb5483d81cbfbd224320295';
                    };
                    'gql-view-rules': {
                        table: 'sys_graphql_schema';
                        id: 'd36c95123843458b9f52837c3f10b0f3';
                    };
                    'gql-view-rules-explain': {
                        table: 'sys_graphql_resolver';
                        id: 'ce4bb6b34876407aa23f5bc148c7fbf9';
                    };
                    'gql-view-rules-resolve': {
                        table: 'sys_graphql_resolver';
                        id: '1317fcbd14ba48dd83a2503dec9c152c';
                    };
                    'job-maintenance': {
                        table: 'sysauto_script';
                        id: '99a34f209f814f79be1f89afc0b46ea6';
                    };
                    'macro-menu-icon-picker': {
                        table: 'sys_ui_macro';
                        id: '37d47580fc71477588e00249dc98ddc3';
                    };
                    'menu-react-portal': {
                        table: 'sys_app_application';
                        id: 'bf748e02a92242daad3fc0b8f04dd50a';
                    };
                    'module-all-components': {
                        table: 'sys_app_module';
                        id: '8d4cd177ee224f7b83734229ebfb2516';
                    };
                    'module-blocks': {
                        table: 'sys_app_module';
                        id: 'd9592f79fcec4e549bd0427f506f3434';
                    };
                    'module-builds': {
                        table: 'sys_app_module';
                        id: 'edb108de93e54eb2820fbb939a707778';
                    };
                    'module-execution-log': {
                        table: 'sys_app_module';
                        id: '17aafc70ae6242b8b089e2ddd50a613c';
                    };
                    'module-layouts': {
                        table: 'sys_app_module';
                        id: 'd956ee6836134b9080e15fa7864afa43';
                    };
                    'module-menu-items': {
                        table: 'sys_app_module';
                        id: 'e38842253af74245b41d5f49c6ec5f09';
                    };
                    'module-menus': {
                        table: 'sys_app_module';
                        id: '01a902d86d7b4d3ba57ca8f033cbbdf7';
                    };
                    'module-pages': {
                        table: 'sys_app_module';
                        id: '0d0b070684b648879cea8e00971b3ecd';
                    };
                    'module-placements': {
                        table: 'sys_app_module';
                        id: '0fa69c69e5a14c899966d426a04e6b3a';
                    };
                    'module-portals': {
                        table: 'sys_app_module';
                        id: '60c8307b91454c86918e3e14781fa880';
                    };
                    'module-primitives': {
                        table: 'sys_app_module';
                        id: 'd9d7e8c1c6c5452d82199ff800bbcceb';
                    };
                    'module-properties': {
                        table: 'sys_app_module';
                        id: 'f84744ffface4b58b766db6cff80332c';
                    };
                    'module-record-fields': {
                        table: 'sys_app_module';
                        id: 'f64da03a7447442b8f0d66c2cf8985cb';
                    };
                    'module-releases': {
                        table: 'sys_app_module';
                        id: '4ccef0ad8b9c4a57bfd615bd66be00c3';
                    };
                    'module-sep-admin': {
                        table: 'sys_app_module';
                        id: '613067293fa849a7b497338edaa111f1';
                    };
                    'module-sep-components': {
                        table: 'sys_app_module';
                        id: '65f61478956c4e60a952a290aff58baf';
                    };
                    'module-sep-delivery': {
                        table: 'sys_app_module';
                        id: 'cbebe3a230924039b7e126673d6e4203';
                    };
                    'module-sep-portals': {
                        table: 'sys_app_module';
                        id: '99fe950b434045109ced0890ba28168d';
                    };
                    'module-source-files': {
                        table: 'sys_app_module';
                        id: '03bb3e1db8bf4defa523dea73581e11a';
                    };
                    'module-themes': {
                        table: 'sys_app_module';
                        id: '8e8fe15740c54528b5990f37d06faba0';
                    };
                    'module-utilities': {
                        table: 'sys_app_module';
                        id: '27dba5732025437ab5088b7b42277c91';
                    };
                    'module-widgets': {
                        table: 'sys_app_module';
                        id: '008f68b729fd4445b4d7bf568e9ca04b';
                    };
                    package_json: {
                        table: 'sys_module';
                        id: '43b4ae1ecc7143fd86ea49f82c0050f1';
                    };
                    'prop-build-abandon': {
                        table: 'sys_properties';
                        id: 'd2405e9099584afa8e3d5cc80b540e63';
                    };
                    'prop-build-max-bytes': {
                        table: 'sys_properties';
                        id: '292781a2a4484d18a15fdeaddc7ab4d2';
                    };
                    'prop-build-retention': {
                        table: 'sys_properties';
                        id: 'b28c2593a2ca422da6bd75bdf9eb423b';
                    };
                    'prop-log-executions': {
                        table: 'sys_properties';
                        id: 'febb9abb16624b6c9968cb4edebf5224';
                    };
                    'prop-log-retention': {
                        table: 'sys_properties';
                        id: 'e3c24687bd5a480a8b24f5e364d75da1';
                    };
                    'prop-max-files': {
                        table: 'sys_properties';
                        id: '3451e5aa3ff242258677f196fb08789b';
                    };
                    'prop-portal-sheet-background': {
                        table: 'sys_properties';
                        id: 'cde4d89cc6a941a88455561fbb65ed63';
                    };
                    'prop-public-welcome': {
                        table: 'sys_properties';
                        id: 'bf9a2b2a07bf42099e4fa33a5fab007b';
                    };
                    'prop-runtime-abi': {
                        table: 'sys_properties';
                        id: '248269eee91945d5a4d5bf19e2772753';
                    };
                    'prop-source-max-file': {
                        table: 'sys_properties';
                        id: '6b677239ad6c46a09679c424eb3b0976';
                    };
                    'prop-studio-kind-files': {
                        table: 'sys_properties';
                        id: 'e35f9dabd5ee43c8985e969799934f4c';
                    };
                    'queue-portal-sheet': {
                        table: 'sysevent_queue';
                        id: 'd82da0be8fd649a08d419c97974e2b7c';
                    };
                    'rel-build-imported-by': {
                        table: 'sys_relationship';
                        id: '1e73a4e3eb2840caad1479758113a74c';
                    };
                    'rel-component-imported-by': {
                        table: 'sys_relationship';
                        id: '055fed37c1644805a6dd85a6578a6a53';
                    };
                    'rel-component-imports': {
                        table: 'sys_relationship';
                        id: 'ef742e520459439c9314fadfd2f827fc';
                    };
                    'rel-portal-record-fields': {
                        table: 'sys_relationship';
                        id: '627f21eb7a334511a5d0dae5d13e6a50';
                    };
                    'related-list-build-build-asset-build': {
                        table: 'sys_ui_related_list_entry';
                        id: 'a743a34e09834dbd88050e63357a8bfe';
                    };
                    'related-list-build-build-dep-build': {
                        table: 'sys_ui_related_list_entry';
                        id: 'd6d0e45f22b246d38721ff413ab4fd40';
                    };
                    'related-list-build-build-dep-build-imported-by': {
                        table: 'sys_ui_related_list_entry';
                        id: '7ef10981a7e44392b63fde3b2b8eb39c';
                    };
                    'related-list-component-build-component': {
                        table: 'sys_ui_related_list_entry';
                        id: 'fd96376616e2414a90404a5694212200';
                    };
                    'related-list-component-build-dep-component-imported-by': {
                        table: 'sys_ui_related_list_entry';
                        id: '13ffa99f03144da9a3a35926782ad104';
                    };
                    'related-list-component-build-dep-component-imports': {
                        table: 'sys_ui_related_list_entry';
                        id: '4e0448c6bd644a10a32bb7f1826c9606';
                    };
                    'related-list-component-page-layout-override': {
                        table: 'sys_ui_related_list_entry';
                        id: '0845b1db3fe448c9823d08696353b94c';
                    };
                    'related-list-component-placement-component': {
                        table: 'sys_ui_related_list_entry';
                        id: 'f648cdd1dac74ad3b4899f4845b64c16';
                    };
                    'related-list-component-portal-default-layout': {
                        table: 'sys_ui_related_list_entry';
                        id: '346a399794264b258b422d033d6045b5';
                    };
                    'related-list-component-source-file-component': {
                        table: 'sys_ui_related_list_entry';
                        id: '895addd9ff494b64a2399c94892e4dfd';
                    };
                    'related-list-doc-collection-doc': {
                        table: 'sys_ui_related_list_entry';
                        id: 'e404321f7a994559bcd59e272117e9be';
                    };
                    'related-list-doc-collection-section': {
                        table: 'sys_ui_related_list_entry';
                        id: '7c37b304c10842e6bc4ae85a4b029563';
                    };
                    'related-list-doc-section-doc': {
                        table: 'sys_ui_related_list_entry';
                        id: '42245a0532f14ae7a9a2c399bda4081a';
                    };
                    'related-list-item-uc': {
                        table: 'sys_ui_related_list_entry';
                        id: '792e65c9f2cd4b3e895998197e6cb6d4';
                    };
                    'related-list-item-uc-no': {
                        table: 'sys_ui_related_list_entry';
                        id: '5333883607bd4e399f63afea4fd4ac4d';
                    };
                    'related-list-menu-item-menu-item-parent': {
                        table: 'sys_ui_related_list_entry';
                        id: '8122edaaa3a94309bcae0eb0b2048f3b';
                    };
                    'related-list-menu-menu-item-menu': {
                        table: 'sys_ui_related_list_entry';
                        id: '925919f4169c4a0c81d804327e5e2f97';
                    };
                    'related-list-page-menu-item-page': {
                        table: 'sys_ui_related_list_entry';
                        id: '42bf47ecc1f744cb9c1053feb3c5d4bb';
                    };
                    'related-list-page-placement-page': {
                        table: 'sys_ui_related_list_entry';
                        id: 'c06acec3d13740ec9df99b9f352d870d';
                    };
                    'related-list-page-uc': {
                        table: 'sys_ui_related_list_entry';
                        id: '6ecaae40cf534322a586ad0b8850a6c2';
                    };
                    'related-list-page-uc-no': {
                        table: 'sys_ui_related_list_entry';
                        id: 'bd6776c529754016b4b3a8e13695cefa';
                    };
                    'related-list-placement-placement-parent': {
                        table: 'sys_ui_related_list_entry';
                        id: '3ebdfb2b86134d118ffe3b6549c00d33';
                    };
                    'related-list-portal-menu-portal': {
                        table: 'sys_ui_related_list_entry';
                        id: '7bcd56a67b1847d28a93f95be721a0c7';
                    };
                    'related-list-portal-page-portal': {
                        table: 'sys_ui_related_list_entry';
                        id: 'a382887d9f5b4a438f942b6ff31dd2d4';
                    };
                    'related-list-portal-placement-portal': {
                        table: 'sys_ui_related_list_entry';
                        id: '021a1f77836e455b8881b4b20e4692b2';
                    };
                    'related-list-portal-record-fields': {
                        table: 'sys_ui_related_list_entry';
                        id: '6e206cae04514ca19f8f28823197787e';
                    };
                    'related-list-portal-release-portal': {
                        table: 'sys_ui_related_list_entry';
                        id: '01d8be100a2c48e4a49840feba88582b';
                    };
                    'related-list-portal-uc': {
                        table: 'sys_ui_related_list_entry';
                        id: 'f36be68dec104e48a7cf4a549a8dd33a';
                    };
                    'related-list-portal-uc-no': {
                        table: 'sys_ui_related_list_entry';
                        id: 'fc6fe3d200a440c6bd97acdcf485c234';
                    };
                    'related-list-release-release-entry-release': {
                        table: 'sys_ui_related_list_entry';
                        id: '52cea77125dc40ffa1118e97dc5b1d91';
                    };
                    'related-list-theme-build-theme': {
                        table: 'sys_ui_related_list_entry';
                        id: '4e74af8cdaaa48dbb64265da6961998c';
                    };
                    'related-list-theme-portal-theme': {
                        table: 'sys_ui_related_list_entry';
                        id: 'fc2b8fa6b5444f3c8b2064836f42957e';
                    };
                    'related-list-theme-source-file-theme': {
                        table: 'sys_ui_related_list_entry';
                        id: '8efb3b3e80624c63a94d422d1b80fc6d';
                    };
                    'related-lists-build': {
                        table: 'sys_ui_related_list';
                        id: 'b9176a3ad37348ac8bdcad4180bf1485';
                    };
                    'related-lists-component': {
                        table: 'sys_ui_related_list';
                        id: 'e7c8f558a57f4fdf83861dac6a2bd01b';
                    };
                    'related-lists-doc-collection': {
                        table: 'sys_ui_related_list';
                        id: 'da17536079de48a9a7dce964960f9ed9';
                    };
                    'related-lists-doc-section': {
                        table: 'sys_ui_related_list';
                        id: '66d7d82d153048f4afe721a66c19b635';
                    };
                    'related-lists-menu': {
                        table: 'sys_ui_related_list';
                        id: 'e00dbfbc36ac4272995acc4c27843779';
                    };
                    'related-lists-menu-item': {
                        table: 'sys_ui_related_list';
                        id: '9666aa9715ca44de8dc0278e44d01020';
                    };
                    'related-lists-page': {
                        table: 'sys_ui_related_list';
                        id: 'ec007ed80a0c42449fceaa5b61810363';
                    };
                    'related-lists-placement': {
                        table: 'sys_ui_related_list';
                        id: 'f22399c5233e42d69860f2424bda8801';
                    };
                    'related-lists-portal': {
                        table: 'sys_ui_related_list';
                        id: '549011f3252d4092b474f7fac9eeed95';
                    };
                    'related-lists-release': {
                        table: 'sys_ui_related_list';
                        id: '00ece0105725429e864938ea2df9c1fa';
                    };
                    'related-lists-theme': {
                        table: 'sys_ui_related_list';
                        id: 'b6d24e85a75e4cc7a689438b305e7a8e';
                    };
                    'rest-runtime': {
                        table: 'sys_ws_definition';
                        id: 'b126850f03724a08ae48bf8a75b8dd6a';
                    };
                    'rest-runtime-asset': {
                        table: 'sys_ws_operation';
                        id: '6e623eb5ebe34a828bb58963b9220672';
                    };
                    'rest-runtime-bootstrap': {
                        table: 'sys_ws_operation';
                        id: '6ea50810834c44a39d5ec0f70f6268e1';
                    };
                    'rest-runtime-execute': {
                        table: 'sys_ws_operation';
                        id: '0e6d99c88afb449e8b21ee7404855898';
                    };
                    'rest-runtime-icons-lucide': {
                        table: 'sys_ws_operation';
                        id: '12f5d6f4140b4717bf61e3815fd43557';
                    };
                    'rest-runtime-initialize': {
                        table: 'sys_ws_operation';
                        id: '79db1f11b20d4906b1d36087ef3745c4';
                    };
                    'rest-runtime-messages': {
                        table: 'sys_ws_operation';
                        id: '6dcb418bd9c84d0e9153a8a98a3af024';
                    };
                    'rest-runtime-properties': {
                        table: 'sys_ws_operation';
                        id: '17e5684834b24b1b99264deee3f2fac2';
                    };
                    'rest-runtime-properties-names': {
                        table: 'sys_ws_query_parameter';
                        id: 'e89d4a5daeab4b2398fa5ee8601cf671';
                    };
                    'rest-runtime-properties-portal': {
                        table: 'sys_ws_query_parameter';
                        id: '5c5541b9ef65499d85b0e93256fdad09';
                    };
                    'rest-runtime-resolve': {
                        table: 'sys_ws_operation';
                        id: '9a9ee74b62d24dc2b02c5a92e7e9b3c2';
                    };
                    'rest-runtime-v1': {
                        table: 'sys_ws_version';
                        id: 'd10fc676c7fc4d36a3e8d52d5e26a408';
                    };
                    'rest-studio': {
                        table: 'sys_ws_definition';
                        id: '2f3cb475219b40a6acc6aa46e71b89b8';
                    };
                    'rest-studio-build-complete': {
                        table: 'sys_ws_operation';
                        id: '14973f90038d4af7b1b4f6f25ab055f2';
                    };
                    'rest-studio-build-preview': {
                        table: 'sys_ws_operation';
                        id: 'cc913ab2d2ec47ceaa9464e8359ea7f7';
                    };
                    'rest-studio-component-check': {
                        table: 'sys_ws_operation';
                        id: '1d78c004180b466280ef4e8355c9647f';
                    };
                    'rest-studio-component-create': {
                        table: 'sys_ws_operation';
                        id: '0b32481988664a949a6359794c1b07ae';
                    };
                    'rest-studio-component-dependencies': {
                        table: 'sys_ws_operation';
                        id: 'b47c2b1ebacc44ea944281b6a9586d61';
                    };
                    'rest-studio-component-project': {
                        table: 'sys_ws_operation';
                        id: '51bdc3ddf71d4bb7a2b5f8c65e6f265c';
                    };
                    'rest-studio-component-save': {
                        table: 'sys_ws_operation';
                        id: 'cf3b72bd3d484aa5bac07e2573ac4287';
                    };
                    'rest-studio-components': {
                        table: 'sys_ws_operation';
                        id: '1ca038e1821845bc993198aa4b1c29ec';
                    };
                    'rest-studio-context': {
                        table: 'sys_ws_operation';
                        id: '97ec9fab4d5e493296ea9ee051bba459';
                    };
                    'rest-studio-design-target': {
                        table: 'sys_ws_operation';
                        id: 'e7acd31cea8e4f16a5f50708cd62b2ca';
                    };
                    'rest-studio-doc-collections-create': {
                        table: 'sys_ws_operation';
                        id: 'f0a6bb5e41a942feb7c1d1086f5998e0';
                    };
                    'rest-studio-doc-collections-list': {
                        table: 'sys_ws_operation';
                        id: '7edb76e1974d4880943ae58cbf45e440';
                    };
                    'rest-studio-doc-collections-update': {
                        table: 'sys_ws_operation';
                        id: '1ca05b7def654eeeae851645a1eb007a';
                    };
                    'rest-studio-doc-sections-create': {
                        table: 'sys_ws_operation';
                        id: 'a285d0c030654cf38555237390e39aa8';
                    };
                    'rest-studio-doc-sections-list': {
                        table: 'sys_ws_operation';
                        id: '10dcb392b1fc4893b50db5b6fd0f19ba';
                    };
                    'rest-studio-doc-sections-update': {
                        table: 'sys_ws_operation';
                        id: '665acef8e6fe4edc9e641112d182bdc2';
                    };
                    'rest-studio-docs-create': {
                        table: 'sys_ws_operation';
                        id: '05b1a8e33a5f410b802d9f78167abf84';
                    };
                    'rest-studio-docs-get': {
                        table: 'sys_ws_operation';
                        id: '4ed16f835fef4987960e0ef089b4723a';
                    };
                    'rest-studio-docs-list': {
                        table: 'sys_ws_operation';
                        id: '7f84ec7fdb4f4093b41826ccd0b21d43';
                    };
                    'rest-studio-docs-order': {
                        table: 'sys_ws_operation';
                        id: '7a64730838334566b6e6059035494572';
                    };
                    'rest-studio-docs-update': {
                        table: 'sys_ws_operation';
                        id: '2792543399df4f47b3086ef34319c33d';
                    };
                    'rest-studio-icons': {
                        table: 'sys_ws_operation';
                        id: 'ef92d8dc6be3466fb9ae34d5244a74e8';
                    };
                    'rest-studio-menu-create': {
                        table: 'sys_ws_operation';
                        id: '90cabba5a921480088f5c73bd2766485';
                    };
                    'rest-studio-menu-delete': {
                        table: 'sys_ws_operation';
                        id: 'ef16b079fa3648f996af4fd1f8692409';
                    };
                    'rest-studio-menu-item-create': {
                        table: 'sys_ws_operation';
                        id: '58e5c5c3614d402a86c066a6a610320d';
                    };
                    'rest-studio-menu-item-delete': {
                        table: 'sys_ws_operation';
                        id: '9c49b40bc14341039ca848c80990a271';
                    };
                    'rest-studio-menu-item-update': {
                        table: 'sys_ws_operation';
                        id: '924e13d359fc4f81a82eeb1e1e0cb4b8';
                    };
                    'rest-studio-menu-update': {
                        table: 'sys_ws_operation';
                        id: '18e419fd12954fc8aeff1fbf00736ff3';
                    };
                    'rest-studio-menus': {
                        table: 'sys_ws_operation';
                        id: '4232c0f476264dd49beb7172fa6935bf';
                    };
                    'rest-studio-page-create': {
                        table: 'sys_ws_operation';
                        id: 'a6248644ecce4ef78a882f3f222152fd';
                    };
                    'rest-studio-page-delete': {
                        table: 'sys_ws_operation';
                        id: '1bfb0385ea0945acba8aea60b634e5c8';
                    };
                    'rest-studio-page-design': {
                        table: 'sys_ws_operation';
                        id: '780a22356b0b449f8ee0cbabf24c202d';
                    };
                    'rest-studio-page-update': {
                        table: 'sys_ws_operation';
                        id: 'e8c59d64aaee4a768949d4512328c395';
                    };
                    'rest-studio-placement-create': {
                        table: 'sys_ws_operation';
                        id: '5fe8938016234ab980a99486092d9ddf';
                    };
                    'rest-studio-placement-delete': {
                        table: 'sys_ws_operation';
                        id: '0f8af23756f84ba0a15826b39269d29e';
                    };
                    'rest-studio-placement-update': {
                        table: 'sys_ws_operation';
                        id: '1c065d0b8c1141b7a5640b084e253f0c';
                    };
                    'rest-studio-portal-audience': {
                        table: 'sys_ws_operation';
                        id: '9686b57263b7452eaf2ca8ca916ea9b3';
                    };
                    'rest-studio-portal-design': {
                        table: 'sys_ws_operation';
                        id: '7451eaa5f30547f3ba95fb99f536bec0';
                    };
                    'rest-studio-portal-update': {
                        table: 'sys_ws_operation';
                        id: 'e256b7b4dbe842ae9d8c25ce10bec2a0';
                    };
                    'rest-studio-portals': {
                        table: 'sys_ws_operation';
                        id: '0cdcf9aeafaa445fa5c74d94a8e89b10';
                    };
                    'rest-studio-process': {
                        table: 'sys_ws_operation';
                        id: '8872a213362841558019422dbda5085c';
                    };
                    'rest-studio-theme-project': {
                        table: 'sys_ws_operation';
                        id: 'd53d2d9c782d4817b828c0fe34875839';
                    };
                    'rest-studio-theme-save': {
                        table: 'sys_ws_operation';
                        id: 'cda072ba902f4fa7a38ebaa4b6bd511c';
                    };
                    'rest-studio-themes': {
                        table: 'sys_ws_operation';
                        id: 'd7bd6fc43a314deaa8acc0072ae8410a';
                    };
                    'rest-studio-users': {
                        table: 'sys_ws_operation';
                        id: '8b3e86bb95274dd1be9e2047219fc3d3';
                    };
                    'rest-studio-v1': {
                        table: 'sys_ws_version';
                        id: 'e86a826add0f4d26a4ba76930005fe24';
                    };
                    'rf-change-request-pill-approval': {
                        table: 'x_312987_portal_record_field';
                        id: '153e12fbe8664f32b61778a689217ccc';
                    };
                    'rf-change-request-pill-risk': {
                        table: 'x_312987_portal_record_field';
                        id: 'a866836b9267472d9c842d3b44f634cf';
                    };
                    'rf-change-request-pill-state': {
                        table: 'x_312987_portal_record_field';
                        id: 'f078f0b0941042ec96e4204a1e3b7361';
                    };
                    'rf-change-request-ribbon-assigned-to': {
                        table: 'x_312987_portal_record_field';
                        id: '55cdeb8f485c47eca531d60b7dcabd6a';
                    };
                    'rf-change-request-ribbon-start-date': {
                        table: 'x_312987_portal_record_field';
                        id: '93cdc9f238804a0cb7596b386d2ed6eb';
                    };
                    'rf-change-request-ribbon-type': {
                        table: 'x_312987_portal_record_field';
                        id: '817f4a52a4b7440cbd679a34700b872a';
                    };
                    'rf-change-task-pill-state': {
                        table: 'x_312987_portal_record_field';
                        id: 'fb079bc7e81e44d99050c80f5f01c1ef';
                    };
                    'rf-change-task-ribbon-assigned-to': {
                        table: 'x_312987_portal_record_field';
                        id: '91b7027912ae45378a79b117ed362fbc';
                    };
                    'rf-change-task-ribbon-change-request': {
                        table: 'x_312987_portal_record_field';
                        id: '0a52e378b69141d08757cd639c8ec77f';
                    };
                    'rf-change-task-ribbon-planned-end-date': {
                        table: 'x_312987_portal_record_field';
                        id: '6051627c7ea74ce786c1cdade5aa855e';
                    };
                    'rf-incident-ribbon-assigned-to': {
                        table: 'x_312987_portal_record_field';
                        id: '4f4245aa03a64d64835b3f6a4ecc885e';
                    };
                    'rf-incident-ribbon-caller-id': {
                        table: 'x_312987_portal_record_field';
                        id: '93aa951b637948a9afd79299414793ca';
                    };
                    'rf-incident-ribbon-sys-updated-on': {
                        table: 'x_312987_portal_record_field';
                        id: '3cab37fe541a432697af296ce406713a';
                    };
                    'rf-kb-knowledge-pill-workflow-state': {
                        table: 'x_312987_portal_record_field';
                        id: 'bbcaec263a1f49e2b87cc79a835b35a6';
                    };
                    'rf-kb-knowledge-ribbon-author': {
                        table: 'x_312987_portal_record_field';
                        id: '69874afcbbea4c6abf663231d6a3b1ab';
                    };
                    'rf-kb-knowledge-ribbon-kb-knowledge-base': {
                        table: 'x_312987_portal_record_field';
                        id: 'e3c72d54835f4553a964bdbcb6df2105';
                    };
                    'rf-kb-knowledge-ribbon-sys-updated-on': {
                        table: 'x_312987_portal_record_field';
                        id: 'b96766ceaf5b4eb39c5d3fd9f9e293c5';
                    };
                    'rf-problem-ribbon-assigned-to': {
                        table: 'x_312987_portal_record_field';
                        id: '1b645ce9687b441e8d27f28fbb502ad9';
                    };
                    'rf-problem-ribbon-sys-updated-on': {
                        table: 'x_312987_portal_record_field';
                        id: '7149f24e9b77415ba1b78cc89215974a';
                    };
                    'rf-sc-req-item-pill-stage': {
                        table: 'x_312987_portal_record_field';
                        id: '57a54b430fe24cb396dd117297a8f419';
                    };
                    'rf-sc-req-item-pill-state': {
                        table: 'x_312987_portal_record_field';
                        id: 'fd8448a673db40da9934b4526a228e13';
                    };
                    'rf-sc-req-item-ribbon-cat-item': {
                        table: 'x_312987_portal_record_field';
                        id: '80ee0d26f1864a408e6ce13e3e15d1e1';
                    };
                    'rf-sc-req-item-ribbon-due-date': {
                        table: 'x_312987_portal_record_field';
                        id: '101749d13ed347f89ed8fe43dab7dbe9';
                    };
                    'rf-sc-req-item-ribbon-requested-for': {
                        table: 'x_312987_portal_record_field';
                        id: '6ca551945c4b401b91488dd39b741ffe';
                    };
                    'rf-sc-request-pill-approval': {
                        table: 'x_312987_portal_record_field';
                        id: 'da55bf1e74dc4fba9ba5adedb969471a';
                    };
                    'rf-sc-request-pill-request-state': {
                        table: 'x_312987_portal_record_field';
                        id: 'f7faf70bd07c49dfa9a345fe2012c557';
                    };
                    'rf-sc-request-ribbon-due-date': {
                        table: 'x_312987_portal_record_field';
                        id: '8a13e49a7ed6487792e93365d6837d53';
                    };
                    'rf-sc-request-ribbon-price': {
                        table: 'x_312987_portal_record_field';
                        id: '45bdd91421d445f9ae1003342edb8606';
                    };
                    'rf-sc-request-ribbon-requested-for': {
                        table: 'x_312987_portal_record_field';
                        id: '16abb0129cf84e7c90dfddad6732d4a2';
                    };
                    'rf-sc-task-pill-approval': {
                        table: 'x_312987_portal_record_field';
                        id: '3c7de2771cdb4cc7830c6ab59fa3e3d4';
                    };
                    'rf-sc-task-pill-state': {
                        table: 'x_312987_portal_record_field';
                        id: '3038e141ea0347f3820ba063d75f58ae';
                    };
                    'rf-sc-task-ribbon-assigned-to': {
                        table: 'x_312987_portal_record_field';
                        id: '89657200b15d432dbe6a9050cc32b650';
                    };
                    'rf-sc-task-ribbon-due-date': {
                        table: 'x_312987_portal_record_field';
                        id: '6769a856af2e492d89f133de3ade5d14';
                    };
                    'rf-sc-task-ribbon-request-item': {
                        table: 'x_312987_portal_record_field';
                        id: 'f16c0b55a0724f02bb3ce003249d2698';
                    };
                    'rf-sys-user-group-ribbon-email': {
                        table: 'x_312987_portal_record_field';
                        id: 'ed130c2b28ad4be29f52fabd251e19a1';
                    };
                    'rf-sys-user-group-ribbon-manager': {
                        table: 'x_312987_portal_record_field';
                        id: '5a6cf591b2df46db96ab09baef28f6c6';
                    };
                    'rf-sys-user-group-ribbon-type': {
                        table: 'x_312987_portal_record_field';
                        id: '23f5edd204f84321aeec5fb8ebf41325';
                    };
                    'rf-task-pill-priority': {
                        table: 'x_312987_portal_record_field';
                        id: '19f79b92999645d7b66dfefbd91b5f3d';
                    };
                    'rf-task-pill-state': {
                        table: 'x_312987_portal_record_field';
                        id: '45a6cf73e02d44aba580ed109bd6141f';
                    };
                    'rf-task-subtitle-short-description': {
                        table: 'x_312987_portal_record_field';
                        id: '57b2b3e785a1447e806629c83e4e79d2';
                    };
                    'rf-task-title-number': {
                        table: 'x_312987_portal_record_field';
                        id: 'e185c3b6bb1f4497a26e59de0a3e9a55';
                    };
                    'sa-portal-sheet-compile': {
                        table: 'sysevent_script_action';
                        id: 'fa2503d8ffbd4e0793ba9ba54b1d9f7f';
                    };
                    'script-include-quick-utils': {
                        table: 'sys_script_include';
                        id: '37641b67e6a24135aceeebe2dde5300d';
                    };
                    'script-include-react-portal': {
                        table: 'sys_script_include';
                        id: '165f45dcc2944475ab7448b10fe426c9';
                    };
                    src_server_api_http_ts: {
                        table: 'sys_module';
                        id: '5de04d7595244495bc88a19c8d1cee80';
                    };
                    'src_server_api_icon-api_ts': {
                        table: 'sys_module';
                        id: '9f941f22e36c453aab3068c51d78b6f7';
                    };
                    'src_server_api_runtime-api_ts': {
                        table: 'sys_module';
                        id: '5a92d85b0c48456d9636b9d4a96a8b58';
                    };
                    'src_server_api_studio-api_ts': {
                        table: 'sys_module';
                        id: '10bcff2823324257807ab7329ad0aab2';
                    };
                    'src_server_automation_build-rules_ts': {
                        table: 'sys_module';
                        id: 'dc0823f2c2e04b1ea2bcdee4c6e8275d';
                    };
                    'src_server_automation_compile-rules_ts': {
                        table: 'sys_module';
                        id: '966e146d0bfe41f6b55dd34e84c50e53';
                    };
                    'src_server_automation_component-rules_ts': {
                        table: 'sys_module';
                        id: 'a5bdc71481f94b5390f42fa8d96a79c9';
                    };
                    src_server_automation_guards_ts: {
                        table: 'sys_module';
                        id: '2c6ee7bff4794fd4a6a2274fe56c5abd';
                    };
                    'src_server_automation_instance-style-rules_ts': {
                        table: 'sys_module';
                        id: '0a8505d7c90c40848ffe4c28141daf3e';
                    };
                    'src_server_automation_menu-rules_ts': {
                        table: 'sys_module';
                        id: 'e80689f549dd43d7bf5eb1406025a929';
                    };
                    'src_server_automation_menu-script-rules_ts': {
                        table: 'sys_module';
                        id: '429c66f535a545a9a8087243e7c77bc3';
                    };
                    'src_server_automation_page-rules_ts': {
                        table: 'sys_module';
                        id: 'd30679e67b304ff69b3052c27e69ad3d';
                    };
                    'src_server_automation_portal-rules_ts': {
                        table: 'sys_module';
                        id: 'cb9daf2115be461dab05f3f1544e4aa9';
                    };
                    'src_server_automation_reprocess-rules_ts': {
                        table: 'sys_module';
                        id: '746117a850b04a0a8b34278053e69993';
                    };
                    'src_server_automation_sheet-rules_ts': {
                        table: 'sys_module';
                        id: '8ca9cd135b124a05bb689cad0bda1e93';
                    };
                    'src_server_automation_source-file-rules_ts': {
                        table: 'sys_module';
                        id: '0da99972b8954341a38335447d8abba2';
                    };
                    'src_server_automation_theme-rules_ts': {
                        table: 'sys_module';
                        id: '29358250f0084eec8ee57d165b944414';
                    };
                    'src_server_build_build-service_ts': {
                        table: 'sys_module';
                        id: '49915d03a9634fd2b00ff45eb6965160';
                    };
                    'src_server_build_dependency-service_ts': {
                        table: 'sys_module';
                        id: '129b9e003f0943668d4e20c8029e1b86';
                    };
                    'src_server_compiler_cache-asset_ts': {
                        table: 'sys_module';
                        id: 'dbedf4c1c96249019fc85f1a9b6aab56';
                    };
                    src_server_compiler_compiler_ts: {
                        table: 'sys_module';
                        id: 'cc60548c79ad47bab7da2b55749d78db';
                    };
                    'src_server_compiler_host-candidates_ts': {
                        table: 'sys_module';
                        id: '108ebc710ec144ab931b8dc1b0be8bab';
                    };
                    'src_server_compiler_utility-roots_ts': {
                        table: 'sys_module';
                        id: 'ddc330326e0a4b0689ff4f0a0a2a0b77';
                    };
                    'src_server_compiler_variant-layer_ts': {
                        table: 'sys_module';
                        id: 'eecc22f14c704d85a8980a302b5c3ce0';
                    };
                    src_server_compiler_vendor_sucrase_js: {
                        table: 'sys_module';
                        id: '74abcbbc1479414e8833c22babffd054';
                    };
                    src_server_compiler_vendor_tailwind_js: {
                        table: 'sys_module';
                        id: '10c615a8d3884fc39c6f7ba3540bc446';
                    };
                    'src_server_design_audience-service_ts': {
                        table: 'sys_module';
                        id: '9f06b579e9e44011ab3127fbf7a28f6a';
                    };
                    'src_server_design_design-service_ts': {
                        table: 'sys_module';
                        id: '3b7b2fd8ad8442439ee73a308df35660';
                    };
                    'src_server_design_instance-style_ts': {
                        table: 'sys_module';
                        id: 'c53ee18ad83f481b81f895cdc23d760a';
                    };
                    'src_server_design_menu-design-service_ts': {
                        table: 'sys_module';
                        id: '5ceed3e8985e461c8241a05d08c8bb91';
                    };
                    'src_server_docs_doc-rules_ts': {
                        table: 'sys_module';
                        id: '81f7ff434e5d4667be25358e8c96acf2';
                    };
                    'src_server_docs_docs-legacy_ts': {
                        table: 'sys_module';
                        id: 'b25afd91984248d2ae3019e8916e6a94';
                    };
                    'src_server_docs_docs-service_ts': {
                        table: 'sys_module';
                        id: '6c0daae8c13f46f6acd35c66ae0047ee';
                    };
                    'src_server_docs_docs-text_ts': {
                        table: 'sys_module';
                        id: 'f6efd1ea0e574238bc8fb0d6a6bd51a1';
                    };
                    src_server_docs_package_json: {
                        table: 'sys_module';
                        id: '03c3475f83fd41de839aadbebe1b7d7a';
                    };
                    src_server_icons_icons_ts: {
                        table: 'sys_module';
                        id: 'f973c2ccf43042f489e961e230b8297b';
                    };
                    'src_server_icons_lucide-names_ts': {
                        table: 'sys_module';
                        id: 'd19320608f4146d9a15a2a1650523d30';
                    };
                    'src_server_icons_lucide-sprite_ts': {
                        table: 'sys_module';
                        id: 'c4fe7de842984a16bdb101b5ac6b4f07';
                    };
                    'src_server_lib_css-safe_ts': {
                        table: 'sys_module';
                        id: '52cca34ae4ec497cb5103a15eadab06e';
                    };
                    src_server_lib_errors_ts: {
                        table: 'sys_module';
                        id: '189dccb60f084c5396dc2a521145d0ba';
                    };
                    'src_server_lib_global-helpers_ts': {
                        table: 'sys_module';
                        id: '3ed1e2a5554948d5865d441da55f14c1';
                    };
                    src_server_lib_gr_ts: {
                        table: 'sys_module';
                        id: '3dc2759c1ec1488ba5f55b130a556da0';
                    };
                    src_server_lib_paths_ts: {
                        table: 'sys_module';
                        id: '167b743946854574b1c5729af38f6c64';
                    };
                    'src_server_lib_quick-utils_ts': {
                        table: 'sys_module';
                        id: '270260f3ed754b59bc10dc59c928114b';
                    };
                    'src_server_lib_session-flags_ts': {
                        table: 'sys_module';
                        id: '104389a4d9214291b73b7cb4da938c82';
                    };
                    src_server_lib_tables_ts: {
                        table: 'sys_module';
                        id: '59b187e1485b4e0398625049f80e66a1';
                    };
                    src_server_lib_util_ts: {
                        table: 'sys_module';
                        id: '5701354c7d6340109c46bd7a0904d412';
                    };
                    src_server_maintenance_maintenance_ts: {
                        table: 'sys_module';
                        id: '4e03c481343447118f0f4fc5b62132b7';
                    };
                    'src_server_registry_block-regions_ts': {
                        table: 'sys_module';
                        id: '454ba62a7057480aa07703dbcc976ad1';
                    };
                    src_server_registry_catalog_ts: {
                        table: 'sys_module';
                        id: '6f53903ec1df4eb7afc1599aa0f51b81';
                    };
                    src_server_registry_dependencies_ts: {
                        table: 'sys_module';
                        id: 'e9de69bed8124a0389c7d54357a7e46b';
                    };
                    src_server_registry_registry_ts: {
                        table: 'sys_module';
                        id: '91726c31c83f4cdb8cab4700c931d685';
                    };
                    'src_server_release_portal-utilities_ts': {
                        table: 'sys_module';
                        id: '4fd10cb40d9e48e7aa01fbaaeb922438';
                    };
                    'src_server_release_release-service_ts': {
                        table: 'sys_module';
                        id: 'f033fed4bbbd4486b8d6a16a5c7a722a';
                    };
                    'src_server_runtime_asset-service_ts': {
                        table: 'sys_module';
                        id: 'ffd487c0b2be4018b2a15e3abc923e73';
                    };
                    'src_server_runtime_component-executor_ts': {
                        table: 'sys_module';
                        id: 'f6daba3ff7a544cd9150114ab7218084';
                    };
                    src_server_runtime_diagnostics_ts: {
                        table: 'sys_module';
                        id: '08de0edf05c04e1b83771a756e4df165';
                    };
                    'src_server_runtime_embed-options_ts': {
                        table: 'sys_module';
                        id: '8ccaa10c70c84614973975f75762b02e';
                    };
                    'src_server_runtime_embed-token_ts': {
                        table: 'sys_module';
                        id: '385ec9f4a4b94cbe91ac65ba6a56ea3f';
                    };
                    'src_server_runtime_menu-service_ts': {
                        table: 'sys_module';
                        id: 'cdfbd494168f4d19845cfe1fabe17e18';
                    };
                    'src_server_runtime_portal-service_ts': {
                        table: 'sys_module';
                        id: '9522dac3a3f549f99e73fd0ae51a74aa';
                    };
                    'src_server_runtime_server-api_ts': {
                        table: 'sys_module';
                        id: '06f529a050f54f1e9dd691c9c5e2cb21';
                    };
                    src_server_security_access_ts: {
                        table: 'sys_module';
                        id: 'b6221819fd20457eb3ae01e87f0b0ed7';
                    };
                    src_server_security_scope_ts: {
                        table: 'sys_module';
                        id: '2a2089ffa9934053abbf76c789ac1048';
                    };
                    src_server_security_user_ts: {
                        table: 'sys_module';
                        id: 'd00cc69203d44f2585be6a1f782a220d';
                    };
                    src_server_source_owner_ts: {
                        table: 'sys_module';
                        id: '4301e04482774d87a08a36705a136dd3';
                    };
                    'src_server_source_project-files_ts': {
                        table: 'sys_module';
                        id: '71120d16a50b46ceb755ef6420eb1ccf';
                    };
                    'src_server_source_source-service_ts': {
                        table: 'sys_module';
                        id: 'a385f5d5659b4d56bcf422f85e93bc4b';
                    };
                    'src_server_views_record-fields_ts': {
                        table: 'sys_module';
                        id: '7680e1b8e69e4d3292421338683de12c';
                    };
                    'src_server_views_view-rules_ts': {
                        table: 'sys_module';
                        id: '9fd5b6ff9ac5435aa55c061ae8934935';
                    };
                    'src_server_views_view-rules-api_ts': {
                        table: 'sys_module';
                        id: 'af13ad2b182d4a4b8ca1b56ee861988c';
                    };
                    'vtable-view-answer': {
                        table: 'sys_script_vtable';
                        id: '91690e63157146b4985d108abba89ef0';
                    };
                };
                composite: [
                    {
                        table: 'sys_documentation';
                        id: '004aa82afebe44f7af80f84b136ef9d6';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '004e756a9a7744cfbe6eec4fcb39be75';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'slug';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '0052b3a8b8f24dbfa8f39cdcd0c10532';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            caption: 'Menu Item Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '0056ef7ab8bf4fd9a187aa0673a62026';
                        key: {
                            name: 'x_312987_portal_menu_item';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '00d112976a4f4bbfa15ed3c8c8d4147b';
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '00fee8c2ecc64b0286b349edd91153d2';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'input_hash';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '010047ea28e04f2896f427a659e2c437';
                        key: {
                            list_id: {
                                id: '8dcae45ec3ec4cfca4fb3bbc06551a70';
                                key: {
                                    name: 'x_312987_portal_page_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '010b425dcc73495d929654d47a9511e3';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '012d58deba204fd4bc8c6f833ff2926f';
                        key: {
                            sys_security_acl: '49dc813b70924468acaf4df132354e61';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '01d37c639e994c219de14ef004d9d76f';
                        key: {
                            sys_ui_section: {
                                id: '753810b5dde6481dbc947085132a637d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '12M.x_312987_portal_theme.x_312987_portal_build.theme';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0217f7f32c624316975f815e2f643621';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'path';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '021fb2a1413b497a90352533b41abcd0';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0235f200f84545f5a8146b1b48b12dc1';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'remember';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '028a0b3895db4c5197ecf15c00438a47';
                        key: {
                            name: 'x_312987_portal_build_dep';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '02cd09ef5778401ba1218f0591c60aae';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '02d5466acc6d4a2eba0277a3c8b01cd1';
                        key: {
                            sys_security_acl: '2b94db142fa2440989ea98f6714e3382';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0314c78204fa45e895bd5a88be11660a';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'search_text';
                            position: '19';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '031ec06f699e475884176bdc009166b8';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'seed_slot';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '033b4dcf3103463fbe9da2d5fdebc020';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            value: 'utility';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '036fe0ea4c444cb0a686f614f057947a';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'placeable';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '03a0913331e14e2eb20dd41aba4fbbbe';
                        key: {
                            name: 'x_312987_portal_placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '03a183c48ae74771bfcf8270ba705bb3';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'icon';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '045be9a25e4542778eddbebbfa8f29e5';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'preset';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '04bbab8717604096be5a96c119c2119a';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '04e615d63e0242f2af01274170a8541d';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '0506fb5b855741c5adfdb26a8238d598';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_build';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '0508857bfec748bb8f5d082026791fb0';
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '050b45a3fbec46c1a276a3d9fe6c9a90';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '051cd10974c34435859a3bc738351677';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '057a6346c6044d158c49690ff0bab7e7';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'layout_json';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '057de3520b2f4b7897bb0194a5599e9f';
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '062b8fe6b22e45aa947eb91d1c0b9d9e';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'state';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '0660d804734c4a3f88573fa8a92853c7';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            value: 'map';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0678d4f7a8e64f50821faed5d6cc3430';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'theme';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '068178b1c7f743fe8de67c2b3c314005';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'label';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '0686580e8f214d568d733dec58c45f8d';
                        key: {
                            name: 'x_312987_portal_doc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_doc_section';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '06b26a19a3214f3896acc18761876d70';
                        key: {
                            name: 'x_312987_portal_release';
                            caption: 'Release';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '06cf3c04e51c48e1bc3992d3b9543082';
                        key: {
                            name: 'x_312987_portal_doc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '071f6d9139434459ade79d695c5f0c35';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '07303319f1dd4cc2be82975d3fa73137';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'seed_slot';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '0742f94ae5b74cc2bec6de3bf86167f0';
                        key: {
                            sys_security_acl: '2b94db142fa2440989ea98f6714e3382';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '0752b7ec56b04addb9c22e5e944ed692';
                        key: {
                            list_id: {
                                id: '7583d37514ff4c0bba72561952997901';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'built_revision';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '07b43628468f4016b39e62d23bba7737';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0845cd6153ae47d9bb652a9ad489f301';
                        key: {
                            sys_ui_section: {
                                id: 'd008a73cc75e473fbc08d659a52c1ad0';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Scripts';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'badge_script';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '08498264d7c64b109daf77015fd9babb';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'instance';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0852ce87752a4004a6dcf8bc72d7399f';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'label';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '08715d75a3f34f02b747624eab816607';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '08fa4b56a52d4e6299b97dc2911d9d2f';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'slug';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '09315789c8484a81ac28aaa7d82b6911';
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '093265daf0884b59873b56263b90b0f7';
                        key: {
                            name: 'x_312987_portal_portal';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '094069f49a3a439c8874e8b8f4524fa2';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'tokens_json';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '09b02d9faa1c40f29521bc88b9a72365';
                        key: {
                            name: 'x_312987_portal_record_field';
                            caption: 'Record header field';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '09fedb3ce7234da8b5928656bea1f645';
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0a26d60dad0a4323ba4e9775e8275975';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0a3e2908c4304bd19852779578798dbb';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'table';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0a5892c4ea1c4a72bbc40728674d2fe1';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0a944fe1ccb1480c8e9b9940355c0b11';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'is_default';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0aaf7449d5d04e09942bd9f9d5b7df87';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'visibility_config_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0ad3bf3fc5bb4c8e97d768af734d216a';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'theme';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0adb2939cee94b5589fd7143cc255d88';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0aff4919eeff43a782cf1f374c58f61e';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'owner_key';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0b3982ec329448bfbce96a85f56420dc';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'options_schema_json';
                            position: '18';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '0b4d019a59dc49109f80e5a0f7651f50';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'unique_id';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0bac5cd0c7ff43c4904b3c92f50a79d7';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'exports_json';
                            position: '20';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '0bc3d65038394b25aeb2a2d0ccc92fa9';
                        key: {
                            sys_security_acl: '79be2e86119144a3b0af10affdac1374';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '0bcb18cd6f9446c9948693509ae51e26';
                        key: {
                            logical_table_name: 'x_312987_portal_source_file';
                            col_name_string: 'owner_key,path';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '0bceaaa4193e455692d8326214108156';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'match';
                            value: 'exact';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0c01c3d6324d4d7087f98d39405b86bd';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'config_in';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0c2675bea00a4ca08cb3479ae4efd6e7';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'route';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0c789e2fe3594fdb84c4d5ffcffbcd01';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '0ccbdfa69e734ea59d9da160b1c0bcca';
                        key: {
                            sys_security_acl: 'bd4470dbb8204073af688550bd4056d2';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '0cd2e62efaa24a3eade8bb9d4180d986';
                        key: {
                            list_id: {
                                id: '34ea8fd3b89f4047b2a04d8961f3b11b';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0ce473c560964b97ba8019801b419d68';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'package_version';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0cfa07f46e6f49fbaeb5846163586e0d';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0d2a9028ec6749c6849cc9221b8328e9';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0d2b44982a3843b1a59ed33918e88074';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'match';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0d560d3389414cdda993e8991addac7d';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'theme';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '0dda362c79414bbfabc37f852a4e806a';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '0e68b59a31034e218493d222eb4b0e39';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0e69897f3b8d491aad6b4b75559c296f';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '0e80ac3223dd4606ae74afc302acec91';
                        key: {
                            list_id: {
                                id: '63526d64a5404425bb5f717753f7b1eb';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '1e73a4e3eb2840caad1479758113a74c';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '0e8e441c07914a749e6bb7690e334121';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            value: 'css';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0ec937c588e84678829fcbcec8149bb6';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'encoding';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0efaaa873acc45b6afba8bcbef354e7c';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'headings_json';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0f0b796bef7d46bd8e9e0691bb7679b3';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '0f0c36485b154dd08821712423427751';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'origin';
                            value: 'repo';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '0f439a4d4cb944c1b4b73598c168cc3f';
                        key: {
                            list_id: {
                                id: 'e43ab5a0c2ab4199a2538c46be5289a7';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0f67cd719af94a5e85428753d011149b';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '0ffb7752a5d94079a90642e5980ecf89';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '102404c50cb54a16a2f9425d43f06c93';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '10384fa30c494d37861a5b6fb23a8ab2';
                        key: {
                            sys_ui_section: {
                                id: '79cdcfcc5ea24890a3bfaa3c2406afcf';
                                key: {
                                    name: 'x_312987_portal_page_uc_no';
                                    caption: 'Page Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '10a2582f9a8b4a1dadae06a502789a3d';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'placement';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '10ae5dbd3aa5487da5ec87b707d6e003';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'default_options_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '10b4a7e1d67c4a6c8b45e80cc0c5305f';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '110ee07ad520465f9844f9b56b161025';
                        key: {
                            sys_security_acl: '086652282c414903b3618bcc0e1160f2';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1169155c276a4e22a468586d6af322a2';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'default_views';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1173cd6bad294ee6a3713b026aa2a81a';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'style_tokens_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '11ac434110c14fb6bfeae8443ddb4502';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '11c3bc2933e746d190998df4e7a5a358';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'portals';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '11d7e95fe8e14e2eb76afb5c8f9479ec';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'action';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '11db7e501c9a49f8a15b9eaa45139747';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '11f2d6de144949efb0e88a9447159af1';
                        key: {
                            sys_security_acl: 'c1cf1de959324e448a1dd33708dc3e24';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1200333b39ed48f9aaf8ea8e81b861ae';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '121df09f189d40c9b0803087edeb0b2c';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_doc_collection';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '122c2db209774673bf4d1f03612e611e';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '126aaa2d5a284466b6f7eaa73c3c7514';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '127a5beb5b32472fbb81ae7ca6ab1671';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'view';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1289bba49b754f1faa53d9646005e6e7';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'content';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '1338c7c7db404910a3e8fd6c3340da27';
                        key: {
                            sys_ui_form: {
                                id: 'fb8126e9697044d1a21fc888b731fe83';
                                key: {
                                    name: 'x_312987_portal_page_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '2317504f51f34c2a974ee5cd2b6bf6e5';
                                key: {
                                    name: 'x_312987_portal_page_uc';
                                    caption: 'Page Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '13413dd563a84924930e00150393393e';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'visibility_config_json';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1380c208c8344037a04fd4ee15f23e4a';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'url_view';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '13b18a0210184bf7a869cfcad6edfb9b';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '13c1551399374700b8633ddaa3dc9d28';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '14274923f43a4130ae2367ad909287ee';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1450618fdeb84aed9732759c57d0c1d3';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '1455ae977dd64cb9a03b707e6f29beef';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '14f101b6e1c74eac8eb0187319b17514';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'needs_rebuild';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1608fc9d957c4f54b6f0e72222b581f9';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'key';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1626e70e13964f10a84ab2052f50de77';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'seed_hash';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '16285f382a2349c58bcea36eaf1f9dc9';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                            value: 'failed';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '16317e35201548589bba662eb12e91c2';
                        key: {
                            sys_ui_section: {
                                id: 'bc19d47a62b840bf9521ec865d2c25bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Assets';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '12M.x_312987_portal_build.x_312987_portal_build_asset.build';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1642ab97200d4a07bdfe495ff689d4cf';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '164df4eb290449c2bdf0eadd38ba80e0';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'diagnostics_json';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '16632f86aceb47099c2df3e41ddf9dee';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'host_export';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_ui_page';
                        id: '16e218296bbe4a94995531af4a4376ee';
                        key: {
                            endpoint: 'x_312987_portal_incident_manager.do';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '176636f729be40d4b392acd1062a581b';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'content_text';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1775c881975a45a490644c050108d63d';
                        key: {
                            sys_security_acl: 'fac866c5dc3e400095bd95e31f9ea60f';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '178f4dc3b194404292f8ce2e494272f4';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'parent';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '17c941662bfa4525b5c8d1ca9d9aac77';
                        key: {
                            sys_security_acl: 'd9201a732f5c4208bf96da0b1d0ecd2e';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '18ace13f89f54e9197ef24f186dd45e0';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'problems_json';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '18d4efb6d74f41799fc058c6c3910c37';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'origin';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '18f8d840ddd2441db35df96b6ae4ecaf';
                        key: {
                            sys_ui_form: {
                                id: '49b2f355a8124a5cb40aed47582e959b';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '753810b5dde6481dbc947085132a637d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '192c011fc49c4519937faae7584cee75';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1946ed649e014f7498abef3bd78fc919';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'title';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '195257aa65be4a399539724a5ce607d9';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '1985d5847821497a95bb7d51c6014c7d';
                        key: {
                            list_id: {
                                id: 'c4dc983cbea24413bfd9df8b2125c4b6';
                                key: {
                                    name: 'x_312987_portal_portal_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '19cb3a8ff52a4742a99e2da24e578059';
                        key: {
                            sys_security_acl: '357bf49e0d104238956dcdeddbbeda85';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '19e86a5060d5491c9b9f736522c8b293';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '19fab2c986ff436fb3c86ae8172bd1b3';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'regions_json';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '1a190b76144e4089a6deb857d1942696';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'page';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '1a1df7f61b4b4cc4a5089e647fcf56db';
                        key: {
                            name: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1a3aaf7314f34fbda1f71c09a7d8b938';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'settings_json';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1a4667160f75427db847bfcc5581f585';
                        key: {
                            sys_security_acl: '2ad6f262425749079f4605043234cf32';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1a68e9dde1dc4a02ae2e5cfdee5c2e9b';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'collection';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '1a8534742bb141f69f4cf46fa7e67184';
                        key: {
                            name: 'x_312987_portal_execution_log';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1aa0756984ae416bbebdd71e8c13aeb9';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '1ac9557f25cc47c189501e75b73b2e26';
                        key: {
                            list_id: {
                                id: '6155f958c13d448a917f27136d365293';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'region';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1ad2190fa2664511a49765ee67ab15cb';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1b0f0121e2f946fdadbfb7f7feb9fe9b';
                        key: {
                            sys_security_acl: '90693bbc7bfd4da790de4ae8877da1b7';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1b7040fd62ca4f238e8c5e3ac25bc349';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'sheet_pending';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1b8429910d014e0cbaf751c16de5431a';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1b9fa917e674405ca011994bd2c36526';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'client_script';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1bce3802c3c64c6a85fa39b1a80efec7';
                        key: {
                            sys_security_acl: 'a968f2f685684c3f9c333f4804ffddc1';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1bf2526e2b92495fbeb14a9b56ad064c';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'name';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '1c1c7ad8f03c4fa39f351d0492f48c9d';
                        key: {
                            name: 'x_312987_portal_view_rule';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1c365bfab0ff485c9db06cb1fb4e1e8a';
                        key: {
                            sys_security_acl: 'be337baca61f417fb58ab93188b955d5';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1c7220f97b044627b97d6600ba16aa80';
                        key: {
                            sys_security_acl: '28c7990032314b35bd6c82172125e949';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '1c8e1881f89841a29aaccee9a6a96c94';
                        key: {
                            name: 'x_312987_portal_source_file';
                            caption: 'Source File';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '1c933d775da448e0832a40f370535b7d';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'field';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '1d0338ad893b439cb8ca2cc49ef58151';
                        key: {
                            list_id: {
                                id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'built_revision';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1d1087d589da4afc96f6b23494ad8c1a';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1d23870fc19445248ef5af572dec60b2';
                        key: {
                            sys_security_acl: '34a507dcd5214ccda88c18a7f2778a18';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1d7f51f904114e7699214a7873f27256';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'menu';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1d80949e9b2c459e990023124f9fe5bd';
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1dafc98be7ee4eedb40a6e8e6332fa3d';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '1e012a3d7c7747c388da4340b0f3d998';
                        key: {
                            name: 'x_312987_portal_source_file';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1e0fb66b585d43c8b42f0e11fa6616e3';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'revision';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1e3c9aeab1e244ef82fafb2ada6d1182';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1e625a67ad6f4571854af8a53c4eaf81';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'home_page';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1f387402cf9c46b187322595e4ac07f4';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'icon';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '1f4c03414d4b4a50848d92b3adea5ed9';
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1f512b1066d745bd8f231303195d73bc';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1f55d8795da246e68ccfcc9c56ccb01e';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '1f83771eb273489a9c49a8ed8d5f0159';
                        key: {
                            name: 'x_312987_portal_doc';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '1f874a3518184e79b6af9a956582b4e8';
                        key: {
                            list_id: {
                                id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '1f894760a21d40a99c16f406bd2c1563';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'roles';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '1fadae7c833945de9eb82c39854fd006';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'key';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '1fde28e3e2744288a9f71620492f1fc5';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'mime_type';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '20626024692b48259ec4473ba5c046a9';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '2087686d90414057b2e56e73c92b1b8b';
                        key: {
                            list_id: {
                                id: '7e2ca20f84ba4d0eb5582153b433776c';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '209943e7bd764b3f95ebedf135bcf000';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'revision';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '209e540fcb984f99ac9aa0e2080a29a4';
                        key: {
                            name: 'x_312987_portal_page_uc';
                        };
                    },
                    {
                        table: 'sys_ux_lib_asset';
                        id: '20a184ca6305438d97ecb927ffe721fe';
                        key: {
                            name: 'x_312987_portal/main';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '20ee26bf315346859242f0903aba4cd7';
                        key: {
                            list_id: {
                                id: 'e43ab5a0c2ab4199a2538c46be5289a7';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '214226c80e2246f29e7fda262dcb7b08';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'field';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '21484ac3f53948e2a4dca3a6e91ef553';
                        key: {
                            sys_security_acl: '0b5ea8c1491a4ae38adf8a5e34a89145';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '214a592f10744d81b62b1897012b2ac2';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '216273ce3c2e48739348d22ff30a77de';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'namespace';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '21d251abeec8413883279abcb89f3626';
                        key: {
                            sys_ui_section: {
                                id: 'd008a73cc75e473fbc08d659a52c1ad0';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Scripts';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'condition';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '22157da517a24b758293d78154f67c5a';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '22856e8e84284f55a2fcec3d6c9a0c7a';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '22fe43c14aed451cbce2587b687150c6';
                        key: {
                            sys_security_acl: 'bf3ff613b9e44f8cb9eacbf62aec8735';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '23049525215d4358a753c71e1b0204e9';
                        key: {
                            sys_ui_form: {
                                id: '60e2ac4965a74a1382a533456e47b638';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '2317504f51f34c2a974ee5cd2b6bf6e5';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            caption: 'Page Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '23223bb1fbec445790ae1481d4c378d0';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '232970d7a3b149f58016bf5c83960151';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'missing';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '23897e57aeea45e79295a1ef966bfba7';
                        key: {
                            logical_table_name: 'x_312987_portal_doc_collection';
                            col_name_string: 'key';
                        };
                    },
                    {
                        table: 'sys_user_role_contains';
                        id: '244c12f542b44ff98803a0b1e4b8f01f';
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                            contains: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '245f7360e1f549d984a24719b5e183e7';
                        key: {
                            sys_ui_section: {
                                id: '0052b3a8b8f24dbfa8f39cdcd0c10532';
                                key: {
                                    name: 'x_312987_portal_item_uc';
                                    caption: 'Menu Item Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'menu_item';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '2490f79b3d0546f7ae31dfabd10330d4';
                        key: {
                            list_id: {
                                id: '4e17906504b04942aea617a0c78e1496';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '24a56d61de7146bbb36af6c55e9fd8ca';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '24ddf50052f04c5eb1cc46bcb93def41';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'theme';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '25077b5df71a4598bcf6dae36d92cc28';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2547c119aeca4fa1bfaf8275a6b694d4';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'layout_override';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '256e654b9a4849eb81b97df58ee80863';
                        key: {
                            logical_table_name: 'x_312987_portal_doc_section';
                            col_name_string: 'collection,slug';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '25c99e3fef4445369f7cb2f8bfda1006';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '25ca4931fe424289b2af9a57afcea985';
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '25d3e8dca5ca4fd39fc4a07261f0710f';
                        key: {
                            sys_ui_form: {
                                id: 'f4560beac2e545b7914ecd4306785a52';
                                key: {
                                    name: 'x_312987_portal_portal_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'ac0446c09bbb46fe8ff1ddeccc03235b';
                                key: {
                                    name: 'x_312987_portal_portal_uc';
                                    caption: 'Portal Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '26b1521e2ebc455691091dab23ca4af8';
                        key: {
                            list_id: {
                                id: '0dda362c79414bbfabc37f852a4e806a';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'specifier';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '26c59391033a4de983a1229918050050';
                        key: {
                            list_id: {
                                id: '4c29705d156a458cac8883b60b947c25';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_placement';
                                };
                            };
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2730d4775c734c2d9ce8e1fa18485ce5';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '27beb25a48bd4e0193926690596a7ece';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'mime_type';
                        };
                    },
                    {
                        table: 'sys_user_role';
                        id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                        key: {
                            name: 'x_312987_portal.admin';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '27db35c2467741819f243e79fd145fdd';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '281e5db1453b495cab575721f4a07d8a';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'build';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '285fdb717e784ee7800f1a23651fbb7a';
                        key: {
                            logical_table_name: 'x_312987_portal_page_uc';
                            col_name_string: 'page,user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '28aac522f058462dbcc1326f9319cd0b';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'theme';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '28e364b0d01743a0b13a00e006b015b1';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            caption: 'Portal Not Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '28e646fbdc824c69b25b434d214f5a9c';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '297f1082a8b445928b79b63439d74795';
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '2983a67f3e774961b7a085053372c39b';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            caption: 'Execution';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '29d2baca02e54afd84fc08dcbb1445a4';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'build';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '29e3f61a958f4a97a136856693175ddd';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'built_revision';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '2a56088a33d14151a45f2d57c3ca25d7';
                        key: {
                            sys_security_acl: '3a6b630555304dba83e10b607bb0fb13';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '2a8496033b8447fab09ac079c1b0c1fc';
                        deleted: false;
                        key: {
                            logical_table_name: 'x_312987_portal_doc';
                            col_name_string: 'path';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2ad33e7e9d7949d9aa422c3a875c7dee';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'condition';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '2af5c7e2ceeb471bb16eb6b86495484d';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2af616dba7564eada67659181d169390';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'runtime_abi_version';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2b3b97edb395492ba37fb73fe1a0490e';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'processed_at';
                            position: '5';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '2b946ffaa4294522b029b0d7a385ea2d';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '2bbaae1394534ce7aaed13ca087b08bd';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2c1fab4da270455b86b4adf776fc6115';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'server_mode';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '2cb241a8cd704489b9771983480e2ab7';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'group';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '2cf18aa95b8247538c01b350aede8242';
                        key: {
                            logical_table_name: 'x_312987_portal_release_entry';
                            col_name_string: 'build';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '2d3aa916bfbf4b65846b11b9cde9ebdd';
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2d3e61e31f6349729d1a4277545cbf6f';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2d4e400e19814dcd866a2cd52388ae08';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'mime_type';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2d4eef51c4a846148866b5f8226a2840';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'mime_type';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '2d940a38a2f4403b9ee31b76684f96f5';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                            value: 'relative';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2db709988fd84f6aab28297bb01b936d';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'namespace';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2dd6d08898734f299122b8b8f7eca98c';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2e6b497647dc4be092fce0112d7c0bb9';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'roles';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '2e71f906c5b54d109e50fb281ce13a65';
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711';
                                key: {
                                    name: 'x_312987_portal_component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '2e7e32b032a242e3b64e4f641e21b3d3';
                        key: {
                            sys_ui_form: {
                                id: '093265daf0884b59873b56263b90b0f7';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2eb1aba11c3948559506c1fb43234e2c';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'stable_key';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2ed9c42f798d4f4d841c31caab15eeb5';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2f0504cd4be54b7592a56c9665341de9';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'css';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_user_role_contains';
                        id: '2f2531b9b94f4cab9f3821015820706f';
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                            contains: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '2f2a58d68dc4457f9d9938ece4dc703b';
                        key: {
                            list_id: {
                                id: '0506fb5b855741c5adfdb26a8238d598';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2f4a96c996414b97a9976ac26e165e1f';
                        key: {
                            sys_ui_section: {
                                id: '86baf561d77948abb736964bbc197cb9';
                                key: {
                                    name: 'x_312987_portal_item_uc_no';
                                    caption: 'Menu Item Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2f8b38d33e5c4d4fa64802670dc4f6df';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2f929cc75a114ddbb88c4aeaacea09f9';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '2fadc499f2a04fb9ba997a8a56c46af3';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'region';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '2fbaa4649efd41f7af296c2cc2a9f432';
                        key: {
                            sys_security_acl: '3720d57546a84ea5b3d6dfa63541d89e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '2fc0bcc304094d3ebbd8341401800ed3';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '2fd48b68c08d47f08297f2d0c6900889';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'path';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '30310c059d6c40889f4e7885550cc676';
                        key: {
                            sys_security_acl: 'b81a135a56104bf2869c86049b840d52';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '303a6fe01583409fae18a507ea3511bb';
                        key: {
                            sys_security_acl: '49ce7530de4849948abbe5219a3a648c';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3055b4f9eb5047fa88430f21b9d4288e';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'instance_css';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '30636f3530eb494088002748c74cc917';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'seed_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '307782c21eb84d38a8d660e2dde395b9';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'kind';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3092f7b711a44e3cb6d1cadbc0473241';
                        key: {
                            sys_security_acl: '81a2595e06584145a83dcf6977d8d896';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '310a335112de4805a4154c87dfe1f881';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'route_pattern';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ux_lib_asset';
                        id: '31230aad63ce47e4bd58fd08fbfe2908';
                        key: {
                            name: 'x_312987_portal/main.js.map';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3167c388dca8405483c7a8283d258645';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '318629f0179b4b198402b60bc21c8f0b';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '31a731d4424e43a8934101c4dc3bdc99';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            value: 'js';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '31f146a3ae9c45c99f1a332a753bef62';
                        key: {
                            sys_security_acl: '650c74a0983843c992449f76bbf47c39';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '324ed3282f8f433f9d91bc4a94cd8048';
                        key: {
                            list_id: {
                                id: '7583d37514ff4c0bba72561952997901';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'state';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '325a70130d464742bdf1a28e89d19ec4';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                            value: 'theme';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '328026a41a7347fe92db421700bf7134';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'encoding';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '32a0b4baca034242975d73c3b2989eea';
                        key: {
                            sys_security_acl: 'bfb72e9906af471092dccc2979f3be78';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '32a14cb413ce4ebab2f63f830b5d2090';
                        key: {
                            sys_security_acl: 'ca512051fd344ac09e8cbf0c92b82c5b';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '32e221d0b9eb430fa6628f96a6cfed45';
                        key: {
                            sys_security_acl: '2fe2a5f1dddc48d2b41ef58ccc91fd5e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '33599e8b9ac941d0b08dc1f4e36ec7ca';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '335bba7389c14bcc8b8d757cda34c8bf';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'reason';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3392ea3f0f7e47baabbf4d54dff9ca95';
                        key: {
                            sys_security_acl: '909bef3da11a4f5f9fe04eac0312236f';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '33b77be1b81649e9ac76b6456bf7839f';
                        key: {
                            list_id: {
                                id: '0686580e8f214d568d733dec58c45f8d';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_section';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '33c526b355e14304bcaf3e6e104ed612';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'byte_length';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '33def8683bb2428db3c3d335aaa1ab26';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '33e7407d9afc48c4ba3e65192d040e91';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '33ead82857a34c8d88d414239aee90ba';
                        key: {
                            sys_security_acl: '49ce7530de4849948abbe5219a3a648c';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '3407a0eafaa74712b9389235d7c10eeb';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '345661bb019a4591898ac9fc854616ca';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'host_abi';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '345d01c6527246d1933fa89b9d7cd9cc';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: '7xl';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '345f1328bcbb4588a0b62a6c9fa34a0a';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3499700d11a6405782ff326d9ce7bdfe';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'name';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '34d12a170e66405faf4c64453e88c20d';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '34d5e6686d3140b0bb36feea989cf594';
                        key: {
                            list_id: {
                                id: '63526d64a5404425bb5f717753f7b1eb';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '1e73a4e3eb2840caad1479758113a74c';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '34d9dffff39b43deab3b623874d778c5';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '34ea8fd3b89f4047b2a04d8961f3b11b';
                        key: {
                            name: 'x_312987_portal_page';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '35503f4bb7764b26962894215856e4bc';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'params_json';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '3596779e87bb4296b80df15ee84b7d77';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                            value: 'form';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '35b63b5b9b10434aaa71bad48adc48d6';
                        key: {
                            sys_security_acl: '843a538cf2cf44c1a852b2e07cd7f9c9';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '35c0033140ff4fadae652269599dc386';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'options_schema_json';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '35cf98582b5d4088aafbdbd0b8f061bd';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'theme';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '36003519da204db8aac21bb6bee81a64';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'sanitized_error';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '361aa120e1c54f0babc4ef324ea43644';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_meta';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '362fe40af9764bceb6473dd5d774174e';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '36309b8852b840c18ea8c4ef95ba348c';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'title';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '364a0589fa7a48969b292e9b2d94fe34';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'built_revision';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '367adbc0e905420e9109988db90ce64e';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: '3xl';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '37338248a7f647acb58b35def654e893';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'views';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '382f4d87147e4cb4850173ac912ea25a';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section_order';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3833de5277a54269910e6be7ca06671d';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'settings_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '38b49fb9320b4447965e9ecff73d4783';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '38b63ed47ab34ab7bb3c37f570038c32';
                        key: {
                            sys_security_acl: '3c05001f9c9643aa87481c1dd2eda1ae';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '38b88c08af1949138ec817f0a508745b';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'options_snapshot';
                            position: '18';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '38c7d458c5064ac2afcacc0a4677144d';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '38ccbe64bdb044f991ac77d6fc4e34e2';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'navigation_json';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '38f70a4bdfa643b997f67914a25d42b1';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '390ebcad723649669bb277bf4ce80082';
                        key: {
                            sys_security_acl: 'd39aac86f7da40b59041e2f799839894';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3938c9cf92eb4a61a2bcbe16a93a7de8';
                        key: {
                            sys_security_acl: 'a86e2fc5d50247dcb5635a5d60d3243d';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '3939514612fb4bbebe0f2e9bc000a8b7';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                            value: 'component';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '39399a57851c4b88b60d1b883c8d8c1e';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'last_error';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '3948a2d4abac4f36964813b7974a2dd1';
                        key: {
                            list_id: {
                                id: '34ea8fd3b89f4047b2a04d8961f3b11b';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'route_pattern';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '39521bce7896415ba3971afa74e4a677';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3952ed656d744038b67c940337a2de17';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3960f26797fe4b18ba182fdd74bc4462';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'key';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3963639a6c8b46549d444a461d5107b2';
                        key: {
                            sys_security_acl: 'd4a45248c5294001be9078e3b46dcf1b';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '39a68c89c34a48fa8a5fa27e17a0385b';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'theme';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '39ba72b0c24146bda84cb46e0d5235ca';
                        key: {
                            sys_security_acl: '357bf49e0d104238956dcdeddbbeda85';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '39bd777664ed425db9f679a25a413bdc';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'lock_view';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '39fc61d984b24ababc0e99d091f81831';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3a19aa8b05cc4d84bbd5111550fa3588';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3a2081edea3447f495fd965a65b9df2b';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3a60e78eff384d52b60832479137477d';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3a77b86c56e744fb989d96a6ff1bb488';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3a85d8e4e1154c2cb126b79abd96f3d0';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'tailwind';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3a8cf1f138fd48eabcc9f0f28160d4f2';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '3aa5950bec1449f9b0c5059edeec155d';
                        key: {
                            name: 'x_312987_portal_theme';
                            caption: 'Theme';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3ad741188e8b49fdb85315ad46b52d0c';
                        key: {
                            sys_security_acl: 'f4775c8d06954c84897a98b6e86c37ee';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3adcf1cc016f48e289dba5b47a5273bb';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'manifest_hash';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3b1d740c72a94cff87f7a57693facab1';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '3b41b36966144ec394f5b5a697496700';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                            value: 'style';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '3bf9948645364a4f8ab4054daf6bb463';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_menu_item';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '3c05ffe068e540f0b18dbee1a11c2d96';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: '055fed37c1644805a6dd85a6578a6a53';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3c25d03cde7b4ab998fff83fa908ef96';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'seed_slot';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3c2865e1d25f46fe8ea04919b9d1e6c0';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'layout_override';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3c4d05b6aae747e1aa6d029474108700';
                        key: {
                            sys_security_acl: '48b2fcf706f94872bf4fe9c0ec2d8525';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3c5ceb6547844cb4bad9b3140e449d4e';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'correlation_id';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3c62f390ca5b4543aec65533becd7cd3';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'advanced';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3c9732b945e94e828ae7c1de72e32e58';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'action';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3cb3b70c48d5485aa6c36e19807648e6';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3cb749a8db7345fe93feb5d464f110eb';
                        key: {
                            sys_security_acl: '101358b57c33406691128e90d677953f';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3cd29d3774634fdfa3ced2bf57568c98';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'content_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3ced23968689409dba6dd91113ec1f2a';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3d006e14e1a24dd6b8a98d1165fef516';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'icon';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3d2eedc2e9344bd0a03f89139ce3dc80';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'build';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3d4c15c3d17740fbb639868d874dc90f';
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3d7d019598a54dd2bf58d90b549417bc';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'server_script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3d9838045c004288884749f581cc986a';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'server_mode';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '3de5d6c724954500a30117448d5d523c';
                        key: {
                            list_id: {
                                id: '4c29705d156a458cac8883b60b947c25';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_placement';
                                };
                            };
                            element: 'region';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3dee6a027e4442ae8f123daf1e53bfa4';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3df779a2f1934e04bb9c276573fd9e5b';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'manifest_json';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3e181b774fb046b281692f22e84d9cdd';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'slot';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '3e76fe3df5dd41c19c6582a23cca1f4b';
                        key: {
                            list_id: {
                                id: '6088a1152aeb446ea00a4708c2f0d029';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'key';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '3e8fd510ddff487fae4b5d4219bed4d0';
                        key: {
                            list_id: {
                                id: '0686580e8f214d568d733dec58c45f8d';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_section';
                                };
                            };
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3efab3cc9b8b4cb6980461ce067ccf95';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3efb17aab9924be4a94a4a201eee7a85';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'menu_item';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3f07f42156c94f3a95862bc415e56ce2';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'parent';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '3f09fea0f0294f22b957282f72b4aea1';
                        key: {
                            list_id: {
                                id: '34ea8fd3b89f4047b2a04d8961f3b11b';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '3f36a9c4f51a4401bbb78f97db8885b2';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'markdown';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3f3b7d4f50164e71a28f2c5699c6af16';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'badge_script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '3f4d5d57c4be470cbb0ebc894514812f';
                        key: {
                            sys_security_acl: 'a1526f5aee0d433aaabef12b7c40e7f9';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '3f903851799c4f8b90965ca059d64167';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                            value: 'none';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3fa6963581c04fcfbb6390a0f2de437b';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'view';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '3fbbe4e2ddf74916aab157510c2a6cec';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3fcac1a1ab884f8dba430e52b4f4e83f';
                        key: {
                            sys_ui_section: {
                                id: '2317504f51f34c2a974ee5cd2b6bf6e5';
                                key: {
                                    name: 'x_312987_portal_page_uc';
                                    caption: 'Page Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '3fe1ed00f19244fda1ae89250ec68c8c';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '401aa69a0d504a69af58682b873d1a40';
                        key: {
                            sys_security_acl: 'ca512051fd344ac09e8cbf0c92b82c5b';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '406ff12a68cd42ebb0b5903683b300fb';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '40abd39639c74d388af02adff3cfe28f';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'access_config_json';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '40d50da9ea204a6a8be065320e48ffd0';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '411fb358845a40f980fa8f1fa63a2ebd';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '415238db5b8f4fb99e6589934580c043';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'manifest_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '415b852b985746d9aa51e1e335bc3e71';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            caption: 'Doc collection';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '415c060cc816492db4f5a2d95515d5d2';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4164cd55ce374ab1bde3c4f793e403e6';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '41cae9b9659940b4b6d4095d1493838a';
                        key: {
                            sys_security_acl: '0f2b57beef0f486bbfdbe40994136ae7';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '41e44c9db24e41c0b4a40d4fc28a48a2';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '42662b9711ec4d4a8e65364154425b86';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            caption: 'Release Entry';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ws_query_parameter_map';
                        id: '42b07042358441138107060e666a5ca5';
                        key: {
                            web_service_operation: '17e5684834b24b1b99264deee3f2fac2';
                            web_service_query_parameter: '5c5541b9ef65499d85b0e93256fdad09';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '42bd30efe29f4aea94d465e8ae546371';
                        key: {
                            sys_security_acl: 'be337baca61f417fb58ab93188b955d5';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '42da7206a3544345b2b39b32b193a6b6';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '42e79df5eea34f8889ae31ace01b9e74';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'url_view';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '42f16577de894fb4b40418f1551570d5';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'view_name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '42f2f1cc9d5b46679cb190b5ac9ad5a9';
                        key: {
                            name: 'x_312987_portal_doc_section';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4320de1f438341fb992acf71ed35af91';
                        key: {
                            sys_ui_section: {
                                id: 'ac0446c09bbb46fe8ff1ddeccc03235b';
                                key: {
                                    name: 'x_312987_portal_portal_uc';
                                    caption: 'Portal Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '43320d8f8c1a470e8c9e5793315f9135';
                        key: {
                            sys_security_acl: 'ba60e358ace5472eaed179973fff36f8';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '43339d0eacf64ec9b77c8140d2980032';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'roles';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '43602826561c48e39738381a587458fb';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '437c2e5ef3e348fe923d4bdffab0e673';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'content_hash';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4409b6051458496cabfc81cc54a6c020';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '440dcc9a8abb49968a0de399b0f8af03';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4453d78c00b84e52b7adb40c8e4cc09f';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '44890ed5aa454cbda4e7163c801ce7c6';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'roles';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '449c2cd360fe4ff4b048ae756a3d6bcb';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'resolved_entry';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '44b1c27278864ba5bb8b573c49ff7f2f';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '44bff2f681a24994bfc34de33bbaefc5';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '44dabfb9e8214bb2905560a030ae0afb';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '461652b8812d427793dabc5ecdaeb1a5';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'theme';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4631cc25f0a94a99ad7e3adda9dc8fe1';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4642246fbd3d4f3db0de220a1bfc8931';
                        key: {
                            list_id: {
                                id: '77ad3bad573c4abe96379315d5ae711d';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '46bb120642984592b3a3c2689bbc5d8d';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '470721a52f6441e0bb89df70abb4d47a';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                            value: 'error';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '47087543901248f6a8edd526f77e2166';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4710deef2aa444afbe11d25701b14047';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4747ef2bd96b4d2eb0b4143ed216e3e1';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4774ecd951fc451b8af59fdb09b9721f';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content_hash';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '477b07640d114f70a1a8672ccf59c694';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'path';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '47dff86ccb394037a8066744d07d17bf';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'utilities_meta';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '481c99430426412b95535b597a64adaf';
                        key: {
                            list_id: {
                                id: '8d053fd198474c6884fed6e8dba6b201';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'ef742e520459439c9314fadfd2f827fc';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'target_build';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '481ef2624b5e4be0914c1b2cd0a80a7e';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section_slug';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '483ced20c38d4f4cabaa36705639fde0';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'tokens_json';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '484f54b364ef408cb9f0069d191913f8';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'correlation_id';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4851ffff65b64b1fbc56e28f633d74d6';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '48741e4236894795b49a5b35e4b5d952';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'slot';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '488dfa51294049e5ab9c2df9561a2395';
                        key: {
                            name: 'x_312987_portal_build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '48aa180a660d424a969cba2558faaa4e';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '48b1effba70048d98541b30a2802201b';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '490bd2730f0146cd9e82cd4b9a5f229a';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section_order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '494ee19e367e4b83824ee408a14c015c';
                        key: {
                            name: 'x_312987_portal_placement';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '49794e80708446f1963061cce45c44c3';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '498121458c57474b85b8a7e0cb99c6ba';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '498b8cbbbb6841a2a1cacc2fcc954c3f';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '499555f8f3814262aacf22e7d686201a';
                        key: {
                            sys_ui_form: {
                                id: '75c422210c4146f68ef52e6b2ef4c330';
                                key: {
                                    name: 'x_312987_portal_page_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '79cdcfcc5ea24890a3bfaa3c2406afcf';
                                key: {
                                    name: 'x_312987_portal_page_uc_no';
                                    caption: 'Page Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '49ac4e68844c403a93da10af3b9f1f99';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '49b2f355a8124a5cb40aed47582e959b';
                        key: {
                            name: 'x_312987_portal_theme';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '49f3c8099db24ab9b3158c5d8cff00e4';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '49f82fc2ae7b4b23a110ef19f5e3bc35';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'region';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4a0b6128ac6c49de8f1e78abc7aa8561';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'placement';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4a13ef628b2745cb872504bf76eedc6b';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'doc_section';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4a188dc5468141d19996273f25b47cb6';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4a4ee3959f824e08bf60fc497b0d6cc9';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_hash';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4a57fd59143449229c4bf18a29e53e74';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'owner_key';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '4a65f3493e8041e0b8d418c471a0b750';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '4aaf56667bbf4f1fb135193d2d81ef91';
                        key: {
                            name: 'x_312987_portal_record_field';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4ad09794c0644fefb70be784dbdef667';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'processed_at';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4adfa60f41ea4936ac0a8706243402fa';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'source_path';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4afd9048a64f4f60bd3f8eb36ea31806';
                        key: {
                            sys_ui_section: {
                                id: 'fabfd4ed419b41d48f6e1aca498703f5';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'collection';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '4afe0998318148208d30806cbdb51e96';
                        key: {
                            name: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4b255136e91b4f948a4d0f4b28ba2000';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'badge';
                            position: '18';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4b70118c742f46969a0cc680fd2e57f8';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_css';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4b7a07ac38184ebbadc79e922478b022';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'layout_override';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4ba5d6c0226846719c309c7dd289395c';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'config_in';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4ba763c754704c26a4831913416a715e';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4bbb3c8b6377498983ab498b989612df';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'is_default';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4c00e44c4576401b9ba17aec0711309d';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '4c29705d156a458cac8883b60b947c25';
                        key: {
                            name: 'x_312987_portal_placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_placement';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '4c8f09d1691e4a349d5cfbe7613b98da';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                            value: 'success';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4cb0142449944cdf97f793c4ca4da65c';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'instance_css';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4cb17239c3ba49008cb2c5ec255a6f78';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'tooltip';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4cd116043ee74b7cb74d1257a746888e';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'collection';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4cd17e8711bd4ea1a65cf95113b3c0ac';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '4cf99cad240b473a9e83d3d024a05df5';
                        key: {
                            sys_security_acl: '90693bbc7bfd4da790de4ae8877da1b7';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4d029a5ab69f46f5898d43b7af81270a';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'manifest_json';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4d04e78d436549bfad17053911cb0bd9';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'build';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4d2685a15b3442659b5d29d7f41a7ff7';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4d73417a0a064f009d445d6f836cb5a7';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'client_script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4dd8656e7ebe4c5fb187dffc9f063313';
                        key: {
                            list_id: {
                                id: '4e17906504b04942aea617a0c78e1496';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '4e17906504b04942aea617a0c78e1496';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_menu_item';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '4e2d488bd65a4233be5f4909f9eb1dc0';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'seed_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '4e36eef8ad8948fd91c72a03ebcc35e3';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'origin';
                            value: 'repo';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4e54c08d3d674656992241f4f5351522';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'needs_rebuild';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '4e870c260234407b86fefecbbc4e7cec';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '4e8ddd578d5444d4a73d7bcbcf9e1711';
                        key: {
                            name: 'x_312987_portal_component';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '4e90deedef1f4212a5fa45e7977706f2';
                        key: {
                            list_id: {
                                id: '4c29705d156a458cac8883b60b947c25';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_placement';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '4ead91e5e7f24d55a4d2fc1c31ddd7f1';
                        key: {
                            sys_ui_form: {
                                id: 'da16a7eab3464cd4a97ff30018d4f597';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '4ebabf853f8e422bad0f6c180bb49ec4';
                        key: {
                            sys_security_acl: 'b2186a5a95764f56b5524eb4f7cb2af9';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '4f1f7a28997e44e2a05cf7ecb656a970';
                        key: {
                            sys_ui_form: {
                                id: 'e88d21f020e445a085d4d1014ea5bd3d';
                                key: {
                                    name: 'x_312987_portal_item_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '86baf561d77948abb736964bbc197cb9';
                                key: {
                                    name: 'x_312987_portal_item_uc_no';
                                    caption: 'Menu Item Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4f819739b97843f287ae6e3b5d10903f';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '4f833b5f99a1458eb7e61c74f23267b2';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'rule';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '4fc7babfe5ca4bcba792050db14dc2f3';
                        key: {
                            name: 'x_312987_portal_release';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '4fcc771cec2b4518a3ae26d56b8b1a22';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            value: 'other';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '4ffffc2493df4f628399b91776d2f8a1';
                        key: {
                            sys_ui_form: {
                                id: '793a41b0e6c04bcea1417f32b75c5636';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '502192f2d6a1479d8e0c39e1640296a1';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'name';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '508c842a5a3142b7b97c66634e582ebb';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'dependency_spec_json';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5096d6b4893a4f60b82a45d19ef2ddde';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'component';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '50e97394f57f4e2a84f489b1c4bdd910';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '50f78e22a4ea4a3491b8e05149f9bd76';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '50fae3c2130942859498dc09dc3e278a';
                        key: {
                            sys_security_acl: 'b5c2628f5c384f4db46441cbbffc0605';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '51316b0956ce4ff08145c37cecfdc047';
                        key: {
                            sys_ui_form: {
                                id: '4fc7babfe5ca4bcba792050db14dc2f3';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '695d39a55b224a10803955b5aeebdc65';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Entries';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '51934e9f457a41b1930cb85e759d0d87';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '52464447a07247ba858b68a000c83cd0';
                        key: {
                            list_id: {
                                id: '0dda362c79414bbfabc37f852a4e806a';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m';
                        id: '52611dca0e0249519287fad822977128';
                        key: {
                            application_file: '16e218296bbe4a94995531af4a4376ee';
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '527051f4d3d24b039ba138312af562ba';
                        key: {
                            list_id: {
                                id: '46bb120642984592b3a3c2689bbc5d8d';
                                key: {
                                    name: 'x_312987_portal_portal_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '52e14d6b111a45119f034cc8261b06dc';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '52ee20906c344fd6b6d69098f5f35424';
                        key: {
                            logical_table_name: 'x_312987_portal_portal_uc_no';
                            col_name_string: 'portal,user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5305a2d9a43948519dac20b68c08e16b';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'access_config_json';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '53649c9f86e5483d91d2b71756f45167';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'regions_json';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '537d3f7ce9d24efd9a8532511f1a94b9';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'owner_key';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '538fabcd190d43ce972bb20a5655d22f';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'icon';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '539cd7b462144e2b83972b5516b2d6c2';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'sheet_pending';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '54076dd5ebaf4b5eaf7a3388c7d84fd6';
                        key: {
                            sys_ui_section: {
                                id: '81668d6febee46d19f6a654c24228910';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '12M.x_312987_portal_component.x_312987_portal_build.component';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '544d29ed0f66413c8810db5361a7a8c9';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'duration_ms';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '54512f75263f4ce8b2832c0b83f9e667';
                        key: {
                            sys_security_acl: 'dd931d88774f4b27a71fcedabf62ac65';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '54a4dce615914862a2495b2bca0fef38';
                        key: {
                            sys_security_acl: '431b64c5716f457bbcd93a1f87d16d53';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '54b18dca0072436fb1dd325ea8814a50';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'theme';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '54cf2fca69bd44a286193003130f4a36';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'page';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '55211ea51c984c9f8741421c59d11b58';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'remember';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '5522590b4cd2429886959337ed9a94cf';
                        key: {
                            list_id: {
                                id: '7583d37514ff4c0bba72561952997901';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'needs_rebuild';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '552d478cfda140c0913e685be4074f59';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '554263dff2fa4a85af51bbba365610e4';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '55aeceeccadd4429a22323a4f388beaf';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'field';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '55ed3fea59f84978889bdcfacc83c41b';
                        key: {
                            name: 'x_312987_portal_item_uc';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '56038b80f90c4d559243e67d9c8691d0';
                        key: {
                            sys_ui_form: {
                                id: 'e658c7d49a8d46a5abc45272541cc829';
                                key: {
                                    name: 'x_312987_portal_portal_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '28e364b0d01743a0b13a00e006b015b1';
                                key: {
                                    name: 'x_312987_portal_portal_uc_no';
                                    caption: 'Portal Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '5613dda22d9e4b9fa65c8463ad125769';
                        key: {
                            list_id: {
                                id: '3c05ffe068e540f0b18dbee1a11c2d96';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '055fed37c1644805a6dd85a6578a6a53';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '564faa3820f74d44a07dc77a3cc94da0';
                        key: {
                            sys_ui_form: {
                                id: '06cf3c04e51c48e1bc3992d3b9543082';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5654b6eb7e6c4afcae4b97b9592e0658';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '565aef3aab33444fa120a44b49580f7d';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'placement';
                            position: '8';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '5686d8f46c5d4415a03d93bfb1b54ef6';
                        key: {
                            name: 'x_312987_portal_placement';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '56ecac922fe443c2a3a5537be5fa7971';
                        key: {
                            sys_security_acl: '7fb117d138ed444ab6b388d9b74e0065';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '570fac52470347cfa219d2ffc816c538';
                        key: {
                            list_id: {
                                id: '74fbb26ae4e54640aec4ec2d9f1829ad';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'processed_at';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '573e1442a1814c13ab048fcf6b3c23e4';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '57828caff19f441c99d0cf67fd6af60c';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '9';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '57b32a3bbfeb459b917d49b09d197d63';
                        key: {
                            name: 'x_312987_portal_build_dep';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '58150f2ecce6431fae18523c85292543';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'sanitized_error';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '584151b422d1449dacfdef16f968a227';
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '589e0a40e30040ec8cfef053228d7096';
                        key: {
                            list_id: {
                                id: '7583d37514ff4c0bba72561952997901';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'completed_at';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '589f2de236854cb4aac44769b0cc5e69';
                        key: {
                            sys_security_acl: 'dcc7ac8b198844e58ac5dd036a6b4f4f';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '58acba106a374a9ba6a3268134d68b1f';
                        key: {
                            sys_ui_section: {
                                id: '86baf561d77948abb736964bbc197cb9';
                                key: {
                                    name: 'x_312987_portal_item_uc_no';
                                    caption: 'Menu Item Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'menu_item';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '58c67460ec464e778e225cd5b4e1086d';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'icon';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '58d121f89b104c91802ce6cdde5d27f7';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'server_script';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '590656262b6846a580c54925a6312ced';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '598bd3748f2c4257bfda9d847587f1ce';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '598bf657e89c4ce5a0b49f3cefb35272';
                        key: {
                            sys_security_acl: 'e99f9ceced3f41c994d4c2e160a98944';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '59bf6da30bac4815be37182db811d3b2';
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '59e6e6763c134ff89e2ab6b380bfc58f';
                        key: {
                            name: 'x_312987_portal_page';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '5a0449f7f37a4f88a127a5a42c7b255a';
                        key: {
                            list_id: {
                                id: '0dda362c79414bbfabc37f852a4e806a';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'package_version';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '5ab9fd928b36473594758020d84d7281';
                        key: {
                            list_id: {
                                id: '74fbb26ae4e54640aec4ec2d9f1829ad';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'host_abi';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5ad02f4d7a2541aeae9e4cb7af22c82e';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'collection';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5b89d5894dc14f5aa6374eb25bb6bf94';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '5bae95cd050a495a86e77c820af7b52f';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '5bc6dba4799f401784f371c2fb702cde';
                        key: {
                            name: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5be2b8eb60e24808988922d4fd10b9bb';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'release';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5bec066d34614de987bbeec7c30d3473';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'badge';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '5bf1e8e5fc9649f1980b92bcfe09f545';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '5bf5e859837b4567a94bf9ce4bd54647';
                        key: {
                            list_id: {
                                id: '1455ae977dd64cb9a03b707e6f29beef';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'menu';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5c627b69a29f44a5969880786bc49e29';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '5c6db2ad18ff4785bf996c93afd86e71';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'origin';
                            value: 'studio';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '5c8fe9c9c8d74c0ebe8ed39bd021ce39';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '5cce78ce63d14051bd192e714bf89f19';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '5cfcc8e9d7e9425e8085d1c104c90964';
                        key: {
                            logical_table_name: 'x_312987_portal_record_field';
                            col_name_string: 'table,active,slot,order';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '5d4c826b58aa4da9b5a6ae1527283bdc';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'title';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5d4e69f5eef84b3fb9cbe0e7dfb3485a';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'seed_hash';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5d513b91085349c5bc47070cdfbe2dfb';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'package_version';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '5da3379369544d1b88ca0d9d674eec1c';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '5db377c63bff41edb947d7e9f74e4810';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'byte_length';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5dc7207e48964a88a5419eb50ab4fe5e';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content_hash';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '5e1e8e204516460a9dbf448ab836569a';
                        key: {
                            sys_security_acl: '1beee74bfbf34fa9b464677744540146';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '5e84551a7c1149028991dc6d6900e354';
                        key: {
                            logical_table_name: 'x_312987_portal_menu';
                            col_name_string: 'portal,key';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5eb7fda650ea4690a78ad88dcba84c9c';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '20';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '5ebf486d4fe04314bbb0120318a3a435';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'name';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6057bfcb33904de7bcc4c5d5748a5553';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'css';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '60618a92fc0a458687d1fc2bfea68305';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '606d7b58a92f41a4a0732837178a2c1d';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'manifest_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '6088a1152aeb446ea00a4708c2f0d029';
                        key: {
                            name: 'x_312987_portal_menu';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '609b46150a514b2c9432cda57d9f51a1';
                        key: {
                            sys_security_acl: '97c1933e4e68477bbe7a7344b586f173';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '60a8be68e6bb4e8296026c0026042411';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'compiler_version';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '60bf73fbc32943d7975fbfcbdf760c9b';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'region';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '60dc6993b5cc489db567aac94b78ffab';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'byte_length';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '60e2ac4965a74a1382a533456e47b638';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '60fbe69a0ea14a549a21bd75c9e14437';
                        key: {
                            sys_security_acl: '39d6579701aa4e18b2a3364e680eadc2';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '610a4ac950f6461f8b0811325cc7da63';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'icon';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '6155f958c13d448a917f27136d365293';
                        key: {
                            name: 'x_312987_portal_placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6168fa2bc43d4689a2ed66fa4422188f';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '616917ae4c2c48edab0d8b827b4196de';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6191feff51bb4c7db1373417b3e54aaa';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'default_layout';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '61bfba57e2784ce18437373e637f870d';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'hash';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '61cb4dbac5f44f8a840587ffb57f70f7';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'mime_type';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '625ff197aff347c78bbed2a1c7693cfb';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'content_hash';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '62674d0c61cc49278a27f0280346fd11';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '62a270c082274fd48077bca1d85c009f';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6311786257744be1b9aab9d2019a205e';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '6345a955695d408c8dd40b80c4b05b58';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            value: 'layout';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '63526d64a5404425bb5f717753f7b1eb';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: '1e73a4e3eb2840caad1479758113a74c';
                            parent: 'x_312987_portal_build';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '635fefef12244d5bbd6c8415a670978f';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '637188b8c37148659a519ae68871febe';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '637564a71e62482f9d9883aff0a1510d';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '639895fe00ba4bddabe0a0ecbe47aafd';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'search_text';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '63e30da6395d4edc8aeeb8acde842573';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '640334f9dea948b3aed273f808316b99';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'theme';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '64149aa3dfa14e05ad74cbacf25a081e';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'default_options_json';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6443438d45384c73a3ae41dd9a11fa52';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'slug';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '644d2ca0f02549e69f873676365d56c4';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'label';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '64512ebf00114ac4bc9d6935562fb5d2';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '64ab81718b9d4928a4fe1e1324ff8a91';
                        key: {
                            name: 'x_312987_portal_page_uc';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '64b97f7e3f72453ea08cf2ee1118a103';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'dependency_spec_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '64c0b19a76b24e36a511ca8b7e7f5463';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'problems_json';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '64c7b77497e94f438cc5b40a65294666';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'client_script';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '64dbbceb3cef4d2285a83f1e176e61c5';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'style_tokens_json';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '650f92fa8fbe43cca7b24eac2d9a0863';
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '658bfd94ae0d4cdca40280053e4f75f6';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'tags';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6593e3b634d24bac9085f1e0305c269f';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '65986f727c284bc5a48904b813be985e';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '65d599cd28bc44a09d60b0d4dbefa85f';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'revision';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '65d628a48cd9491194dc819410881e56';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'condition';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '65eb9a3df5a44a3f9d047dc0ae396155';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '65f3be0c755e46f0833fa47bfeb82b31';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                            value: 'layout';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6629cdb211db4591a4c70688914af15b';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '6668c19f593a4174b89ab4b9b7fb274f';
                        key: {
                            sys_ui_form: {
                                id: '5bf1e8e5fc9649f1980b92bcfe09f545';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '666a0c1987794e55bcc420599d425be2';
                        key: {
                            sys_security_acl: 'f0dd537bb0e2425499e8300d3e3a1bf2';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '669664ff244a47a8a79f17772f3cae89';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'classes';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '66b8f431d7e4463b82541346223c5ea6';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'owner_key';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '66db5d2360ac4c67b305d29ac33c7857';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '66f1d3a33e1741519e9613754095daea';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'runtime_abi_version';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '67022341f43c4a18aa50d14ddd7f8142';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: '4xl';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '675ede009a11436eb906384196b2f1ff';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'layout_json';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '67d680f47e1c434daa498410435fdc71';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '67f326a6d5554137b175260cd236826b';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '67feb24a23fc4c0287a740bd3eed901c';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6801760d8ed24148aa269761783b0887';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_id';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6838af4e171a4ccb9a4d9ecec766c4be';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '685da8b27e984e89935ef87c7d991eec';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '68a2f77a4152435e99b2465af704fc91';
                        key: {
                            list_id: {
                                id: '77ad3bad573c4abe96379315d5ae711d';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'region';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '68ae3f6fa10c4511b29044fd74a2f695';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '68ffb767c80d40afa988fe9ffb4610fb';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '691839b6009d469db50c9b7bcddd7282';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section_slug';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6940e2c2e50e432d8986981cc0f7cc81';
                        key: {
                            sys_security_acl: 'e8b2a1f684274c60a0751f4e4e3ba4a6';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '695965bd80004a37b3b545a99277c982';
                        key: {
                            sys_security_acl: 'a204d4a2329a4f51b250c79eea17420a';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '695d39a55b224a10803955b5aeebdc65';
                        key: {
                            name: 'x_312987_portal_release';
                            caption: 'Entries';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                        key: {
                            name: 'x_312987_portal_build';
                            caption: 'Build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6a17e518afef48078eb118d64000a439';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6a21ca66284b4f51b0799c8ae5aad110';
                        key: {
                            sys_security_acl: '2b94db142fa2440989ea98f6714e3382';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6a930423bcf24770af200fb9db18bbb4';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6ab6853317444744926973c6041f4374';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6ab7a28ce5484cf39df4b97a91d7da45';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6b05bf158e0c40d8b03aca0798758b3c';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6b4d719baaba49228f8ceb1330323c2e';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'manifest_hash';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '6b8b9fdd1ab842b1a1bd03fccc29162a';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_menu_item';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6b9fab91ca394919b3edfb89d96658a1';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6bf63ade0373445aa02549ec7db9a49f';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'roles';
                            position: '19';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '6c7166f58cdc4b67b05dc6ddfcc85210';
                        key: {
                            list_id: {
                                id: '4c29705d156a458cac8883b60b947c25';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_placement';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6ca1c2d53b3349fabcd51dc8d5937b8b';
                        key: {
                            sys_security_acl: '85c324c768a84b7f8ab4ab84cac9b88e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6cb6d60ff6e64a36a840c027c7e0a814';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6cd8e26c811e4382a482553b4605665a';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'record';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6d3fdbbb5e5b4fb2bcf200d6cf478777';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6d52fbfa45de4d8a96d74fee1dd1ba82';
                        key: {
                            sys_security_acl: '357bf49e0d104238956dcdeddbbeda85';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6d67c5e83c9e4beb944780935a4f0bea';
                        key: {
                            sys_security_acl: '802c3065867e4ec59d389f09eb5a7201';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6d71366506324de794f6b8e8d7d39fe6';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'tags';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '6d772d44df0147b38f06a2af03e29827';
                        key: {
                            sys_security_acl: '180bed6bcf084d62b48d01893e78ab08';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6d8b0486b4084764b8ed320e6390e021';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'source_revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6d910b4ed3b8472b917a3912ad899694';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'roles';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6d9e11fba46e48d7960d8a68d04b590e';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'menu';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6dd1823e6cd44e319a939e1cf1458d22';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'seed_hash';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6ddf1eee7d454a738713144341b663a8';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'source_snapshot_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6eb884c1f7684c7c8b6bcf94745a4930';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '6';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '6efbaa44462e45b5a7d328827954d544';
                        key: {
                            name: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '6f667511563d4106816e781d8174f066';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6f786dfcf2ef48c182f8f2a7ab3413c2';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '6f7abf041a9c4255a7016a2547fd08bc';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'package_version';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '6ffaa891cbb54428b7110c03b7aa25ca';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '70a0d9763aea437a88300c2434f006e9';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '70c0c3363f5943f8a0f431a05e1ff7c8';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '70e91b300eff47b1953cb71b1ffa05ac';
                        key: {
                            list_id: {
                                id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'needs_rebuild';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m';
                        id: '72494ad1504c440881435b92020d1eb5';
                        key: {
                            application_file: 'beabfd6834154c95998db2920bc50263';
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '7270bae8abb24f4192bc7a194c400135';
                        key: {
                            name: 'x_312987_portal_portal';
                            caption: 'Portal';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '727e77c4d9b440e38f04195e01448606';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '72c8e93ed7c14d2cb08fe6493dc4c708';
                        key: {
                            list_id: {
                                id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'compiler_version';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '72ee5f6a351a4577a198b4ea5f321734';
                        key: {
                            sys_ui_form: {
                                id: '06cf3c04e51c48e1bc3992d3b9543082';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'fabfd4ed419b41d48f6e1aca498703f5';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '732a386a36184e77997190c918a5b1a0';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '732fc981297a448d8f3245073f76ea99';
                        key: {
                            sys_security_acl: '854c6b8f40674111bba541c27029d15d';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7347bad3fa9d458096544e450991c534';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'table';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '738531e0ffe64804979792185bb7cb8a';
                        key: {
                            sys_security_acl: '4ca60a8bea8b490fa923cdf6e924d388';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '73f0bd1146be47a0944c9dd646f93aeb';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '741d48114c8248a4b7a9c11183283479';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'match';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7432d83fd83740fabed0ba87b8da7bd2';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'layout_options_json';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '743797526a534299b999c3566f0034bf';
                        key: {
                            sys_ui_form: {
                                id: '60e2ac4965a74a1382a533456e47b638';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'd008a73cc75e473fbc08d659a52c1ad0';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Scripts';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '745a395d88a0446285a5054eeab4688b';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'rule';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '745fbb2eabae49468afc0fc137615912';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '74aba4ae0b2940419b6687dfeb50deee';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '74d510c01417484cb3fb0fa90c086913';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'default_layout';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '74daf1f1d64b4d3b8841dad293396c97';
                        key: {
                            list_id: {
                                id: 'e43ab5a0c2ab4199a2538c46be5289a7';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'slug';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '74edd62069ec4d589bd09b9e30bba411';
                        key: {
                            sys_security_acl: '3bc184270e8440ffbad686ba02cf3ab1';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '74fbb26ae4e54640aec4ec2d9f1829ad';
                        key: {
                            name: 'x_312987_portal_release';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '75250d10116f46d4b6ed5541d5d9f551';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '752e2a80149a41e2b349209291289abe';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'visibility_config_json';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '753810b5dde6481dbc947085132a637d';
                        key: {
                            name: 'x_312987_portal_theme';
                            caption: 'Build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '7583d37514ff4c0bba72561952997901';
                        key: {
                            name: 'x_312987_portal_build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '75c422210c4146f68ef52e6b2ef4c330';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '75d5498077eb4f18ba34d3f3eff26ba9';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'collection';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '762b9182146f4f9e991ea9764e93a96f';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '763064c30c714beaa66d064580c8a849';
                        key: {
                            sys_security_acl: '8c0871c1327d4f3c8155b5c0cb00b435';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '763afb654bfa48eda048162e4b5fbd2f';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'utilities_css';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '76539af56ae74d2c899c659bd12512fe';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '76bea92475a6467a8e0a391b064cf8b4';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '76fe1296b6764783aa8a970212111d15';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '771b75b17ce94d9eba2b2e5d23822d7c';
                        key: {
                            list_id: {
                                id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '774ee38f975342afb3f51f97a3066c52';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '775f9de6817a4df8bae9cb46795d9008';
                        key: {
                            sys_security_acl: '3570bfd8ae8c4359a74c82b0da632683';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '777cdeb4ca58414dbf98cce214b3b845';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'url';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '778e99bd850b435eb3202c571b5e4beb';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'placeable';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '77aae5b63fc04df2b26e5e2ef55e0ad5';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_meta';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '77ad3bad573c4abe96379315d5ae711d';
                        key: {
                            name: 'x_312987_portal_placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '77e18e71f67a401ea6395270421b0381';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'specifier';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7802d8e31ac84db382684beee4113109';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'headings_json';
                            position: '18';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '78075675885241e9b73122d4778add58';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'default_views';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '784834075793477386b68bd428dcc9ad';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '785ccf36b16e4cc78b7c3647e31a70ad';
                        key: {
                            sys_security_acl: '7581dafdf83f4aacbbf767d37e87282c';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '786b4d3297244724af7ad3465071100d';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'key';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '78bc5ce5debb447ea2ecb3eb5c9bc2f0';
                        key: {
                            logical_table_name: 'x_312987_portal_placement';
                            col_name_string: 'owner_key,region,order';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '78c30f199bad4011b661428eb5b0b99f';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'target_table';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '78e0bd7bae274255bab357dfd7a5eaf5';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '790997e7ac6a4780962c6dcc07d6a55d';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '790a2954b2e24d35953227d142683245';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'compiler_version';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '79290bfb8105470d8f388b04a982fa94';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'stable_key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '793a41b0e6c04bcea1417f32b75c5636';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7982d9998e7e42c4b15b00e3176fe273';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'specifier';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '798443616a09413d8765219ac7d4b751';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '79cdcfcc5ea24890a3bfaa3c2406afcf';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            caption: 'Page Not Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7a1e2d444135497b849f7e143a62b0fb';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'exports_snapshot';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7a5448cbbecb40b196346774f7fdfe70';
                        key: {
                            sys_security_acl: '16b7ac2616fb484d850b6a1ccb0b661f';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '7a7691fc45434e0eba3673969ff3fc4f';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7ab0cdc083b549a1bea91a63a8cf09af';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7ad591d0d12b4055ba0d38bdf725ea45';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '7b18ed4d1c99417db6419c9b2d597663';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'encoding';
                            value: 'base64';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7b3f4c4fdd174528855816d43e41c6ba';
                        key: {
                            sys_ui_section: {
                                id: '28e364b0d01743a0b13a00e006b015b1';
                                key: {
                                    name: 'x_312987_portal_portal_uc_no';
                                    caption: 'Portal Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7b6d410e63404e50b52e787fda309f7d';
                        key: {
                            sys_security_acl: '1f6ad0afaacd4940a37dced18690164e';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '7b9e1c5c74a3472c811495a395ad0b60';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'origin';
                            value: 'studio';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7bad5b9265b54166ab7a8923b2627cf5';
                        key: {
                            sys_security_acl: 'f93d47786d3e478b85faf4496af41f56';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '7c1c11a3550c4013af40e96f06236ad5';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'slot';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '7c3578c5b06b4184b5d65e47a4bcf377';
                        key: {
                            name: 'x_312987_portal_doc';
                            caption: 'Doc page';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7c3a9a6c417241ce862dddadfd5143be';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'exports_snapshot';
                            position: '19';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7c466a31549e45dcad3c57037663e8d2';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'remembered';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7c783052626a49689d1c89a98fdf0759';
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '7c9005daa7df4253aa641037a0b06ad4';
                        key: {
                            list_id: {
                                id: 'f600a236001c4c7097d7e6148f6eb86e';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'revision';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '7ca42e13a7134d189c88389f04df39a1';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                            value: 'ready';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7caca9137e724454ab68ba49328a0b44';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7caea49b07dd452091d8de7cf852d19c';
                        key: {
                            sys_security_acl: 'd9201a732f5c4208bf96da0b1d0ecd2e';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7d24da03e7ad46ee89f86621b5c75eb8';
                        key: {
                            sys_security_acl: '1c1b2b9df1c043b7bb1c4c9fd807cf08';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7d5aa14a808048fb94646e9d047f7b19';
                        key: {
                            sys_security_acl: '802c3065867e4ec59d389f09eb5a7201';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7d6a651c7eef485794d283d43b2bc449';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'icon';
                            position: '22';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7da84ea5642f4d49b98afa8b6ccd8c5c';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '7dcbe0cf665a4377a0a477b2d13bbfed';
                        key: {
                            name: 'x_312987_portal_release_entry';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '7ddb6e65d0f4426e8c2c279138976bea';
                        key: {
                            sys_ui_form: {
                                id: '488dfa51294049e5ab9c2df9561a2395';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7e066155eff24227b65895562d92dd0c';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'layout_options_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '7e0a66bfd5824191b81d62740a91c914';
                        key: {
                            name: 'x_312987_portal_menu';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7e2020a1299b4f8c8e49bc2c0c19eb08';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'title';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7e202f2ba3f44dedaaedd49949035580';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'badge';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '7e2ca20f84ba4d0eb5582153b433776c';
                        key: {
                            name: 'x_312987_portal_portal';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_theme';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7ed96064269a40d6a69a523c98deb992';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'home_page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '7ee42712a2604bc58e28359b10dc3005';
                        key: {
                            name: 'x_312987_portal_record_field';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '7f126be6ee934df7a519334d5247bbe0';
                        key: {
                            sys_security_acl: 'b3189e89b00a480696031b1135729bec';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7f35352ce3e24efda829f409da7901d7';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7f5ec92ebbe546a1a2c67662974f5b4d';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'resolved_entry';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '7f6e713169804927874db8117bac8ba4';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'stylesheet';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '7f81e6bbf4d148d5b444933eae101ab2';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '7fb244f0b77d4dd78132ff06fec41ac9';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: 'inherit';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '7fcc200910b64b39a767ea82e464374d';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '7fd2c9a6576b4b5c89c9244a8fc5224c';
                        key: {
                            list_id: {
                                id: '0686580e8f214d568d733dec58c45f8d';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_section';
                                };
                            };
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '7fdd18c122ca49a8a733d61447615e61';
                        key: {
                            list_id: {
                                id: 'abb9edad53df4cbfb9f9a0a637debcc5';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'path';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m';
                        id: '7fe2ed0016954f118ae644565a49602d';
                        key: {
                            application_file: '20a184ca6305438d97ecb927ffe721fe';
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba';
                        };
                    },
                    {
                        table: 'sys_graphql_resolver_mapping';
                        id: '800f09d385ba4a068e32a25c1a2fb902';
                        key: {
                            schema: 'd36c95123843458b9f52837c3f10b0f3';
                            path: 'Query:explain';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '803fc661a17f40549e77183152e57079';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'exports_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '80978561799e4fa5b8e258588dc738d0';
                        key: {
                            list_id: {
                                id: 'abb9edad53df4cbfb9f9a0a637debcc5';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '80981d0a5467429ebc43dd7540e2a7fe';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'pending_revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '80cd006dec984a6fa86fd05b52ecaada';
                        key: {
                            sys_security_acl: 'd9e4c6be8b3e4f32a83403e6464f2f55';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '80e3c0fd60704b3f9df42c22ad630a49';
                        key: {
                            list_id: {
                                id: 'd8e333faeeab4a2ca250f6f59e8542cb';
                                key: {
                                    name: 'x_312987_portal_page_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '814955280851421292550f939064c908';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'roles';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '815696ac57e74f149982bb13c3f071af';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'match';
                            value: 'prefix';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '81668d6febee46d19f6a654c24228910';
                        key: {
                            name: 'x_312987_portal_component';
                            caption: 'Build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '818b1b6737a049a7a1c393c14b07ca04';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'resolved_entry';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '819a286d8df94fcda9e676f1937baba7';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'release';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '81a30ae236f54bca8d7a08013600ca4a';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'needs_rebuild';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '81a9f8546d504cf78bfb8633075a80cd';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            caption: 'Build Asset';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '81ad4df5d619405895a41e75b0a9ba5b';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'correlation_id';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '81be897775434d73bdaf3c03aa388b29';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'content';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '820f8bacaf7e4bd782d10fc2375f22dc';
                        key: {
                            name: 'x_312987_portal_page';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '821a36b68cb04adeb15ad26063d1df5a';
                        key: {
                            sys_ui_form: {
                                id: 'b41c2dc04029474f911335a9051a8e20';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '824e2f8c921147ce819b409e1d5aeead';
                        key: {
                            list_id: {
                                id: 'abb9edad53df4cbfb9f9a0a637debcc5';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'byte_length';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '8261d3244abc46e3b132588c3b959838';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'encoding';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8265485db4c24bce89efc4eb48c01953';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'notes';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '829c1d4d5cb14c7e96daa017ec3b2681';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '829ddeed0d4c4792bc661f38dab2f4bc';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'collapsed';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '82a458e44de8435991e02daea2cd7755';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '82ba1cfae74d4037bd5c0fe10c0d0d10';
                        key: {
                            sys_security_acl: 'a645680168c44e31b9fe32f56be688fc';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '82c7d6af428e49c1b7832eaa044fe60b';
                        key: {
                            sys_security_acl: '26e2747b9ae34adb9b5a54f6bfe6960f';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '82cf52ce03f444488402a7158561f4c3';
                        key: {
                            name: 'x_312987_portal_doc';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '82d055dd29c84beca4e328dc0d6cdd5b';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'build';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '82f800d1494c439690c71cf535e1e0c9';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '83328297558c4872a0ceb433aec2844a';
                        key: {
                            sys_security_acl: '081452fbbc5b4e06902085d8db092ef4';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '833dd196d82045699d9d8b4a32bb18b3';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'views';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '836ae2725e564678a2494a010b29e3c4';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'owner_key';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '83c53b4b926545f6b1cbc74796584a9c';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'route';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '83d93e7525414be8bda1ceeba5812150';
                        key: {
                            logical_table_name: 'x_312987_portal_view_rule';
                            col_name_string: 'portal,table,active,order';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '840b8701178f4a3486407a6f382ded21';
                        key: {
                            name: 'x_312987_portal_source_file';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '84319fd82f9b4b8eb8c949a9bb1191b8';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_name';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '8441f6e0c502423eae85ae81058fa6f1';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '84983a5f31cd480d92874313890bec1b';
                        key: {
                            sys_security_acl: 'f464aadfb0a64eef85771a5fbeab53a3';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '84aedf8ec42a4f5281115fe4a7c33420';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'notes';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: '84da8d0f90c24ad4a7b370f9a89761ba';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8530a1a7fa214f2d93ee97e0850b50df';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '854e48eb2cef4c50afb4a8c97225e7b7';
                        key: {
                            name: 'x_312987_portal_doc_section';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8593cd9149c441289cf91e4d5bd3d265';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'navigation_json';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '85ad87195c6145e9af6586faf8e3a85a';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'tooltip';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '85b6281ab2994aa188eb44ad915a9360';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'diagnostics_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '86075cb3fe644758912015c2790db0b4';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'roles';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '86267e56241740c8ab93aec9c3e095b9';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '864bff858f8149f58ab534552a53f6c4';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            value: 'wasm';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '86baf561d77948abb736964bbc197cb9';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            caption: 'Menu Item Not Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '86c698745bfb47748c8eaf7d3ebe334b';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '86d59248d50e4717bd1116870b445292';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '86ee526cd66849b38444cea89cb808f5';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'roles';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '871bd31b72d94eeb866b5402bcd05ef9';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '8751348b37e944e4b8dc77b05022dff9';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                            value: 'ribbon';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '8758a8221584472fabf085adc8da9c8d';
                        key: {
                            name: 'x_312987_portal_component';
                            caption: 'Extra Files';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '87a5ee7fbf3144cd88fc48a68cde5baa';
                        key: {
                            sys_security_acl: '5ed8aed75f544fa096cedad920ff52e5';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '88147b83cd084d819e02c53bf6c1f54f';
                        key: {
                            list_id: {
                                id: '77ad3bad573c4abe96379315d5ae711d';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '882405ca1e4f495b9df7b0fe076aeee3';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'notes';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '884d598fa29f4dde83503d056d4e3da3';
                        key: {
                            name: 'x_312987_portal_release';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '88a3e6bfaf1e4de9a8e17dbe60a442f8';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'placement';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '88de2f9f9c4b403796825c088d21a3ba';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'key';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '892a88bfd5c54c55b01316686ae6b037';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'target';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '89409a95f28f406bb521f9514c894ec5';
                        key: {
                            sys_ui_section: {
                                id: 'ac0446c09bbb46fe8ff1ddeccc03235b';
                                key: {
                                    name: 'x_312987_portal_portal_uc';
                                    caption: 'Portal Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '8949a2a8063c4b29bee2924a1824c762';
                        key: {
                            sys_security_acl: 'd9201a732f5c4208bf96da0b1d0ecd2e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8984e66d716047d0bcc21e12699bafe3';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'stable_key';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '89a18000174741b6808fa762ace91856';
                        key: {
                            name: 'x_312987_portal_theme';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '89c25a57893b47f4ab27685eb1b435f6';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'pending_revision';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '89cbe0e56b024d95ac4e4623f39e1cf6';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8a4ad5d4f170491584d2209af696091f';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8ac5682baf844bdabd46a9d8e47bb0f0';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'remembered';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8ac57905c3f444aba431331c69d0ddf0';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '8b58db7ba55e4b2585585fe0e1bde36b';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '8b795c656a0d4261ab42df379ad85c47';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                            value: 'on-load';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8ba29caf783c45d09d874c6192009419';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8c01fd4a21524868a1b05252779c8389';
                        key: {
                            list_id: {
                                id: '34ea8fd3b89f4047b2a04d8961f3b11b';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '8c13225afd3344568ac6f09d003a0aa1';
                        key: {
                            logical_table_name: 'x_312987_portal_doc';
                            col_name_string: 'collection,path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8c16ae18fc07491380d5aae8c05c89c0';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'source_path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8c6f4dce288c45cb864b8cb79785fb67';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8c7ca5c9bd88471f92ce15300d689914';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'entry_type';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8d02d0029e8f4e2983e008ce23d64eb5';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '8d053fd198474c6884fed6e8dba6b201';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'ef742e520459439c9314fadfd2f827fc';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8d07bbcfd76541b3abbbe4f8bb944417';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'sanitized_error';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '8d144ae77c0e449f9e8d806104b0a571';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                            value: 'asset';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8d297c6395f44da9a7684d4212ad8b93';
                        key: {
                            list_id: {
                                id: '77ad3bad573c4abe96379315d5ae711d';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8d44aac17dfb431fa187ff125e4eb363';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'source_revision';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8d8a8181e9734e3e9f823f8cae1b62bc';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'diagnostics_json';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '8d9d7df68a7045ab93f509b34ed82e67';
                        key: {
                            list_id: {
                                id: '0dda362c79414bbfabc37f852a4e806a';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'target_build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8dbc940b576548d48330c985d5f42868';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'target';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8dc47b243031446aabd7b16b516400d4';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'script';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '8dcae45ec3ec4cfca4fb3bbc06551a70';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '8de377c1496e4a078986891ef5a1c39b';
                        key: {
                            name: 'x_312987_portal_execution_log';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8edb3c1c32cc493c8784317cb0da3d02';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'section';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '8eeabf95546d40b68fe00387edc700fb';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'doc_section';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '8efc9fa1e6044778a72ea39fc40bffd1';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'processed_by';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '8f5ccd56b994496c8bdb07f9f41e73f5';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'outcome';
                            position: '3';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m';
                        id: '8f930c66b90d4bb692b4f25e00965e99';
                        key: {
                            application_file: '31230aad63ce47e4bd58fd08fbfe2908';
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '900c5721ff8c41bca2da1131ad978707';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '905736279aec4025a390098b85a19842';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'duration_ms';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '9079e79cd3794fd5ad24da5f3bccb831';
                        key: {
                            sys_ui_form: {
                                id: 'b7ac7abeaedc4c749d1c7a13e47cd9fe';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '907fc8f5312144b5bb0184c0e2ed2b45';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                            value: 'placement';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '90af612f059248539a0c8565b6d1787e';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '90ba16282da8469a9d96aa4ce2805bd2';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'slug';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '90d034d96f8346a3b4de273852416613';
                        key: {
                            list_id: {
                                id: '7583d37514ff4c0bba72561952997901';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'compiler_version';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '90d96917021549bda4aa9801b302d7db';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: '91327e0c1dd34fcea1b20af16c7d34bc';
                        key: {
                            logical_table_name: 'x_312987_portal_item_uc';
                            col_name_string: 'menu_item,user_criteria';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '914108b0ae5b483cbc5c5078c03fddb1';
                        key: {
                            name: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '916fbfec1457495fabfcf93031389885';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '917ee6ca845c4f1cb5561ed9f84323a4';
                        key: {
                            sys_security_acl: 'b9940744220d46b28c6ecffdf791048b';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '918187f735bd453cb780cfb6a8da717d';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'placeable';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '91bd0bd881a7469d935757b583495cb5';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '91ed8ef20e4b49439a7da99fdc3b3871';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'is_default';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9218a56a0d0844a3a7eb0145c78550ed';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '922d8058c39d49709f08609fe14517fd';
                        key: {
                            list_id: {
                                id: '0686580e8f214d568d733dec58c45f8d';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_section';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '924a99b0bdff4c17a0af36e1c2f08edf';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'namespace';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '930b9c2cbf3e4f279b04bf1d8b4e14cf';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'x_312987_portal_menu_icon_picker.xml';
                            position: '23';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '933c3c290cc64dc396ce51cd0ba7278a';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'visibility_config_json';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9365599e51f1455ea682c857e1e1f77f';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'target';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '938d35eb52a241b2b22964409753b8a7';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '93bd4f465c174c84a9ea3be202b43877';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'pending_revision';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '9400f464a61d46e2a89a4083bad2cdd3';
                        key: {
                            name: 'x_312987_portal_build';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9437078eeaca4e2d8147796b175f073b';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'portals';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '94456fe34bc04a8ba2515721fd55c951';
                        key: {
                            name: 'x_312987_portal_record_field';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9465e4a8c1684e22adcf9037b8d7e927';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: '948d706d21d04c7eb1a71fc5421b1fae';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '94a7298e0ec242bb870e3a14c9e9acae';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '94db9ac8d0ce440b8c455328caee2e33';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'source_revision';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '95c1bef07ce1466193cf80db067e9cad';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'stylesheet';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '95cd9791fc3c4f2592fb28ed41276dfe';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'access_config_json';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: '95d2fd117a3049d396667ef0ccb34240';
                        key: {
                            name: 'x_312987_portal_component';
                            caption: 'Component';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '95deab6e1a8544f8a8121807746b5746';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'preset';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '95ef5c39c9db4855af52fc4082aecf4c';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_config';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '96711288c13342d7affead58a4970f82';
                        key: {
                            sys_security_acl: 'f464aadfb0a64eef85771a5fbeab53a3';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '96768899f6ac41fc8089c7746965e381';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'record';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '967eacdbc2e24ce7bd581cf03fd4347d';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '96cdcd4a62cc4e9a897009f50ebc25c7';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: '6xl';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '974c0e2ea4c14732847d57071a0def04';
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '98246ea48f184458b1d2dbbd8e2793a0';
                        key: {
                            list_id: {
                                id: '74fbb26ae4e54640aec4ec2d9f1829ad';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'processed_by';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '98275bd5eb3d4363a0404fcb2b4cc1de';
                        key: {
                            list_id: {
                                id: '6088a1152aeb446ea00a4708c2f0d029';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '987cf46b3a7f4538b0c9c5e3f9c3e78e';
                        key: {
                            sys_ui_section: {
                                id: '2317504f51f34c2a974ee5cd2b6bf6e5';
                                key: {
                                    name: 'x_312987_portal_page_uc';
                                    caption: 'Page Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'page';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '98b894a24d14427bae355c0d626d2aa3';
                        key: {
                            list_id: {
                                id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'state';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '98c621cf3ac246dfac99b61d7fca6372';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '990a50e924da4a06818d80ae8c16e151';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'markdown';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: '990bce6bf88f49b1ac8e0ef3d4f7aa39';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9910e49944234d4993894e4a1a841779';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'missing';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: '99829aba95104d96a00705160609fc38';
                        key: {
                            sys_ui_form: {
                                id: '03a0913331e14e2eb20dd41aba4fbbbe';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '998e99e6aa9641658cd803eee72d554b';
                        key: {
                            sys_security_acl: '6d9a07a54ad04e5a8bc902b89bdacdf5';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '99a26310765c4572a7c917be74aec683';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'tailwind';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9a02f2b1b44044dfb08a7141ab2afae1';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'rule';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '9a1ce043faee405ea460ae6ddbec38bd';
                        key: {
                            sys_security_acl: '7542b8f18b154a88aabacd239605fb0e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '9a41764218de4f3a9ac0e062c3ac6635';
                        key: {
                            list_id: {
                                id: '8d053fd198474c6884fed6e8dba6b201';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'ef742e520459439c9314fadfd2f827fc';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9a60db73a4684935a5677e282a16c02d';
                        key: {
                            sys_ui_section: {
                                id: '8758a8221584472fabf085adc8da9c8d';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Extra Files';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '12M.x_312987_portal_component.x_312987_portal_source_file.component';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '9a6c5655e1f24ae1abbac192204927d4';
                        key: {
                            sys_security_acl: '4efcc57c4b1d4198bde8da6531bc327d';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9a74ce29205d476ea139921beca24d16';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_release';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9b7a1e3962664ee4a99f2543865b0d64';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9b97cb62f33b43e2bd64298cfd5d1193';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'stylesheet';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9b9f26c9f07643cdb1fed32c2bab8e13';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'processed_at';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9bc5b5922b044666b200b31731a7b044';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9bf75ed4c5b443ba8c1f31fb904bdd3c';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'url';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9c03c44592ab4f1f990d7e43e654d091';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'content_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_graphql_resolver_mapping';
                        id: '9c2de6b8611e47d98700caf9ee357ccd';
                        key: {
                            schema: '023ceb6d6e4146d99e92171cac9e8d25';
                            path: 'Query:resolve';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '9c589ec7721f4bc3b8d1534315f9ac7f';
                        key: {
                            sys_security_acl: '0cd5ed8391d34a479c628b55994338f0';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9c9a60f41e55474d99f7e5b91e1f00e4';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'advanced';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '9ca87243916b4c5e846f4f370902f5d3';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'table';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9d163f0cdc094bd5827255e068756545';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: '9d2e58dcea3f4b6bad0aa08d9f3aa0e7';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                            value: 'denied';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '9d30b47067c54133ba99cc5900639a37';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'placement';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9d3e36a895e9498082208485c83923e0';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9d50026f34df4f8c88019cddad3a1be6';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'roles';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9da871d3affc4e5a8210643df83abf78';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'rule';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: '9dd014fc544545ac892a795d213ed112';
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9df422122efa4397bae962d12a77418c';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'icon';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: '9e47449a3d67424b94682c2c34c2d2b4';
                        key: {
                            sys_ui_section: {
                                id: 'f6d45c2af9f14206baf26e9261854574';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    caption: 'Menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9e89030b647f450584edf1ea5f4b776f';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'completed_at';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: '9e8ed27567444ea68f924c3d181be99b';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'instance';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: '9ebb75e9042d41b6938a7619db3f84c9';
                        key: {
                            name: 'x_312987_portal_view_rule';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9ed2065f6a7146c089591d122379d7c9';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: '9f4ea6dfffe44ee38605a879e3fe22a0';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'script';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: '9ffb40926daa4604880d7002ffbd6f86';
                        key: {
                            list_id: {
                                id: '0506fb5b855741c5adfdb26a8238d598';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'mime_type';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a02abc895edc4cb8b4df567020f3d725';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a04d3f803f614cab80561b7ac2d1a81a';
                        key: {
                            sys_security_acl: '5580ad75cd004e7c90d8dbfc9710f56e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a056321aacb44b748213fef561a04368';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a0564bb789dc4065a055c23fce92e25c';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'classes';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a0ab9605b4744dff99f2db7183bc626c';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'icon';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a0cc9d866a8b4b238fbf8805b6b5785e';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a0d8e6ff342b437db5adba57ab33ca36';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'layout_override';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a1246150d38b496a85b9a8bc1616d2bf';
                        key: {
                            sys_security_acl: 'f464aadfb0a64eef85771a5fbeab53a3';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a126537454c5481abdb9010a411a814b';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'build';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a1539ff12538453fb90f4a7cb1a73d0a';
                        key: {
                            list_id: {
                                id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'completed_at';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'a16749a741784f66be2646d047b85c67';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'encoding';
                            value: 'utf8';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a197277d9d8a4f2c91ec8c181317eb87';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'source';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a1cef5c6ee8142898878c53dd03490f0';
                        key: {
                            sys_security_acl: '6d9a07a54ad04e5a8bc902b89bdacdf5';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a1d745f24fae49ea999dff1c98d8cb05';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'host_export';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a21e73ee4455429cb79a9f00cb5049a5';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'route';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a249b6c8f0744a31bb9675006377d088';
                        key: {
                            list_id: {
                                id: '0506fb5b855741c5adfdb26a8238d598';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'byte_length';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a2c45e967df845cca85a389cd1884a79';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'server_script';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a2e6000b12c64ea8ba8d8a853e84cccf';
                        key: {
                            sys_security_acl: '52c75446fa0148a4b4eee82e402f7973';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a39be4e0886b467598ce36c0c8c3363c';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a3cc0dbf24ef40e7ab0e2948106cb43c';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'requested_at';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a4057686c8464f598ea10109bfc7de26';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a496d2e8d31c4d5ebf9e2e20b04e9fd4';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'byte_length';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a4d2e96b5af84bb18d99acf38093cf24';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'runtime_abi_version';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a5ad4af6ba154f74bc0e56e5495f9ee8';
                        key: {
                            list_id: {
                                id: 'abb9edad53df4cbfb9f9a0a637debcc5';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'revision';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a61a91b56c9b4a8299104a0277f499c4';
                        key: {
                            sys_security_acl: '8c0871c1327d4f3c8155b5c0cb00b435';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'a64cd65f623f4d1799b7beab336f7624';
                        key: {
                            name: 'x_312987_portal_theme';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a657f048cbc246cb8cfc3b560f235f72';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'options_json';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a6d49c95f13f408ebf1a1ab3ef4e9d12';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a70bf3223cf047d6887950541f4c0452';
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a757efcd053e4a4ba880521ba5479da3';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'requested_at';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a75ced3a5240481bac726a55036604aa';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a77707ef02a745249c55f135366398f9';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'key';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a7a743d343b545e48eb71341db61f683';
                        key: {
                            sys_security_acl: '1c4d2ed1ddf64ae29a2e98c7a714c5eb';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a81364c137a643d687c81ad0b2509fdd';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'encoding';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a8269538d53a4019b649435ccb7628da';
                        key: {
                            sys_ui_section: {
                                id: '695d39a55b224a10803955b5aeebdc65';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Entries';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '12M.x_312987_portal_release.x_312987_portal_release_entry.release';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a83a2372dcb9461bb8cd70a17e39f86f';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_menu';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a843728eccc8420ea773fb55adc7622d';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'a855f1667aaa4e8bac5dc68f02f760f5';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'target_build';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'a8634c7df6b74adba6f63dc336fb2154';
                        key: {
                            list_id: {
                                id: '6155f958c13d448a917f27136d365293';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a86d5ebcd20c4550b0b1935b54620f61';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'source_path';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'a874f5d14ae74648b3a0337267e42fb0';
                        key: {
                            name: 'x_312987_portal_item_uc';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a8b5ad685f4240a9be0e759ccdaf828d';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'last_error';
                            position: '15';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a9392706a25f4dd3993e5868e55dce3c';
                        key: {
                            sys_ui_section: {
                                id: 'fabfd4ed419b41d48f6e1aca498703f5';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'doc_section';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a94db737025742eea2e75459e04e144d';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a95fd5834712431988a63e3d20e34fe3';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'host_abi';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'a9691c3d8dc64e3498525264c9de0dbc';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'collection';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact';
                        id: 'a96ecfa85cec470db062f471b8facdba';
                        key: {
                            name: 'x_312987_portal_incident_manager.do - BYOUI Files';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'a996845bc1964734bbbce152a969a35e';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'a9f407e458d44bce94d24044c8818ff9';
                        key: {
                            sys_security_acl: 'c1cf1de959324e448a1dd33708dc3e24';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'aa1a5a35eaeb456f958c2f8b6e23763f';
                        key: {
                            sys_ui_form: {
                                id: '820f8bacaf7e4bd782d10fc2375f22dc';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'aa8a4029daeb4bcdb149305e3fa12381';
                        key: {
                            logical_table_name: 'x_312987_portal_build_asset';
                            col_name_string: 'build,path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'aa90cce60adf4728b5877f5897edac70';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'instance_css';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'aaa2081e06224abe849c478faaf3ed16';
                        key: {
                            sys_security_acl: 'b27901b4bc2b483c899b68e8764a9120';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'aac76afe2be54138a717822ad030c4a1';
                        key: {
                            sys_security_acl: '8c0871c1327d4f3c8155b5c0cb00b435';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_user_role';
                        id: 'aaff259f0aa54d43b45dbce14a6012d1';
                        key: {
                            name: 'x_312987_portal.designer';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ab23927d7df542e991919ac69f9728d5';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'abb9edad53df4cbfb9f9a0a637debcc5';
                        key: {
                            name: 'x_312987_portal_source_file';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'abfccee6e5df45edbc29e71591c2c9e3';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'host_export';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'ac043c58ccb841bdbe9657f69d986fa6';
                        key: {
                            name: 'x_312987_portal_release_entry';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'ac0446c09bbb46fe8ff1ddeccc03235b';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            caption: 'Portal Available For';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ac18af1652de4c3b9153c52cbafdf0c0';
                        key: {
                            sys_security_acl: '453f4661479a4c23a3422ab787569dec';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ac988673ed8543bf9cc6a91be44a5f93';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ac9e144763bb4fc99cad40017b087963';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'last_error';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'acb10efbfd634fa0b51996f30b50fbd3';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'acdcef0d611e4f56b8c3cbbb9c17a49d';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'view';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ad2dd2d526f54d58be607d991385a39e';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'adb4285a502a4c31a0df4fb3db213aae';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'adb6191480d9441eb73c1a3a3b4f6d74';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: 'ae11d101a2fb473a80679cbe5ed60916';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ae2f16f3accd4f04a17a9fbfa44bc9df';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'source_snapshot_json';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'aea3d6734fa1457ca53b9495ebcc48c2';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'layout_options_json';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'aea8882cb17c409693d103fa0c8094e7';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'script';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'aea9ac5535f147e7bab0dc6dc175c0ac';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'kind';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'aebd1ee85c3d468cab39c4fa6e706712';
                        key: {
                            name: 'x_312987_portal_view_answer';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'aec644b1319a4a01a8663de4f67ef68a';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'markdown';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'aecb3b8fd1b94381a306ddbaacb96c20';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'sanitized_error';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'aee5c81b3d5f4484a0d02bf7bc948025';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'tokens_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_user_role';
                        id: 'af10a92d95ca4d52bc65ad852ac7db12';
                        key: {
                            name: 'x_312987_portal.publisher';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'af648accaf2141139e3c887aae887e96';
                        key: {
                            sys_ui_form: {
                                id: '94456fe34bc04a8ba2515721fd55c951';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'af8b88d120b24a60919ea06e98246f40';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'problems_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'af8e5b0dc7b44f1fa19c2774f449b01a';
                        key: {
                            sys_security_acl: 'b2d264b46ff449d3ab2eed11affd414a';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'afad0ef4e85447ab8f96686903a8594a';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'afcb02a011e84f8f9a467a5702acb6e5';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'exports_json';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'affdaeefac0943b9aa630d533a3db33f';
                        key: {
                            list_id: {
                                id: '1455ae977dd64cb9a03b707e6f29beef';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'type';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b0050d3a71c347218fab118d47196824';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'utilities_hash';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'b0724b34d13d4a7b860f2fbb9ee271b8';
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'b1512e9b2bf745b8ad9d4dcd2181c27a';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'condition';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b15caec56a794f8084cc7b9d3ec1ad68';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'host_abi';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b20aa2079bb14cf7908961ca5fa5530c';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'kind';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'b220e0bb04b74247bd51703575991ce0';
                        key: {
                            sys_security_acl: '802c3065867e4ec59d389f09eb5a7201';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b226da593e7d4a7cad90085953fdc544';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'title';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'b265b001cbb54aeaa3e87d7b2a67fef0';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b2867c9e96a34080a11eb7e95505081d';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'target_table';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'b2dbe53d8d6a425dae074d0fc0b216ca';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'b2fe9f08fcfc400296fd3f145e30c8c5';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'dynamic';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b31a0863c5934fe89f71e7b26bf066b4';
                        key: {
                            list_id: {
                                id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b34114284ad64b91a8e7a163b1974180';
                        key: {
                            list_id: {
                                id: '8d053fd198474c6884fed6e8dba6b201';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'ef742e520459439c9314fadfd2f827fc';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'specifier';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b38bc88707a948b8af80e8a9976da1d9';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'kind';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b40d124c2d474cb09c32f0c2d0ba74b9';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'parent';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'b41c2dc04029474f911335a9051a8e20';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b4bb0cd4d16d47adbcc73b2c298dc4c5';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b4c65ed9dafd40d4821aa013a92b0aad';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'b50a87b809b948a689c5d365385cfda7';
                        key: {
                            logical_table_name: 'x_312987_portal_execution_log';
                            col_name_string: 'correlation_id';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b532b56ae46c40d687c23705047274f0';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'portals';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b542f658065b4c44a17d5b0a01f4c1d6';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b55a76c540a440dbac768467fc90c296';
                        key: {
                            list_id: {
                                id: '4e17906504b04942aea617a0c78e1496';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b629a6f9fba147e681acb5e7a1fd9172';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'duration_ms';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'b668df8c46374c1b86f88dff0ea6aed3';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b6998ba87ffe4bdaa912d1b4eef5978c';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'b718428c938e49c9a18f54b34dadf70f';
                        key: {
                            name: 'x_312987_portal_build';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'b7429df95e9a489e929b6e8eae714db9';
                        key: {
                            sys_ui_form: {
                                id: '86d59248d50e4717bd1116870b445292';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b7773f6118dd47dd95eb30aaa1e79ded';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'dependency_spec_json';
                            position: '21';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b7aab955407143bcb0b711fde3895573';
                        key: {
                            sys_ui_section: {
                                id: '28e364b0d01743a0b13a00e006b015b1';
                                key: {
                                    name: 'x_312987_portal_portal_uc_no';
                                    caption: 'Portal Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'b7ac7abeaedc4c749d1c7a13e47cd9fe';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b7bc0b3700b4445cb6be69969d30ae64';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'menu_item';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b7d95b1fafc94f4c8526c26e233da69b';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'b7e219dcd79e45ce9c69b6e9d1a293bb';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'target';
                            value: '_blank';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b7ee01445ab8409694ee2839289c0905';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b807809ce31c4043949d7847e331d6d4';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'origin';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b82aede02b024677944f6ff67594ff89';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'theme';
                            position: '2';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'b83d8a95ca944637810cbf87716ce215';
                        key: {
                            name: 'x_312987_portal_view_answer';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'b85444c7ff214db187514cb8c96fe303';
                        key: {
                            logical_table_name: 'x_312987_portal_vrule_uc';
                            col_name_string: 'rule,user_criteria';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'b87a4c80983b4ede960e212180da2c30';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'server_mode';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'b880e3aa6d434b7a80589b8c58e7b1bc';
                        key: {
                            sys_security_acl: '90693bbc7bfd4da790de4ae8877da1b7';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'b8d5aec32bef43079b456ef3f1ad6667';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'seed_hash';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'b9327800b78e420190266c1f9302d372';
                        key: {
                            logical_table_name: 'x_312987_portal_page';
                            col_name_string: 'portal,route_pattern';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'b962f9d908ad4747b393ff1476605e7d';
                        key: {
                            list_id: {
                                id: '4e17906504b04942aea617a0c78e1496';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'b96b5ea3fff7434882b86164f0d68c1b';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'default_options_json';
                            position: '19';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'b9bc4033d9c845fd8110c6dcf00b349e';
                        key: {
                            sys_ui_form: {
                                id: '948d706d21d04c7eb1a71fc5421b1fae';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'b9d19afdee1a4d44b678b8ab921f22b3';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'owner_key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ba234e57c19f40e7939a9070dcb70752';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ba805864de734f348dfa45f7e4771274';
                        key: {
                            sys_security_acl: '31adee037a7d499b84eeddcefaacaf57';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'badbce0fdb2041a691be84c8bc79d785';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'key';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'baf5119460ac4658aa44901b89266ebc';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'name';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_user_role';
                        id: 'bb0d5f6b27044597a388e855e8154d92';
                        key: {
                            name: 'x_312987_portal.developer';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'bb5d20389efc459a847fd4c251b54daf';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'bbba98e4853240cfabf013ecb5a6662f';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            caption: 'Build Dependency';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'bbecb6f701544ebbb2f7b9de5b8b1401';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'bc19d47a62b840bf9521ec865d2c25bc';
                        key: {
                            name: 'x_312987_portal_build';
                            caption: 'Assets';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'bc8a233425b0427a88a48ed15d126bc4';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'bcc41f4e5ae24cfeb53e34714ab6c63b';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'options_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'bd0db1164f3a4fa698c91553853465aa';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'collapsed';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'bd57bf0a3b3046b8bf199775a36b642f';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'unique_id';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'bdb44171feae4aa78c16a5ed14585838';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'bdf80791809c40099b6529cef84bc02c';
                        key: {
                            sys_ui_section: {
                                id: 'd008a73cc75e473fbc08d659a52c1ad0';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Scripts';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'script';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'be2191a9a48648e7bd8eea7d8bb97d8c';
                        key: {
                            list_id: {
                                id: '3c05ffe068e540f0b18dbee1a11c2d96';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '055fed37c1644805a6dd85a6578a6a53';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'be68f11509c645908fb1921e5136a9a4';
                        key: {
                            name: 'x_312987_portal_record_field';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ux_lib_asset';
                        id: 'beabfd6834154c95998db2920bc50263';
                        key: {
                            name: 'x_312987_portal/vendor-react-dom--55da69dc';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'beb03de2413f4a45afd6cb0c72302908';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'parent';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'becc73893f39499085616f672e3c9fb1';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'path';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'bf0ce32c4f8548bdabc4dae7a1bf9df5';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'bf258e3f775b4da48681676abead12d5';
                        key: {
                            list_id: {
                                id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'parent';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'bf35161cb6274c41b5e812e2b71d2848';
                        key: {
                            list_id: {
                                id: '6155f958c13d448a917f27136d365293';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'bf4361345ae640d296f80525bbd0c0ea';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'bf4bcef8178f486394c24fad4fd40be3';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'bf569810a9974bc9a8f1529c993d153e';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'bf720a631fa84a58852613d684279ec3';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'processed_by';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'bf75179d738a46f39b40754d2f2c9115';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'page';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'bfb600de83af4f019d21711750a44e4f';
                        key: {
                            name: 'x_312987_portal_source_file';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'bfbd8a72723b4683be4f8b673661daf3';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                            value: 'host';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'bfc2b3e565dc47b6a0b9f262186e4215';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'entry_type';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'bfc78ad332a64788b5dff6238e2d3a6a';
                        key: {
                            sys_ui_form: {
                                id: '90af612f059248539a0c8565b6d1787e';
                                key: {
                                    name: 'x_312987_portal_item_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '0052b3a8b8f24dbfa8f39cdcd0c10532';
                                key: {
                                    name: 'x_312987_portal_item_uc';
                                    caption: 'Menu Item Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'c01867424f9644d39c791e661c39992c';
                        key: {
                            sys_security_acl: '49ce7530de4849948abbe5219a3a648c';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c02802f1d275464ead51d4887367af31';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'c0502b9e00024a8bbeff0de8b03bdff2';
                        key: {
                            list_id: {
                                id: '1455ae977dd64cb9a03b707e6f29beef';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'label';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c0fbc2ccc5d94037bac6847cc0617ef9';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c10e26bc914240efbc02686ec610d70d';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'c175d4930e6e417db162230344a98191';
                        key: {
                            name: 'x_312987_portal_build_asset';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'c1bc4cf0aed04d709cf1da5cf9bb967c';
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'c1be0f227381410bb3025062cc2d7ea6';
                        key: {
                            sys_ui_form: {
                                id: '4fc7babfe5ca4bcba792050db14dc2f3';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c2322cd0db92474b84dca1b2d9f433bc';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'key';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c255da48c61041ec958fd8376109e762';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c26e93d196964b3e976f226fd77c7964';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'view_name';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c2701a902e7b48b1868c5474a23424fd';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'c294da3cc6964553a23c0e845b42ec5b';
                        key: {
                            logical_table_name: 'x_312987_portal_menu_item';
                            col_name_string: 'menu,parent,order';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c2ab9dacc38a4b1692e42fde37b8103f';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'c2f188eb094246a89f1a812d559e3c64';
                        key: {
                            list_id: {
                                id: '3c05ffe068e540f0b18dbee1a11c2d96';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '055fed37c1644805a6dd85a6578a6a53';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'specifier';
                        };
                    },
                    {
                        table: 'sys_ux_lib_asset';
                        id: 'c30e8814f59b46a6bd5ca39741c1b446';
                        key: {
                            name: 'x_312987_portal/vendor-react-dom--55da69dc.js.map';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c3526e3bc8cd477a98c4d8a704f6ab9d';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'mime_type';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c367a31d971645fbba70834c7898d76e';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'theme';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c373b0c5ae424ac6a33ebcfdbd85dce4';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'component';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'c3feaebb204845e1a934ca3136e686b5';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: 'full';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c414942ded52420c8f50cdb0ca119562';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'build';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'c43e8fa5b052439ebb6210a62b29013c';
                        key: {
                            sys_security_acl: 'ad6897f0f6c34a61b69ee8e4add834f8';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c4d227a077d7434088c6a1d64eeb74ec';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'placement';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'c4dc983cbea24413bfd9df8b2125c4b6';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_portal';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c5b571c573ab489e9291715c96bcdad8';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c6109724522c4b4e862d179284948dc3';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'specifier';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c69a00efdb61454c8a1956e11a110c64';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'layout_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c69a492a8b124035a6a39b4f91d1de32';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'label';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c69e6db9f87b4c0fa2765949efbdd39a';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'input_hash';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c723e89e0a464ebabd901e48edf6b993';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'lock_view';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'c7283b0cc15643de96daa99b4a0725d8';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'target';
                            value: '_self';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                        key: {
                            name: 'x_312987_portal_placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c74b56e1641d4b35b582153d60b8b409';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'release';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'c764c9bf81c24b1fbcaa29a782d66074';
                        key: {
                            name: 'x_312987_portal_placement';
                            caption: 'Placement';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c76ea745acec48fe94f3c3e54f264f33';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'requested_at';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'c793d1ab969048b1ab1ceb511dff875d';
                        key: {
                            sys_security_acl: '0acab0516d474892ba4fb049fbc63f74';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c7a8d4e8d88c4e75b72a34c5784542cc';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'tooltip';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'c7e209f3799c46d4bef9d45d3e7ec0f8';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c8057657dafd42d68c2ae791620e4299';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c80cdd5ebf9e40289cf8277900038c3b';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'page';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'c825e96ac86c43549a24898df4b270c2';
                        key: {
                            logical_table_name: 'x_312987_portal_page_uc_no';
                            col_name_string: 'page,user_criteria';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'c8ab825a08744b02ad1844dae6f34bd2';
                        key: {
                            logical_table_name: 'x_312987_portal_release_entry';
                            col_name_string: 'release,stable_key';
                        };
                    },
                    {
                        table: 'sys_graphql_resolver_mapping';
                        id: 'c8dbf48300cc4431ad149b683466092e';
                        key: {
                            schema: 'd36c95123843458b9f52837c3f10b0f3';
                            path: 'Query:resolve';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c8e5e0b1cb0a43aa8eff94fa22cb1abe';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'target_build';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c8e856974c7f4b5aa30adc685055468f';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c8f2b17710394fdba688083fe8c1b546';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c9114f708496435795fde7a98bd29b19';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'c93c44aaf0944f8c991d6bc7799f5065';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'params_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'c95e32bb6bb4425daf3fcfd951c6ce15';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'route_pattern';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'c9641f18c37b4fc39b3a3295a0538886';
                        key: {
                            list_id: {
                                id: '74fbb26ae4e54640aec4ec2d9f1829ad';
                                key: {
                                    name: 'x_312987_portal_release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'revision';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'c968f36c3b8b4c6abb19d6642a25fcc2';
                        key: {
                            sys_security_acl: '5544cc1b45cb44cfa07c54a57c76499a';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c96fda851e8e4e6f953916fc15f08605';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'options_snapshot';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c9c9add173634d64962916565baea4a8';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'source_revision';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'c9d2bf10565349efb4e53c3bfb5fe1de';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'title';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'c9f445b1acfe4ff6bfeb46b350739756';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'source_revision';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ca10bbeee86344e68586bc49a3909c4a';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'content_text';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'ca1c8f8e46ca4fd89241e1aaa94e08cd';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                            value: 'package';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ca2c850d8db24155bd5c87211f45a2b5';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'content_hash';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ca363320ab4f41a28e3e774a1e193401';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_user_role_contains';
                        id: 'ca374cd0a0114cc2a388f9dfbe72e136';
                        key: {
                            role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                            contains: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ca7981ee96b846fb8864918c80ab304a';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'parent';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'caee44061d024d75a6bd44194270df9c';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'path';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'cafb98b06dfd44efb022c5208afc3ac6';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'action';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'cb06e68a3c4f4da98605e3ce86006ed7';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            value: 'widget';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'cb2aa4f55ae14c77b3ee57a2f607997d';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'build';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'cb4cf00805d64f10b868d243d7b56ee4';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                            value: 'client';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'cb576eea42eb4c609754e2a1502560ba';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'search_text';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'cb738c3bdfef428a8e1f78f64decef2e';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'server_mode';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'cb8fab656d714f1a9f618b05694ddefe';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cb9f6bfb87d84e279d22afe0602ec698';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'style_tokens_json';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'cbb2c9c9760d4c0ea7db5e75fb23ab9a';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                            value: 'title';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cc1a5802a0d144a7849840217d1f9faf';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'cc211e141b2d4aed99a5ce2dbca7fa44';
                        key: {
                            sys_security_acl: '14ce2fb94b2f4e9c9de7e77a61d54e6d';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'cc9fe63eae1e4a0188d06d959cfa2a4a';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                            value: 'pill';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'ccc7664422a64b349fbcd15ce2106a67';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ccf95a85a0b6440698319c59c6044778';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'owner_key';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'cd03346c3900436fa0a98ca785b5412a';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'build';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'cd11081db2914c2a9cbe2c9c2b3a660e';
                        key: {
                            list_id: {
                                id: 'c73c606b1d1f4f539e2b1a26c892cd69';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'region';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'cdab6c8e31124042b55a208a3c74b161';
                        key: {
                            sys_security_acl: '7d3f69ad5e5a493a93399fe64dd52e3e';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'cde7a0588467418abcc3879fc1c747a7';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'cdf6c598768340a084c5fdd22f0ce40a';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            caption: 'Menu Item';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ce1744269aac40528e6a30f661828cfa';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ce2b189bdad944758dd04791d46c8ccc';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'icon';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ce5a8422693845f7b264cc30a6cdbd00';
                        key: {
                            sys_security_acl: '3d53050dcf76450b9c987a1465561a1b';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cea99e1a78394269aee8d67a5ea2456f';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'cebbc28a52f447dc808898e0a175d3e0';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'search_text';
                            position: '17';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cedd7b5f1c7c417d9556448277f71300';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_config';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'cee154cfafe54ac0b0daddcf03be6d88';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ceea8e9ba5154e55aac2d240cea3b2cf';
                        key: {
                            sys_security_acl: '59eb7796fc114b869175f3103b1cb66c';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'cf56f8bf3c74439bb49be1ea5d22978c';
                        deleted: false;
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'classes';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cf7fca82d4744c72903d064d9ef0c8bc';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'release';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'cfb8365865eb42a5b0308b96512672fa';
                        key: {
                            list_id: {
                                id: '9b4bd5e57e844c89a2bc3aad3aaa1a65';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_release';
                                };
                            };
                            element: 'server_mode';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cfc7ed53c09849dcb58df0f9c66f7fd5';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'cfde6ccc55e249938a8122a8285015bf';
                        key: {
                            name: 'x_312987_portal_page';
                            caption: 'Page';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'cfe26d864343431b8f348944eb3130f1';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'tags';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'd008a73cc75e473fbc08d659a52c1ad0';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            caption: 'Scripts';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'd08518eb9a3c4b08bf70f2f305be3760';
                        key: {
                            name: 'x_312987_portal_record_field';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd09c0d127514480d8355ba80968caf25';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd0a19ad88170468f81931e72e268c9e2';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'built_revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd0a48a8f7f4f4e2d9b8d14f6649739a9';
                        key: {
                            sys_security_acl: '025e0a20832641e5a971fa21b820f8ea';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd0f25c1b3e414151a808fb4f6f1eed62';
                        key: {
                            sys_ui_section: {
                                id: 'bbba98e4853240cfabf013ecb5a6662f';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    caption: 'Build Dependency';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd0fd9ed5ffbc44438b63464503b88ed0';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd152a93bbeb944f3a941edc764a4868d';
                        key: {
                            sys_security_acl: '19a741c62f7d4080848b1d9a4f6e1204';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd1663d5a88344863adf2afe9141a36f9';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'parent';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'd169260f5d0f4557a7ae7d0c49c4a4ac';
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711';
                                key: {
                                    name: 'x_312987_portal_component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '81668d6febee46d19f6a654c24228910';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'd19f5072d86541458911e1917eaa525f';
                        key: {
                            logical_table_name: 'x_312987_portal_vrule_uc_no';
                            col_name_string: 'rule,user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd1c845f984d64ced8121c68ba3700181';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd1daaee097874d68adb9e61591c8bda6';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'table';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd209439035f44270ad3bc3fb07afe5b8';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd22f64f95edb480796902ca8025ce169';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content_width';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd23e66ecad604ec082c5d816aeea7332';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'options_schema_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd278ceb5c11c47fa8b165b8256a9b079';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'menu_item';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd2cfeed5963941fe93ad97c021df3beb';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd2fdf201fd2845bbb55424b56cd6ca10';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'section_slug';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd30e20322a08455aa62f904d87c19e7b';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'component';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd31681c13773428cbed4e2be869ac770';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'component';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd3281f9a4df8401f959757b15a6bc617';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'option_view';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd356a2b86d3d4b908a9c873fb8715d38';
                        key: {
                            sys_security_acl: '81e01cd299ba451d819a85cc90b7bcc1';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd37f621c832f4425b7caa2b9e9fd3eff';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd390a9ed1b2a4fafb61e68554f987382';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'path';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd3a65785713d45cc925131975df24d74';
                        key: {
                            sys_security_acl: '02e4cb5531bc4df5a252409229779238';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd3ffed77ee894d4dab315eb82bc676aa';
                        key: {
                            sys_security_acl: '6d9a07a54ad04e5a8bc902b89bdacdf5';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd40f55696daf42a6b136402d31c15bf1';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'field';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd4239df82fb24c87b959c63dfcbe20b2';
                        key: {
                            sys_security_acl: '0acab0516d474892ba4fb049fbc63f74';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd439d92fd4a246379b53158a00c48612';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'd441233a10dc4c9a8918356da5caad35';
                        key: {
                            sys_security_acl: '0acab0516d474892ba4fb049fbc63f74';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd4454b3864dd480ab30737f7340cad57';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'section';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'd472758e7ea3422ab688facb1aac90b4';
                        key: {
                            list_id: {
                                id: 'f600a236001c4c7097d7e6148f6eb86e';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'd4b29ce6d77f4196a969da1f0149f02b';
                        key: {
                            list_id: {
                                id: '6088a1152aeb446ea00a4708c2f0d029';
                                key: {
                                    name: 'x_312987_portal_menu';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd4fed6fabdb14989b2a15300bb40df80';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'icon';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'd5433443864d4880882ec8ad432af9f6';
                        key: {
                            logical_table_name: 'x_312987_portal_item_uc_no';
                            col_name_string: 'menu_item,user_criteria';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'd54749071af84fcdba2128dd65289ebe';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'd561280b330e463aa7b6cff7fd127ab3';
                        key: {
                            sys_ui_form: {
                                id: '4e8ddd578d5444d4a73d7bcbcf9e1711';
                                key: {
                                    name: 'x_312987_portal_component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '8758a8221584472fabf085adc8da9c8d';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Extra Files';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd5627f6b03e94243a5911c9821c084be';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'byte_length';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: 'd582f03dcc2b4ec2be2f819a270d0555';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd6836193d83e40f69babc646c5221899';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'route_pattern';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd68de0d4ea954e57ac7d53bd4c5a9e5f';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'd6d10d8512464da29136ec14e8eca14d';
                        key: {
                            list_id: {
                                id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'doc_section';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd7843e6ca0db4ad5abaae317240cbd63';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'icon';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'd7bac966c36943798a53161b12bde0b7';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'field';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'd85894846d5a4e52800165b159c8699b';
                        key: {
                            list_id: {
                                id: 'f600a236001c4c7097d7e6148f6eb86e';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd86340f325ab4c38b06ca31cf7f4b3df';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'origin';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd87af397c79c45ef9045adc3120942b7';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'compiler_version';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd8881bff0d1144a3a50946cd8d9af328';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd895f7be360643ef905147cef68b5ce6';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd8c39b1f710c489ea08cd5611c023896';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'release';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd8db610d351943cf9614cbc9d4da7f14';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'parent';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'd8e333faeeab4a2ca250f6f59e8542cb';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'd8f7476fde314551bc90e8420acd5be6';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'notes';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd8fec3984ebb4d1c944e6e7d348e70b7';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'entry_type';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd9191cc6123c4784881bfdb2b586b393';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'description';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'd927308b53424c5da765ec2ea7a91b40';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'options_snapshot';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'd9a70ad75d284b0fa762a40db6a13676';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'unique_id';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'd9efb487294d4aadb7c13114b085975d';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                            value: 'list';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'da16a7eab3464cd4a97ff30018d4f597';
                        key: {
                            name: 'x_312987_portal_menu';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'da9d776d23e34ab48c33a731886e1706';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'source_revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'dac5ff081456476c9bacb9fc6c515d79';
                        key: {
                            name: 'x_312987_portal_release';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'dae25c97113241f08292c74dc384d694';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'view';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'db01ae01c32c4f7faba929fac37cea38';
                        key: {
                            list_id: {
                                id: '0dda362c79414bbfabc37f852a4e806a';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'host_export';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'db3f37665d46476293f1f27c8800380c';
                        key: {
                            name: 'x_312987_portal_theme';
                            element: 'name';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'dbbc785b01894dd5b2055df16aa860e5';
                        key: {
                            sys_ui_section: {
                                id: '0052b3a8b8f24dbfa8f39cdcd0c10532';
                                key: {
                                    name: 'x_312987_portal_item_uc';
                                    caption: 'Menu Item Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'user_criteria';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'dbe217eca2aa4293880bd119929c3530';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'source';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'dc00ffb6c1a64d47830051771a235195';
                        key: {
                            sys_ui_form: {
                                id: '488dfa51294049e5ab9c2df9561a2395';
                                key: {
                                    name: 'x_312987_portal_build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: 'bc19d47a62b840bf9521ec865d2c25bc';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Assets';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'dc0154cee3e447718de1eec1cd9ba4ca';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: 'dc2e5bd25e624d9f90c56b822d5d283b';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'dc34143253ee4e83adcc57ce419c2d15';
                        key: {
                            sys_security_acl: 'f71c8ea2927947d1b72d7415a7dc78f6';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'dcb4f34d5c324e769700d59f34c436fc';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'dcc159628be040ee87aa1b276235566d';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'dd06c6ab05a5432c96359eefd1cda161';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m';
                        id: 'dd11b8e3d1d141b8827552dcfede889a';
                        key: {
                            application_file: 'c30e8814f59b46a6bd5ca39741c1b446';
                            source_artifact: 'a96ecfa85cec470db062f471b8facdba';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'dd4278b0261a40d8be4d2f76d292d179';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'hash';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: 'dd78151708e544338988d6ad05c1a960';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'match';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ddcdb4a07f19423fa42a54f3e561fd52';
                        key: {
                            sys_ui_section: {
                                id: '2983a67f3e774961b7a085053372c39b';
                                key: {
                                    name: 'x_312987_portal_execution_log';
                                    caption: 'Execution';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '12';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'dde72d79f9ba45bb81e9ad7bf5d41f16';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            value: 'block';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'de0da5f2a8304834b59075c3a4b44ff0';
                        key: {
                            list_id: {
                                id: '0506fb5b855741c5adfdb26a8238d598';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'de14378012884fa9bd71a6a599f82f1e';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'de2591146b464991b07695f6a2b6dc9f';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'de3e3957cb6e49f0a82542744ed46793';
                        key: {
                            list_id: {
                                id: '1455ae977dd64cb9a03b707e6f29beef';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_page';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'de5d7efcf60f4ed5b5f95b916d99b018';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'de96ebd8fcd147b7b79091c1e47f7cdf';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'component';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'deebc5506e0c4bfcadb3169b52a649a8';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'condition';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'df3472753bcc479b9eef270a92251fc0';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'css';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ws_query_parameter_map';
                        id: 'df3507a3aca7436fb46c115e6cc0335d';
                        key: {
                            web_service_operation: '17e5684834b24b1b99264deee3f2fac2';
                            web_service_query_parameter: 'e89d4a5daeab4b2398fa5ee8601cf671';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'df4e2f65cc124e0e8c35f08823a52897';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'df74b7bef3d541b7ab81496fb5249233';
                        key: {
                            sys_ui_form: {
                                id: '49b2f355a8124a5cb40aed47582e959b';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'dfb690c4e87b4c77a94258d4646dcc05';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'description';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'dfd51494ff40410cb7f1f13fde861261';
                        key: {
                            sys_security_acl: '1d63e1720194444d91a068533b24d940';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e030721e0cf744daae6b12d227e8f996';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e03c898f3f724575ac59128b99ba7579';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'settings_json';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e0437a7c22334f6b813f5aa464c7dc30';
                        key: {
                            sys_ui_section: {
                                id: '79cdcfcc5ea24890a3bfaa3c2406afcf';
                                key: {
                                    name: 'x_312987_portal_page_uc_no';
                                    caption: 'Page Not Available For';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'page';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e05baa495d824c6d8225ae0cbee935c4';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'component';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e07f7cf4b4aa4d1c9517985cc1a8196a';
                        key: {
                            list_id: {
                                id: 'f600a236001c4c7097d7e6148f6eb86e';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'byte_length';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e097eb5aaa184b26a55f4cc51e9a2760';
                        key: {
                            sys_security_acl: 'c1cf1de959324e448a1dd33708dc3e24';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e0fcb509669c438194afa86bb9134c93';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'active';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e1099609c74d4059be3144df00ea3ad0';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'roles';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e11b5c022240488c9ad051f0ba5a6bb5';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '6';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e1c5b250750746bd971076320e3e546f';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            element: 'menu_item';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e1e24eb62ddf4ac087c180d350cb41c4';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e233295c83484101ab555e774320b86d';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'tags';
                            position: '14';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e2343c5aa28b40419c7aa16c2a928225';
                        key: {
                            list_id: {
                                id: '8d053fd198474c6884fed6e8dba6b201';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'ef742e520459439c9314fadfd2f827fc';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e2367436458347289bb4c1df872ea406';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'kind';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e270c85ad1a146de8b894aa9555d915b';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'headings_json';
                            position: '16';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e27b67519f2342859ef2501ea5090552';
                        key: {
                            list_id: {
                                id: '3bf9948645364a4f8ab4054daf6bb463';
                                key: {
                                    name: 'x_312987_portal_item_uc_no';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e365fecb24f946aaa3d79dd9cdd364ab';
                        key: {
                            sys_ui_section: {
                                id: '06b26a19a3214f3896acc18761876d70';
                                key: {
                                    name: 'x_312987_portal_release';
                                    caption: 'Release';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'revision';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e3808ba57a434458a9fad2f0180015ac';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'option_view';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e38b1c393636406a9cea0973512b126c';
                        key: {
                            sys_security_acl: '0a6eb7db3ce047a281cf08837a99f8a7';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e3b415d7b57d4d43bff3533dec7b16a1';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'roles';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e3e1bdbf0d84497c996a32660fbcf6cf';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'slug';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e4206d779fae4782a2f048bc6f316dc7';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'manifest_json';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'e43ab5a0c2ab4199a2538c46be5289a7';
                        key: {
                            name: 'x_312987_portal_portal';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_component';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e44d76371ef64a44a29715b9d05c2d8c';
                        key: {
                            sys_security_acl: '924854e1b6b84ed9add817f06e133f01';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'e4b68fd03acd4351a6b98127a2ac08eb';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'server_mode';
                            value: 'on-demand';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e4c42f771bd7483eaf4b476cc2fcedd9';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e504299245374ba89ee71907724a81da';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'slug';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e6018a6dfa4d487893f3e0785e31e7dc';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'options_json';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'e62b9c85a5b446e093c4dc5db673dd16';
                        key: {
                            name: 'x_312987_portal_build_asset';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'e658c7d49a8d46a5abc45272541cc829';
                        key: {
                            name: 'x_312987_portal_portal_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e69a7502632d4acaa69c3ba23e148a6f';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'section_order';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e6d45d67af0f49f8a58da38ad00c068d';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'script';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e700322cfddb4c5aa900300ea64a744f';
                        key: {
                            list_id: {
                                id: '6b8b9fdd1ab842b1a1bd03fccc29162a';
                                key: {
                                    name: 'x_312987_portal_item_uc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e7435f1c5b67427fa420a2bf1d39ffc6';
                        key: {
                            name: 'x_312987_portal_placement';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e774ad2f465b4228b9fddcb6c1f2f89f';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'access_config_json';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e78cc7ded3334956b94a9d37a09125c7';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'instance';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e7b346a2110846e5a676304e1ae06ec0';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'slug';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e7d05959a3474980950b28691109281c';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e7dfe64088424997a7348eb8876be3ff';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'utilities_css';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'e80205f944b549b890ebe3ca00bdfac1';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'url';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e81829f5b04b464bb81233858164ba4f';
                        key: {
                            sys_security_acl: '22b5d1b3a76a4ddbbab908bf5f3aa85d';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e81d9b1c8bfd492c89cd6c66b7e97a8e';
                        key: {
                            sys_security_acl: 'a7e9b3ad4bac4b538030eadf2f862d25';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e8203d83edf041ce8e4017f693d6487a';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'menu';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e85958c4379f4c71bfe75b1b8442653f';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'regions_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e87d68aef7664093b259bf7278dd11a2';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'e87d998f74fb46a8a10473aa20039707';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'markdown';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'e88d21f020e445a085d4d1014ea5bd3d';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e8d700ced3bd462a95c45d219961c080';
                        key: {
                            name: 'x_312987_portal_build_dep';
                            element: 'target_build';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e90ac525fb424ca48d72def2f448a7a1';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e90d9bd4098e405e94bea1e04dcd7d54';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'badge_script';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'e93b2fce80834051bc93cef49671cec7';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            caption: 'Doc section';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e94f5b38e5a14a25b7f645f7efd4c5bf';
                        key: {
                            list_id: {
                                id: 'be68f11509c645908fb1921e5136a9a4';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'NULL';
                                };
                            };
                            element: 'table';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'e973639aef374715a6c111cd4638a429';
                        key: {
                            sys_security_acl: '9be74f906e7245deb7b17e445ac123f1';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'e97b7499b75e4e99a274bd97c23ba659';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'e99e49309ba24233af355ca33fa29516';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'rule_id';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'e9a469c782bb49f5bc21547243521740';
                        key: {
                            list_id: {
                                id: '0686580e8f214d568d733dec58c45f8d';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_section';
                                };
                            };
                            element: 'path';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ea06ed2c8a374f758461a229c7cb38c8';
                        key: {
                            sys_security_acl: '543b56590732464ca3cc70000041a909';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ea16053ac4814e179da72855006e49bf';
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'title';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ea1c960173994f85a6540b897f1bbd65';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'route_pattern';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ea494d69defb4a71bc2b1550ded3995d';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'type';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ea4b77bcc12945f19d9797876c183b7a';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content_hash';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ea862fdbfee64a6a8376df6bf1ea989a';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'origin';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'ea9fbca1fa6448fb8d5967c000cec5f7';
                        key: {
                            name: 'x_312987_portal_doc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_doc_collection';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'eab5448ba8e74fffbf3fb6b7c6b19715';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'active';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'eb1b09b763e44236b889391ce4f31db3';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'page';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'ebf272027e02430a96ad8e4af31b4392';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'target';
                            value: 'server';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ec1695e63f7647c99db36ed1491a78bc';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '10';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ec2418c2a4b44cbcbb49fab62ba84918';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'tailwind';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ec46e893cef6473b947614b294c3c5ad';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ec58678b589a45d0821d7ff4327c349b';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'placement';
                        };
                    },
                    {
                        table: 'sys_ui_form_section';
                        id: 'ec897c1b05f540b68c41e9a6be74f53b';
                        key: {
                            sys_ui_form: {
                                id: '1e012a3d7c7747c388da4340b0f3d998';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_index';
                        id: 'eced895c425c4f3c8794cd7443d884ac';
                        key: {
                            logical_table_name: 'x_312987_portal_portal_uc';
                            col_name_string: 'portal,user_criteria';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ed363722984540d794a6123be85187ae';
                        key: {
                            sys_security_acl: 'ec216a92934d487f951c1f108d844c43';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ed4419665500473db09747fb63170f16';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'completed_at';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ed4e9081017e490588990ef0e1dc2ab1';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'title';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ed803f30f33c464f943172a4ee9df29c';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'release';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ee18b9d572d24ce59893ffc5228d0344';
                        key: {
                            sys_ui_section: {
                                id: 'c764c9bf81c24b1fbcaa29a782d66074';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    caption: 'Placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portal';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'ee23dc8d8f9e4c658038b3c35c6a5014';
                        key: {
                            list_id: {
                                id: '4e17906504b04942aea617a0c78e1496';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu_item';
                                };
                            };
                            element: 'type';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ee2a642ea9e34b569f8782e9c9f8a40b';
                        key: {
                            sys_security_acl: '4294fad8926541a69639f8a63553afaa';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ee32ca9420734249a3c0b2871389d722';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'portals';
                            position: '8';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'ee34b219436443d3bd3a4611e02cb6a0';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'state';
                            value: 'pending';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ee3af723171847039dd947435e25ae24';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'completed_at';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ee48da3439804d6287a0a3702ace6a86';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'input_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ee4fc43abfb3451b966768f453f868f3';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'exports_snapshot';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'ee6688dbb45c4dd1ad59eb8e6c22b569';
                        key: {
                            name: 'x_312987_portal_record_field';
                            element: 'slot';
                            value: 'subtitle';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ee70dbef702c4e3f94e02326bf40bb31';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'title';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'ee7c520733d0432db3374a6ddc48753d';
                        key: {
                            name: 'x_312987_portal_component';
                            element: 'kind';
                            value: 'primitive';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ef5cc1af22ab42e380de9152c19d2ce1';
                        key: {
                            sys_security_acl: 'f06a0ff7d27c4f52930231dd38ab2664';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ef80a8748e3d44bd8ffe0f4911accf16';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'efabf43fa7424c9c849639fabd6c38eb';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'efd721621f1d4d75af93256f79136b37';
                        key: {
                            list_id: {
                                id: '77ad3bad573c4abe96379315d5ae711d';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'parent';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'efe89738ccf943b2aaf488cdc1235e1f';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'content_hash';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f0078d05a0a04d0f9abe3ed72aba46f3';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f04166522df84c7eb150dc5524bf328c';
                        key: {
                            list_id: {
                                id: '7e2ca20f84ba4d0eb5582153b433776c';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'active';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'f071466c38ff48f085744da26a3f1a51';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f076bd24aae84c0d956d56cef7087db6';
                        key: {
                            sys_ui_section: {
                                id: '1c8e1881f89841a29aaccee9a6a96c94';
                                key: {
                                    name: 'x_312987_portal_source_file';
                                    caption: 'Source File';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'content_text';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_choice_set';
                        id: 'f10f6874bca34f13a9acf5e58cb37ae1';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'outcome';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f158eafb842d4fa7b25a0cf4498a9b98';
                        key: {
                            sys_ui_section: {
                                id: 'cdf6c598768340a084c5fdd22f0ce40a';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    caption: 'Menu Item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'params_json';
                            position: '21';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f1895631d3314cd6984b27ab17568beb';
                        key: {
                            sys_security_acl: 'fb6d306abdda4f2c97ba3481b26f56a6';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f19699e4218441e796c3b32e967f3122';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'order';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f1d84d1c6a224fb69bbfaf89d6cae4b8';
                        key: {
                            sys_security_acl: '8f9d5597c87e4136af8004bb92e14dd0';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f1dadb4e208f46fab084885476a2226f';
                        key: {
                            sys_security_acl: '0ae0f46bee4642d89169874bc3eac62e';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f1ea2cebec9540d498dbb57133d0a8a7';
                        key: {
                            sys_ui_section: {
                                id: '69ef9bbdff6b4bb9ac3c45748a40ba12';
                                key: {
                                    name: 'x_312987_portal_build';
                                    caption: 'Build';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'source_snapshot_json';
                            position: '20';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f1f3c8494dbd426a897c37cc446f5c9c';
                        key: {
                            list_id: {
                                id: '7e2ca20f84ba4d0eb5582153b433776c';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_theme';
                                };
                            };
                            element: 'slug';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f20ef94951444467a9c0791fe7ce0b0f';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'theme';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f22f17762add44cb9f900c1c0006a6ec';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '5';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'f27f33cb32844dc6a19beb7773a3906d';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'separator';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f2bd8c6ccaad40df8fdf8c0e57f2fa06';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'default_layout';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f2c10e7eeebb458ea41a0adb035b2b49';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '4';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f2cfaf22b5904ea9b98f9bf50e31af57';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'access_config_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f319bc158fe6438b823ee77dbb9d6446';
                        key: {
                            sys_security_acl: 'e039a674fd6d411a912453227f97df8b';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f330f54218bb43419b99abe65a93726c';
                        key: {
                            list_id: {
                                id: '6155f958c13d448a917f27136d365293';
                                key: {
                                    name: 'x_312987_portal_placement';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_component';
                                };
                            };
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f358cf134e1d43529931f67c44c03188';
                        key: {
                            sys_security_acl: '336a8bac1d0f4e74a394cf9ba177997d';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f37b62ead76c41a6b9b80d769b1c4beb';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'headings_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f398354b891b489689392651aadf60e4';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'collapsed';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f3c624cfc653415aa2cebd6bc918811b';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'table';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f3cc4b1dd186465aa8a794602cbea856';
                        key: {
                            sys_ui_section: {
                                id: '3aa5950bec1449f9b0c5059edeec155d';
                                key: {
                                    name: 'x_312987_portal_theme';
                                    caption: 'Theme';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'active';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f42419f4b26d4dedbbbfa8323489632b';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'order';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'f4560beac2e545b7914ecd4306785a52';
                        key: {
                            name: 'x_312987_portal_portal_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'f45eb4ed5a5b4aefb27068cf4b134db3';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'type';
                            value: 'route';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f4e91b6546d54746ae13af549139333c';
                        key: {
                            list_id: {
                                id: '59e6e6763c134ff89e2ab6b380bfc58f';
                                key: {
                                    name: 'x_312987_portal_page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'name';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f55475f34c6a4d799bb90c94fa9163e4';
                        key: {
                            name: 'x_312987_portal_build';
                            element: 'owner_key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'f58792e9713441ddbcf7aa5e42bfd2cc';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'applies_to';
                            value: 'both';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f5b504acebf14d24a9631ca7a90cde14';
                        key: {
                            sys_ui_section: {
                                id: '7270bae8abb24f4192bc7a194c400135';
                                key: {
                                    name: 'x_312987_portal_portal';
                                    caption: 'Portal';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'home_page';
                            position: '9';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f5e0f9129a94469790108b0ff874be17';
                        key: {
                            sys_ui_section: {
                                id: 'e93b2fce80834051bc93cef49671cec7';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    caption: 'Doc section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f5f255d38fc649719b0b9f1b33034f4e';
                        key: {
                            list_id: {
                                id: '4aaf56667bbf4f1fb135193d2d81ef91';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '627f21eb7a334511a5d0dae5d13e6a50';
                                    parent: 'x_312987_portal_portal';
                                };
                            };
                            element: 'portals';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f5f460816eee44f981093136169fd324';
                        key: {
                            name: 'x_312987_portal_build_asset';
                            element: 'byte_length';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'f600a236001c4c7097d7e6148f6eb86e';
                        key: {
                            name: 'x_312987_portal_source_file';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_theme';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f601f013c8d640c0a9f8e488b9d4e471';
                        key: {
                            sys_security_acl: '32cabea3751c4e1ca7370ae85989eefc';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f63bca9e52374db2b16b3e874c1abe34';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'portal';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f6579262d72d4c7fb2906f588b6080c7';
                        key: {
                            sys_security_acl: '843a538cf2cf44c1a852b2e07cd7f9c9';
                            sys_user_role: {
                                id: 'af10a92d95ca4d52bc65ad852ac7db12';
                                key: {
                                    name: 'x_312987_portal.publisher';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f695d974859548c89850037ec262ad63';
                        deleted: true;
                        key: {
                            sys_ui_section: {
                                id: '7c3578c5b06b4184b5d65e47a4bcf377';
                                key: {
                                    name: 'x_312987_portal_doc';
                                    caption: 'Doc page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'description';
                            position: '13';
                        };
                    },
                    {
                        table: 'sys_choice';
                        id: 'f6cf91176d644bd496b87b5dead7237f';
                        key: {
                            name: 'x_312987_portal_page';
                            element: 'content_width';
                            value: '5xl';
                            language: 'en';
                            dependent_value: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'f6d45c2af9f14206baf26e9261854574';
                        key: {
                            name: 'x_312987_portal_menu';
                            caption: 'Menu';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f6d53e7b59ca4416b3912edf2aa1622a';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f6fdb8285e84438b8fc07356a0ca6006';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'processed_by';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'f7693acb1b854eb5b10869bf8546817c';
                        key: {
                            sys_security_acl: '52c75446fa0148a4b4eee82e402f7973';
                            sys_user_role: {
                                id: 'bb0d5f6b27044597a388e855e8154d92';
                                key: {
                                    name: 'x_312987_portal.developer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f7a7ef145dbb4b44a20303d27f84aadf';
                        key: {
                            sys_ui_section: {
                                id: '81a9f8546d504cf78bfb8633075a80cd';
                                key: {
                                    name: 'x_312987_portal_build_asset';
                                    caption: 'Build Asset';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'kind';
                            position: '3';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'f825e87719fc4862b4c34e9bfd25f868';
                        key: {
                            list_id: {
                                id: 'a83cefa349d64fd0aed9fb6cf6ca67d7';
                                key: {
                                    name: 'x_312987_portal_menu_item';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_menu';
                                };
                            };
                            element: 'type';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f83fc127c86d42649ec8f0a110dd5e2d';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'f845b548ece64e25b973a462961d116c';
                        key: {
                            name: 'x_312987_portal_item_uc';
                            element: 'user_criteria';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f8bbac9d034b43deb2d859c6ecaf5265';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'url';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f8d8fca4b76847c7aeea7ee46c735f9b';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'match';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'f8e31cacc804423fa34684d00da22bbe';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'page';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'f91e4b08e28240a78b6fc44d10d9d4d7';
                        key: {
                            sys_ui_section: {
                                id: '95d2fd117a3049d396667ef0ccb34240';
                                key: {
                                    name: 'x_312987_portal_component';
                                    caption: 'Component';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.split';
                            position: '7';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'f9a094e1615d4fbfbda2b2afd33dbd26';
                        key: {
                            name: 'x_312987_portal_item_uc_no';
                        };
                    },
                    {
                        table: 'sys_db_object';
                        id: 'f9fc55694c5e4a51abaad1500bf0dcea';
                        key: {
                            name: 'x_312987_portal_menu_item';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fa146f43c47e415ea0d56e9189d5dc46';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fa55f8614c5a4b618beadea25d48dd63';
                        key: {
                            name: 'x_312987_portal_doc_collection';
                            element: 'icon';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fa73c590f6f44759837babec7e0f8be2';
                        key: {
                            name: 'x_312987_portal_release';
                            element: 'revision';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'fa7785cab9c04e4fafae1acfbdc08c63';
                        key: {
                            sys_security_acl: '08acd90e2ec8411dbef374c24df824e1';
                            sys_user_role: {
                                id: 'aaff259f0aa54d43b45dbce14a6012d1';
                                key: {
                                    name: 'x_312987_portal.designer';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_ui_section';
                        id: 'fabfd4ed419b41d48f6e1aca498703f5';
                        key: {
                            name: 'x_312987_portal_doc';
                            caption: 'Collection';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fae6b86bc01144498833e159503d7b67';
                        key: {
                            name: 'x_312987_portal_release_entry';
                            element: 'component';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'fb38fe205b2d45088b177dbf0e56152d';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'NULL';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'fb419bb3f10741dfb7ee4550c4a0b8dd';
                        key: {
                            list_id: {
                                id: '63526d64a5404425bb5f717753f7b1eb';
                                key: {
                                    name: 'x_312987_portal_build_dep';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: '1e73a4e3eb2840caad1479758113a74c';
                                    parent: 'x_312987_portal_build';
                                };
                            };
                            element: 'specifier';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'fb69b657e2784ec697a55a63389e82f7';
                        key: {
                            sys_ui_section: {
                                id: '415b852b985746d9aa51e1e335bc3e71';
                                key: {
                                    name: 'x_312987_portal_doc_collection';
                                    caption: 'Doc collection';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.begin_split';
                            position: '0';
                        };
                    },
                    {
                        table: 'sys_ui_form';
                        id: 'fb8126e9697044d1a21fc888b731fe83';
                        key: {
                            name: 'x_312987_portal_page_uc';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fb8da58465b94eec9106b4ce829d6262';
                        key: {
                            name: 'x_312987_portal_doc_section';
                            element: 'origin';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_ui_list';
                        id: 'fbdb41a41aeb4e56ad89306535edf7bc';
                        key: {
                            name: 'x_312987_portal_build';
                            view: {
                                id: 'Default view';
                                key: {
                                    name: 'NULL';
                                };
                            };
                            sys_domain: 'global';
                            element: 'NULL';
                            relationship: 'NULL';
                            parent: 'x_312987_portal_theme';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fc42ffe6d4db46ad8bf684f4ce3fc1d0';
                        key: {
                            name: 'x_312987_portal_source_file';
                            element: 'owner_key';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'fd20d8bd897d498aa19a55d727c82026';
                        key: {
                            name: 'x_312987_portal_execution_log';
                            element: 'build';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fd6437a117fb482ab5928e6ba51fb3d2';
                        key: {
                            name: 'x_312987_portal_page_uc_no';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'fd686ac3fa3b44f7bfac842e0a910ce8';
                        key: {
                            name: 'x_312987_portal_page';
                        };
                    },
                    {
                        table: 'ua_table_licensing_config';
                        id: 'fd6976c4ff56479fbacddf46323e19bb';
                        key: {
                            name: 'x_312987_portal_menu';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fd76f1b916604ab9945294d22edb538e';
                        key: {
                            name: 'x_312987_portal_portal';
                            element: 'navigation_json';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'fda05640bcbd4654be2dc5f293900ab2';
                        key: {
                            name: 'x_312987_portal_doc';
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'fde9b3325d614b3e806d3a678fdd9608';
                        key: {
                            name: 'x_312987_portal_view_rule';
                            element: 'script';
                        };
                    },
                    {
                        table: 'sys_ui_list_element';
                        id: 'fdf75a6cb55c475594df5d0a3d0d94da';
                        key: {
                            list_id: {
                                id: '121df09f189d40c9b0803087edeb0b2c';
                                key: {
                                    name: 'x_312987_portal_doc_section';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                    element: 'NULL';
                                    relationship: 'NULL';
                                    parent: 'x_312987_portal_doc_collection';
                                };
                            };
                            element: 'order';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'fe92053e184d41af91579e7f642fcd23';
                        key: {
                            sys_ui_section: {
                                id: '09b02d9faa1c40f29521bc88b9a72365';
                                key: {
                                    name: 'x_312987_portal_record_field';
                                    caption: 'Record header field';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'table';
                            position: '1';
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'fefdb91e998c4e76ad018b765280ef79';
                        key: {
                            name: 'x_312987_portal_menu';
                            element: 'portal';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ff26a2865f5c480eb73c41ca11e78e2b';
                        key: {
                            sys_ui_section: {
                                id: '42662b9711ec4d4a8e65364154425b86';
                                key: {
                                    name: 'x_312987_portal_release_entry';
                                    caption: 'Release Entry';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: 'stable_key';
                            position: '2';
                        };
                    },
                    {
                        table: 'sys_security_acl_role';
                        id: 'ff7c5a64d3334148ac46737174dbfe7a';
                        key: {
                            sys_security_acl: '2ef0535aee074fdea1410792a401f2a4';
                            sys_user_role: {
                                id: '27cc37ae2ddd42c0832e3c4cd39dfe8b';
                                key: {
                                    name: 'x_312987_portal.admin';
                                };
                            };
                        };
                    },
                    {
                        table: 'sys_dictionary';
                        id: 'ff89a07437d540a2a787a774d4d68a7e';
                        key: {
                            name: 'x_312987_portal_menu_item';
                            element: 'target';
                        };
                    },
                    {
                        table: 'sys_ui_element';
                        id: 'ff91289ab92e4a09ba0f0600e38bfc55';
                        key: {
                            sys_ui_section: {
                                id: 'cfde6ccc55e249938a8122a8285015bf';
                                key: {
                                    name: 'x_312987_portal_page';
                                    caption: 'Page';
                                    view: {
                                        id: 'Default view';
                                        key: {
                                            name: 'NULL';
                                        };
                                    };
                                    sys_domain: 'global';
                                };
                            };
                            element: '.end_split';
                            position: '11';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ff9453b3444d4d3fb75ff73b39f012c2';
                        key: {
                            name: 'x_312987_portal_vrule_uc_no';
                            element: 'NULL';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'ffcf1650b9034d88a0ff70725eb50cb3';
                        key: {
                            name: 'x_312987_portal_view_answer';
                            element: 'reason';
                            language: 'en';
                        };
                    },
                    {
                        table: 'sys_documentation';
                        id: 'fffdb0b32b99474295ab824a510679a3';
                        key: {
                            name: 'x_312987_portal_vrule_uc';
                            element: 'user_criteria';
                            language: 'en';
                        };
                    },
                ];
            }
        }
    }
}
