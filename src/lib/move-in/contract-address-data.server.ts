import 'server-only';

// 계약자 명부(주소.xlsx)에서 생성. 현재 ACTIVE 계약·고객 ID가 일치할 때만 사용. 클라이언트에서 import 금지.
export const CONTRACT_ADDRESS_SOURCE = {
  "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
  "sourceFileName": "주소.xlsx",
  "sourceSha256": "030254dfa01dc28fa0e35fde3337e52b1d0b68a9bb3e8af0d95d5bea2061d6de",
  "sourceRows": 851,
  "linkedRows": 850,
  "matchRule": "동·호 + 현재 ACTIVE 계약자 성명 + 전화번호 모두 일치"
} as const;

export const CONTRACT_ADDRESSES: Record<string, { contractId: string; customerId: string; address: string }> = {
 "509a4cb8-e021-4097-91c7-1d9c6c17ccbe": {
  "contractId": "475439ff-baa6-4b7b-a659-ec9ff6e81203",
  "customerId": "a42e76d5-c9e7-4195-871b-67d3b596c619",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 108동 803호 (이화마을 건영캐스빌)"
 },
 "77ed1ecd-1b3c-4937-a013-d273371e6f50": {
  "contractId": "34d22ebc-3434-4bed-83cb-e857e59d42a6",
  "customerId": "654cf4fb-463f-4637-9d9d-aec934fd7a0a",
  "address": "(5305) 서울특별시 강동구 구천면로64길 25 , 601호 (천호동)(세림스테이)"
 },
 "2450c395-a45d-4c7b-9e26-6a65b6a2c3f2": {
  "contractId": "86f54b04-aec4-456a-ad59-e90d7cfb7044",
  "customerId": "dc88466b-cf5c-4095-a6c5-c1605b2327d5",
  "address": "(52859) 경상남도 진주시 소호로19번길 11 , 103동 103호 (충무공동, 진주혁신도시 중흥에스-클래스 더프라임)"
 },
 "8854a735-7658-4ffa-9bc4-b7cbf0e86038": {
  "contractId": "1cd4a341-e54a-4a76-a046-845714f2d9b6",
  "customerId": "21549c43-2cc2-40cb-95d7-188a777ed4ff",
  "address": "(31465) 충청남도 아산시 탕정면 한들물빛5로 36 , 306동 1201호 (한들물빛도시지웰시티센트럴푸르지오3단지)"
 },
 "6ca9046c-5da6-43e0-80c0-0fcceccb940b": {
  "contractId": "6576a831-e278-4bb4-ba5e-8a8f8d9346f0",
  "customerId": "7588dfa7-1f72-4a53-afff-a31da2116231",
  "address": "(18354) 경기도 화성시 장조4로 33 , 207동 403호 (안녕동, 우미린센트포레2단지)"
 },
 "79cfc85d-f6d6-4381-b95a-947c543b1754": {
  "contractId": "d0c6882e-07fd-4d1e-a331-90899bda1c44",
  "customerId": "d9805739-e0bf-4766-8974-64527955df66",
  "address": "(8772) 서울특별시 관악구 난곡로64가길 16-3 , 501호 (신림동)"
 },
 "4e1ee38e-c17b-48a5-a4b4-1502db1315b9": {
  "contractId": "7aec5d87-7de2-4eb4-b6a2-c09c31d740fa",
  "customerId": "1ab93dd5-a795-4c6e-b0fd-c2b78d5c9598",
  "address": "(18000) 경기도 평택시 팽성읍 평궁1길 11-5 ."
 },
 "f1b47b32-5b24-4990-96a7-c85874d68dbf": {
  "contractId": "4da5866c-77fb-4d1e-a23e-9530e1c01c6e",
  "customerId": "9fab343f-9b74-434d-b445-63b465019590",
  "address": "(18138) 경기도 오산시 오산로226번길 20-4 (원동)"
 },
 "0e9dd5c7-dbd0-423d-a304-04ec2463656c": {
  "contractId": "0c89d1ef-b608-4aab-9f09-222177911f89",
  "customerId": "f6c6ffff-700f-44ea-a8eb-4db8902b5692",
  "address": "(7775) 서울특별시 강서구 월정로18길 3 , 604호 (화곡동)"
 },
 "608d1036-dd12-4a59-be7d-ddc7509848e2": {
  "contractId": "22446532-53ea-445f-9379-efe0fb78214a",
  "customerId": "4a232273-df3e-486a-bcb4-a9fb3b391224",
  "address": "(32402) 충청남도 예산군 고덕면 내석곡길 155-16 ."
 },
 "109f272c-a843-4c1a-9738-4f73cd910914": {
  "contractId": "20b92c0e-bd8f-4779-88a3-74e8b677d3a8",
  "customerId": "2b4c4f5b-3337-4c74-afb7-7e56a5493b04",
  "address": "(8567) 서울특별시 금천구 독산로44가길 19 , 301호 (시흥동)"
 },
 "51e046fb-d04e-49cc-be47-b42ffd247b7b": {
  "contractId": "5ad8b738-3ade-4676-803b-20f4bbafda1d",
  "customerId": "2a87fdfd-813a-4808-b4e1-65773cee8359",
  "address": "(17932) 경기도 평택시 안중읍 현화중앙길 96 , 2동 1102호 (동환아파트)"
 },
 "e7ad29a0-37b0-4403-94ab-79cc78ff0284": {
  "contractId": "d18efc96-c2e4-45c7-90d6-4ca428d5984c",
  "customerId": "7730b29c-e00c-468c-a9c8-8135dd6bd3f3",
  "address": "(18472) 경기도 화성시 동탄순환대로27길 45 , 624동 201호 (영천동, 동탄역 센트럴 예미지)"
 },
 "8f5d0a6e-d9d3-4417-9fc9-c7022ff73b52": {
  "contractId": "2f40a576-f99b-43ef-b6a7-7963f3ed810c",
  "customerId": "343bf19a-f89a-463f-907d-e68c831187c2",
  "address": "(17761) 경기도 평택시 지산로20번길 65 , 601호(오르빌아파트) (지산동)"
 },
 "6e0eacd1-3fae-49b6-9211-22b67866fbe5": {
  "contractId": "c6170360-20d7-4489-bcba-b80789f9bcf4",
  "customerId": "4e02b1c3-c855-4bdd-a3ff-7e92059255b0",
  "address": "(16051) 경기도 의왕시 보식골로 17 , 107동 1006호 (오전동, 대명솔채아파트)"
 },
 "ba2aa3c0-e82b-4115-9c2b-0dfceed3c225": {
  "contractId": "466a9349-e65c-4f66-b254-ef478494d716",
  "customerId": "d35fbae4-d9bd-489f-a770-7920cd2517f1",
  "address": "(34989) 대전광역시 중구 보문산로41번길 9 , 503호 (산성동, 사랑드림아파트)"
 },
 "83185697-9e3c-416d-84b0-68932dd6250d": {
  "contractId": "334bd63c-6ce9-40be-9ab9-12687417985c",
  "customerId": "5a023b32-a1db-4319-a95d-67baff4aa886",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 102동 2002호 (안중 지엔하임 스테이)"
 },
 "8582f16c-a4ae-41e1-a122-050988819c93": {
  "contractId": "3ea19602-f71a-48a2-8f63-c11e7c27e6fe",
  "customerId": "d2898761-69b3-4f65-a180-7f1c0323ca40",
  "address": "(16342) 경기도 수원시 장안구 장안로385번길 95 112동 1701호 (이목동, 수원 장안 STX KAN 2단지아파트)"
 },
 "b3686a7b-643d-4103-a2bd-21e77b4ee373": {
  "contractId": "f3ade911-ec7e-49ac-843d-f3e39d6b76fe",
  "customerId": "9dec642c-4dea-4193-89b7-c3cbd065b216",
  "address": "(18610) 경기도 화성시 향남읍 하길로 70 , 1009동 602호 (화성향남오색마을사랑으로부영10단지)"
 },
 "27b976ec-1873-47be-b2e6-8497f9cd9864": {
  "contractId": "7a758393-0672-46c2-ba9b-86921c3eebc4",
  "customerId": "28de971e-6e7f-4fc4-8b6d-be67b08d9260",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 205동 1201호 (동신 사랑마을 아파트)"
 },
 "2d18e757-a579-456a-b990-316344e0ab55": {
  "contractId": "08030dc3-78a1-4ca4-a32d-bcb6145e238d",
  "customerId": "8b84545f-5c55-4312-b26a-6c4e317007bc",
  "address": "(17804) 경기도 평택시 청북읍 청북남로 278 , 304동 901호 (부영사랑으로)"
 },
 "26e82d29-4998-48bd-83ee-0185b68ad7dd": {
  "contractId": "21649461-62e2-48a9-a2b0-f4e94f8013b4",
  "customerId": "d06c7045-b41b-42f2-8049-0edffa31064b",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 104동 906호 (늘푸른마을)"
 },
 "6b02ab55-3521-4e7e-a470-a6190dd2788a": {
  "contractId": "476d432e-d111-4263-8e5c-150da48b5e68",
  "customerId": "bb9b8dec-c667-461f-93b6-cff0d0a5aa86",
  "address": "(17933) 경기도 평택시 안중읍 안중로117번길 17-8 , 204호 (골든쉐르빌)"
 },
 "f6f2eaf0-747d-4fec-8490-bf2409b82422": {
  "contractId": "43a4cf04-20d6-4adb-9cc3-2fe91c6b9453",
  "customerId": "0f7b1e06-83d5-4bbe-84de-c4632baec8f3",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 93 , 301호"
 },
 "35a32c99-5c76-45d0-9b3c-d5bc35ac358f": {
  "contractId": "dcd3da44-088f-4d3a-9e80-53474937868b",
  "customerId": "296078b6-195c-4523-978d-cd4a77601e85",
  "address": "(15297) 경기도 안산시 상록구 화랑로 510 , 408동 304호 (성포동, 주공아파트)"
 },
 "60549998-0f38-4092-a2d8-041fd9496f75": {
  "contractId": "5ead96de-181f-4ecb-b86a-6ecfa27f1842",
  "customerId": "d3ed8f1e-f7f2-4719-8326-cc7bb100a157",
  "address": "(31494) 충청남도 아산시 배방읍 월천8길 29-3 , 201호"
 },
 "48adc651-338b-4143-9a5d-0cfae8019eaa": {
  "contractId": "538876bf-2a5a-4680-8001-936269b7c596",
  "customerId": "ef9b2616-5a4f-4683-8d48-a1d3cd23fa1a",
  "address": "(17721) 경기도 평택시 지산로175번길 70-1 , 502동 402호 (지산동, S-CLASS 5단지)"
 },
 "8163cff8-53a9-466f-a56b-6735f306cded": {
  "contractId": "b85b9311-1054-4e99-85af-e1fc6102adb0",
  "customerId": "930cc90a-62e2-4f13-a08f-de4a26d308ba",
  "address": "(8632) 서울특별시 금천구 시흥대로57길 19-29 , 3동 402호 (시흥동, 산들빌라3)"
 },
 "d17b8b94-2d27-4b55-a411-e0b90e6a6a4e": {
  "contractId": "2c41aab3-0eba-4891-b404-23c52ee0c8a0",
  "customerId": "b48714a7-6e15-46c6-b8ae-be2a653390f9",
  "address": "(14996) 경기도 시흥시 장현순환로 111 , 902동 902호 (장현동, 제일풍경채 에듀)"
 },
 "67d6005f-e57c-41bc-a159-49a2546a2f35": {
  "contractId": "07f246f8-c670-49bc-88a9-c15f4704a8af",
  "customerId": "72230f7d-f26f-45bf-862d-b911473303ee",
  "address": "(15500) 경기도 안산시 상록구 중보로 16 , 204동 1203호 (사동, 푸른마을주공2단지아파트)"
 },
 "dff2636b-e43d-411a-b011-6ba48e89b9e6": {
  "contractId": "cdbac913-cbe7-420d-bdc4-90df419534f6",
  "customerId": "5089421a-0b10-45f9-b10b-6c27dd815660",
  "address": "(17931) 경기도 평택시 안중읍 현화중앙길 103 , 103동 901호 (현대3차아파트)"
 },
 "be391f27-52ec-4c9d-be81-da5ac28e1471": {
  "contractId": "3e78c904-54fb-447a-8a21-dd89c75c1505",
  "customerId": "55a8619c-27fa-47cb-9585-14dd39a863b3",
  "address": "(8573) 서울특별시 금천구 독산로16길 22 , 금강누리빌 502호 (시흥동)"
 },
 "386980f7-47fb-42cb-932c-8f9256cf9165": {
  "contractId": "915eea8c-087f-436a-a502-df42ba49cc6e",
  "customerId": "74df125f-7cbc-488c-b4d4-57453609a04e",
  "address": "(16225) 경기도 수원시 영통구 대학3로4번길 50 , 307호 (이의동)"
 },
 "38487f3f-59e2-48a7-89ad-08420f37bc15": {
  "contractId": "bf937485-9159-4ddc-b814-267df733984a",
  "customerId": "108f673c-f981-4769-8850-80e11806b672",
  "address": "(16903) 경기도 용인시 기흥구 보정로 26 , 101동 603호 (보정동, 신촌마을 상록데시앙)"
 },
 "711335ab-0de1-4a52-883f-0d2933af494b": {
  "contractId": "a83e69c1-f0bb-45a4-9021-9729b4157234",
  "customerId": "067932c2-30c0-41e3-b42d-087cfd77421e",
  "address": "(17813) 경기도 평택시 포승읍 포승장안로 421-28 ."
 },
 "330b216a-9b88-4234-9720-f1685b3e4c9b": {
  "contractId": "b77c2fca-9f62-45ec-87cd-e7eccf2d077a",
  "customerId": "6a16e7ff-3a7e-4af1-9ca0-45a103069514",
  "address": "(18578) 경기도 화성시 팔탄면 버들로 1375 ."
 },
 "42429fc8-6d3d-48e9-8ad9-1d1e2b2c847e": {
  "contractId": "60ce6863-6651-405a-ab09-6ae67b804bf0",
  "customerId": "275d74bc-4aeb-4d33-82db-f365ccc9bf8e",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 106동 1501호 (이안평택안중역)"
 },
 "658f57d3-7236-4247-8633-dc69753e84a0": {
  "contractId": "e6c6fbd6-f129-4b94-b78f-3a320d0fb043",
  "customerId": "1c926572-05f5-4d01-907a-28e5fcb3c595",
  "address": "(31931) 충청남도 서산시 성연면 성연4로 46 , 109동 1401호 (e편한세상 테크노밸리 아파트)"
 },
 "ff6ccd97-9f47-402f-89ce-60c0f22a7a63": {
  "contractId": "485737ff-51c1-49c8-892b-cce25609c353",
  "customerId": "ba02f0c2-7cdc-495f-8c77-9c997490a95e",
  "address": "(10362) 경기도 고양시 일산동구 대산로11번길 32-14 (정발산동)"
 },
 "cf068619-a377-4af2-bc8c-6b825b599892": {
  "contractId": "d511db12-abbf-448f-81a1-2b80c98e3708",
  "customerId": "d3261a69-5ab4-463c-ba26-9447b3900a91",
  "address": "(17954) 경기도 평택시 포승읍 여술로 74 , 107동 1103호 (모아미래도1차)"
 },
 "fe8542af-5b87-4ca7-bd6c-7a30f1de755c": {
  "contractId": "aad16897-963a-49c8-8a5e-546b5c83a5d6",
  "customerId": "382bf879-6daf-46cf-9602-77dd0a1ffe46",
  "address": "(17805) 경기도 평택시 청북읍 안청로4길 42 , 103동 904호 (평택청북 이지더원)"
 },
 "3504bdab-b036-4c89-9540-3274e2655633": {
  "contractId": "00cef81c-817c-4dc9-b2e1-837a5feae1d6",
  "customerId": "f0eff380-2eb3-4130-a7a5-3e840d49b370",
  "address": "(17868) 경기도 평택시 현신2길 1-34 , 아테네 307호 (용이동)"
 },
 "a1163685-443e-471f-bd09-056245b2f94a": {
  "contractId": "999913f1-2809-47e4-97f6-fd141a2078d8",
  "customerId": "5eb77f0e-1420-4d9d-9bf1-4d4cdb01893c",
  "address": "(15010) 경기도 시흥시 배곧4로 106-25 , 1101동 2303호 (배곧동, 호반베르디움 센트로하임아파트)"
 },
 "9112d811-5707-4fbc-a21e-683a0c6aabfd": {
  "contractId": "904892f0-4f82-4015-8abf-0cb9e458168e",
  "customerId": "b8fdb59c-ff5d-4d42-ab33-dd121a6f5ec5",
  "address": "(31000) 충청남도 천안시 서북구 성환읍 와우2길 38-12 ."
 },
 "1c970009-5792-468f-bd02-bdb67c06dd9b": {
  "contractId": "ba412ced-d1fe-4b73-9c54-c50e016e7460",
  "customerId": "beb04f90-8c84-4015-a21b-da34673de132",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 108동 1601호 (힐스테이트 송담)"
 },
 "c41e77ee-fa56-4058-b187-394dfd26e30b": {
  "contractId": "332d9a5f-36cd-4ca2-9b5d-a5d9ebd6c794",
  "customerId": "243295da-4d1a-4645-960e-8606f471388e",
  "address": "(31706) 충청남도 당진시 석문면 대호로 1551-11 , 401호"
 },
 "12fdea89-f676-4d11-95ac-53b3bac80dff": {
  "contractId": "a237daed-548d-4e16-91ce-7ec788fc413f",
  "customerId": "d325820a-bb5e-43e7-86f2-55310739375a",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 105 , 202동 603호 (현대아파트)"
 },
 "23cb32e6-3b3a-4596-b806-93b5c23ae57e": {
  "contractId": "e34b6efd-c70f-43da-8e64-88eda80f95e0",
  "customerId": "f8612ec7-ffed-4641-83b0-dd1c1bc40974",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 64-7 , 302호"
 },
 "8e5f8fd1-8d2a-4452-a72e-8f763318f9f1": {
  "contractId": "1a622205-dee7-40c5-bf9f-58694996e7b5",
  "customerId": "141f1f0e-cafa-4c67-8973-a5e5a84335fa",
  "address": "(17804) 경기도 평택시 청북읍 안청로1길 92 , 503동 1203호 (사랑으로부영5차)"
 },
 "e8b6f785-bfa1-4a13-af14-9751025c33be": {
  "contractId": "26ad14a2-b698-4ee4-ae83-ddf4d9cc1dd6",
  "customerId": "063d1981-934d-4c34-86ba-aad7a14687bf",
  "address": "(30089) 세종특별자치시 금남면 둔대밤절길 35 ."
 },
 "5c9b62f5-0a7a-49bb-a133-18a6b47dd8a1": {
  "contractId": "a952c0df-af25-44b7-a168-147898409234",
  "customerId": "bcad4ff9-c9de-48dd-a343-44f7353161d0",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 106동 201호 (화현마을우림필유)"
 },
 "5bbdc4d7-7cda-424b-ae6f-7c2e9c1e7c77": {
  "contractId": "548b0d9d-2bd4-45df-8d49-56a37f916590",
  "customerId": "a1241b96-c07f-42c5-94af-76550dc135ce",
  "address": "(17939) 경기도 평택시 안중읍 안현로서6길 61 , 110동 701호 (주공아파트)"
 },
 "d1162262-0990-46dd-9568-56ef06090172": {
  "contractId": "61f8924d-e8d2-45e6-b328-d5fcb8fa1a4a",
  "customerId": "50a40d83-ced5-4279-a8b9-32ac3f8dcee6",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 107동 403호"
 },
 "a92e7d31-001f-4bd4-aac8-2084c739e973": {
  "contractId": "a1659f43-ceac-491b-801a-8ec2c92162c2",
  "customerId": "7c462b55-1c28-4d56-a110-3aa381f710d6",
  "address": "(17941) 경기도 평택시 안중읍 송담6길 42 , 301호"
 },
 "e01ebb09-a338-4372-a379-a484342c30ed": {
  "contractId": "b8669f3a-be77-4f81-b806-37dfa919e441",
  "customerId": "e17eef0f-6cda-46dc-ac55-56ccbac09678",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 53 , 105동 502호 (유승한내들퍼스트뷰)"
 },
 "90b2d09a-8da4-4778-81a6-0dc457f93a13": {
  "contractId": "62f26394-f73d-4151-80f3-9519e94236a3",
  "customerId": "58f8553e-a7f7-4e19-930f-23eaa8299478",
  "address": "(18240) 경기도 화성시 수노을중앙로 425 , 104동 10호 (새솔동, 송산그린시티 리안비채 테라스하우스 1단지)"
 },
 "e023de2e-c974-4a49-84d8-5907a5930f1d": {
  "contractId": "03a7c212-e735-4952-90c0-a9d947bf9773",
  "customerId": "1a092c36-a848-4950-99e3-ac1ac7711ebe",
  "address": "(18238) 경기도 화성시 수노을1로 236 , 604동 402호 (새솔동, 송산그린시티 반도유보라 아이비파크)"
 },
 "25dae963-cc98-4bba-8604-58fda98712eb": {
  "contractId": "752053b5-d767-4cd4-9e36-211742910a80",
  "customerId": "8a3ba0a8-9ba1-4bb0-9e2e-ad772fa63992",
  "address": "(31784) 충청남도 당진시 운학길 69 , 104동 802호 (채운동, 당진채운코아루1차)"
 },
 "2f006218-abba-42ec-87e2-f71c69c65590": {
  "contractId": "0c7ec7f5-d9f0-4a3d-86b1-623db6530bdc",
  "customerId": "21eb1f1d-2a8e-4b02-9728-efe778c7101e",
  "address": "(17803) 경기도 평택시 청북읍 안청로1길 91 , 101동 1203호 (평택 청북 이안아파트)"
 },
 "10099c3d-03de-405d-a9e0-34ae86bf1478": {
  "contractId": "c17105e2-ebc6-4c1e-856e-55f9cc818cd8",
  "customerId": "6f4168fc-218a-4a43-a89a-b58fd8c94398",
  "address": "(15449) 경기도 안산시 단원구 초지2로 41 , 1504동 404호 (초지동, 그린빌주공15단지아파트)"
 },
 "7277b2d8-7cb4-4ce8-b91f-b7932bdb7087": {
  "contractId": "3d99c9a9-e0c4-4026-9acb-77e0309be9af",
  "customerId": "6e88b940-3f5a-40c4-9db3-3907a9c12ca6",
  "address": "(31766) 충청남도 당진시 수청중앙로 85 , 101동 604호 (수청동, 당진 센트레빌 르네블루 1차)"
 },
 "119a8496-6153-42a2-bc5b-f981f04e3e05": {
  "contractId": "dda3bf6c-2366-4736-8657-1947c0f92787",
  "customerId": "06bcefbf-b628-4528-9dce-57a548a80c44",
  "address": "(17816) 경기도 평택시 안중읍 용성3길 212-11 ."
 },
 "dc75a546-cccb-4d9b-bc6b-92d22b811e86": {
  "contractId": "80b8414f-e1a1-4ac1-b826-79e910c3b53c",
  "customerId": "77a87434-b03c-4a80-8c51-fbe2d08d7de8",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 106동 604호 (서광미소마을)"
 },
 "808617a6-1eec-4a90-9a73-aff80f171b62": {
  "contractId": "f3602310-6008-4cc7-b632-f2a2ffef9b24",
  "customerId": "01ebe212-4825-4a0f-a2b3-3936dfb310c7",
  "address": "(12713) 경기도 광주시 퇴촌면 천진암로 560-19 , 301호 (밀양빌라)"
 },
 "3f6fe3ed-040b-4395-91fc-36649b934d6b": {
  "contractId": "3ccf2af2-838f-4510-824b-8c241f8566e2",
  "customerId": "fd49ada4-93c3-4451-9eb0-f6f5cc48212d",
  "address": "(17943) 경기도 평택시 안중읍 안현로서8길 14 , 301동 1904호 (동신아름마을아파트)"
 },
 "8d39d841-845d-49c3-a4e2-b9a18729c05c": {
  "contractId": "bd0a93c9-7fb3-4be9-aed0-2aec2eed79f9",
  "customerId": "0fa0d721-2d4e-4ffe-9528-3baf9ddeb71b",
  "address": "(17930) 경기도 평택시 안중읍 행궁길 26-9 ."
 },
 "af48e1e9-241b-40d6-846d-33d64e141a99": {
  "contractId": "9107cd89-1f5b-4ff0-8515-db18ed152abf",
  "customerId": "4f1c713d-1d0b-4196-81a7-d4d7ac85234d",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 103동 1402호 (이화마을 건영캐스빌)"
 },
 "895da3c1-6c04-4fc5-b57f-2f96f144fa8f": {
  "contractId": "0abdf85c-9b14-4a1a-86c5-533507daf8e7",
  "customerId": "1c143333-5f2c-4f1a-87c0-b25da377c573",
  "address": "(17932) 경기도 평택시 안중읍 안중믿음길 7 , 2동 201호 (한양빌리지)"
 },
 "5f4e8e34-4582-4674-b4ea-89f76edad6c3": {
  "contractId": "20f18b6f-5bfb-4199-bffe-95437e1fb9a1",
  "customerId": "58ad34f3-d18a-407a-9ed2-552c8b643e2b",
  "address": "(17546) 경기도 안성시 대덕면 대학4길 3 , 206호"
 },
 "ee62bfd5-515b-401a-86e6-4f7bf2c947a3": {
  "contractId": "35e6855c-b023-4703-840d-f96b981236aa",
  "customerId": "31949ae3-681b-4e93-a5d3-34a589947bc2",
  "address": "(17803) 경기도 평택시 청북읍 안청로1길 91 , 111동 104호 (평택 청북 이안아파트)"
 },
 "177adc08-4920-4509-81c0-e7df5b05c4f2": {
  "contractId": "58795693-0522-4301-825e-fba67515873e",
  "customerId": "f1d5226d-4c61-447d-a457-c745d4a527e5",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 203동 1601호 (동신 사랑마을 아파트)"
 },
 "14f603c3-cd22-4a89-a9ac-e9c3e64a730a": {
  "contractId": "e7874719-a85e-47e8-846d-1cf6dbff66ff",
  "customerId": "0fd9794d-1295-4887-9afd-a3b15e16d4d6",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 108동 504호 (이안평택안중역)"
 },
 "ad4ca02d-b801-4154-82ce-baaa4ae722b6": {
  "contractId": "fd58ad82-fbbc-4873-a36a-11ec11e0c16a",
  "customerId": "c259ecc9-f086-4d2b-9598-49667cc0ecd6",
  "address": "(18306) 경기도 화성시 봉담읍 수영로 161 , 307동 1702호 (중흥에스클래스 에듀파크)"
 },
 "f2f6bd44-1f68-4631-a726-aa84f09294c3": {
  "contractId": "9d5156fc-fbde-49c1-88b3-b12257967e15",
  "customerId": "1b09745c-0753-4341-b0b4-407b326d888f",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 201동 203호 (포승삼부르네상스2단지)"
 },
 "7b0ce3dc-f753-4d7f-b37b-91f35c0d14d6": {
  "contractId": "4a54debc-32b2-4952-a814-98dc9fedea4f",
  "customerId": "603f5e94-8cce-41e5-967c-1285ab65ab6a",
  "address": "(18610) 경기도 화성시 향남읍 하길로 70 , 1011동 1403호 (화성향남오색마을사랑으로부영10단지)"
 },
 "248b8ad7-4f44-48da-af49-9d14bbf94b70": {
  "contractId": "017a5de8-85c5-4448-bfd3-8e8f061bbba2",
  "customerId": "b0cb5d94-529b-42cd-ad6c-04a1a6bf1d14",
  "address": "(21613) 인천광역시 남동구 서창남순환로 55 , 504동 403호 (서창동, 서창센트럴푸르지오)"
 },
 "db8fc677-e0f1-45a2-bb00-f0964e84706c": {
  "contractId": "83f78938-2cee-42f1-b1eb-3feb60a12595",
  "customerId": "29b7b94d-1248-4edf-9283-c8e09e8ead7e",
  "address": "(18237) 경기도 화성시 수노을1로 108 , 305동 1902호 (새솔동, 송산신도시 대방노블랜드 더센트럴 3차)"
 },
 "2426e006-555d-40af-adfd-917970098c9f": {
  "contractId": "7cbee6c9-3f08-4c6e-8d09-e1b2fdc41775",
  "customerId": "92e4973b-a18a-4efa-8227-10ef64b2e156",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 55 , 201동 1602호 (송담 지엔하임2차)"
 },
 "7d73e2bf-ae85-413f-8f88-257df2f6cdeb": {
  "contractId": "f3d19c75-f4c3-48f7-9b6c-c97117691bf5",
  "customerId": "17b1a267-9d14-4147-bcc7-fdda713b8622",
  "address": "(17941) 경기도 평택시 안중읍 송담6길 16-14 201호"
 },
 "3410ddff-57b7-4cb3-8658-7f2f44a2a4c6": {
  "contractId": "96e2d582-d595-436a-9637-7430e8465002",
  "customerId": "ed434dd9-ba65-4594-8530-47697f177376",
  "address": "(58839) 전라남도 신안군 안좌면 시서길 70-18 ."
 },
 "808e023f-c501-4d54-96f1-94af907b64d4": {
  "contractId": "982984fd-3dd0-4b48-b5b4-6396124d1316",
  "customerId": "52b1a62c-207c-44ab-b065-f71233906b17",
  "address": "(16865) 경기도 용인시 수지구 용구대로2787번길 9-9 , 이지뷰 34동 104호 (죽전동)"
 },
 "fdb9246a-d599-47b7-aef1-d9396d4daa3f": {
  "contractId": "26b82ea2-ce66-457c-9455-bd8c735ea0b1",
  "customerId": "01f0475f-277e-4c42-ba0e-fa4058d083aa",
  "address": "(5817) 서울특별시 송파구 새말로 102 , 502호 (문정동, 아이디움)"
 },
 "519c9793-9a49-46e3-bfa5-5fabf42dfad7": {
  "contractId": "d4173440-cead-411d-a1b2-98022bc5ee6a",
  "customerId": "137564e5-d22f-41d1-a25b-e7880cfb925d",
  "address": "(17946) 경기도 평택시 현덕면 인광1길 106 , A동 1101호 (한일아파트)"
 },
 "6c0b43f0-30ce-41ab-abe3-fed68d6d0714": {
  "contractId": "56f30171-52b7-48f4-bd96-8ee19d6e4c3f",
  "customerId": "8821ba1b-e4bd-4260-8f24-f045bb4f059a",
  "address": "(18616) 경기도 화성시 향남읍 손개1길 4-2 , 101호"
 },
 "31cb705a-1b20-4246-9b37-b85d504b8244": {
  "contractId": "0e728d73-2a99-4878-9ac3-6129b448d651",
  "customerId": "0875017d-2481-4796-ac7f-70cc5f61f692",
  "address": "(13013) 경기도 하남시 위례순환로 270 , 6503동 1401호 (학암동, 위례그린파크 푸르지오)"
 },
 "cc3df856-8f11-4799-ab61-0518b35c457c": {
  "contractId": "f82db3c0-477a-4b30-a7ab-ac33fc469b9a",
  "customerId": "a26f9614-9f82-42f1-83f8-bf5f1ac3eb82",
  "address": "(15208) 경기도 안산시 상록구 가루개로 59 (양상동)"
 },
 "36e339e9-fdd6-4bbd-88fb-00da472fce04": {
  "contractId": "6d5c0f6b-7134-482c-9c3f-385403a227d7",
  "customerId": "463676cf-48fc-4bc8-b65f-b09eef4d957e",
  "address": "(17842) 경기도 평택시 세교6로 45 , 213동 702호 (세교동, 힐스테이트 평택2차)"
 },
 "406d170a-ec12-4633-83bd-976db86fb87b": {
  "contractId": "fa3ec295-bc4a-4603-ada3-a7fd2b5789ff",
  "customerId": "b1982ae7-9f5a-4261-bb7d-e8e679c0396f",
  "address": "(3360) 서울특별시 은평구 불광로14길 10 , 201호 (불광동)"
 },
 "12798c36-e9dc-41b9-9151-da5f8f51542d": {
  "contractId": "10f5c415-a33a-4f05-8a08-9b7821035ab5",
  "customerId": "a8c62c33-d2ff-472c-b4d3-1dde90c061ea",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 114동 1302호 (부영사랑으로)"
 },
 "82cba8d1-6751-4635-857d-e8a658c93cfe": {
  "contractId": "bd55e936-3b22-4441-8281-947b2bbb314f",
  "customerId": "4bc2fcc7-3caf-4032-82a3-a911b6d36370",
  "address": "(14779) 경기도 부천시 소사구 경인로 605 , 104동 904호 (괴안동, 이편한세상 온수역)"
 },
 "811f4d10-30c9-4ff4-be0a-380cc3be6e67": {
  "contractId": "a2cade8d-2f86-4e9a-986d-93b38c551d6e",
  "customerId": "8b6d458d-3a3e-49f2-9386-a028f8b3a778",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 106동 1501호 (힐스테이트 송담)"
 },
 "dd10da08-2d56-483e-bbc4-40ab89b22df8": {
  "contractId": "297c7644-b49d-4460-89da-49dc51aed449",
  "customerId": "20fe0996-493c-45bf-8a54-fadef4efb357",
  "address": "(13183) 경기도 성남시 중원구 광명로 384 , 509호 (금광동)"
 },
 "b88bd177-01a8-4771-9c2c-7e616eb50dba": {
  "contractId": "ac5d9651-7d6c-4f68-9f5b-0e7c2ec7647e",
  "customerId": "bc36c488-17cb-40c5-9235-1c42a3b27eb3",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 65 , 1706동 303호 (화성향남언덕마을사랑으로부영17단지)"
 },
 "1d5e33db-d618-4d74-a3c2-f7a874eaa472": {
  "contractId": "27fdaa68-5ef4-4ac8-a94c-8249b17126fe",
  "customerId": "5716adff-5639-4f37-a412-18e1b4387326",
  "address": "(16812) 경기도 용인시 수지구 신봉2로 154 , 101동 904호 (신봉동, 힐스테이트 광교산)"
 },
 "2f988082-8e00-473f-b533-c701f6919468": {
  "contractId": "f30a619e-4efe-4683-96c0-e3f96a25a974",
  "customerId": "693e2812-9f20-467e-b1e7-d0b6846d2106",
  "address": "(17965) 경기도 평택시 포승읍 승학동길 25 , 204동 1203호 (명지미래힐아파트 2단지)"
 },
 "ea238b60-a6ca-43da-98af-7acc31bd721a": {
  "contractId": "ea761cb6-d3a9-4c5a-b16c-721ca30f8ad3",
  "customerId": "27ac7433-6a22-4d3b-a480-ce6f58b3e738",
  "address": "(17773) 경기도 평택시 특구로27번길 46 , 8동 105호 (서정동, 동산아파트)"
 },
 "1b6ec106-5a64-44fa-a724-4e9bc512b731": {
  "contractId": "fda5a01f-bb17-4a1b-8b70-d4adc458ba24",
  "customerId": "09e30bcb-2256-4c09-b2c0-9072c9e83b7d",
  "address": "(12285) 경기도 남양주시 다산중앙로146번길 7 , 2204동 501호 (다산동, 다산롯데캐슬)"
 },
 "8b2be575-1132-4b7c-a918-4f217633c27b": {
  "contractId": "05168907-2a02-4721-b039-1f5cb86a47ad",
  "customerId": "18dbe444-cd62-4f84-9e0b-91a5447a49c1",
  "address": "(16328) 경기도 수원시 장안구 천천로74번길 92 , 821동 2004호 (정자동, 대월마을대림진흥아파트)"
 },
 "cb50ab0d-0b61-4b62-b1d5-013a5ba34f1f": {
  "contractId": "8b539f26-cde8-45e2-b56d-87b611bff96b",
  "customerId": "50ade31d-17ea-499f-a5fa-d15bf8198cc9",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 104동 1804호 (화현마을우림필유)"
 },
 "bd61d36e-506a-4876-b5e9-0dd643161f1b": {
  "contractId": "0b9ade8d-7b6d-4e14-a74d-b2947d644b28",
  "customerId": "89e42538-5cbc-42e0-a3f9-6bd5715f058a",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 102동 103호 (안중 지엔하임 스테이)"
 },
 "46519d27-8ffd-425c-870c-3b8cb1ddbf1d": {
  "contractId": "9d383fb6-ed26-4150-a24c-a60b3c9fff25",
  "customerId": "2c871987-7fc9-4526-85f3-604e2ed048dd",
  "address": "(18573) 경기도 화성시 우정읍 이화뱃골길 56-7 ."
 },
 "df59df29-0512-4a08-9bcf-79579fa3ea91": {
  "contractId": "718f080d-cf92-4445-89b5-8e151beaf8a2",
  "customerId": "b933decd-0c42-4efd-b08d-fb3806b67d74",
  "address": "(10116) 경기도 김포시 풍무로 113 , 102동 1905호 (풍무동, 신안아파트)"
 },
 "4ac82e78-db02-44c8-8b5a-f8d1f3eace8f": {
  "contractId": "de61aab7-d783-4405-b4fb-d37ae618e337",
  "customerId": "4b7fc228-33ea-4727-9beb-a6e1ca2faaf4",
  "address": "(5850) 서울특별시 송파구 위례광장로 215 , 2507동 1702호 (장지동, 위례스타힐스)"
 },
 "1352d846-9678-4c7a-b119-aa8884915180": {
  "contractId": "2c44a0ff-510e-434c-935b-497077e9d779",
  "customerId": "dcb9d6d0-6f26-4b84-a312-6a367db51045",
  "address": "(17931) 경기도 평택시 안중읍 현화중앙길 103 , 101동 703호 (현대3차아파트)"
 },
 "b6354f11-dcba-4b22-8824-d0120d72fc45": {
  "contractId": "0011ef34-2bf4-4c33-8a35-682773c06cdc",
  "customerId": "0642d850-b87b-4faa-95ce-b436e50b2da7",
  "address": "(16008) 경기도 의왕시 청계1로 28 , 303동 208호 (청계동, 휴먼시아 청계마을)"
 },
 "2a55e411-6bf7-4cfc-bbe6-d150d7767d1a": {
  "contractId": "19c59dd5-6ef4-4ce3-9a30-feae80412f90",
  "customerId": "f7eb6032-e63d-48dc-8e4d-f39808e8574a",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 113동 1502호 (부영사랑으로)"
 },
 "1d475f82-020d-47f7-a1b8-cbcc0e2f45dc": {
  "contractId": "cda2f2ff-7264-40f6-a6b6-9dedf5defb24",
  "customerId": "c5bc1346-4f8c-49b2-ac2a-170ad35fc256",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 107동 801호 (부영사랑으로)"
 },
 "d04a17dd-a83c-4934-a4f5-303eebe22ab9": {
  "contractId": "9605f927-cf79-406b-92cd-21dab486f317",
  "customerId": "64a1c758-d555-4cfb-96d5-be5445c15f94",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 64-7 , 301호"
 },
 "e3420a58-44e9-4535-82e6-0fb01e20404d": {
  "contractId": "469bf1e4-f089-4ef1-bc87-97e82bdaf259",
  "customerId": "c2987080-d982-4b6f-a490-2b9ce35ea66f",
  "address": "(17813) 경기도 평택시 포승읍 홍원길 24 ."
 },
 "6b6e1333-323d-493d-a861-54f7ddfaf9f2": {
  "contractId": "34cc8e30-08ea-4f70-8257-10acf219dcf4",
  "customerId": "3830bec0-4750-4ae2-ac8f-7ac8db580b38",
  "address": "(28796) 충청북도 청주시 서원구 월평로 24 , 808동 1801호 (분평동, 현대대우아파트)"
 },
 "9c2e0262-4bc5-477d-a141-fe08bde7414c": {
  "contractId": "da926c87-9ef8-490e-8817-018477bdb062",
  "customerId": "3ee01da9-dee7-4fb8-8f7c-803583a41a57",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 104동 503호 (부영사랑으로)"
 },
 "4df8c647-9abb-4e71-b8e0-d6569fea9541": {
  "contractId": "8964c4ea-8915-4045-b5cb-e434e387e378",
  "customerId": "b27ae4fc-b0c9-4ed4-8c67-56bce7fa0c42",
  "address": "(16693) 경기도 수원시 영통구 영통로200번길 111 , 102동 602호 (영통동, 영통 라온프라이빗)"
 },
 "bb003f9b-908b-4595-8518-e240c21be525": {
  "contractId": "cd076398-25a6-4028-b35a-dc037cc87108",
  "customerId": "f7f437a0-e1d8-4028-b9c7-a7f6cb370eb3",
  "address": "(17866) 경기도 평택시 현신7길 43 , 303동 203호 (용이동, 용이 반도유보라아파트)"
 },
 "e24ec7c6-5c7b-4fff-b092-995a8d987925": {
  "contractId": "c54965dc-9b2f-4b55-9529-aae71a3bfc43",
  "customerId": "6a86e1e0-b272-4156-a24c-99b7980915cc",
  "address": "(42974) 대구광역시 달성군 옥포읍 돌미로8길 19 , 604동 401호 (옥포 대성베르힐 6단지)"
 },
 "02cd37a4-7994-483e-ba1b-3285885dbf97": {
  "contractId": "4d429f71-8118-4f91-bef0-f71eb53cf187",
  "customerId": "9d791c12-5d96-4ff7-b308-db6e9c862085",
  "address": "(17926) 경기도 평택시 오성면 숙성길 165 , C동 401호 (대성빌라)"
 },
 "d61b29dd-8859-4a87-918d-4f150080f142": {
  "contractId": "21395905-f0d6-4b6b-a324-4433e31c7839",
  "customerId": "e8a6ebf6-1dfa-41b2-8a97-a40d26769e99",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 102동 402호 (안중 지엔하임 스테이)"
 },
 "a2a48899-8ef7-46a5-a79a-d75f3dab90c3": {
  "contractId": "6356af76-11a7-46c0-bce2-400c3e5189d0",
  "customerId": "1bf04389-9f92-4d96-8c48-ee6162e130ea",
  "address": "(10016) 경기도 김포시 통진읍 검암1로 11 , 101동 120호"
 },
 "9b92924b-6c0e-4644-b0b1-5fa41702e577": {
  "contractId": "52d5efd9-840c-4dc0-98f7-dad020190e57",
  "customerId": "5432a141-294a-448a-a529-075919e93eb0",
  "address": "(22114) 인천광역시 미추홀구 숙골로112번길 11 , 510동 301호 (도화동, e편한세상도화 5단지)"
 },
 "fccb8b9b-65a5-43d4-a6ef-6945f1d2bc7b": {
  "contractId": "35475dcc-5550-4333-aca6-517bb1fc287a",
  "customerId": "3e35008a-e924-49e8-afae-f9e91e8cc8b5",
  "address": "(18123) 경기도 오산시 대호로 93 , 801호 (궐동)"
 },
 "630265b9-12e3-4080-ad41-9292376c3e3b": {
  "contractId": "3b4b71e5-0a5c-4f4c-add0-f75dd37b8eb1",
  "customerId": "b3c017de-fe1f-4670-a16f-65ce20e6a7a3",
  "address": "(17943) 경기도 평택시 안중읍 안현로서8길 14 , 304동 504호 (동신아름마을아파트)"
 },
 "c0432a12-33f0-4057-8f1c-5d7a0415d335": {
  "contractId": "87b4555e-6fd0-42a1-848c-a1a7ed14a033",
  "customerId": "c6fe9df9-bcac-4aa2-afaf-13d7be3e9822",
  "address": "(5600) 서울특별시 송파구 삼학사로19길 41 , 301호 (삼전동)"
 },
 "7036a346-484a-402a-b1c2-21443c0ff3bb": {
  "contractId": "cb02dfec-b705-4095-8911-bd92216280ca",
  "customerId": "dfa392be-0597-4e05-99f3-380a59db1bc0",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 106동 602호 (안중 지엔하임 스테이)"
 },
 "b315bd3b-911b-4d49-ace8-ab8e525afc5b": {
  "contractId": "7951c6a5-3906-4e44-b2fb-e4dd2dde5505",
  "customerId": "fbfb8c16-a5f3-44bd-85ae-f7a40bc3214f",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 111 , 302동 703호 (현대아파트)"
 },
 "f49f0c9d-3e7b-4682-a53b-85e3744de20e": {
  "contractId": "7a99c647-af3b-4b34-b482-f977659796e8",
  "customerId": "bda1dc54-cd98-4387-9f37-89c4c6d1d060",
  "address": "(22552) 인천광역시 동구 화도진로 16 , 107동 3804호 (송림동, 동인천역 파크푸르지오)"
 },
 "a856d4a2-ed4f-4c6d-bcc4-459cc9b63909": {
  "contractId": "6eb1c6c7-fc96-4d9e-8c21-5be7826344f0",
  "customerId": "81427932-e30c-44d1-8978-ae71da7616f1",
  "address": "(18321) 경기도 화성시 봉담읍 와우로15번길 10 , 313동 904호 (봉담 그대家 3단지)"
 },
 "dce264da-8d49-4351-a377-2d419a28ce43": {
  "contractId": "50a338dd-b0af-4bd5-890e-ca6aed629b24",
  "customerId": "406a104b-86b3-4f3c-97a9-172b21b28738",
  "address": "(31784) 충청남도 당진시 백암로 173-3 , 102호 (채운동)"
 },
 "14f14240-fb69-4c55-9c0d-0d83be99cebb": {
  "contractId": "ad6a1a4e-4ce9-4b39-887b-bb6b2d4b920b",
  "customerId": "e2fbef36-75a9-438d-b8ca-cd41441b98ae",
  "address": "(15449) 경기도 안산시 단원구 초지2로 41 , 1506동 404호 (초지동, 그린빌주공15단지아파트)"
 },
 "f30ea8a9-5aa6-4ae7-8e09-8e11d3eb0e04": {
  "contractId": "7e977bc8-8f09-432d-9abb-6d063d9d3ae4",
  "customerId": "cd2089c1-6408-4e8b-8358-4ef0c79adb51",
  "address": "(17959) 경기도 평택시 포승읍 평택항로184번길 3-33 , 1229호 (스마트빌듀오3차)"
 },
 "49fc9682-2e31-4c83-9e44-60860421626b": {
  "contractId": "39812543-c823-49e7-b84f-d44cc1fcbde0",
  "customerId": "8594cf53-e768-4217-b963-ebbf5c655dd2",
  "address": "(22631) 인천광역시 서구 검단로744번3길 7 , 306동 1301호 (불로동, 삼보해피하임)"
 },
 "64bf7f3e-8bdf-48c0-87f6-538bb030f982": {
  "contractId": "2241521b-6c17-4041-a601-09c4a61faf64",
  "customerId": "27d491db-db31-4ebd-96db-f2fee7af3881",
  "address": "(17935) 경기도 평택시 안중읍 안중6길 21 ."
 },
 "918f2555-c492-4e55-acb2-f5ef82f32696": {
  "contractId": "c9bb6e9a-7cc5-4dbc-9b3d-408cb082cea3",
  "customerId": "c776917a-b969-4618-ad30-4b76438a8229",
  "address": "(17804) 경기도 평택시 청북읍 청북남로 278 , 305동 2004호 (부영사랑으로)"
 },
 "c02aaf60-5764-48bb-b3f1-c47fc9e97837": {
  "contractId": "1a8b802a-2b4c-4a66-975b-f9518064a6ae",
  "customerId": "0a7fe43c-d242-42ff-88a5-8264dda82d0e",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 108동 501호 (늘푸른마을)"
 },
 "ae4e6a71-d630-4348-b94e-1386574bfd34": {
  "contractId": "d56f4131-2679-4bc8-a400-33c10ef66b75",
  "customerId": "d0ce938d-0eed-430c-b7cf-3d76106defe1",
  "address": "(5531) 서울특별시 송파구 토성로17길 9 , 103호 (풍납동)"
 },
 "ee408ec7-50a8-4db2-9f1c-c80af6f9cd87": {
  "contractId": "f0b6b505-9be9-4aeb-a79f-c6fabd3db226",
  "customerId": "d318f3e6-8fd1-46f6-872c-66ae1a1f55a1",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 110동 401호"
 },
 "36c51225-7829-4fe0-8f3e-1addcdd5860e": {
  "contractId": "293dac84-05e7-46bd-a394-31fd835c955c",
  "customerId": "e111fe49-7ec8-4941-a521-79e8930fd0ab",
  "address": "(17761) 경기도 평택시 탄현로 261 , 612호 (신장동)"
 },
 "57cfab72-1695-4bed-9909-d105162ed35f": {
  "contractId": "33477153-e4d8-4c9b-a86c-48f80244b950",
  "customerId": "d09e73be-3c44-4b12-9275-88188b926788",
  "address": "(25766) 강원특별자치도 동해시 샘실2길 64 , 2층 (천곡동)"
 },
 "61ca3bfe-da4b-4c46-8eaa-21cb864dfbed": {
  "contractId": "2ce302f7-ff4e-40bb-a248-abe3c222bea7",
  "customerId": "1bd04f8c-d493-4897-8f19-b210973af4df",
  "address": "(15360) 경기도 안산시 단원구 중앙대로 885 , 101동 803호 (고잔동)"
 },
 "11b427bb-2775-4813-a166-18b9bfe7d926": {
  "contractId": "3da70c84-6621-4d8d-a3f0-bb5a2c13dab7",
  "customerId": "e8f085ea-de43-451e-8c56-325823c662cc",
  "address": "(15257) 경기도 안산시 상록구 안산천서로6길 45 , 302호 (월피동, 휴먼캐슬)"
 },
 "77ce43d0-8eca-4b9a-b5c5-a6381b422583": {
  "contractId": "3466cb49-681d-4a2c-8d3e-73e0f652a3dc",
  "customerId": "320337fa-eb71-409f-8ed9-fa842b087b94",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 103동 1603호 (서광미소마을)"
 },
 "dced69d5-06cb-4b55-9ac6-48ec0e2711f9": {
  "contractId": "9b7f56e2-ec2b-426e-847d-46df858a81e5",
  "customerId": "e20a9767-5874-418e-9bed-ef7bb6fc1f5c",
  "address": "(18025) 경기도 평택시 신촌5로 56 , 401동 2403호 (칠원동, 평택지제역동문굿모닝힐맘시티4단지)"
 },
 "85a3fe5b-a708-4c2d-bbb4-2a583c1779fc": {
  "contractId": "bed3b3d3-29c5-4ef4-a298-32d05b3e6d6f",
  "customerId": "ab110701-a0f7-4d21-866f-7495b22a97bf",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 105 , 203동 706호 (현대아파트)"
 },
 "92eb9372-1270-4c3d-93e4-837a948204c6": {
  "contractId": "1cd70615-81cd-4b46-b23c-93d73f813029",
  "customerId": "4c1fa265-e22f-44eb-8889-105a4fcf8332",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로328번길 21 , 302동 1002호 (화성향남서봉마을사랑으로부영3단지)"
 },
 "1e0bb57c-93f5-4151-80b8-dd425c95c7d6": {
  "contractId": "e32312b4-224c-461e-bd3e-02399c6a2e13",
  "customerId": "007981b2-6804-440a-86c0-bae2b2db1dd6",
  "address": "(21061) 인천광역시 계양구 용종로 97 , 208동 704호 (용종동, 용종마을신대진아파트)"
 },
 "5320e5b4-b78f-478c-9a34-cdf6c8f06ecd": {
  "contractId": "a9b1b12e-e831-4c5d-826b-400a503ef710",
  "customerId": "b1c3c648-8c86-4629-8818-8b5a6be1e6f8",
  "address": "(21458) 인천광역시 부평구 동수로128번길 27 , 905동 503호 (부개동, 동원아파트)"
 },
 "952b7606-787d-4e06-9aaa-f0b3d1162866": {
  "contractId": "24fd0298-fb7f-463a-9ada-588768f19ca6",
  "customerId": "d5643da4-605e-469b-ac42-71bf30514e9b",
  "address": "(30124) 세종특별자치시 다정북로 109 , 307동 2503호 (다정동, 가온마을3단지)"
 },
 "bfb11b13-7fa1-470f-8717-a50e1c07ec0c": {
  "contractId": "a33f2335-efe0-44f7-98c0-5b1215d0b4ce",
  "customerId": "3aac9279-86c8-4a00-861c-dc294b2584b2",
  "address": "(10826) 경기도 파주시 법원읍 자운서원로 36-29 ,201동 1008호 (안산율곡2차아파트)"
 },
 "7680e8b2-f9b0-4519-bf36-cc503c80e5b6": {
  "contractId": "1d6a88d0-87f4-4493-8cc3-18b1e9dfa788",
  "customerId": "522cc781-1ab8-43bf-bd6a-5161f1c496b0",
  "address": "(15521) 경기도 안산시 상록구 남산평길 30-13 , 7동 401호 (팔곡일동, 영동빌라)"
 },
 "06db7aee-59c4-49c2-a317-705e633ab4a4": {
  "contractId": "941ae64b-a4ce-4e92-bf46-787ba1fa264b",
  "customerId": "f6f6db43-822e-4d28-9b99-cd4646c2f2ef",
  "address": "(31920) 충청남도 서산시 지곡면 충의로 762-78 , 107동 704호 (늘푸른오스카빌)"
 },
 "ddfc578b-3aed-4e96-a5ea-23cc3f98a0dd": {
  "contractId": "ba0c957e-d8c0-48e5-9b1c-cd05ee5603de",
  "customerId": "288867d4-964a-47a5-add7-dd628d924d5b",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 204동 1403호 (동신 사랑마을 아파트)"
 },
 "e653a310-6d9b-4ea5-afb9-4e9d0d9fa6b6": {
  "contractId": "62a79bf7-efaa-49b2-a53f-598b120cdbaa",
  "customerId": "baf76117-b9a3-4533-a17e-e505a118a317",
  "address": "(14427) 경기도 부천시 오정구 원종로35번길 46-1 (원종동)"
 },
 "c88c4320-593f-472d-83e1-ec9b9cc2e2f6": {
  "contractId": "fc5b268f-19fb-471d-bfe9-71e1be52570e",
  "customerId": "6d46f000-09f5-4a95-9403-134d6ab6559b",
  "address": "(15202) 경기도 안산시 상록구 원당골4길 25 , 302호 (수암동, 한성빌라)"
 },
 "a7c51718-d553-4887-b4c6-1ff7adac6b98": {
  "contractId": "2c369ad0-29dd-4391-96c9-efe4b80755c5",
  "customerId": "f37e0606-4350-4893-ae88-a55f201ea4fa",
  "address": "(16093) 경기도 의왕시 부곡중앙남6길 53 , 2동 208호 (삼동, 삼신8차아파트)"
 },
 "d5baa12a-d5c7-46f2-8f98-ba00c8dcb963": {
  "contractId": "f7341020-7cdf-48be-9c32-070b119e4c68",
  "customerId": "e3bfc99d-911a-4f46-8272-37d7aad7a797",
  "address": "(62313) 광주광역시 광산구 목련로273번안길 30 , 402동 801호 (운남동, 운남주공4단지아파트)"
 },
 "0c36be31-2c4a-4e76-9091-693100599599": {
  "contractId": "92fcd227-87b8-4279-bc63-df4c99a660fe",
  "customerId": "982c508c-dc6f-4c7e-bfff-944604bf5671",
  "address": "(31409) 충청남도 아산시 둔포면 아산밸리동로 261-24 , 3동 401호"
 },
 "b8bb5c27-303a-4294-a92e-727fbc40fb28": {
  "contractId": "4b04bf18-cad5-4583-af19-09de90bb9954",
  "customerId": "8f20e2fc-23ea-49a4-b153-da356485098d",
  "address": "(18032) 경기도 평택시 상서재로 50 , 404동 2104호 (동삭동, 평택센트럴자이 4단지)"
 },
 "0cbcf92c-5f3a-4d3c-aa93-33c71d0dcdb5": {
  "contractId": "0f84b0cb-080d-41a7-9e1c-23117e324edd",
  "customerId": "37c0e9e3-8048-42ba-8650-3fec037afc19",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 202동 703호 (동신 사랑마을 아파트)"
 },
 "3e62ff23-90fa-4f27-840b-9d30b59a2f96": {
  "contractId": "48742abb-7f97-45a0-b635-dfeb168cd2e5",
  "customerId": "8fcaff41-9fe2-4708-87aa-200fb2721930",
  "address": "(18310) 경기도 화성시 봉담읍 상리3길 90 , 106동 1103호"
 },
 "c5349ffa-876f-42a5-bce2-4f7ae2390fc3": {
  "contractId": "bbf4a3df-edb6-4afb-ad6e-f4d5efa6c85c",
  "customerId": "53dd08f1-c3f0-4dd4-83a5-7fe16f926f0f",
  "address": "(17954) 경기도 평택시 포승읍 여술로 74 , 106동 906호 (모아미래도1차)"
 },
 "c0d7d3b1-7f35-46a9-8b05-398ffc108ae2": {
  "contractId": "407e1074-280d-4bb1-aef3-1216933b6acc",
  "customerId": "55aa3486-4b9d-4a15-b9e1-ada3b04194b0",
  "address": "(52697) 경상남도 진주시 석갑로 58 , 314동 1305호 (신안동, 주공3차아파트)"
 },
 "bec1d386-a725-4273-8106-b5e13de0a05f": {
  "contractId": "eb4ad7a0-c839-4fac-a71b-c9cafe85a5b8",
  "customerId": "0da4526b-1c01-4fdb-87b0-e503f6e56cfe",
  "address": "(31146) 충청남도 천안시 서북구 양지14길 8 , 남경오피스텔 2동 210호 (성정동)"
 },
 "3927fa70-39c2-407f-a1c0-b432c002685a": {
  "contractId": "b6b161cf-4d5c-4b0d-8f2c-d8ad11af4d84",
  "customerId": "b7fccd0e-ae70-4e99-8434-ed07afa805e6",
  "address": "(14729) 경기도 부천시 소사구 경인로29번길 32 , 2동 1301호 (송내동, 우성아파트)"
 },
 "687919cb-514f-41f0-bb37-c0d49175f7e5": {
  "contractId": "f3fda28d-0ba2-48f2-a8d7-84cd3e334ae6",
  "customerId": "d10841b0-3777-4128-a064-1fee616a381f",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 103동1301호 (서광미소마을)"
 },
 "55ed81b1-8ab7-4785-983f-e6707585dc9b": {
  "contractId": "b60f1b73-bb2a-4e27-a402-acbc1b4ee5f0",
  "customerId": "b1eecfd7-f057-4a2f-bd94-70acc6cb0bb1",
  "address": "(18581) 경기도 화성시 장안면 감나무길 46-4 , 405호"
 },
 "936aebd1-07ff-4a21-a101-5f2219ff2d46": {
  "contractId": "ded53a45-6d40-43a1-b1b1-b0a78cb12327",
  "customerId": "a12ac911-f639-4a9f-93c8-0d2ec1a1af1d",
  "address": "(21324) 인천광역시 부평구 수변로 333 , 220동 902호 (삼산동, 삼산타운)"
 },
 "b04522bf-8960-4c65-b80e-c91b49c4b44f": {
  "contractId": "cb6362a7-1713-4ffd-ba1c-dbacf05c8ef4",
  "customerId": "ede6cb67-8acb-4e0b-8dcf-f2b737c41316",
  "address": "(13509) 경기도 성남시 분당구 새나리로 19 , 201호 (야탑동)"
 },
 "7d9fade3-923e-4639-a16c-bd835ce3895d": {
  "contractId": "6b22ec50-fbf3-456e-9d5b-bdeef577b938",
  "customerId": "3ffbb205-a6d8-4adc-bb56-5debfafcc459",
  "address": "(63605) 제주특별자치도 서귀포시 하신상로 112 (신효동)"
 },
 "2e63ebdf-b35b-40af-9d80-40ebbc46e10c": {
  "contractId": "bb054ae7-86ee-4da7-a5a2-f52f6caa5828",
  "customerId": "89353191-8b8e-4b91-8433-308e3437b4e4",
  "address": "(14905) 경기도 시흥시 대골길 36-2 , 2층 (대야동)"
 },
 "9a4ddf1a-ec4d-4db9-8ae2-950bf5e05ea4": {
  "contractId": "33ef5467-d16e-4b04-9a4e-13a83045e69c",
  "customerId": "087b7150-b559-4f60-939f-99b3697ce513",
  "address": "(21431) 인천광역시 부평구 동수로 80 , 105동 2503호 (부평동, 부평역 화성파크드림)"
 },
 "7ad0dab8-b6e2-4bd7-8359-cd94ba71a641": {
  "contractId": "39053176-2c33-495f-ae05-b0e14345705e",
  "customerId": "88f2368b-699e-4924-b075-7d8bfb76fb4a",
  "address": "(17943) 경기도 평택시 안중읍 안현로서8길 14 , 304동 901호 (동신아름마을아파트)"
 },
 "4f7e8c6d-921b-4575-9b3f-f732920ba6e2": {
  "contractId": "53fbbd37-d562-480a-be64-295565162fed",
  "customerId": "9dcfd007-7784-4b5d-804b-cd0c83b140ea",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 103동 403호"
 },
 "2ac5ac28-e472-418a-98b4-3108ea736587": {
  "contractId": "729a4c82-45ab-460c-95b6-2b4b32ea431b",
  "customerId": "e8ad7d6c-da4e-412b-9dc6-5f40dc1cf386",
  "address": "(6584) 서울특별시 서초구 동광로 89-5 , 105동 504호 (방배동, 방배3차이편한세상)"
 },
 "c4ac3ff2-d3f9-4923-ae5f-54dbe91cb7a0": {
  "contractId": "08dccb39-6c81-4bf0-8014-00f36436e65e",
  "customerId": "a350ed4d-7bb1-4dda-82ee-b007c7d81da1",
  "address": "(17821) 경기도 평택시 고덕면 효덕새싹길 55 , 119동 702호 (고덕하늘채 시그니처)"
 },
 "a1bfbf21-6836-48da-bc5a-b13176e749a0": {
  "contractId": "7b3632f2-ced2-458e-aa4b-f651c94a2122",
  "customerId": "933f90ea-d8d0-475e-ac31-012e9d8842f7",
  "address": "(15623) 경기도 안산시 상록구 감골로 83 , 609동 405호 (사동, 신우아파트)"
 },
 "598c00da-f7aa-4e71-b7e7-9501f39e1589": {
  "contractId": "68dc30cc-01f1-4688-aeee-d03d32437564",
  "customerId": "c9044a5c-1ab0-4ad2-a48f-47a1dee6b242",
  "address": "(17955) 경기도 평택시 포승읍 여술1길 103 , 601호 (평택포승 골든포트)"
 },
 "0db4b5db-1063-4e1c-8353-6bc2510aa68b": {
  "contractId": "6baf7697-a5d1-48b2-9ca0-34f8dcad2a49",
  "customerId": "a37a5302-4761-422d-879c-8fd32f6c7ae3",
  "address": "(54608) 전북특별자치도 익산시 동천로 25 , 202동 704호 (동산동, 그린팰리스)"
 },
 "3f67d3be-fd01-4a74-8fe3-a13ed2f155fa": {
  "contractId": "5caec122-9ade-4b30-8340-47dc9ac5d0d3",
  "customerId": "8053932b-5fc3-4d95-87f2-6840f31be465",
  "address": "(18503) 경기도 화성시 동탄순환대로12길 85 , 3632동 1404호 (산척동, 그린힐 반도유보라 아이비파크 10)"
 },
 "4244771b-d4e9-4787-ae3c-6d9422e5de7d": {
  "contractId": "b54f004c-68c4-4d1c-97ab-9c074b40acc5",
  "customerId": "f2545984-3e04-480e-8ba1-f2ff68e28af5",
  "address": "(17965) 경기도 평택시 포승읍 승학동길 18 , 104동 501호 (명지 미래힐 아파트)"
 },
 "2e25db34-1238-45d8-b72f-19e4378be676": {
  "contractId": "2d0dc7d4-5b92-4bdb-aa3d-014e3cb937c6",
  "customerId": "54a9e416-117b-48d9-aa74-d1b2ad93a680",
  "address": "(34401) 대전광역시 대덕구 동춘당로114번길 60 , 304동 1604호 (송촌동, 선비마을3단지아파트)"
 },
 "c9a82617-fc6c-4ba5-8493-fbe9bfd1e1c9": {
  "contractId": "7c38e147-62c2-4fcc-bdc4-eeacfcd1cbfe",
  "customerId": "13b6d613-98f5-4291-b3e1-ea3199f4ae6c",
  "address": "(13643) 경기도 성남시 수정구 위례순환로 211 , 5402동 302호 (창곡동, 위례 센트럴 푸르지오)"
 },
 "ad0be78d-12af-46ad-8d60-e0cfb3d60058": {
  "contractId": "9111e0da-e059-4cd1-a708-04d4d20be196",
  "customerId": "56058385-b363-4a67-ba43-c87127bf757d",
  "address": "(17804) 경기도 평택시 청북읍 청북남로 278 , 303동 1303호 (부영사랑으로)"
 },
 "0f40424b-ac84-4b75-b8d1-825f42d481a3": {
  "contractId": "577c4648-8329-411c-95c3-9048233fa8e6",
  "customerId": "5451a789-f3ae-4518-95f3-469423138ccb",
  "address": "(17951) 경기도 평택시 포승읍 당두길 24-6 ."
 },
 "8a8817cd-1127-427d-a312-72b7b601a1a8": {
  "contractId": "755a4bf1-2e1e-4688-bfe8-a5a7667b46e7",
  "customerId": "da3da342-fe31-4ca0-addf-7cd11e2570fc",
  "address": "(21501) 인천광역시 남동구 염전로 440 , 101동 1710호 (간석동, 신동아파밀리에명품아파트)"
 },
 "fda7c591-62c2-496b-bdee-8c47067b53ec": {
  "contractId": "8d5ae16f-857b-41d7-8511-73732b609ff5",
  "customerId": "cdbe51c4-6381-4ede-89d7-6e87b870a8c0",
  "address": "(32144) 충청남도 태안군 태안읍 서해로 1643 , 101동 1101호 (코아루 3차 아파트)"
 },
 "21d0e1ee-655a-4968-8fcd-bd98bca70679": {
  "contractId": "958c599e-c1bb-49aa-9d02-49c6fdb64efa",
  "customerId": "ddcfe1b9-1a14-44de-83d0-c5b988c40054",
  "address": "(17817) 경기도 평택시 안중읍 서해로 1211 ."
 },
 "1e496f66-a606-45fc-a650-951493ef973e": {
  "contractId": "28049248-7285-4dde-ae69-4371a0bfe73a",
  "customerId": "78608ee4-384d-4951-9ff3-bd0fb9122dba",
  "address": "(18600) 경기도 화성시 향남읍 행정중앙2로 83 , 1002동 301호 (향남시범 살구꽃마을 대방 노블랜드 아파트)"
 },
 "3735ed3e-71d1-4f98-8a5d-8eced3e91bef": {
  "contractId": "6015ee95-bab5-4178-90e7-5c0a4bcc44c1",
  "customerId": "3b31cbde-0331-478d-84bf-4c49088aed0c",
  "address": "(18611) 경기도 화성시 향남읍 상신하길로274번길 61 , 801동 102호 (서봉마을 모아엘가)"
 },
 "3c26af4c-fdac-4b58-8819-56c1b4ea0e51": {
  "contractId": "5d43e86e-3f11-4759-81ab-2ff01013a6d5",
  "customerId": "573a132b-c11e-4166-bf2a-5cc0e0d5473b",
  "address": "(3962) 서울특별시 마포구 방울내로11길 38 , 101동 906호 (망원동, 마포월드컵제이스카이)"
 },
 "18abc155-8c2a-4ee4-b37e-770f41efa959": {
  "contractId": "d4db1377-3005-499a-8ece-4537abbec590",
  "customerId": "fbe41afd-8711-4160-9e47-e5dae52ba47a",
  "address": "(23050) 인천광역시 강화군 길상면 온수길 77 ."
 },
 "3efac2f1-eeaa-4f66-9d8e-a36d122f2a80": {
  "contractId": "a252281f-1e2e-4e88-a254-4b7e851f19e4",
  "customerId": "cff4936d-c8f7-4f85-b072-d327fdc7190b",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 109동 901호 (힐스테이트 송담)"
 },
 "f312e752-eb39-48f5-9765-31a25accd695": {
  "contractId": "710de781-c172-4e45-9e65-8ba675111eba",
  "customerId": "8b2e77af-92a5-4011-b94e-2b689bce5622",
  "address": "(15052) 경기도 시흥시 군서로54번길 16-1 , 401호 (정왕동)"
 },
 "6b2fd375-da09-4008-bed9-26b16037b681": {
  "contractId": "53bdd445-c3a6-4551-bacb-3df82b48b852",
  "customerId": "e3385f4e-1847-4114-82b8-d93a1d7a2bbd",
  "address": "(13307) 경기도 성남시 수정구 남문로13번길 6 (태평동)"
 },
 "766ecefe-82a3-4ac7-b1a9-3b55bc588de4": {
  "contractId": "9fcb012b-dc03-4da0-a4d8-de38a29fb207",
  "customerId": "0fd9d35c-a24c-4745-86ab-14dad5338770",
  "address": "(4574) 서울특별시 중구 난계로15길 63 , 933호(황학동, 한양립스 이노와이즈) (황학동)"
 },
 "680ad02f-8624-40b0-8f3a-e0d373c792be": {
  "contractId": "51234ad9-8147-4b7b-8b8d-9d33e1712fce",
  "customerId": "0db2a9a0-92bc-4536-810e-04cdc45e741c",
  "address": "(14438) 경기도 부천시 오정구 부천로470번길 24 , 301호 (오정동, 우리하임)"
 },
 "a65b41ad-1af6-4816-83be-4fbd08e841f2": {
  "contractId": "01cd2524-da0e-4b68-b6ab-5c3c21d0df9f",
  "customerId": "2562daf4-995d-472b-929b-cb235321933a",
  "address": "(18017) 경기도 평택시 고덕국제6로 50 , 1408동 1501호 (고덕동, 고덕 국제신도시 리슈빌 레이크 파크)"
 },
 "8788eda6-2f48-4836-ac7e-a983bf6268c0": {
  "contractId": "4cacd6ea-52a4-4647-bf35-f59b43b1c8a9",
  "customerId": "8a18311b-a3e9-476b-b657-2677b448f9f7",
  "address": "(17933) 경기도 평택시 안중읍 안중초롱길 16-11 ."
 },
 "6fc03b6e-9082-4f59-ab74-847af5e11bc9": {
  "contractId": "640b2606-f992-4d81-96f6-6a24694ca205",
  "customerId": "4a00997d-2869-4d5d-b248-cff0a1d7102a",
  "address": "(16679) 경기도 수원시 영통구 신원로 124 , 505호 (신동)"
 },
 "89cb3e96-3524-421b-9bc4-0329ed32ff3b": {
  "contractId": "fcd4ddb4-6155-4bf3-98b8-3b5e0b2b6c48",
  "customerId": "e4dadd01-e2a7-4390-992d-a6181c73d2cf",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로356번길 15 , 101동 703호 (서봉마을1단지아파트)"
 },
 "44e05da1-0f02-41bf-baf4-99e994a92eb5": {
  "contractId": "32871fc9-e2bb-4de9-8fef-8c6f4bd3403b",
  "customerId": "912e61f4-26ca-445a-8f7a-d8a367f1852a",
  "address": "(17954) 경기도 평택시 포승읍 여술로44번길 17 , 201동 303호 (모아미래도2차)"
 },
 "ad1e041b-ac09-42e3-85f8-db25b6160f30": {
  "contractId": "d9fdf00f-28da-4d06-9a08-f3e6f11c361f",
  "customerId": "488802ea-1354-4633-ad91-ffa0b3171f8d",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 55 , 202동 702호 (송담 지엔하임2차)"
 },
 "38d71ce3-3f9f-44de-957c-f064ccf425e8": {
  "contractId": "7b435ce4-e510-4a8f-ab1c-7f34608a2830",
  "customerId": "3ad8b336-65c9-45ba-a7f6-fe22e70d241c",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 109동 903호 (안중 지엔하임 스테이)"
 },
 "32c716fd-ba72-4b21-b79b-4bc96f1a6735": {
  "contractId": "e9f3a37d-b511-4292-bcbf-7ad9c21ddc6b",
  "customerId": "67ca7f14-d4b4-4b23-b0e1-b1105159d1e0",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 112동 1301호 (힐스테이트 송담)"
 },
 "04438774-9bf3-44e1-9697-14e5170a6c0c": {
  "contractId": "009c48e2-d181-4bd8-9cde-02289f247197",
  "customerId": "147287b1-31ae-41fd-95f6-1c270eca6219",
  "address": "(16687) 경기도 수원시 영통구 태장로82번길 32 , 101동 1401호 (망포동, 동수원자이1차)"
 },
 "71d7df53-a7eb-4d3f-984a-6c299460e2c3": {
  "contractId": "888a6205-22f1-448d-9a47-5ad9c857e8cd",
  "customerId": "ba2821bc-d49c-436e-8c2d-f755ce84f7d2",
  "address": "(17936) 경기도 평택시 안중읍 안현로서3길 55 ."
 },
 "a9637d47-2a70-4992-9fe6-aa7c4f0252d5": {
  "contractId": "ab86c982-87ce-46ed-8e8a-7b980473aeee",
  "customerId": "2b7c8b6b-a3a2-41bd-9e42-b4e3daf3e5e2",
  "address": "(22775) 인천광역시 서구 가정로 437 , 109동 1402호 (가정동, 루원시티 SK Leaders' VIEW)"
 },
 "c61d44fe-f200-43f8-9ce3-c4fa9b594a2c": {
  "contractId": "39b32d5b-a4b7-4d94-a086-1ac02587ae5b",
  "customerId": "ae8ca48a-c564-4162-a18a-2c910194deaa",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 65 , 1701동 1801호 (화성향남언덕마을사랑으로부영17단지)"
 },
 "e4e2c83f-518b-4ebf-8c7c-aa5281d223a3": {
  "contractId": "f2c0b8cb-7d11-4803-8f4f-cc687ccca730",
  "customerId": "85c9020e-c79f-455a-aef9-14c18fc4a992",
  "address": "(13232) 경기도 성남시 중원구 금상로 70 4층 (상대원동)"
 },
 "c83cb482-3a10-4eb1-85c8-d5f6df2939c4": {
  "contractId": "688cfb27-cce4-4a3f-a0d4-29422b074fc6",
  "customerId": "cac0813e-a4d4-4f5e-8029-94c9344b9e57",
  "address": "(18014) 경기도 평택시 고덕국제3길 10 , 201호 (고덕동)"
 },
 "38b256b9-dd23-4113-ab69-ff9362ad23b3": {
  "contractId": "5bb67912-36ab-4e5a-9441-7bf490ea9941",
  "customerId": "434eb633-5721-48ec-b2ee-6623092944fd",
  "address": "(13916) 경기도 안양시 동안구 임곡로80번길 33 , 117동 204호 (비산동, 더 포레스트 힐)"
 },
 "ce6346ff-4869-4932-8696-d681ce559dc8": {
  "contractId": "b624208d-92ad-4341-89db-c83a5715a026",
  "customerId": "f623b178-7f34-4bcf-82cb-561297a9ece0",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 111 , 301동 405호 (현대아파트)"
 },
 "f46aee8c-5216-4296-8661-0606292d748d": {
  "contractId": "a44cbabb-a389-4baf-8683-36482dae5e29",
  "customerId": "a89f7b72-275c-4774-a655-82c45d705a88",
  "address": "(13162) 경기도 성남시 중원구 자혜로17번길 16 , 112동 202호 (은행동, 현대아파트)"
 },
 "b0497439-42d5-4c21-81ce-f180631784d2": {
  "contractId": "f80a0162-b28a-4ff7-96de-564042318132",
  "customerId": "eea0d015-bc1b-4ae9-b0d9-a4f4d02124f5",
  "address": "(22541) 인천광역시 동구 인중로 614 , 205호 (송현동, 송현동 누리아파트)"
 },
 "6ff3af5a-c866-417c-abcb-479499eab6e0": {
  "contractId": "01edb690-2e9b-458b-acf1-c8852f5bb383",
  "customerId": "e766e071-3343-4adb-b5ff-19f271b27ff0",
  "address": "(18477) 경기도 화성시 동탄대로시범길 276 , 914동 1404호 (청계동, 동탄역 시범우남퍼스트빌아파트)"
 },
 "0dc60517-b54a-41aa-9f23-1d7d13779ee4": {
  "contractId": "56a33b44-1068-4b6f-a474-3b183b2c5f0f",
  "customerId": "7402dad9-d61a-4059-95a7-ad177cce17ca",
  "address": "(17945) 경기도 평택시 현덕면 운정3길 5 ."
 },
 "0198ef7b-5f2c-4c52-ad9e-d1532eb63c0d": {
  "contractId": "0657e791-8aa2-4059-8c63-2dc6497f60de",
  "customerId": "d5795b2e-f8a3-4131-b7ef-46f9c4bc1d26",
  "address": "(14586) 경기도 부천시 원미구 조마루로 134 , 1103동1604호 (중동, 보람마을)"
 },
 "25497bb8-c920-491c-874e-45561e7de434": {
  "contractId": "eb692a8c-7fcf-4a47-98e2-60e966a321aa",
  "customerId": "bbe10bb5-6588-4d04-bd78-65f5df53cf82",
  "address": "(12975) 경기도 하남시 수리남로 26 , 101동 401호 (덕풍동, 한솔파로스)"
 },
 "1d57a0ba-e448-403a-adcb-ba8c679e111d": {
  "contractId": "d9b1d3e0-a9f2-4db4-8dde-d9b24446e51f",
  "customerId": "956fb66c-fc14-4f52-aa27-2da23e462dd8",
  "address": "(5545) 서울특별시 송파구 오금로11길 65 , 1205호 (방이동)"
 },
 "e968df1a-3c3f-43ab-8667-91bdd3f49d2e": {
  "contractId": "cc1a7813-0289-4e94-a48a-a6df56d12596",
  "customerId": "c0c926e0-3fe4-4416-bdda-755c8aa3a75f",
  "address": "(13534) 경기도 성남시 분당구 동판교로 92 , 313동 406호 (백현동, 백현마을3단지)"
 },
 "587888be-d6f2-4dee-bac6-53a91c83996e": {
  "contractId": "1f85cd7c-240c-4e8c-be2b-846c8d64cef7",
  "customerId": "a4e6ecdd-4cdf-428f-b04e-898795b1816d",
  "address": "(18584) 경기도 화성시 장안면 조암동로36번길 35-1 , 301호"
 },
 "8ce2509f-5f36-485e-8cbb-ea97bc0d3ed5": {
  "contractId": "857ce3b7-e745-4c4d-a4b7-53de0272b61f",
  "customerId": "a49da23f-bf44-44f3-853b-faaf5742cb43",
  "address": "(5377) 서울특별시 강동구 양재대로97길 53-11 , B01호 (성내동)"
 },
 "d3f5e2c8-a48c-4554-9e3b-084c4bdb8817": {
  "contractId": "8e4e8aad-487f-4bf3-b5d4-2871adf81f25",
  "customerId": "c4942350-ee55-4625-bf6a-4de34365510f",
  "address": "(17814) 경기도 평택시 포승읍 용소길 7-16 , 101동 807호 (한라파인빌)"
 },
 "4b4b994e-f30e-403d-8a7d-08c4a04156b4": {
  "contractId": "9579a507-b024-4f15-9b98-ed4a96e99caa",
  "customerId": "5ef3df91-a06e-428f-946a-23bb33758e10",
  "address": "(14436) 경기도 부천시 오정구 오정로244번길 47 , 3층 (오정동)"
 },
 "4ed2a88d-4e69-4862-9c45-1a890a7d4026": {
  "contractId": "28415210-5764-4147-ac93-d5972b837cc3",
  "customerId": "f646d84c-39df-4ae7-bc82-a00db7c0caa8",
  "address": "(12251) 경기도 남양주시 도농로 34 , 213동 906호 (다산동, 플루리움)"
 },
 "a46a79c1-a500-4174-a70d-41e113fe1804": {
  "contractId": "3cce9afb-66da-4b3c-84fd-bdf7b1fb046c",
  "customerId": "9f145484-b445-45c7-8c1f-8c75cc3aaf6b",
  "address": "(21333) 인천광역시 부평구 굴포로5번길 47-8 , B동 301호 (갈산동, 세종빌리지)"
 },
 "66b07b61-c292-4baa-b8ca-04de3aecf617": {
  "contractId": "cc703d39-4b2e-400c-ab94-bb0ca0a1588b",
  "customerId": "8104760a-d3c5-4167-9328-a7f8a0abc65e",
  "address": "(6725) 서울특별시 서초구 남부순환로333길 31 , 204호 (서초동, 서초 에르스떼)"
 },
 "f4f638eb-65be-4ce1-bd36-d581f491ea7e": {
  "contractId": "0618a6b4-7ae4-479e-a068-0d2a7a8259c0",
  "customerId": "276ead58-9951-4104-84d5-ee0a3c150996",
  "address": "(18593) 경기도 화성시 향남읍 푸른들판로257번길 7 , B동 403호 (가림아파트)"
 },
 "1f380be4-6ffe-42d9-82f8-fcee643cf0ab": {
  "contractId": "7fbf06a7-4a57-4ed2-a07a-c9e612de2144",
  "customerId": "1e4d08e4-d761-41c1-a6d3-a49dc56a819c",
  "address": "(17969) 경기도 평택시 현덕면 덕목1길 32-37 ."
 },
 "7e0838a5-966d-4e37-8306-cc89d4b1318c": {
  "contractId": "245b9047-1ffe-463b-af12-30bf63a174ef",
  "customerId": "a2f13e0d-cc13-4ded-baa4-7f5e3fa89bda",
  "address": "(14307) 경기도 광명시 하안로 238 , 1309동 1206호 (하안동, 하안13단지고층주공아파트)"
 },
 "38cb0fdd-c4f7-4cc2-a87c-cfdca8f977ff": {
  "contractId": "d37daacb-6614-40f0-952b-0ccfda05d0f9",
  "customerId": "421656a7-668c-4300-b76a-a68c3b8036cd",
  "address": "(13916) 경기도 안양시 동안구 임곡로 43 , 108동 804호 (비산동, 더 포레스트 힐)"
 },
 "c69e5ad1-db35-4727-a184-91cd9f45f032": {
  "contractId": "9d4faa4a-40bf-4a80-9b8d-58aa70d985f3",
  "customerId": "2fdf0a16-c230-4aab-8d6d-6023a58b4db2",
  "address": "(17928) 경기도 평택시 안중읍 서동대로 1832-23 , 108동 104호 (안중우림아파트)"
 },
 "c88d1037-7f9c-4690-ac51-82d9fdbb0d5e": {
  "contractId": "79c66d0e-28ea-40c1-83c9-36f723e61128",
  "customerId": "5e938fd3-d377-4433-9fe3-800b3e986d9e",
  "address": "(17722) 경기도 평택시 동막길 178-2 (지산동)"
 },
 "089876c9-7d23-4349-894e-21052f630249": {
  "contractId": "be2f4aa5-6b94-4779-91d7-fe538e793162",
  "customerId": "a55d82cd-4b50-4c1e-85fc-35333556517f",
  "address": "(11932) 경기도 구리시 원수택로64번길 9 , 101동 209호 (수택동, 수택동 성원상떼빌)"
 },
 "c5ddd12d-9c0a-4dd2-9deb-5129118ae508": {
  "contractId": "7dc0d067-bfd6-4822-a6c7-73996dd4d09d",
  "customerId": "c9511e23-23f7-43ec-9909-12b612cf765d",
  "address": "(16676) 경기도 수원시 영통구 신원로250번길 10 , 휴먼빌 601호 (매탄동)"
 },
 "839556d4-41f0-4e87-a6d0-ee5583605175": {
  "contractId": "26bec1f7-6d95-41c8-80b0-135d98250c28",
  "customerId": "35df0618-c8f7-47df-965f-7b822835fcac",
  "address": "(31037) 충청남도 천안시 서북구 직산읍 천안밸리로 22-22 , 203동 2401호 (한양 수자인 비다펠리즈)"
 },
 "1a17d332-abad-469b-875f-3e86dbae4a4d": {
  "contractId": "8d38d72f-8edc-4bd1-b865-44da880d9bba",
  "customerId": "bec10278-3039-430c-98d6-922888d32604",
  "address": "(18565) 경기도 화성시 우정읍 조암동로36번길 42 , 201호"
 },
 "ba056610-7ebf-415d-a161-b0a064b4e5d3": {
  "contractId": "d6eebfb2-dbe1-48f1-99d3-86e5edeb05ca",
  "customerId": "d134a8fc-9a93-419e-98c3-4d3d219d10ba",
  "address": "(17737) 경기도 평택시 이충로 38 , 106동 1503호 (이충동, 반지마을주공아파트)"
 },
 "69b69608-958a-4668-8097-eb06b71db832": {
  "contractId": "749f9bfa-4c95-4977-86f8-27dfd638515b",
  "customerId": "f2dca429-becc-49e7-8d85-0ed7c147f2f0",
  "address": "(14462) 경기도 부천시 오정구 삼작로346번길 20 , 404호 (여월동, 뜰아래)"
 },
 "9d2f66a5-26e1-4639-9113-ee646367d339": {
  "contractId": "ef19efab-2e1b-4c08-a7d2-87bab7b0e941",
  "customerId": "9f57b19d-ffe9-4ceb-be3b-1d847a7394d8",
  "address": "(15446) 경기도 안산시 단원구 광덕2로 74 , 1209동 904호 (초지동, 그린빌)"
 },
 "3a0c9ad1-a483-429f-8a2b-b274fdbe4c43": {
  "contractId": "8fadcd86-a355-43b1-aa81-475f46091c00",
  "customerId": "ff64cf1a-50a2-44ca-930d-6e7c7218f510",
  "address": "(16569) 경기도 수원시 권선구 세지로112번길 25-20 , 1층 (권선동)"
 },
 "ccb8af1b-963d-444b-be6a-c977fbf61338": {
  "contractId": "e3ef7d4e-9706-4198-9113-59ec83d4e634",
  "customerId": "93f9e39b-3e0a-4b29-8292-64c71776eb9a",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 105동 201호"
 },
 "27a61407-c84a-4dd0-9e9f-916772766352": {
  "contractId": "dc50078a-4eac-4630-91cc-38d2f9c4a4df",
  "customerId": "48228225-200c-4c9d-85e6-4fc224f5fa30",
  "address": "(17968) 경기도 평택시 현덕면 인광2길 55-53 ."
 },
 "a219f12a-244c-4c4c-af3d-98cafda5143a": {
  "contractId": "1a84d2aa-445c-479b-a66d-e20efa40f11c",
  "customerId": "a5b5abc2-3997-4174-a413-45d13c4ca91e",
  "address": "(17955) 경기도 평택시 포승읍 여술1길 96 , 1001호 (서평택 삼익 마에스트로)"
 },
 "fbdae2c4-017c-41ab-8c0f-6ee6aff7ab02": {
  "contractId": "2fb9dcae-8f85-4854-ae33-9f21c7c2cb5f",
  "customerId": "6b128c86-9063-4c8e-9099-76418aa6d792",
  "address": "(18121) 경기도 오산시 궐리사로29번길 26 , 504호 (궐동)"
 },
 "4961966a-1f6a-43df-a580-574c0b8fff6e": {
  "contractId": "9e286c73-fab3-4fa2-8d40-bdcd2331f947",
  "customerId": "3a19e83d-574c-4ace-86c8-0d651ed49205",
  "address": "(44057) 울산광역시 동구 방어진순환도로 580 , 102동 1404호 (화정동, 정우6차 센트럴빌)"
 },
 "1a9dec1c-eb8c-44da-9a09-1772aa511f5a": {
  "contractId": "ce6864e8-66b3-4e44-86ee-3a7b7030c56e",
  "customerId": "a4ab56b6-ce8e-46dd-92e7-bdcfa5eb2f1a",
  "address": "(16918) 경기도 용인시 기흥구 구성로 99 , 102동 1603호 (언남동, 하마비마을 동부센트레빌)"
 },
 "c1f16c52-d3cd-4fec-8401-170ccb2aa8cd": {
  "contractId": "62cf4360-5d06-447f-9c30-2b9215ee2ad1",
  "customerId": "7eb2d630-3a73-4ac4-b498-a8276ff41ad5",
  "address": "(13916) 경기도 안양시 동안구 임곡로80번길 33 , 118동 1903호 (비산동, 더 포레스트 힐)"
 },
 "c4644c8b-d080-41b5-9b8f-a9f23a208f66": {
  "contractId": "a3fdd777-6c95-41d5-a44a-19b09bdacad6",
  "customerId": "408079de-1ae4-42ab-bf07-4438988b1d15",
  "address": "(18527) 경기도 화성시 팔탄면 동촌길21번길 10-6 ."
 },
 "3a52ea46-1e4a-4ab8-bd95-322a0908e651": {
  "contractId": "54baa337-7c1b-45e1-b23a-a8a70d2184a2",
  "customerId": "26acbcd8-9921-4f73-bd52-455cca80af1a",
  "address": "(1776) 서울특별시 노원구 섬밭로 229 , B동 1302호 (하계동, 극동,건영,벽산아파트)"
 },
 "ba99487b-ff13-4931-9ecc-6a0efd5b881c": {
  "contractId": "b797d8f6-ab42-43a0-bd1a-2931b1524169",
  "customerId": "01478581-c150-4d25-a631-cc94a9328649",
  "address": "(32503) 충청남도 공주시 유구읍 동대말길 29 ."
 },
 "2013e0ca-7db9-4a74-b867-e5f87bdc0852": {
  "contractId": "84dd77c3-3901-4678-a5e9-fd1182f41a0a",
  "customerId": "1f2229ba-8a90-4b83-9bd2-e1f254417616",
  "address": "(17938) 경기도 평택시 안중읍 안현로서7길 88 , 103동 501호 (동신 행복마을 아파트)"
 },
 "2dd8142c-46ac-4f70-83a2-d9a8d51e81c2": {
  "contractId": "8e7a9176-aff7-4ed7-b558-26a939a4d153",
  "customerId": "925cc0aa-4be5-4030-8657-1aee3d2ad1b5",
  "address": "(17814) 경기도 평택시 포승읍 서동대로 1297-13 , 101동 504호 (안중플러스빌아파트)"
 },
 "31c57441-0d2e-4eb1-b4bb-af57f93129c0": {
  "contractId": "9d0e69ca-ee65-4344-ab1e-20c82e7a5f8f",
  "customerId": "60bb4f0c-f0bb-44a4-9b01-6549b98a8e80",
  "address": "(17779) 경기도 평택시 서두물로10번길 7 , A동 304호 (서정동)"
 },
 "068ffa92-f195-4a06-8bc9-ae91e9a95cd8": {
  "contractId": "40f75582-625e-4a6a-8bb8-2fc568368025",
  "customerId": "bb96471d-751f-47b9-893f-dd16c4b33dfe",
  "address": "(18025) 경기도 평택시 신촌1로 9 , 107동 1904호 (칠원동, 평택지제역동문굿모닝힐맘시티1단지)"
 },
 "a69dc9a3-02d9-4b5c-84c9-ebff17bed375": {
  "contractId": "71620a87-5f4c-460b-b782-85c624ee9a6f",
  "customerId": "e3cad58c-ba5f-4f39-8a3b-73235cbf4afb",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 104동 304호 (이안평택안중역)"
 },
 "535a56d8-25df-4490-bbf8-a4abc9d53616": {
  "contractId": "129a3e17-7e2a-4549-b11f-ceabf9651c56",
  "customerId": "86e21ad2-4342-4982-bcfd-f72e7793f138",
  "address": "(15010) 경기도 시흥시 해송십리로 472-12 , 106동 2204호 (배곧동, 시흥배곧신도시 이지더원1차 더 퍼스트)"
 },
 "cb824e5a-11e5-4a65-9322-01ce5c88bafd": {
  "contractId": "03491217-8a23-4e3f-9133-bd83e15915cb",
  "customerId": "07487ce8-f6dd-491a-883a-2f8c7169a2f5",
  "address": "(1327) 서울특별시 도봉구 마들로 705-3 , 201호 (도봉동)"
 },
 "cd2533ac-6281-4138-a571-582862d62a07": {
  "contractId": "70d67b46-e780-4dba-a80c-8562f724185f",
  "customerId": "f098d6dc-aaa3-4b7d-aaf6-c39afff8da4a",
  "address": "(17965) 경기도 평택시 포승읍 이평길 33 , 1층"
 },
 "71325989-8749-4a3c-9013-ab2b0b8cf545": {
  "contractId": "cbbbf13d-1d06-4f79-829b-7c5d69d7f476",
  "customerId": "aa5ea236-ab34-46e1-a7af-571296730959",
  "address": "(55048) 전북특별자치도 전주시 완산구 안행로 149 , 101동 602호 (서완산동2가, 전주 서완산 골드클래스)"
 },
 "7bf72866-9085-4982-9123-047fa93dc122": {
  "contractId": "1b4447b0-a629-4c1c-8b44-aa7772e82625",
  "customerId": "eb3f7d76-0271-4728-ba60-86d4ff13bd7e",
  "address": "(14281) 경기도 광명시 광명로786번길 10-1 , 402호 (광명동, 토미하우스3차)"
 },
 "3a1621c1-f47d-4f97-b52c-556703d0282a": {
  "contractId": "ce31a057-a6bb-49f9-a7e8-f3813b125cc8",
  "customerId": "a01481ec-54a0-4954-a0fa-017e1c4b7293",
  "address": "(27662) 충청북도 음성군 대소면 소석로 39 ."
 },
 "28cd0a7f-f6db-4ee4-8015-0628bd8087e1": {
  "contractId": "0e4136e8-e669-4f69-b4da-142bf3cf864a",
  "customerId": "f6dad955-6ed5-4cca-9952-72a7d5f95007",
  "address": "(18316) 경기도 화성시 봉담읍 상봉길 35-10 , 105동 1702호 (호수마을 동문굿모닝힐아파트)"
 },
 "3fe6b867-eb89-4a4f-a7d4-dbfc2f86a022": {
  "contractId": "6c450362-63e9-41f1-9e6b-1fe5f3fd5d13",
  "customerId": "6290dc3e-d5f5-4054-9837-732591be745d",
  "address": "(17804) 경기도 평택시 청북읍 청북남로 278 , 301동 2003호 (부영사랑으로)"
 },
 "10ab0fb8-4f87-4723-95a5-1bb82697e8d7": {
  "contractId": "d0ebe191-f009-49df-9b85-729d4385287b",
  "customerId": "056b450c-1a31-4bea-9830-e0191bf0b339",
  "address": "(31789) 충청남도 당진시 역천로 270-71 (사기소동)"
 },
 "311966d3-c1b8-4dde-a920-5cb679f7074a": {
  "contractId": "3fba57c0-58a4-4674-850e-98fbb20e8f67",
  "customerId": "b429827e-d4eb-491c-9ad8-238be4ee8d6c",
  "address": "(21539) 인천광역시 남동구 하촌로19번길 17-6 , 가동 501호 (만수동, 태영캐슬)"
 },
 "e15cae48-a4cc-4de6-b330-bd53935c89f4": {
  "contractId": "5364968a-836a-4047-9d29-4461fe64a570",
  "customerId": "8a9142b8-2cac-4034-9e27-ec55d3b47a6b",
  "address": "(16689) 경기도 수원시 영통구 영통로 163-16 , 403호 (망포동, 세흥아파트)"
 },
 "ceb1ea89-a3f6-4685-a2e6-f5402283b606": {
  "contractId": "b8572cdc-16ca-47f8-bb02-460204f265a5",
  "customerId": "e32b555e-e282-406d-a68c-240343691854",
  "address": "(18559) 경기도 화성시 우정읍 포승향남로 2015-9 ."
 },
 "33a06204-07e8-4516-afce-251751402324": {
  "contractId": "9e58a94f-424b-430e-a83f-f6efe6efe603",
  "customerId": "f86abab9-6d75-4ba9-9d71-2e4522e01c08",
  "address": "(17961) 경기도 평택시 포승읍 서동대로 784 , 102동 1108호 (SR 친오애 아파트)"
 },
 "36158254-c874-4973-ad95-81281c8ebbfd": {
  "contractId": "924f1ab5-09aa-4896-beaa-f54d6dce982e",
  "customerId": "022f7227-fcaf-40af-a48c-0e2b761003d7",
  "address": "(31991) 충청남도 서산시 한마음16로 59 , 신한빌 207호 (석림동)"
 },
 "cacf50fe-25a9-4443-affe-6f020222f4b2": {
  "contractId": "ee649fc1-1c83-4a87-9b58-1b9e9bd7dbcc",
  "customerId": "f08842d8-009d-46e0-97f3-fc5b8ea46979",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 55 , 201동 2001호 (송담 지엔하임2차)"
 },
 "20fe3ae6-e193-417a-b026-94e921e83471": {
  "contractId": "37e6df5d-b41a-4067-ad4f-797ba8c3406e",
  "customerId": "b990ff37-ee4c-4cc3-900d-d8d2b168b491",
  "address": "(31139) 충청남도 천안시 서북구 도원2길 36-3 , 3층 (성정동)"
 },
 "adc3c129-9a63-4f49-b675-0055a6def3de": {
  "contractId": "258507fa-c31f-46f2-b940-f4ffcb0acbc7",
  "customerId": "9dc46059-f2a8-4bad-a7f2-a2ee3145a1eb",
  "address": "(18596) 경기도 화성시 향남읍 발안남로 66 , 107동 1003호 (화성발안우림필유)"
 },
 "520c313f-166b-49ad-bea6-7693f3b513e9": {
  "contractId": "f96c72d8-c3a8-4166-84c3-081f3d0375df",
  "customerId": "d451dab6-4cff-4278-a9f6-586999f1f1ba",
  "address": "(18610) 경기도 화성시 향남읍 하길로 70 , 1004동 1001호 (화성향남오색마을사랑으로부영10단지)"
 },
 "d2234506-4527-4588-8adf-2bf317a1884f": {
  "contractId": "1769ced2-4c3f-494e-8ef9-a54709d279e0",
  "customerId": "25593712-e651-4576-acd3-d3acab532c56",
  "address": "(31006) 충청남도 천안시 서북구 성환읍 천안대로 2318-3 ."
 },
 "98ab5ed3-0d16-43e0-93c9-a85eecb03b32": {
  "contractId": "577e1b13-5139-4260-bb25-964fa3d69594",
  "customerId": "a5f1a968-4ba6-45b0-abaf-14ef9c3a2c51",
  "address": "(31182) 충청남도 천안시 동남구 다가말1길 17 , B동 201호 (다가동, 골든빌라)"
 },
 "77221d87-3edf-44db-b1ee-abab41b6b24d": {
  "contractId": "58dad9cb-4d0d-4799-8db3-3d2155c9bf99",
  "customerId": "e271412a-03fe-4e62-81fe-b458ddd1ebc8",
  "address": "(15255) 경기도 안산시 단원구 사세충열로 100-10 110동 B102호 (와동, 진아타운110동)"
 },
 "5b2e404f-c043-4596-8180-3d93a74b346e": {
  "contractId": "172e8aa3-2285-48d3-b34b-8f79f472a6f0",
  "customerId": "29bc5b35-9c92-4bc8-900b-22fb2a314a68",
  "address": "(18570) 경기도 화성시 우정읍 고온리안길 68-20 ."
 },
 "00ba7592-b554-4b8b-9235-c21dce152246": {
  "contractId": "454369f5-9c1c-4532-8f25-fa7c4b1f55d3",
  "customerId": "55168adf-89ef-4ed9-944d-bff4565f0062",
  "address": "(17959) 경기도 평택시 포승읍 평택항로184번길 3-40 (더스위트하버)"
 },
 "001bd712-6fc6-45a9-87f5-e60003a2bb82": {
  "contractId": "d7a6adf1-2af8-408d-9e88-bdb90a5ab74b",
  "customerId": "a88c328d-551c-40cb-89e2-91a17db721f0",
  "address": "(16044) 경기도 의왕시 호성로 48-7 , 101동 1806호 (오전동, 진달래아파트)"
 },
 "a69c3cce-e35f-4a7b-828a-8e2c49a8ae9b": {
  "contractId": "0a52604b-3b0c-4d6a-84c5-4457d2c4d7ed",
  "customerId": "68d0598a-c01e-47f3-b9c5-81bc1cd24a3c",
  "address": "(17955) 경기도 평택시 포승읍 여술2길 60 , 102호"
 },
 "b3519833-57b0-4842-9f80-56591a6e2212": {
  "contractId": "ebbf0ad5-ead7-46a4-8e6d-50c955332a12",
  "customerId": "6a812931-ff47-42d3-a5ed-be2eb79e8342",
  "address": "(63145) 제주특별자치도 제주시 연사2길 60 , 204동 202호 (오라이동, 다몰2차 연립주택)"
 },
 "9344957c-e2aa-41c5-bf03-de3aa72f7cb3": {
  "contractId": "618d24a1-82c5-413e-b77f-8e7735b33d4c",
  "customerId": "9dc7d709-ac17-46f0-8c25-ab4648d4bc65",
  "address": "(17981) 경기도 평택시 팽성읍 송화2길 47-10 ."
 },
 "a52de457-0191-4c85-b86d-9110c552fc0f": {
  "contractId": "fc2c1d29-4b36-4893-a99d-f81709be8807",
  "customerId": "8bdbd116-3860-4b41-9fe2-341fb0a5fa52",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 108동 201호 (이안평택안중역)"
 },
 "f0f92fa6-16b6-4e43-b0e1-e760f27a2370": {
  "contractId": "fe96ab4a-bd81-485a-b4f3-d060969d42b3",
  "customerId": "cfdef040-82ee-4fdc-8624-bf6145070b4f",
  "address": "(7581) 서울특별시 강서구 강서로68길 36 , 105동 306호 (등촌동, 등촌주공1,2단지아파트)"
 },
 "4bbcddc6-d121-4d29-9c02-ce34fe1de7e2": {
  "contractId": "2aebc3e6-5182-428c-b4ce-70ba44e73011",
  "customerId": "99387fe6-1845-4565-ae19-0ae0092151c7",
  "address": "(17954) 경기도 평택시 포승읍 포승공단순환로 403 , 104동 901호 (포승삼부르네상스1단지)"
 },
 "c9a0d6e5-de7a-42ee-9110-0f7bda959a9b": {
  "contractId": "5c01460b-9389-4e82-bd3c-c9ee04a5edd1",
  "customerId": "b686e509-1997-4f66-a75b-4148355e0d98",
  "address": "(17938) 경기도 평택시 안중읍 현화중앙길 53 , 104동 1903호 (성원아파트)"
 },
 "caf78fa4-09af-4a7c-b136-5572b5d36f3f": {
  "contractId": "e0ba1ca7-1ebf-4cc8-b37d-c9b497caebae",
  "customerId": "6c273603-58de-4cc8-bc18-2d6700d86e58",
  "address": "(16585) 경기도 수원시 권선구 경수대로302번길 32 , 104동 1303호 (권선동, 성지아파트)"
 },
 "1851c202-701f-44be-b2c5-65e0ca078f46": {
  "contractId": "0cbf229c-cd19-4b35-a047-b7917da9ece2",
  "customerId": "eb2fff05-a26e-45f0-a52e-4ffea5ca7275",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 209동 204호 (부영사랑으로)"
 },
 "90a7bc08-be23-49a0-8d8b-9161bd571b30": {
  "contractId": "6e07b95d-da3a-4aab-bdc8-d7dbf06f9826",
  "customerId": "37f98fe5-9867-4b8b-8b8f-9ef20906f457",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 65 , 1704동 1501호 (화성향남언덕마을사랑으로부영17단지)"
 },
 "725bbf92-edbc-43e5-abb6-9df4c5ffd95f": {
  "contractId": "7014c136-26a1-4164-b317-77372cb64ca0",
  "customerId": "dcd99e15-c995-47ee-a45c-d444e1f281ab",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 106동 1202호 (서광미소마을)"
 },
 "0c8f1857-7326-46a3-b65b-8dfb1ee7fc7d": {
  "contractId": "a7617221-fa02-4778-89fe-a4feb1a8709d",
  "customerId": "ea482e43-94e1-454e-a8d2-bb61124e8a0c",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 104동 1501호 (이안평택안중역)"
 },
 "5878a0b6-45d5-4294-a5a1-d686adb7056c": {
  "contractId": "6e127cca-1ce0-43f9-b708-64ccbf089e94",
  "customerId": "3db3f84b-ff86-4819-a265-2d3d52f6c0bb",
  "address": "(21319) 인천광역시 부평구 부평북로 431 , 106동 502호 (삼산동, 삼산주공미래타운아파트)"
 },
 "0871b1ca-b2b7-4a1a-b73b-ccd22dec712f": {
  "contractId": "178ed709-caed-462e-acae-7dd864d280ff",
  "customerId": "06a32c41-c772-4994-8d69-9d11bb4765cd",
  "address": "(1026) 서울특별시 강북구 삼양로131길 49 , 1동 1층 101호 (수유동, 정남하이츠빌)"
 },
 "b1fcba03-cccf-496a-b892-3a92aaa3dfd6": {
  "contractId": "f2679258-26a7-4e51-a455-396c18ec0abe",
  "customerId": "f24bf9d1-7639-4c3e-adb1-766439cc1006",
  "address": "(55022) 전북특별자치도 전주시 덕진구 중상보로 10 , 106동 801호 (우아동2가, 롯데아파트)"
 },
 "9ca8df63-d01f-43f9-a054-5fff9a020eb1": {
  "contractId": "48417a41-0e11-4827-ac77-0b5d770ce351",
  "customerId": "082921bc-aaa1-49ef-8482-188334b779b2",
  "address": "(27429) 충청북도 충주시 상방9길 8 , 그랜드타운 A동 307호 (봉방동)"
 },
 "338f57cf-e47a-4228-b54a-dc3eea8cb70a": {
  "contractId": "bddd1b5d-770f-4c92-aaac-7f5f4a3dc26e",
  "customerId": "fa56472e-79f1-4859-9f2a-2a8b21f064ea",
  "address": "(18320) 경기도 화성시 봉담읍 와우로34번길 12 , 104동 1002호 (봉담 센트럴 푸르지오)"
 },
 "dbe3cd3d-74d2-4d96-b824-2d88ac60cb1b": {
  "contractId": "cc1c36d3-8171-40c5-bc9d-6e05c9ced850",
  "customerId": "6bb4e857-e90d-46ac-af97-0f379d997ff7",
  "address": "(18392) 경기도 화성시 병점동로148번길 5-1 (진안동)"
 },
 "254fc02d-3eec-47f1-a50c-8b49fd79b8dd": {
  "contractId": "5a588421-d5db-44ae-9189-eea4e7a13405",
  "customerId": "dd7881e5-1354-4ecb-bb98-26cf26150229",
  "address": "(15447) 경기도 안산시 단원구 광덕1로 80 , 138동 603호 (초지동, 호수마을아파트)"
 },
 "c3216905-0f25-4975-b969-a38f69bde701": {
  "contractId": "7433a5b3-2095-41ac-9836-dfcc6dea4ea3",
  "customerId": "1facd0b2-d1ff-4079-a845-31f6802d25c2",
  "address": "(55053) 전북특별자치도 전주시 완산구 오두정길 10 , 나동 402호 (효자동1가, 대우청솔아파트)"
 },
 "bb7e0184-2ad9-445a-beca-b3f5c63db58b": {
  "contractId": "4f545c47-faba-4e6a-8abc-862f16a9a607",
  "customerId": "5eb23e2c-e482-424f-9379-4d3f7a7db346",
  "address": "(12922) 경기도 하남시 미사강변한강로 279 , 728호 (망월동)"
 },
 "e326afbd-d01f-493f-a0b9-bf16ece290f3": {
  "contractId": "20e168de-279f-4aca-9dfc-75c74a59d5cd",
  "customerId": "188eb37c-3968-45aa-a336-a996500d6928",
  "address": "(10932) 경기도 파주시 금릉이길 26-1 , 102동 201호 (금촌동, 수아트빌)"
 },
 "7e47a6fa-31e3-4cbd-a97d-ef52bc1b5f1a": {
  "contractId": "b2bd6443-3684-4716-881c-e9b163aa8634",
  "customerId": "8128c47c-a2d5-4359-bf23-1b03351a7031",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 201동 801호 (부영사랑으로)"
 },
 "afbdf488-2fcb-4711-8e88-3c3d9c0e7c82": {
  "contractId": "60706037-1a31-4181-9a09-6aaa6ace56ec",
  "customerId": "cd75ae72-a289-43e2-913c-f26ed93cd225",
  "address": "(28043) 충청북도 괴산군 소수면 정용월곡길 13-7 ."
 },
 "1153c7a4-bae8-4e07-a231-8e1a1d79f324": {
  "contractId": "3e4ec55d-628b-42c8-89c2-f4ca0fa6cdb2",
  "customerId": "f9d1c51d-ca1b-45d5-8c8a-eb421fd01132",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 51 , 901동 604호 (한양수자인아파트)"
 },
 "debf53af-06e9-4599-9b15-e1d255c1034c": {
  "contractId": "0f72d30e-df28-4d45-a3ea-8d8188cf6456",
  "customerId": "d843fa4c-4fda-40c6-9ab6-f6d83601057f",
  "address": "(17802) 경기도 평택시 청북읍 청북남로 365 , 106동 701호 (브라운스톤청북)"
 },
 "0d519a8d-759d-4d37-afdc-a020809ae157": {
  "contractId": "478a4ba1-a144-43d6-ab91-eae15d363c33",
  "customerId": "b0fb58a1-678f-46c6-9adb-72fca76a933e",
  "address": "(18392) 경기도 화성시 병점동로148번길 9-17 , 504호 (진안동)"
 },
 "3f044fee-8720-46ce-9b3a-8135958a9bc4": {
  "contractId": "a0526fde-438a-4dc5-a74a-4636c1bfa9f6",
  "customerId": "59d35b53-873c-458c-a634-204be45660ea",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 105 , 201동 1503호 (현대아파트)"
 },
 "74cbc569-0df5-483d-9d8d-774938e5d493": {
  "contractId": "c90fe08a-dcf9-46d9-bcfd-2ad7c5d3f2a0",
  "customerId": "9a812e69-c299-4f00-bb60-fb126e804532",
  "address": "(16571) 경기도 수원시 권선구 권광로139번길 10-11 , 그린하우스 202호 (권선동)"
 },
 "88c6eb93-65cd-46ba-a23b-f166492d08d0": {
  "contractId": "95a5c496-779a-464b-85fb-960892205969",
  "customerId": "ca986a81-7d1a-4905-894b-a7f7e87be14a",
  "address": "(6929) 서울특별시 동작구 장승배기로27나길 6 (노량진동)"
 },
 "9da5cf9f-343d-479f-b602-2d7793983aa7": {
  "contractId": "c115c417-0626-4d05-874c-4cefc1509a57",
  "customerId": "07bf25a1-2b2f-4d1a-8a1f-84dc7f94dc4e",
  "address": "(14786) 경기도 부천시 소사구 옥길로 80 , 611동 1401호 (옥길동, 옥길브리즈힐)"
 },
 "ad2194f6-3b1f-4ddf-b695-65c3adbb3793": {
  "contractId": "c1e4d0cf-b86e-4395-9395-a4c53f615f70",
  "customerId": "c012a1cd-065c-444b-99ed-915ad04b67ee",
  "address": "(18556) 경기도 화성시 서신면 수문개길 81-31 , 301호"
 },
 "62eb6121-17e9-4033-bb0a-67334d5caad2": {
  "contractId": "6c9ed020-c6c7-4b97-92fd-890f517a4503",
  "customerId": "dbc1af58-0a43-4511-a6bc-f8e3efded0cb",
  "address": "(18613) 경기도 화성시 향남읍 상신하길로 295 , 604동 2603호 (서봉마을사랑으로부영6단지)"
 },
 "07eaa905-870e-4bc3-8448-84171cebf0ab": {
  "contractId": "1f7aeaaf-3388-4847-b0bd-ddeab4d06fa5",
  "customerId": "439fac73-0b26-44b9-b6a1-04ff9507d3dd",
  "address": "(31991) 충청남도 서산시 한마음2로 22 , 101동 1304호 (석림동, 서산 센트럴 코아루 아파트)"
 },
 "232d555f-3f45-45cf-9564-99153c827bfb": {
  "contractId": "d1a2ffbe-87e1-47aa-8517-b2aa3c2249f2",
  "customerId": "1a4e49d2-8962-4f85-af3e-78a1dfc15f22",
  "address": "(17954) 경기도 평택시 포승읍 여술로 74 , 102동 805호 (모아미래도1차)"
 },
 "f44d5f18-bedf-4da6-becf-8986b8361963": {
  "contractId": "42a455f3-3390-4920-9688-00f82bb7ed4c",
  "customerId": "39c03bb4-f78e-4bf8-9f7a-b476be95d111",
  "address": "(15589) 경기도 안산시 상록구 후곡안길 6 , 401호 (사동, 그린하우스)"
 },
 "914e9ca5-df85-47ea-8615-2ab1370284fa": {
  "contractId": "aa01169c-64ad-4e33-8e3d-5a22f0d841de",
  "customerId": "36668344-9370-4267-a1ed-64547224fd18",
  "address": "(14548) 경기도 부천시 원미구 중동로 244 , 627호 (중동, 상록센트럴타워)"
 },
 "9c0c3683-9602-4167-a59a-888fe438ab25": {
  "contractId": "187ec08b-a881-4916-98c5-ccb12a32fcfe",
  "customerId": "3086e08d-3870-43b4-baea-734508823855",
  "address": "(39147) 경상북도 구미시 고아읍 가들로 33 , 101동 2601호 (문성레이크자이)"
 },
 "c8f4c394-c64e-4b9b-b794-67e9b63ebe46": {
  "contractId": "9c05e0ae-cf26-49e6-8991-33e265c3f76c",
  "customerId": "ed3546cc-fc08-4fa6-be19-5dee77e21fca",
  "address": "(18134) 경기도 오산시 운천로165번길 19 , 205호 (오산동)"
 },
 "6cdd59d7-bb47-4df2-b7d5-f2b52f1a5650": {
  "contractId": "a53aa7f0-fe6a-42f0-9c79-13d8d18984f1",
  "customerId": "379dbde1-cf45-41ab-baea-cba43c91f447",
  "address": "(5037) 서울특별시 광진구 광나루로40길 45 (구의동)"
 },
 "4753c658-2c78-4c53-8c75-31f0e4e15848": {
  "contractId": "bf5b899c-e67e-499c-ac8e-4a6da2d07693",
  "customerId": "aa6911e7-ab65-49c6-8db5-332fa10f436d",
  "address": "(17946) 경기도 평택시 현덕면 인광길 72-1 ."
 },
 "bf772472-081e-406f-8d42-792474bcb980": {
  "contractId": "d967503d-9427-4600-b078-13e59878c6be",
  "customerId": "40b6968a-2e01-4af0-b3dc-5f515faceab6",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 102동 2204호 (힐스테이트 송담)"
 },
 "776e4d96-d972-4897-a209-81ba32b3edc2": {
  "contractId": "2ab0dd8c-d477-47a6-bc8e-a0c151c0cca0",
  "customerId": "d41a3366-bb9a-41d0-ae26-9a9bc309dbcc",
  "address": "(15052) 경기도 시흥시 군서로24번길 13 , 202호 (정왕동)"
 },
 "f1f65c5f-b403-4973-9d11-37c71baebaba": {
  "contractId": "e2f80320-3230-4437-9196-a0c1d36f3e17",
  "customerId": "210e500c-97b2-447a-803e-1d093a074935",
  "address": "(11450) 경기도 양주시 덕정11길 29 , 2동 202호 (덕정동)"
 },
 "15763237-0d7c-4411-9e0f-ceae7f65986e": {
  "contractId": "aed254ea-4c03-45fa-9db0-aafb7446ff47",
  "customerId": "7e0ff3d6-f7e6-4e4d-add4-6010846a9525",
  "address": "(2785) 서울특별시 성북구 한천로69길 7 (석관동)"
 },
 "4c0842aa-dca9-430b-bb2d-8225cb89e163": {
  "contractId": "4f6e0e52-68ff-4abb-99b0-d5e8ce086dac",
  "customerId": "89d1ccc1-9701-442c-8532-7ad4275bfa80",
  "address": "(61087) 광주광역시 북구 첨단연신로 245 , 207동 1004호 (신용동, 첨단휴먼시아)"
 },
 "46df15ab-02e4-415b-a085-f970723866b6": {
  "contractId": "37b38530-75cb-4cb2-8005-60343c774667",
  "customerId": "455c4e11-5ed1-44e6-b02b-b9651dc0563c",
  "address": "(22134) 인천광역시 미추홀구 주안로160번길 27 , 103동 401호 (주안동, 대송파인빌)"
 },
 "304b9de4-744f-4378-9518-5c9794f9b254": {
  "contractId": "03a03bfc-b8c5-4887-8dcb-5a572e937669",
  "customerId": "a469ff02-84eb-4c99-a99b-2e07c34c59d3",
  "address": "(25480) 강원특별자치도 강릉시 보래미하길 68 , 1동 5층 506호 (포남동, 미진맨션)"
 },
 "07025ad3-4bc8-42b9-965d-2be15e14d467": {
  "contractId": "510db29c-d8e6-47e4-a1f8-02b487e36773",
  "customerId": "6206bb77-e993-4e36-8474-78baaa6b282f",
  "address": "(21974) 인천광역시 연수구 원인재로 124 , 103동 301호 (동춘동, 한양1차아파트)"
 },
 "3a5a6749-7f4f-493a-96c2-122e9fbd71a4": {
  "contractId": "26fc8a71-a2e4-40b8-b7af-6f80ba9e2373",
  "customerId": "1fe38d67-4395-471c-9336-1c1451e71e2d",
  "address": "(11184) 경기도 포천시 소흘읍 아랫용상길 64-2 ."
 },
 "85fc8ad8-c65e-4f89-b470-17f1ec40daf3": {
  "contractId": "2a9340ea-0bf5-4830-869f-f3e423ef9d6b",
  "customerId": "86f3d8a7-f315-465c-83fc-0d056b218cd5",
  "address": "(17961) 경기도 평택시 포승읍 서동대로 784 , 102동 506호 (SR 친오애 아파트)"
 },
 "695c9c9b-1163-41f4-bb37-ce3f9a6a0280": {
  "contractId": "870554b1-5058-4010-b9f5-0ee4c9ed30ef",
  "customerId": "8d6868ab-fed5-47aa-a6e0-db6789cb303d",
  "address": "(13985) 경기도 안양시 만안구 박달우회로164번길 13 , 401호 (안양동)"
 },
 "80e450e6-47d4-4fcb-894a-926074e88084": {
  "contractId": "5a5fe514-d4c6-44e1-8af9-81a57e5d0bde",
  "customerId": "55773c06-bd33-4617-9916-fea52f4c07db",
  "address": "(18310) 경기도 화성시 봉담읍 상리3길 90 , 102동 903호 (힐스테이트 봉담)"
 },
 "c2ba3831-6bca-46b9-8f8a-20fcbc154ac7": {
  "contractId": "bbc90fc8-fc02-4557-808b-c4c2c9dc7673",
  "customerId": "aeb0fd8e-6e43-44fb-bcae-ccba33c9a4b3",
  "address": "(42262) 대구광역시 수성구 천을로 70 , 105동 1401호 (시지동, 시지월드메르디앙)"
 },
 "f3a5bc4a-b21b-4567-a9cf-27b1d100fa62": {
  "contractId": "34e237bf-9a1d-401f-a93f-b76789bfd5c4",
  "customerId": "7d816968-d9d6-4e6c-bd08-b95a34f5f0b0",
  "address": "(17966) 경기도 평택시 포승읍 포승남로 261 ."
 },
 "edf9c799-eea9-49e4-8c43-f961fa815826": {
  "contractId": "65cec57d-f9c2-40a0-982f-818cfb823bf1",
  "customerId": "e828a432-100f-4d04-916e-f54589b725ea",
  "address": "(13532) 경기도 성남시 분당구 판교역로 100 , 606동 1402호 (백현동, 백현마을6단지아파트)"
 },
 "2072cbf8-1ed0-4fec-8787-86b832abcb9f": {
  "contractId": "6b0edafe-5ed4-405e-868a-008ec404b33f",
  "customerId": "bc2a787a-31c3-473c-9504-a6d39a70ed44",
  "address": "(27457) 충청북도 충주시 신니면 신덕로 726 ."
 },
 "7947a052-2f71-40d4-9b7c-13e213252357": {
  "contractId": "ab07627c-0e5c-4720-940d-2388e7ce59f8",
  "customerId": "0b1d8ba6-e88e-49b7-8002-41a8ee1d714c",
  "address": "(15301) 경기도 안산시 상록구 정재로10안길 4 , D동 302호 (부곡동, 두영엘리시아)"
 },
 "6d2c14b4-7fec-4f90-a142-f55e6345ebe3": {
  "contractId": "ec8d87e4-9f2a-4b51-8871-625db20157f0",
  "customerId": "0e63678f-3297-4d72-b728-6627ce9cde9e",
  "address": "(8251) 서울특별시 구로구 고척로21다길 34-11 , 402호 (개봉동, 이레팰리스4차)"
 },
 "08264580-4d60-46ba-86a0-99b79628b181": {
  "contractId": "2203fbd2-fb6d-492c-a588-4de599ac0960",
  "customerId": "6986d89b-3dbf-44b4-8d67-fa4ae251636d",
  "address": "(13407) 경기도 성남시 중원구 마지로 133 , 101동 401호 (하대원동)"
 },
 "f2b021bc-9c51-40cb-976f-7fb090f3e7cd": {
  "contractId": "0edeac6a-7096-49b7-b384-30b052d33b6b",
  "customerId": "96120739-5375-49ac-8662-35e23e619346",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 40 , 117동 406호 (해군원정아파트)"
 },
 "01840c85-0428-4320-b18a-ab826b47c746": {
  "contractId": "d1c6d89e-a9cf-4c53-92cf-3f83d8ca5558",
  "customerId": "75681924-f07c-4d7b-adde-c2a795e27b5f",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로328번길 21 , 311동 2503호 (화성향남서봉마을사랑으로부영3단지)"
 },
 "ade0ec63-daf9-48c4-b004-094ae1e0e74c": {
  "contractId": "44dbae91-7f00-429e-b446-333e80284cc9",
  "customerId": "35a726cc-e790-4f15-ae63-72f12de7e065",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 , 204동 503호 (포승삼부르네상스2단지)"
 },
 "b250afbd-56be-42f4-99a8-465d12e27fd2": {
  "contractId": "49d11b22-7e2b-4718-ab3d-9bd19a31eeb3",
  "customerId": "49ffb555-fa38-4f1b-98e2-b7a6bd68fef7",
  "address": "(57341) 전라남도 담양군 담양읍 담주2길 16 , 808호 (주창하임피아)"
 },
 "6538622e-d9c5-4f91-981b-ad1a72089769": {
  "contractId": "de4cbd2e-d3e8-4dce-8f9b-82f4d83172c8",
  "customerId": "ce7bcc2e-6539-46dd-beed-96d1b1aea6e6",
  "address": "(12127) 경기도 남양주시 퇴계원읍 경춘북로558번길 12 , 108동202호 (퇴계원힐스테이트)"
 },
 "32f6a830-eaca-4271-9ed9-01a8ba5fef03": {
  "contractId": "fedbba63-2543-4741-b402-091e9369ff93",
  "customerId": "11b2730f-4576-40d7-b994-af61c101c10a",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 112동 801호 (부영사랑으로)"
 },
 "b7d1f3a2-2ac8-4130-b997-244942e45448": {
  "contractId": "194883ee-2bca-4f70-8642-0efbcf0dbb85",
  "customerId": "03056337-486d-4676-9909-2c433bfedf5c",
  "address": "(31530) 충청남도 아산시 신창면 서부북로 933-22 , 103동 301호"
 },
 "c7f02835-7abc-4fac-adb3-06cfc5798b67": {
  "contractId": "95aa017d-89c1-45d7-94bc-0071dc4d3b06",
  "customerId": "cf563f8d-932a-40aa-9c1b-96da9c6fc869",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 116동 503호"
 },
 "582eb86d-334d-4f28-9894-8b729a7ac105": {
  "contractId": "9642e0b3-2673-484f-9133-a7f38dcf2bc2",
  "customerId": "8389b18a-88f0-4359-872e-5cdda8f006a7",
  "address": "(18278) 경기도 화성시 남양읍 안석길 222-6 ."
 },
 "01467676-f2d7-4833-a6ae-dc249c67243c": {
  "contractId": "6063378d-3c83-4eba-a6ca-ae85dba681a9",
  "customerId": "4970b695-dc37-4f94-a938-f81f029a1979",
  "address": "(55764) 전북특별자치도 남원시 서문로 28-8 (왕정동)"
 },
 "cc8450e6-9194-4b70-bedf-d63c061c4e3f": {
  "contractId": "ee3d87a0-1137-4751-8437-296e2b48b258",
  "customerId": "f91da88c-1529-48de-bc9a-b3760f8f2aa8",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 116동 801호 (부영사랑으로)"
 },
 "1d9d2e54-de96-4f47-b4ee-e61091653715": {
  "contractId": "3e4367e8-b9a9-4ef5-985f-04bd0d0d2bc1",
  "customerId": "e635e382-7aaa-4a47-8ec6-3ba9487b2f43",
  "address": "(17941) 경기도 평택시 안중읍 송담6길 46-26 , 202호"
 },
 "ba327772-dbe1-422d-98e1-41c839595797": {
  "contractId": "759e5617-4c3b-4657-af92-042244e3335c",
  "customerId": "01edc7ac-f580-4b4e-8bb9-a24a4820454c",
  "address": "(44747) 울산광역시 남구 신선로 45 , 105동 502호 (야음동, 롯데캐슬1단지아파트)"
 },
 "a12e2ae2-18b8-4b62-b12e-9fd3666bc7f7": {
  "contractId": "ea59ba85-ad9c-4491-ba90-03caa2a616bc",
  "customerId": "ceb55d9e-7a55-4d53-ae22-d81d0c0b10c2",
  "address": "(16420) 경기도 수원시 장안구 화산로 85 , 107동 602호 (천천동, 화서역푸르지오더에듀포레)"
 },
 "695eef12-ca6f-41a2-88c6-014b7281f077": {
  "contractId": "26b0e527-8df8-468c-aee5-f4e0f247c2ec",
  "customerId": "8b406022-f623-4a88-a6f5-654a50506fb3",
  "address": "(2106) 서울특별시 중랑구 동일로123길 73-7 , 202호 (중화동)"
 },
 "d9f900e4-3cd6-4281-b09f-2b257fcc6d48": {
  "contractId": "6d7d13a1-4fef-4cdd-aaf3-d411880c654d",
  "customerId": "c1c2a143-ea03-47a3-95fa-41fecce916af",
  "address": "(49420) 부산광역시 사하구 신산북로 41 , 402동 1701호 (신평동, 사하코오롱하늘채)"
 },
 "4313b0dc-5257-4ecd-84c5-c927c5171cce": {
  "contractId": "fb66487a-e448-4a7c-b770-acb27d7325b3",
  "customerId": "de071152-333c-48d0-b758-77cbff2b987c",
  "address": "(17965) 경기도 평택시 포승읍 포승남로 520 , 105동 203호 (반도보라빌아파트)"
 },
 "f55dfd1d-f893-4ea8-ae57-80161ce773c8": {
  "contractId": "19c93dfb-212c-49ca-a1a5-55a1fa896ea8",
  "customerId": "ecf333c7-5717-4882-964f-bf342bd93d1c",
  "address": "(15540) 경기도 안산시 상록구 반석로 8 , 26동 602호 (본오동, 한양아파트)"
 },
 "4248d077-1661-4cc1-8c55-e5f675b648ee": {
  "contractId": "80ed0a59-39c3-4bed-9905-a21268ec6fa3",
  "customerId": "da04a13e-3920-41fe-bb4d-33c3cfde454d",
  "address": "(7211) 서울특별시 영등포구 선유로 207 , 609동 903호 (양평동3가, 양평동 6차 현대아파트)"
 },
 "92289040-fe4f-41d7-a1a2-d04c087f8a92": {
  "contractId": "5d23f343-1605-45be-9eb9-2d8ebd149deb",
  "customerId": "329eba9e-b4cd-422c-ad3b-b3f2f4c5208c",
  "address": "(15255) 경기도 안산시 단원구 사세충열로1길 4-18 ,101호 (와동)"
 },
 "9de15ca6-36e4-404e-b2d4-12d0385e0536": {
  "contractId": "7384b960-2530-4d20-bb27-4d7702139213",
  "customerId": "e1c2baf5-420c-400d-9125-b4e3c38a8eeb",
  "address": "(28337) 충청북도 청주시 청원구 사뜸로 106 , 107동 1201호 (사천동, 청주사천푸르지오)"
 },
 "8b033afc-f06e-45c2-9cbd-96f1d2fd4861": {
  "contractId": "d1b042e8-8dc9-46a1-b512-c38ffcde568e",
  "customerId": "3a2286ff-66a1-4373-a598-c63d11c04b6b",
  "address": "(17804) 경기도 평택시 청북읍 안청로1길 92 , 504동 703호 (사랑으로부영5차)"
 },
 "f6baac02-d244-4b20-a1aa-624134f719c0": {
  "contractId": "9be3ca92-87b1-4e14-a13c-24b79ac54e8e",
  "customerId": "b2a2234e-54b5-4dce-994d-994080ddbd7f",
  "address": "(18019) 경기도 평택시 고덕로 191 , 1121동 1701호 (고덕동, 고덕국제신도시 금호어울림)"
 },
 "45f5c6c3-53a6-494c-ae5c-83c9363bb0b8": {
  "contractId": "eb1c2d1d-7f29-434a-99c2-da42b9e2f33c",
  "customerId": "3c06a65b-020b-46a4-91ad-d7f13e310589",
  "address": "(16547) 경기도 수원시 영통구 매탄로 82 , 205동 401호 (매탄동, 우남퍼스트빌)"
 },
 "b0f2cfa2-46cd-4a27-beb3-cebd50e5de56": {
  "contractId": "cb1010cf-6ee3-4482-9a6d-f18679397b45",
  "customerId": "ee568a73-8cd8-40bb-92eb-a5063a8afba1",
  "address": "(7004) 서울특별시 동작구 사당로13길 31 , 103동 2103호 (사당동, 두산위브 트레지움)"
 },
 "254e208b-1350-479d-b842-62c161de5417": {
  "contractId": "7569aab0-608c-4391-b862-4477d709f12e",
  "customerId": "0fda8575-16a4-4355-9408-f75be78ed4a0",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 108동 404호"
 },
 "c79f4a74-25b9-42a2-87d1-b0fd81c264b5": {
  "contractId": "f896bd99-cfe5-4ed4-83de-0ffc6a9697e0",
  "customerId": "be6eb431-19ab-4fc0-997d-59212bcce309",
  "address": "(13957) 경기도 안양시 만안구 예술공원로 51 , 104동 2005호 (안양동, 두산위브 더 아티움)"
 },
 "1c041837-1f27-4c19-9e36-f4b6ce88e16a": {
  "contractId": "8fb271ba-1a29-483c-999e-53b93dfe8032",
  "customerId": "613c8c4e-b205-4b51-b23c-11fbfe032fb0",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 103동 806호"
 },
 "3f038a53-9028-44aa-ada5-89d7a3617fe0": {
  "contractId": "93d9fa57-9cd6-489f-80ff-bd1099f3a96f",
  "customerId": "0c380ccc-0da9-4e84-aa9d-5528280d3cd2",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 103동 1304호 (이화마을 건영캐스빌)"
 },
 "ab96e50c-d8d9-4911-82e4-fec4bd49f67b": {
  "contractId": "0cf17a59-a17e-473d-8664-20b6dbeec3a8",
  "customerId": "40db23dc-f768-40d8-8c4a-44b51888c6ec",
  "address": "(18591) 경기도 화성시 향남읍 행정동로 88 , 903동 404호 (향남시범복사꽃마을한국아델리움아파트)"
 },
 "a1c93583-bbf4-4868-9b82-a40b98e8df65": {
  "contractId": "009ab8a6-23d1-4478-af7c-07539f94b555",
  "customerId": "7d3a2b87-7a17-44f8-aa1b-e49345f01f8e",
  "address": "(18613) 경기도 화성시 향남읍 상신하길로 295 , 612동 303호 (서봉마을사랑으로부영6단지)"
 },
 "25716434-99d0-4b17-809d-83da4c9efb37": {
  "contractId": "3a4d8686-f268-415e-915e-f5ab50b0ff03",
  "customerId": "a9b6ef5d-72bb-47f2-8440-a2d25476d647",
  "address": "(17819) 경기도 평택시 오성면 오성북로 306-34 ."
 },
 "faf02ed9-1ee5-44e4-8328-7ff31d9eec15": {
  "contractId": "e84011ee-5b4b-4e5a-b4b0-c86a9a692a0a",
  "customerId": "b4103964-9064-45be-822e-c24de3141762",
  "address": "(21324) 인천광역시 부평구 수변로 333 , 207동 702호 (삼산동, 삼산타운)"
 },
 "537a437a-9599-4ab8-b6b8-513f8755b8d5": {
  "contractId": "d0d3e0eb-c333-4241-895d-33dd26b1136e",
  "customerId": "e1498e3b-d890-43b9-9e52-103dd22c7aab",
  "address": "(17954) 경기도 평택시 포승읍 포승공단순환로 403 , 104동 1004호 (포승삼부르네상스1단지)"
 },
 "aec41501-d298-411d-afba-388817945e96": {
  "contractId": "9d24b057-7a47-4bee-a0a8-6875ddbf082c",
  "customerId": "c1130b4d-1333-41a6-a2e4-bc8eb5055aca",
  "address": "(14704) 경기도 부천시 소사구 경인옛로 13 , 504호 (소사본동)"
 },
 "53762400-7bac-4808-9de1-950e51ff9787": {
  "contractId": "c9fb77cc-4fe4-4609-aaf9-de0e0e541a0c",
  "customerId": "1ed346bc-6676-4877-97ce-ba47356a814e",
  "address": "(15622) 경기도 안산시 상록구 감골2로 47 , 202동 702호 (사동, 요진아파트)"
 },
 "066f66b6-09d1-4928-a806-0f6acd3c272d": {
  "contractId": "429920d2-9834-495a-aeb3-81fc6b293dc6",
  "customerId": "04c60f1a-d2cb-4a17-9361-5d788789eece",
  "address": "(22874) 인천광역시 서구 이음3로 130 , 1201동 702호 (당하동, 유승한내들 에듀파크)"
 },
 "195d2a8e-fd53-431d-ae2c-7ec2c6208d7d": {
  "contractId": "a1279b60-0485-44ed-89ba-9be6034c757a",
  "customerId": "160975cd-6088-4b4a-80a8-ef09d2ca5f0a",
  "address": "(17936) 경기도 평택시 안중읍 안중로 74 , 503호"
 },
 "dd57a4a9-7033-4545-b35d-f781d86ad147": {
  "contractId": "e409d57c-83a0-429d-b8f4-256f1cc3f7b0",
  "customerId": "a2df1c26-6cbe-4722-94ab-7fd12133cfcf",
  "address": "(2757) 서울특별시 성북구 돌곶이로 220 , 104동 2002호 (장위동, 꿈의숲코오롱하늘채)"
 },
 "adad2c0f-19cf-4bae-aa71-785a00973b2c": {
  "contractId": "63c6eeff-ede3-49dc-a28a-b54aac4c534d",
  "customerId": "384c7235-c9d0-4c75-82b0-b3dec681c3e1",
  "address": "(16356) 경기도 수원시 장안구 덕영대로407번길 63-27 , 104동 1506호 (율전동, 벽산블루밍아파트)"
 },
 "224e8520-6dc5-48b6-ab48-a7d1cf0825f1": {
  "contractId": "6cdeb9fc-97d8-4d38-bdab-08c8c7d0a3c9",
  "customerId": "e8a1d0b0-e828-4351-8270-307440f102ff",
  "address": "(21670) 인천광역시 남동구 청능대로718번길 7 , 115동 602호 (논현동, 소래마을풍림아파트)"
 },
 "99fed244-26cb-40b2-b66a-e6a5b21ce4b8": {
  "contractId": "a8776363-bbd1-4046-a680-17691d075db2",
  "customerId": "b83feaf4-075e-4517-b9da-4e026ff3b2ed",
  "address": "(15541) 경기도 안산시 상록구 샘골로 132 , 401호 (본오동)"
 },
 "c95c9d07-d9ba-4262-aede-f1564ee87940": {
  "contractId": "e747a74f-c2a2-417b-8b70-a8c4b78d8afa",
  "customerId": "bfa40fd9-860e-4b30-b722-d3cb107865ee",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 104동 1601호 (힐스테이트 송담)"
 },
 "44ab7bf8-b946-4f33-95da-2f4ad44d0233": {
  "contractId": "e9301724-c655-45df-8185-7a5b657ca490",
  "customerId": "a428064c-6823-4903-87b4-48746df7b4dc",
  "address": "(18577) 경기도 화성시 팔탄면 월문길 53-36 ."
 },
 "676c7f18-6ece-4cd1-9125-d2bf2bfb71e6": {
  "contractId": "5d9f0358-96b4-4418-9205-52478b9fdf58",
  "customerId": "9bf426fa-d21e-4098-9773-60c80d8b7734",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 51 , 911동 902호 (한양수자인아파트)"
 },
 "ef42fe12-dc0a-4ca4-bccf-f281ca452c6c": {
  "contractId": "d6cac865-108a-49da-a1d5-5ebc48b2e3be",
  "customerId": "49669646-fc87-44c7-9afe-b099146016c1",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 85 , 110동 502호 (송담 지엔하임1차)"
 },
 "46f4c0d2-c5d1-4832-9617-04331182c5a8": {
  "contractId": "0984653f-a780-4ba9-ae4d-9cc3b237313f",
  "customerId": "a84d387a-57d5-46c2-a069-10f0a279dc28",
  "address": "(7653) 서울특별시 강서구 공항대로46길 28 , 101동 812호 (화곡동)"
 },
 "74be74ce-67f9-40d0-a07e-9f0fbb05aa19": {
  "contractId": "47b73baa-3adf-4cb8-9b7a-d51fae8fc55e",
  "customerId": "58794166-c8af-451d-abf7-4fbc52f97155",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 101동 1302호 (화현마을우림필유)"
 },
 "d9869a5a-8894-40b5-8abb-e4927dde0c1c": {
  "contractId": "a21101ff-2412-4572-8b4a-15b37cfdbdbd",
  "customerId": "31999f00-d092-473e-a118-a965f9dfc2a8",
  "address": "(17931) 경기도 평택시 안중읍 현화중앙길 103 , 103동 103호 (현대3차아파트)"
 },
 "1f18617f-e27f-465d-b8c3-a387c6071eb7": {
  "contractId": "21e953af-17d3-4baa-9e4f-5c050245bed9",
  "customerId": "06ca1b6f-5152-4bdd-8798-66be03a3e6c9",
  "address": "(2058) 서울특별시 중랑구 용마산로 616 , 103동 1501호 (신내동, 새한아파트)"
 },
 "cc830a37-80a6-4d67-abc4-bbbecbd5340c": {
  "contractId": "477ad8ac-0f66-4de6-8c88-d7b897797aad",
  "customerId": "1aac0a40-2874-4fb1-87b0-ddca74860863",
  "address": "(14950) 경기도 시흥시 신천로68번길 25-2 , 우리주택201호 (신천동)"
 },
 "39ce18ba-af55-4e68-8257-e531ba15bc5a": {
  "contractId": "ef890b68-fcde-4585-9c60-41122de888ba",
  "customerId": "4997bc44-e253-4ce7-95d9-3fd8223a7529",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 110동 203호"
 },
 "cefc656c-4d46-47b8-8d4a-27add3f76f0e": {
  "contractId": "f3cc7506-240f-4c11-83f8-ae60f164af7e",
  "customerId": "49ac6c98-da67-4c4b-a5e1-1cfa4566183a",
  "address": "(17936) 경기도 평택시 안중읍 안중로84번길 24 , 3층"
 },
 "32a16e95-fd7a-4a27-9999-c7150a4bc4cb": {
  "contractId": "d8450fe5-176d-4f1f-ae5d-3eb4c8018a23",
  "customerId": "d7d50bcb-2691-4675-9595-1ef8b2ed1f3f",
  "address": "(17969) 경기도 평택시 현덕면 덕목1길 32-37 ."
 },
 "38fb17ee-9979-4fcb-b5f0-f5b18e05d008": {
  "contractId": "443cf765-b4c1-4be9-b829-9856ecc1c271",
  "customerId": "12ccd1be-32bc-4794-a59f-c70d0be22bd5",
  "address": "(18110) 경기도 오산시 수청로 30-12 , 402호(수청동)(해솔리아2차)"
 },
 "dd6c7a2a-49bb-4455-b082-b9ea358c9c5a": {
  "contractId": "85f99e3a-a05e-4400-b388-952d33954d9f",
  "customerId": "84cecf19-e710-4de2-b62b-61caf1c45727",
  "address": "(15021) 경기도 시흥시 정왕신길로49번길 21 , 203동 404호 (정왕동, 서해아파트)"
 },
 "c7304a8c-e742-4c82-8efa-b556adb3dbb3": {
  "contractId": "fa5c152b-3e8d-49dc-aa6c-30db2c1a74f7",
  "customerId": "d79f885c-100d-4ef5-9996-a93eee64a24a",
  "address": "(41529) 대구광역시 북구 동북로57길 14-2 , 502호 (복현동)"
 },
 "caac75c8-30c2-4d78-bb50-a4c8c8976f03": {
  "contractId": "3ebec4d8-d767-4d94-be14-02a1d3a2bd59",
  "customerId": "dcef06e9-b3fc-4da3-966c-b78a7a5c9ac9",
  "address": "(21457) 인천광역시 부평구 일신로 120 , 107동 1301호 (구산동, 부평자이)"
 },
 "e85a9d92-661c-4662-b440-0255dbef9dc1": {
  "contractId": "94f98180-3780-4688-9ce9-ea6020c6f520",
  "customerId": "d266593a-b258-4ea3-9aeb-107605f5331c",
  "address": "(39463) 경상북도 구미시 산동읍 신당3로 16 , 112동 1303호 (우미린센트럴파크)"
 },
 "07401947-8601-44a3-aa60-54a14387e34a": {
  "contractId": "885ea05d-df44-4093-8a51-dea687b32baa",
  "customerId": "7aaa2729-ab1f-42d3-87f3-b83dcb325ce2",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 215동 1203호 (부영사랑으로)"
 },
 "5aeb7f7b-4fd5-4415-99a4-8c183efc28f2": {
  "contractId": "8e60c3d0-1229-4947-97f0-c358cdcb8bf6",
  "customerId": "99dfe719-6255-4fc3-bf06-abb039b86334",
  "address": "(28796) 충청북도 청주시 서원구 월평로 24 , 811동 205호 (분평동, 현대대우아파트)"
 },
 "857a8694-bb29-432f-8dfd-1372245b9951": {
  "contractId": "e049a1a7-1126-4f6b-9fae-63956f0933c7",
  "customerId": "fd0a2d2c-ef0f-43c1-bddb-4a3d1a7515cb",
  "address": "(10116) 경기도 김포시 풍무로 113 , 102동 1201호 (풍무동, 신안아파트)"
 },
 "845abc3d-6a40-4fa1-94ed-0b71f5462be8": {
  "contractId": "c3d98f8f-3e05-41fd-9c27-3fbbf335212b",
  "customerId": "dba954d0-8cb8-4a2f-8db1-515bde94b5d1",
  "address": "(17803) 경기도 평택시 청북읍 안청로1길 75 , 102동 503호 (유승한내들)"
 },
 "5977555c-422d-41be-9f8a-e63b49181852": {
  "contractId": "9cb8762c-f003-462c-8a17-377000ae75c0",
  "customerId": "ae5e4c65-227a-43f1-9557-d3c40f52031b",
  "address": "(41974) 대구광역시 중구 달구벌대로 1970 , 206동 704호 (남산동, 청라 센트럴파크)"
 },
 "e9fef98e-cd1f-4cda-98b7-19d9e70d4e42": {
  "contractId": "564834a2-0ad0-4f5d-8cf3-8f4997e5f71e",
  "customerId": "ceec81d6-ca92-451a-b4f2-c4a54834c221",
  "address": "(16077) 경기도 의왕시 행복마을3로 18 , 101동 1414호 (고천동, 오봉산마을 1단지)"
 },
 "c01d68d2-8218-49ba-85b0-c6f32a71b482": {
  "contractId": "daea2106-dfcd-48c1-a651-b451de3deace",
  "customerId": "307bf412-feed-465a-8a50-b8d76a976cd9",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 105 , 201동 1003호 (현대아파트)"
 },
 "543cec3e-900c-4928-990e-39c1eaf11c65": {
  "contractId": "f0a9b9bb-4226-4594-9ad7-daa1923cf60d",
  "customerId": "da4aba89-60b2-4f9a-82f2-5d46177648f0",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 110동 405호 (힐스테이트 송담)"
 },
 "f80d7e9b-9426-4a76-959b-d4135a059f7b": {
  "contractId": "bdfde151-1964-4b54-9b30-9afb09fdb4b3",
  "customerId": "786be387-8a5d-4397-a6d7-56047362c6b8",
  "address": "(15885) 경기도 군포시 송부로96번길 13 , 407동 1004호 (도마교동, 금강펜테리움센트럴파크 3차)"
 },
 "f6873d9e-1c57-4230-871d-4fbba9b2f37b": {
  "contractId": "b223bf2b-792d-4ccb-8186-2866aeebb6bf",
  "customerId": "d6dfda58-d8e7-4efc-affa-f8b1cac92aed",
  "address": "(18446) 경기도 화성시 동탄반석로 207 , 210동 201호 (반송동, 동탄시범한빛마을 삼부르네상스)"
 },
 "c1be356f-3c44-43d4-87e0-ed8ca80ec7c8": {
  "contractId": "be0845bc-2264-4a7d-8438-32d2ef506327",
  "customerId": "1aef5d45-4a92-4a6d-91a2-8c0e1d6753a9",
  "address": "(17941) 경기도 평택시 안중읍 송담5길 28-13 301호"
 },
 "19fcdf0d-22e1-4973-82ad-279d0640279a": {
  "contractId": "2547b00e-ae93-418a-9c68-c699a421ca35",
  "customerId": "7485170e-9dd8-4eb3-8f3b-0075c68c4d33",
  "address": "(16631) 경기도 수원시 권선구 매송고색로533번길 7 , 101동 1704호 (오목천동, 태산아파트)"
 },
 "2ab1eec0-4de7-48eb-91f6-c61506e76536": {
  "contractId": "789a8317-ffad-4e98-9fbb-bc6942b5fcbb",
  "customerId": "a4f7f0b7-1d2b-4f4b-be3e-72d12cfc8528",
  "address": "(10120) 경기도 김포시 풍무로68번길 78 , 502동 905호 (풍무동, 김포 풍무 꿈에그린 더 포레듀 5단지)"
 },
 "8600102c-6f96-4e57-9018-daaac7391603": {
  "contractId": "0f1ac14d-2e49-45dd-a31a-7b28d0ce35af",
  "customerId": "fd0bb25a-a7b4-44ae-af9b-90f55191334e",
  "address": "(17834) 경기도 평택시 세교공원로 33 , 304동 1405호 (세교동, 부영원앙아파트)"
 },
 "c0e2fd2a-23d5-4091-b08c-fb4de67bc1f1": {
  "contractId": "45ae6039-8a9b-4710-9d26-c8425358681b",
  "customerId": "8ef38068-9872-4feb-9014-effbbe2610ca",
  "address": "(30124) 세종특별자치시 다정북로 109 , 307동 2503호 (다정동, 가온마을3단지)"
 },
 "5b29abc5-0ffc-494e-a381-59f1c1450d4c": {
  "contractId": "d3f8147c-8c17-4af9-ac0d-2b0f4bea0f89",
  "customerId": "78017ad1-e70f-46b2-b0e0-46696b889600",
  "address": "(17814) 경기도 평택시 포승읍 감기길 69-16 ."
 },
 "f6b3cb46-7392-42b5-99e7-399dd6e51a65": {
  "contractId": "b1b0bb79-edaf-41fc-a1a7-583848749bd0",
  "customerId": "9ab1ecbe-6795-4505-8713-279b8c20c18a",
  "address": "(22165) 인천광역시 미추홀구 경인북길485번길 32 , 111동 501호 (도화동, 쑥골마을아파트)"
 },
 "471513f1-f84d-4000-9977-ce860d8fe26d": {
  "contractId": "0c18bd79-8f1d-4072-8fd3-70c8c7db4dbf",
  "customerId": "d95ca882-5824-4e6f-bda2-e454f6bb4adc",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 106동 506호 (이화마을 건영캐스빌)"
 },
 "b886bb87-42b1-426f-8fd4-0d0eda1c0920": {
  "contractId": "709de5e1-47a0-442d-9fbf-c207d2901af8",
  "customerId": "6d71912c-3026-4829-84f9-1c6b60c6da20",
  "address": "(17954) 경기도 평택시 포승읍 여술로 74 , 104동 802호 (모아미래도1차)"
 },
 "798bec6f-7e3f-4e80-aae8-f74f11c0fdf2": {
  "contractId": "4154f442-8bff-4953-a393-a0f16ee9a3fd",
  "customerId": "eada765f-1012-4de3-ad3a-de48bf9dae0d",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 85 , 101동 304호 (송담 지엔하임1차)"
 },
 "69b2ab43-f3dd-42ba-ba07-182395666c98": {
  "contractId": "8d5127e8-84b2-4eb5-b95f-e9211ad4b3e7",
  "customerId": "bdbef915-d461-42e7-b259-45bce1fb8e84",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 85 , 104동 1902호 (송담 지엔하임1차)"
 },
 "2289efcb-a34e-4a30-80a7-70e227c57e9a": {
  "contractId": "25f51865-c0a8-4186-8751-c6b23ff08839",
  "customerId": "ceb70675-e278-4bd9-b2a9-9805d1a5e2aa",
  "address": "(15079) 경기도 시흥시 공단1대로 263 , 101동 1921호 (정왕동)"
 },
 "5b4a0b87-f874-45a0-9ea0-3cdb44caf96b": {
  "contractId": "5b52335d-7ad5-4362-b58c-527af5ca5fee",
  "customerId": "692e97f1-cc97-4927-a036-7cee70644e3a",
  "address": "(15283) 경기도 안산시 상록구 부루지4길 38 , 302호 (월피동)"
 },
 "2f53a701-a745-4636-bb7e-5c5b5f3485f5": {
  "contractId": "68a9f0a1-a2bd-4cd3-8255-96938d095d7c",
  "customerId": "c07fb9dc-9cdc-4ec8-aeab-d9e611ed6af5",
  "address": "(17941) 경기도 평택시 안중읍 송담9길 39-6 , 202호"
 },
 "eb33505a-fec6-4e63-b937-915681857fa7": {
  "contractId": "86a5fd8b-d9cc-4635-8d6a-2f65de51ac03",
  "customerId": "910bff21-f1c3-4b55-b97e-78c0e6588dd0",
  "address": "(18587) 경기도 화성시 향남읍 삼천병마로297번길 15 , 205동 105호 (장짐마을신성발안2차미소지움아파트)"
 },
 "2fda842c-acfe-4f89-8ad0-bda0c0f8f5a4": {
  "contractId": "5ea5ea54-78f1-4fce-8923-15872ca1f637",
  "customerId": "9245a260-9c89-4471-9d31-135aa843bec6",
  "address": "(39660) 경상북도 김천시 혁신6로 57 , 101동 605호 (율곡동, 중흥에스클래스프라디움)"
 },
 "54d5819b-773d-42fb-acdf-c59b2d2e6c11": {
  "contractId": "1e25c27b-cc26-48d4-a770-466d4b355d30",
  "customerId": "0322e062-bfb4-417e-a86d-8dd2607ffdb0",
  "address": "(17940) 경기도 평택시 안중읍 안중로8번길 58-45 , 103동 1006호 (해동마을 삼익 참드림 아파트)"
 },
 "45971455-0aaf-4d77-ae29-3a0554b1de14": {
  "contractId": "d60ab7f8-fc45-4afa-a3f0-f553393a2daf",
  "customerId": "f5b413c0-d92e-4245-b85a-f97b21805981",
  "address": "(31044) 충청남도 천안시 서북구 성거읍 성거길 152-12 , B동 201호 (아모르빌)"
 },
 "3945887b-4854-4d26-8306-ccfa83cf4c79": {
  "contractId": "b7dc221d-d02d-4223-94cc-dfdfe50f416c",
  "customerId": "552bcc32-1aa7-477b-8df6-76b03c1b8e2c",
  "address": "(15251) 경기도 안산시 단원구 화정천동로2길 18 , 401호 (와동, 샤인캐슬)"
 },
 "cd4267c9-7a36-4ba9-9a05-7b08e588adda": {
  "contractId": "3e6408c9-4cc1-4323-a248-6a5dda98bef2",
  "customerId": "cd9b7d6d-9d15-4a0c-bc23-2c668e7fdf55",
  "address": "(17564) 경기도 안성시 공도읍 진사길 27 , 107동 1206호 (안성공도 우림아파트)"
 },
 "200c188c-b61e-4530-8187-56f56a3d26a5": {
  "contractId": "b74fa74c-9ebe-478e-8d8a-41ed169dae4c",
  "customerId": "77c3c2f3-ccae-4b57-a534-200d36242209",
  "address": "(12814) 경기도 광주시 도척면 진말길 28-23 , 110동 102호 (화이트하임)"
 },
 "1129f40b-9bd2-4b32-93c7-92ab9ef77320": {
  "contractId": "45c0a66e-fc3b-44aa-8b7f-7976e05b1e6d",
  "customerId": "bcb4e115-b7ff-4d2e-979f-68023ac86b84",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 106동 1704호 (화현마을우림필유)"
 },
 "7a2c4f14-1690-4509-86b3-a31e85b33a41": {
  "contractId": "a94787fe-2cc1-4746-8a2a-c95ce3ca8d51",
  "customerId": "926b987e-8c7d-4431-a67f-2ae1b4ae59d0",
  "address": "(18028) 경기도 평택시 지제동삭1로 163 , 106동 401호 (동삭동, 더샵지제역센트럴파크1BL아파트)"
 },
 "c5602697-1fc9-4712-affe-a0ede2b4f008": {
  "contractId": "b4f020bd-9166-4491-be9e-a90698d54b7a",
  "customerId": "a8d1b799-4c3a-46cf-9cd3-44baee05ac15",
  "address": "(15002) 경기도 시흥시 장곡로49번길 6 , 302호 (장곡동)"
 },
 "cfa740fa-d8f4-4157-b781-26dda35ecc2a": {
  "contractId": "f1f44f85-ce92-4328-93d1-d4c6ce2836df",
  "customerId": "7367c99b-c4de-4ce9-8233-205a08711997",
  "address": "(13239) 경기도 성남시 중원구 희망로344번길 27 , 지층 비01호 (상대원동, 정립맨션)"
 },
 "defcf897-8d9b-46e6-9615-45e934e3b49e": {
  "contractId": "5dcc95e7-1946-4f0f-8172-fd5e568805c5",
  "customerId": "608cc9a3-dbc4-4010-919a-e95cda5c9fd2",
  "address": "(15553) 경기도 안산시 상록구 오목로3안길 21 (본오동)"
 },
 "ae24aee1-ed2e-4ea1-b5ad-1a29978ee1ba": {
  "contractId": "5439f567-31a3-4207-a008-51021dff92d0",
  "customerId": "c563d051-c107-43cf-a76f-5e21be170fa6",
  "address": "(6604) 서울특별시 서초구 서초대로55길 7 , 502호 (서초동, 로자리움)"
 },
 "eb367ac6-d50b-4c5a-91ec-d663968c7bc5": {
  "contractId": "714bbf6f-7480-4c24-9e2b-1fe479456dd2",
  "customerId": "43067af4-be9f-49cd-a59c-d64e71d1b043",
  "address": "(21016) 인천광역시 계양구 장군봉길 12 , 103동 703호 (귤현동, 귤현아이파크)"
 },
 "5de922b6-a9e7-40fa-96c4-bad3d6695518": {
  "contractId": "4217c5eb-13d0-4006-b9bb-a0fddc558fac",
  "customerId": "3c4e91f2-29f8-4466-a125-5a068d676f7c",
  "address": "(61086) 광주광역시 북구 첨단연신로 217 , 113동 1901호 (신용동, 첨단2지구중흥에스클레스)"
 },
 "bf4ba32e-dbe0-4a0e-915f-3ab376fa0143": {
  "contractId": "b2c79848-21f7-4b5e-9e4f-e0ae5399e7fb",
  "customerId": "d2b7417b-0e44-474a-adea-6764a182e3e0",
  "address": "(7979) 서울특별시 양천구 목동서로2길 22 , 103동 1008호 (목동, 한신청구아파트)"
 },
 "9605efd3-cca2-4619-9b4f-92dc9bcdd1dc": {
  "contractId": "218c56df-830c-42c9-a61a-60c3741f79b3",
  "customerId": "09d645b7-a720-4f04-a675-19c57fd4fb29",
  "address": "(17936) 경기도 평택시 안중읍 안현로서3길 47 , 303호 (비젼타운)"
 },
 "a529ce6e-bfdf-4ee9-b915-0bc1bf36f69e": {
  "contractId": "829bf869-c493-4cbb-b0f4-5084b86c8c47",
  "customerId": "cd200c84-7fcd-46b2-a0e9-4f1932174002",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 108동 205호 (화현마을우림필유)"
 },
 "0ef372bd-f434-4186-a2d9-538b6e641e15": {
  "contractId": "0a243d46-d837-4605-9877-5a3cfa563f01",
  "customerId": "c1c65a0e-f81b-475e-ada0-3f54239e7619",
  "address": "(22706) 인천광역시 서구 서곶로 452 , B동 601호 (공촌동, 오륜아파트)"
 },
 "eba1ef76-58fd-4a01-9054-f2b9538f0c27": {
  "contractId": "38ae166a-781b-4b09-8046-f17ef09da62d",
  "customerId": "abc54f22-5ea1-40e2-9fed-764c04a8c297",
  "address": "(11117) 경기도 포천시 일동면 사리재2길 4 ."
 },
 "ba2bea53-103b-46d8-848e-9c94a69d7de7": {
  "contractId": "6f93d2eb-a010-42a8-bac8-8a1051bd116e",
  "customerId": "25247aca-0aa6-4abb-b4af-d025e230cdc0",
  "address": "(17933) 경기도 평택시 안중읍 안중로117번길 17-11 , A동 303호"
 },
 "f5643f19-f058-4fc1-b634-598c1e9a5b9f": {
  "contractId": "e5f6f651-ce16-4b2e-9aa6-bb19a55d2cf6",
  "customerId": "84de0fec-0c2b-459a-b515-0c5ba0f2ad2f",
  "address": "(18593) 경기도 화성시 향남읍 배터길20번길 37-10 , 204호 (풀하우스A동)"
 },
 "c28b6feb-d738-47f0-8c4f-fa45044a82d9": {
  "contractId": "885b6dde-d454-4dc4-acf3-58305b0976dd",
  "customerId": "e360bbfe-8cdf-4882-9c39-57bf7e6063e2",
  "address": "(16687) 경기도 수원시 영통구 영통로 111 , 302동 102호 (망포동, 엘지동수원자이아파트)"
 },
 "d74ea072-5137-4d19-a8c9-1df06a62992b": {
  "contractId": "c043b909-0b7f-473e-8910-8db609844310",
  "customerId": "bdbf0f73-523a-4d59-a191-24c70b9b5cb9",
  "address": "(4747) 서울특별시 성동구 고산자로4길 34 , 302동 601호 (응봉동, 서울숲리버그린동아아파트)"
 },
 "fcd23f07-fb5a-4edd-986a-f0e059635827": {
  "contractId": "f72e9937-b79c-491e-987c-10c6b2bda3dd",
  "customerId": "bc162403-c4c4-4ebe-8b6f-b168699824f7",
  "address": "(5057) 서울특별시 광진구 자양로13나길 16 (자양동)"
 },
 "e4dcaa82-b53d-4f5c-a021-a89ab911d152": {
  "contractId": "fddbecf8-1df6-4a6b-b18c-c88dceec27eb",
  "customerId": "358f0e3a-d81f-4e42-8c44-fe462996b192",
  "address": "(16866) 경기도 용인시 수지구 용구대로2790번길 10 , C동 304호 (죽전동)"
 },
 "ca54e287-33e1-43fa-8fe8-e5e0e460cbd5": {
  "contractId": "534391e2-dfce-402e-9ef2-ffecb4324eda",
  "customerId": "d2c624f1-33ca-40be-a244-431314e7c151",
  "address": "(4612) 서울특별시 중구 다산로39길 59-4 (신당동)"
 },
 "31c39400-5665-468b-8b16-cd89a90a3675": {
  "contractId": "4b67f9b8-4125-4560-9b35-931bd8444138",
  "customerId": "1de35e8e-2563-419c-95c9-66e2bc235c17",
  "address": "(5377) 서울특별시 강동구 양재대로97길 53-11 , B01호 (성내동)"
 },
 "9d6b5a1f-397e-4180-8832-f65ae4adfcbe": {
  "contractId": "25c46730-b527-414b-92a5-560cc2da09d5",
  "customerId": "9ecf43e3-80a7-40b5-9594-cb5360b9bf60",
  "address": "(17955) 경기도 평택시 포승읍 여술3길 50 , 401호"
 },
 "2def40b6-fab2-4441-aa5d-c688dd6d8be1": {
  "contractId": "6932b53b-dcd2-4447-9f0c-c26f22911a95",
  "customerId": "37749359-c0c8-4f92-88bd-d6ed400f2553",
  "address": "(21443) 인천광역시 부평구 열우물로 90 , 107동 3003호 (십정동, 더샵부평센트럴시티)"
 },
 "12ae999f-9e79-498e-a6d6-753fd9ce54df": {
  "contractId": "363a8c81-3337-46f3-b80e-7efaa6a1eb6a",
  "customerId": "b0679fee-f545-439e-bfad-c1791a1830c7",
  "address": "(12116) 경기도 남양주시 퇴계원읍 퇴계원로 141 , 101동 1603호 (금호어울림)"
 },
 "a4182268-e49f-4818-bbad-a88da44fce6d": {
  "contractId": "b97b19f5-158e-42e9-a203-0d4d458bd716",
  "customerId": "2f5d1d6f-a64f-4468-89c7-4b3482d8f2fb",
  "address": "(15033) 경기도 시흥시 정왕대로143번길 32 , 414동 503호 (정왕동, 주공4단지아파트)"
 },
 "d1f54765-245d-41e9-b532-7cc5e273cf55": {
  "contractId": "94951719-926f-44b2-aa21-ed8cd0f0b83a",
  "customerId": "9e9d7126-6689-43cc-adb7-517f6bdd7728",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 40 , 114동 203호 (해군원정아파트)"
 },
 "3b07c630-f8c1-4f61-a1e7-27cc7bcad635": {
  "contractId": "17d90dc3-3ed6-4dc0-a278-409795ec3a36",
  "customerId": "51b5db73-1a56-43d6-9a86-32c152c84de6",
  "address": "(28792) 충청북도 청주시 서원구 1순환로1137번길 129 , 206동 1806호 (분평동, 주공2단지아파트)"
 },
 "cba80140-8a90-4d97-9c42-434ef0a7cceb": {
  "contractId": "b1feed08-b8c1-462b-91be-a2d84890a1cc",
  "customerId": "05227f9e-fc8a-437e-aa31-2f02fea8f383",
  "address": "(18473) 경기도 화성시 동탄순환대로24길 101 , 424동 101호 (영천동, 동탄2LH4단지)"
 },
 "467de98a-2642-4cd8-91df-3d9c14153216": {
  "contractId": "5bf3003b-f4c5-4a0d-9a1c-3b798062efba",
  "customerId": "d4f8f1ad-270d-4edd-9d9b-abcc3b3ba09c",
  "address": "(16395) 경기도 수원시 권선구 매실로 61 , 202동 712호 (호매실동, 삼익2차아파트)"
 },
 "5d4145a2-aef2-45c9-97d4-dabdc6dfdc5b": {
  "contractId": "801be069-6907-4d4a-bdb9-6b17918b0faf",
  "customerId": "9469b6d8-b85d-48de-bc77-25663d834a52",
  "address": "(14984) 경기도 시흥시 동서로 1079-2 , 1동 305호 (조남동, 장미빌라)"
 },
 "d601e373-d2fb-404a-9348-9df4f390b575": {
  "contractId": "b04c8257-5dfb-493e-a10d-5029badae5f8",
  "customerId": "fea66252-bd81-483d-a405-3b7034a46003",
  "address": "(13938) 경기도 안양시 동안구 관악대로373번길 21 , A동 201호 (관양동, 선일하이츠빌라)"
 },
 "cfbcdd48-1638-4744-8e39-d05b92965357": {
  "contractId": "9cbd5089-7083-4fe2-8533-87f652e35c67",
  "customerId": "011a3cde-0026-4e6d-af2a-98e2cce1d47c",
  "address": "(1704) 서울특별시 노원구 노원로30길 58-20 , 402호 (상계동, 피스플하우스)"
 },
 "68319a09-2aa8-48bf-8ab9-def34bc7b025": {
  "contractId": "92b6f38b-4b08-4cf4-832b-5a6fa027b973",
  "customerId": "1a35670b-2d3f-4188-8f0f-682a98820369",
  "address": "(8251) 서울특별시 구로구 고척로21나길 48-80 , 3동 401호 (개봉동, 창동아파트)"
 },
 "ff21ba05-a6a5-4977-9d14-d37b6457cc51": {
  "contractId": "b8fd1162-c505-43d0-97c0-c3dc3d15cc78",
  "customerId": "5b3ccaad-ccb6-4aec-b359-67484a4d1ab2",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 104동 502호 (이안평택안중역)"
 },
 "4c240ef2-47c6-43f1-84dc-e6dcfa52737d": {
  "contractId": "e5e3b6ba-a637-4603-9b47-c117750cb1ec",
  "customerId": "786f14a0-df0c-46a7-9aff-b9e5e1e2a723",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 105동 1404호 (서광미소마을)"
 },
 "2c34a7eb-88c1-4eb2-86b2-27f8b06b9c12": {
  "contractId": "8f678ce7-3f17-41b9-93f8-23cbc7c0aed4",
  "customerId": "34b5a510-ea46-455b-885f-c103874fc308",
  "address": "(28776) 충청북도 청주시 상당구 중흥로 24 304호 (용암동)"
 },
 "2f7563cb-540e-4793-a6ef-bbc13710faf6": {
  "contractId": "1418398f-bad5-44fb-a2b1-f31240bca2e5",
  "customerId": "9355979a-7817-49d4-9e43-a75eb465a917",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 111 , 301동 1303호 (현대아파트)"
 },
 "df3f0e80-7b95-4a66-a1dd-10a46dbbd782": {
  "contractId": "92e8f1eb-df7e-472f-a712-42ba4ddaf62a",
  "customerId": "6d797404-cb88-4822-84ad-52d0dc42333d",
  "address": "(7599) 서울특별시 강서구 마곡서1로 111-11 ,508동 803 (마곡동, 마곡엠밸리5단지)"
 },
 "177af60f-80e5-437f-af6d-00c668cd682f": {
  "contractId": "7f98ad6e-4b56-4af6-8de0-5477df2c802c",
  "customerId": "c94c31ba-beca-48e9-b9ca-359f0636d6f5",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 40 , 117동 1105호 (해군원정아파트)"
 },
 "2984aa3e-19cb-4549-ba2d-549c248380c1": {
  "contractId": "a290934b-0f4f-4776-915d-3af5343b6f79",
  "customerId": "a6f827df-ebbb-4f7d-a21a-47e8a132a88d",
  "address": "(8707) 서울특별시 관악구 관천로16길 54 , 306호 (신림동)"
 },
 "76284508-0946-4575-82dd-5e03a4d083f8": {
  "contractId": "836ca805-67e9-496d-afe1-e68a61982013",
  "customerId": "153079b5-3768-4117-9efa-bbb6ad0dff87",
  "address": "(27856) 충청북도 진천군 덕산읍 합목3길 27-3 , 303호"
 },
 "2823fd6f-e071-4932-941e-08ad50338161": {
  "contractId": "75147d49-27dc-406b-ab05-4b93ea640b66",
  "customerId": "6ce0fd31-48bb-426a-b6e9-eb9606ceffc2",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 203동 502호 (부영사랑으로)"
 },
 "872d6965-f554-4e0f-8799-ffb8b32ded1d": {
  "contractId": "d015b124-ce78-447c-91b6-d80083488368",
  "customerId": "1894ca1c-bb30-4d62-990a-e4f5415a7e5d",
  "address": "(17814) 경기도 평택시 포승읍 용소길 7-16 , 101동 808호 (한라파인빌)"
 },
 "19790c67-643b-4d23-8331-c590b1a402dc": {
  "contractId": "15ff1a89-ec7e-4324-a29b-48b361df736f",
  "customerId": "fb62be7d-275c-4cc7-add0-b42fe4245938",
  "address": "(18522) 경기도 화성시 정남면 계향문학길 5-13 , 2층"
 },
 "110410e4-f512-4468-bb78-f30ccd2c0895": {
  "contractId": "98d9a5b0-171f-4d37-953e-18c97b87a450",
  "customerId": "54e5853b-0489-41d6-b711-ff6ef6e7fac8",
  "address": "(18611) 경기도 화성시 향남읍 상신하길로274번길 21 , 703동 504호 (화성향남서봉마을사랑으로부영7단지)"
 },
 "4bb64a86-92a0-4705-85b5-8daa8008e5e5": {
  "contractId": "29f47964-9a92-4894-9ca4-14acc3451d9c",
  "customerId": "cceaa649-70d3-4a3a-899f-2167278de33a",
  "address": "(11479) 경기도 양주시 독바위로 433 , 109동 201호 (옥정동, 대성베르힐옥정더센트로)"
 },
 "dc8d73bd-4343-4983-86bc-3623b59c3b7c": {
  "contractId": "99cd9396-b28d-4c3b-87ad-42643b0b6443",
  "customerId": "0c45d1ca-0fcd-48c2-af7e-3130c2703cfb",
  "address": "(17942) 경기도 평택시 안중읍 송담1로 70-57 , 111호"
 },
 "e8005b1f-be6c-4343-90be-25bce18d803e": {
  "contractId": "dafc358b-7f33-4276-baf2-d26a5a00ed30",
  "customerId": "fa118fa5-c613-4f89-9885-c238f9acea69",
  "address": "(31561) 충청남도 아산시 외암로 1247 , 106동 1005호 (장존동, 장존청솔아파트)"
 },
 "5921c5f8-8af3-4e3f-9a79-d1dfc6c96cdf": {
  "contractId": "1cf3f39f-97bc-44ae-8ce5-58e913c82aa3",
  "customerId": "2f275246-c394-4cd9-bf96-5475e8e3d590",
  "address": "(17964) 경기도 평택시 포승읍 허멍굴길 25 , B동 201호"
 },
 "e9796147-62f4-4b10-a521-f0ea81ead400": {
  "contractId": "20d47128-0a3f-48c6-93eb-b9882bfb6a30",
  "customerId": "d35b6a6e-d63f-43ec-b0c2-9aff76054bd1",
  "address": "(7953) 서울특별시 양천구 목동중앙본로27길 26 (목동)"
 },
 "25295e6b-9866-432e-a870-6f2653c2b5dc": {
  "contractId": "9cd134df-84f2-4571-b64b-ea089ac78b12",
  "customerId": "b2f3c827-d602-49d1-a793-4f5211ae6f75",
  "address": "(10865) 경기도 파주시 청암로 82 , 1402동 1802호 (다율동, 운정신도시 푸르지오 파르세나)"
 },
 "9f840671-2ae3-4556-80f8-b960e38ab5dd": {
  "contractId": "ba3c5a37-906a-4038-aaee-d4b8be06dbcb",
  "customerId": "8cb82168-d85b-4bd4-bdb2-2c3a6ff31495",
  "address": "(18473) 경기도 화성시 동탄순환대로24길 101 , 424동 101호 (영천동, 동탄2LH4단지)"
 },
 "a26c9f63-da12-4ec1-98fb-9b8a0e5e5604": {
  "contractId": "1ac03d2b-53ac-4388-9c5d-86a23d685b4c",
  "customerId": "ee868f38-d407-4d44-abf0-8a6d11170176",
  "address": "(36750) 경상북도 안동시 강남1길 98-23 , 306동 203호 (정하동, 현진에버빌3차)"
 },
 "b6bdc360-9e62-458b-89d6-3ae3672d2c54": {
  "contractId": "fb8df3f3-c138-40a8-9bb9-68e974c8fd6f",
  "customerId": "ef25885c-3916-4dc8-a7a9-8c49c009ca8b",
  "address": "(14743) 경기도 부천시 소사구 경인로26번길 22 , 108동 202호 (송내동, 송내 자이)"
 },
 "31e03b14-b6e0-44f4-9ec8-a5f13838da1e": {
  "contractId": "2a636088-11ed-4cbe-a460-996e9b1e176c",
  "customerId": "c7043b23-01d0-4593-9538-221a242edc8e",
  "address": "(17732) 경기도 평택시 이충로 60 , 104동 408호 (이충동, 이충마을미주3차아파트)"
 },
 "5693e1d0-cb61-4602-ae17-1ba95dcf7209": {
  "contractId": "01639b9b-a4bd-41aa-baea-fbd07cae4b8c",
  "customerId": "2df87e0b-79bf-4830-9be0-124f00113083",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 212동 303호 (부영사랑으로)"
 },
 "61cd3667-dd27-435d-ada7-4eec1baa1cc7": {
  "contractId": "11b589bd-da3e-4f4d-8b0e-2d4d5470a21c",
  "customerId": "f17230e0-9260-4302-8d15-b93d74ae7d52",
  "address": "(17965) 경기도 평택시 포승읍 승학동길 25 , 202동 902호 (명지미래힐아파트 2단지)"
 },
 "869900d9-7d76-448b-aea7-25e025fb9ce6": {
  "contractId": "7253883b-e31c-449e-ba52-f03664106c60",
  "customerId": "c4dabc69-954c-4acf-a0d0-7b278773e0ef",
  "address": "(14755) 경기도 부천시 소사구 호현로 483 , 1101호 (소사본동)"
 },
 "ceadd803-aa41-4fc7-9607-591c6b1e2fc8": {
  "contractId": "b1f38006-0aea-4bff-849b-d9e3fad966d8",
  "customerId": "859d75e8-b88b-4922-bfa6-354ca8f68e69",
  "address": "(17941) 경기도 평택시 안중읍 송담9길 49 , 401호"
 },
 "e1ebab1b-52c2-4331-91de-4a75e5efcb7d": {
  "contractId": "a7769db7-ff5c-4307-986f-4dc1eddf1eb3",
  "customerId": "d57b21eb-d4de-40af-8976-7ef450eb6948",
  "address": "(14957) 경기도 시흥시 신현로38번길 23 , 1동 607호 (포동, 태산아파트)"
 },
 "f4020b06-6633-4390-9280-6fa720b03ec7": {
  "contractId": "3e9658df-369d-4fc2-8df7-cd8f2f8acf1e",
  "customerId": "62dcc3b6-ae51-4f65-a790-0ee0a5da043e",
  "address": "(31125) 충청남도 천안시 동남구 원성25길 2 , 201호 (원성동, 행복빌리지)"
 },
 "563debd0-1908-461a-a9c5-4d5a8b6bc830": {
  "contractId": "e97bfe3d-766c-4579-a571-be401e78c200",
  "customerId": "b81b8a87-4164-4e1a-8aff-3cb7566d851f",
  "address": "(18338) 경기도 화성시 효행로291번길 26 , 103동 403호 (기안동, 신일해피트리)"
 },
 "f8c5744d-84ae-404b-a80a-42c1e6a5a1c3": {
  "contractId": "941a9e12-8dce-42eb-839f-99f336d0a61f",
  "customerId": "599c064a-6d10-4d28-b5ca-26b5366e209b",
  "address": "(17816) 경기도 평택시 청북읍 안청로6길 74 , 130동 102호(세인트캐슬)"
 },
 "9a75ac01-45b4-4c3a-aa07-f031f7651dd7": {
  "contractId": "2ece0a16-0812-4601-8ec3-541cc850d865",
  "customerId": "763a3dcf-5f93-42e3-88bf-d5974c0c6c85",
  "address": "(17760) 경기도 평택시 송월로16번길 37 , 3층 (신장동)"
 },
 "a927347a-76da-4780-b551-0eda11e01f3b": {
  "contractId": "c7381192-3b80-4cf3-916c-e38f02712f0d",
  "customerId": "3d0c2fd6-3760-4aee-8b70-8b44db6a6dab",
  "address": "(4595) 서울특별시 중구 다산로 32 , 7동 904호 (신당동, 남산타운)"
 },
 "058626b7-02cd-47cb-a54a-e50896fbdd4b": {
  "contractId": "22a950b8-df9f-4517-b2b9-7db4db107612",
  "customerId": "c9449406-6210-432b-91f3-371eb5b5bf64",
  "address": "(10116) 경기도 김포시 풍무로 113 , 103동 1506호 (풍무동, 신안아파트)"
 },
 "411493e4-1138-47e4-acaa-5813e9ba239a": {
  "contractId": "b74add1a-67d5-443f-82ea-1a5e2d8ecb2d",
  "customerId": "b098ff2e-c432-4faf-84c2-3f2b76e99945",
  "address": "(17942) 경기도 평택시 안중읍 현덕로 7 , 102동 1506호 (신창아파트)"
 },
 "65c35d51-8fdd-4955-b4d0-869739792442": {
  "contractId": "51c4326a-b77d-4fb3-9084-9c8266de994f",
  "customerId": "d36a53a3-4461-4108-bf06-51d3b23bcb81",
  "address": "(17973) 경기도 평택시 팽성읍 내리길 124 , 219호"
 },
 "559915f9-de8a-41f9-bb52-b711cf16cfce": {
  "contractId": "eb67cd99-d072-47eb-a482-e082e8580568",
  "customerId": "16e63dcb-ac1f-4858-8318-831fd58e2ca0",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 110동 908호 (늘푸른마을)"
 },
 "9ec75a77-68a7-413a-84dc-8b244b51894e": {
  "contractId": "63ee1b8b-dcf8-4516-993f-02566f69fc60",
  "customerId": "6c10980e-da9c-40c6-9475-4ca73ecb2f6b",
  "address": "(17932) 경기도 평택시 안중읍 안중믿음길 31-1 , 206호"
 },
 "6ce8c0d4-a90f-4612-b800-1aecf35597b5": {
  "contractId": "ef9f1d50-d0ad-4e26-9324-5fbebf7cb39a",
  "customerId": "e7f072fa-3e5b-4e44-ab3d-a887db7d0618",
  "address": "(4795) 서울특별시 성동구 광나루로 242-12 (성수동2가)"
 },
 "b2bbf474-1a0b-46f9-8a47-c6b113d540a8": {
  "contractId": "54cbcb11-a33c-42a9-87ec-79d3bf5ec153",
  "customerId": "a7abf48b-1312-4818-b152-838718beed7e",
  "address": "(16603) 경기도 수원시 권선구 탑동로47번길 37-8 가동 102호 (탑동, 다림빌라)"
 },
 "495056c7-8c86-45d3-b310-d3bd9f687610": {
  "contractId": "4deb5a3a-c71c-486a-a099-2919cfa69b0f",
  "customerId": "8857fe07-df14-486f-bfc7-1652d560e8a6",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 102동 102호 (늘푸른마을)"
 },
 "ed94fd32-7f4f-4e43-8971-b2530f418351": {
  "contractId": "246ca068-2f5d-482a-a57c-6158798d3b23",
  "customerId": "3a29835e-2f6f-405e-bfb7-f1687952d639",
  "address": "(16377) 경기도 수원시 권선구 당진로31번길 16 , 205동 204호 (당수동, 한라비발디아파트 2단지)"
 },
 "a041d4ad-6bd8-4cd5-9867-afa2a086039f": {
  "contractId": "7fdad24e-c630-47fa-9d98-369a3cef8d49",
  "customerId": "6b73ac99-5e62-4710-83c5-4b0f9bf2fe26",
  "address": "(18025) 경기도 평택시 신촌3로 12 , 208동 2404호 (칠원동, 평택지제역동문굿모닝힐맘시티2단지)"
 },
 "ba647e50-3285-4b36-a794-614ac492b3ac": {
  "contractId": "dbd2a50b-de29-4a8b-b129-303bf46040a0",
  "customerId": "06e268b1-6dc4-42d8-aee1-51a04eaae577",
  "address": "(18577) 경기도 화성시 팔탄면 3.1만세로771번길 61 ."
 },
 "c6c83766-716c-45a5-937b-6a48f09fc8f0": {
  "contractId": "3651fb0f-1385-45bf-96bd-d0b70e606ae9",
  "customerId": "64927e6d-84ca-48b3-a9a9-9f869a1a23d2",
  "address": "(17804) 경기도 평택시 청북읍 안청로1길 92 , 505동 1004호 (사랑으로부영5차)"
 },
 "33180454-49d9-4e5d-bb8d-571f1afb04c9": {
  "contractId": "33e02a38-adf4-4724-8453-0d48909a213b",
  "customerId": "47141764-6cb4-45d8-b9d3-f0e3258d4f97",
  "address": "(17825) 경기도 평택시 은실5길 63-1 , 33동 201호 (세교동, 장미타운)"
 },
 "57ccc845-7841-45f6-bad2-3bbc31511c24": {
  "contractId": "407729bc-fa30-481b-8a98-86546750ac69",
  "customerId": "f1849993-2eee-4956-b66f-87b5f4bce869",
  "address": "(17941) 경기도 평택시 안중읍 송담6길 47 , 202호"
 },
 "27ea5fb9-1376-4ffb-9f28-aa422d7396a9": {
  "contractId": "4eb8f3fb-a7e3-4824-a5ac-f3a44ab74dc9",
  "customerId": "6aa5bcf4-d24a-4089-a70e-520e368c9278",
  "address": "(22543) 인천광역시 동구 샛골로171번길 35-3 , 201호 (송림동)"
 },
 "fb96d9b4-99a4-4e21-a4e3-a82d21e2f1bf": {
  "contractId": "810215d1-52e1-467f-bf5c-b4097c8f56bb",
  "customerId": "10c91d6b-2a6f-4074-ac89-6ec636df19b6",
  "address": "(38662) 경상북도 경산시 펜타힐즈2로 40 , 202동 2004호 (중산동, 펜타힐즈 더샵 2차)"
 },
 "eab5d40a-8d3d-40f6-872b-c68524be8588": {
  "contractId": "7106eb4b-6f61-4da5-a232-0f1f484ee26d",
  "customerId": "765e3c4a-5ffb-420b-8f04-7bce6c8a69d1",
  "address": "(2460) 서울특별시 동대문구 이문로3길 16-2 , 402호 (회기동, 동일스카이씨티아파트)"
 },
 "72cd6105-4f65-4a5e-aa92-206b692fa489": {
  "contractId": "6d822963-33ce-4910-965d-5685ae8d9b1b",
  "customerId": "95b05a4e-43cc-4ad6-a8df-ea0143454138",
  "address": "(15372) 경기도 안산시 단원구 선부광장남로 17 , 101동 2101호 (선부동, 안산라프리모)"
 },
 "85ae7849-1363-46fd-b822-bd6f51416b27": {
  "contractId": "35fbfe2b-6fb0-4f04-8e9e-dc72a5b6767c",
  "customerId": "541631af-387c-47fd-a213-076283f563af",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 103동 1903호 (화현마을우림필유)"
 },
 "e5d14a9c-0452-492a-83a0-95ffefbc969b": {
  "contractId": "45d15d93-edb0-4a5d-9cc1-b34ec2812b20",
  "customerId": "195eb9b0-2d7c-41f0-92d6-a8df76c836f3",
  "address": "(16298) 경기도 수원시 장안구 경수대로994번길 46 , 104동 601호 (송죽동, 희훈루체팰리스아파트)"
 },
 "0d525174-a731-4429-b17a-c93052e247f2": {
  "contractId": "339e0a1e-a87f-4a1d-b8c0-bb4ca6efc3de",
  "customerId": "810b507f-9934-493a-ab46-96ad1c7ec722",
  "address": "(5777) 서울특별시 송파구 오금로64길 17 , 302호 (거여동)"
 },
 "ff9182e3-87b2-4556-ad7c-ac2dd69d5dfc": {
  "contractId": "445aa991-5598-41c0-8a50-6d5f6143a7d5",
  "customerId": "0441b9fc-b582-4b5e-8cd5-943c79b045ca",
  "address": "(15463) 경기도 안산시 단원구 광덕3로 201 , 305동 403호 (고잔동, 안산고잔3차 푸르지오)"
 },
 "b1942560-cfac-4b5e-8581-2a0b45693bfb": {
  "contractId": "25d48d88-a6a4-404b-acd9-c6fa4b098527",
  "customerId": "98eeaaba-0a82-4035-851a-8cf1075a3232",
  "address": "(18613) 경기도 화성시 향남읍 상신하길로 295 , 607동 2304호 (서봉마을사랑으로부영6단지)"
 },
 "ca66c814-b218-4d9c-9064-d7876d8826b8": {
  "contractId": "9c440e43-754a-45ba-bd0b-973c68706d87",
  "customerId": "01f84500-1686-4545-99b7-0bf6e249623d",
  "address": "(21119) 인천광역시 계양구 주부토로363번길 27 , 104동 903호 (작전동, 동보아파트)"
 },
 "41948801-75d4-474b-a391-05b799f8ac94": {
  "contractId": "74eb6bf3-74dc-400d-8134-c068c505a00b",
  "customerId": "d3462749-e5cb-42ee-b07a-3ee65954ec2d",
  "address": "(8533) 서울특별시 금천구 시흥대로145길 29 , 505호(로젠빌라) (독산동)"
 },
 "528f1160-51ae-4a4f-b62f-97992cbb2685": {
  "contractId": "e95ee355-2fa8-4687-bab1-995d7ff83d60",
  "customerId": "badcf1e9-492e-4f4c-be26-0852f1e13e59",
  "address": "(17802) 경기도 평택시 청북읍 청북남로 365 , 112동 904호 (브라운스톤청북)"
 },
 "e2a5907b-7c21-4e2b-9864-527c67fdd003": {
  "contractId": "455e7f8d-ece5-4310-8da1-0036ae1a7ce0",
  "customerId": "0089e62a-d7d4-4044-94a7-0e08472ec57f",
  "address": "(35205) 대전광역시 서구 청사로 281 , 204동 505호 (둔산동, 샘머리아파트2단지)"
 },
 "1a2317e2-8340-462e-afb0-8113b188e20f": {
  "contractId": "eb5d2348-9708-42ef-b738-950cec92e417",
  "customerId": "18909731-5771-449f-b75a-8307aa5ed630",
  "address": "(17801) 경기도 평택시 청북읍 안청로4길 33 , 104동 802호 (풍림아이원아파트)"
 },
 "2a486402-d467-47b7-98f3-b7e5268480fb": {
  "contractId": "da49336e-6aa4-468d-af5c-c90a35f8c02e",
  "customerId": "96a2232d-ee4e-4bd2-a70d-12552397aaa9",
  "address": "(7372) 서울특별시 영등포구 도영로7길 15 , 103동 304호 (도림동, 쌍용플래티넘시티1단지)"
 },
 "8d307202-17ff-4919-90e8-c59a06e5a15e": {
  "contractId": "dd7f8c3e-e7ec-4c90-aa97-1429cb701979",
  "customerId": "c9bd6d49-1a1b-4433-a7f8-eb21f125b14d",
  "address": "(54871) 전북특별자치도 전주시 덕진구 오공로 71 , 111동 401호 (중동, 호반베르디움)"
 },
 "05c186ad-e409-4491-a9ca-9c10ed8b5f56": {
  "contractId": "e666c5fb-1770-47ee-b6a7-b3e5b66b8d04",
  "customerId": "b52cffa0-9292-40d7-b197-f9a634cf51cf",
  "address": "(17942) 경기도 평택시 안중읍 송담길 26 ."
 },
 "0c65e2f4-6f6e-4690-8153-920f0e116fdd": {
  "contractId": "def2133a-1e07-476a-85e7-0013d8737d40",
  "customerId": "1d570e18-b1a4-4c0f-b782-4f0f79437ea3",
  "address": "(17801) 경기도 평택시 청북읍 안청로5길 47-15 , 202호"
 },
 "e4f4c68c-0a51-4951-aa44-fbc783884ebd": {
  "contractId": "3c4665c0-25f3-4c1a-b86e-e224e7535a30",
  "customerId": "dc0699d3-150a-446a-8040-804f27e87e38",
  "address": "(18613) 경기도 화성시 향남읍 상신하길로 295 , 609동 1503호 (서봉마을사랑으로부영6단지)"
 },
 "3b877903-8a0c-470b-bd52-4d920b0222e7": {
  "contractId": "5681b261-ccda-42c2-bf5f-0d545705ddd4",
  "customerId": "ec68564e-fad8-4757-9210-673914ad778c",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 40 , 117동 505호 (해군원정아파트)"
 },
 "f7bf6f99-42c0-4cae-bb94-5ab1de963734": {
  "contractId": "bd0fbc99-de91-498f-bb12-d23237603b5f",
  "customerId": "29fafc6f-f839-4303-a355-700be337a54d",
  "address": "(21672) 인천광역시 남동구 소래로121번길 11-1 , 11동 101호 (논현동, 대양빌라)"
 },
 "0d11f951-e33b-437d-94b0-fb835ac72762": {
  "contractId": "16120309-dcc4-4953-96a0-bf8c4096155f",
  "customerId": "136507d0-4a6b-4388-89ca-d587fe82b5a9",
  "address": "(12039) 경기도 남양주시 오남읍 진건오남로580번길 5-12 , 102동 1407호 (대한아파트)"
 },
 "6ecfd89c-3997-4fe7-bf7d-b87393b9e11b": {
  "contractId": "87e326a7-4030-4fe2-ba33-48ff5c6cffa1",
  "customerId": "b2ba8a0a-a34d-426e-890b-b90e71b5b493",
  "address": "(18238) 경기도 화성시 수노을1로 235 , 110동 1402호 (새솔동, 더 펠리체 휴먼빌)"
 },
 "b0397cd5-b261-4d3c-b5f1-920f7fd50ae4": {
  "contractId": "11a2fd16-c77e-4860-97d4-f96db8ff5402",
  "customerId": "9bc14032-26a2-40d5-b1fe-1d3afff85b73",
  "address": "(17867) 경기도 평택시 현신3길 75 101동 103호 (용이동, 평택 용이 푸르지오)"
 },
 "e381e5bb-3690-4579-bf49-c4774e5ba757": {
  "contractId": "4d43a319-9d23-4960-83ad-46e1261cc62b",
  "customerId": "379433a1-61f3-40b1-9595-b4f56598f18a",
  "address": "(17816) 경기도 평택시 안중읍 용성3길 199-5 ."
 },
 "3d55199a-081a-492a-bafc-cfcfa539ff61": {
  "contractId": "3b8be865-036a-4b35-832b-a33320b539d1",
  "customerId": "7f3d1d0b-9956-4a4f-a9c6-fbd10af00104",
  "address": "(18031) 경기도 평택시 상서재로5길 15 , 102동 804호 (동삭동, 평택센트럴자이 1단지)"
 },
 "9a7b0bae-c9cc-4595-8251-7c7fa4f5b1da": {
  "contractId": "55c946bc-4c96-42e2-893e-d08bb4842ee7",
  "customerId": "53fe8938-66e9-4ef4-9433-f91599ef5ce0",
  "address": "(17941) 경기도 평택시 안중읍 송담7길 47 , 3층 303호"
 },
 "d1c0e4f9-dfa9-432f-96e6-a7c0fcc04257": {
  "contractId": "ee43896c-2bac-4c5f-9495-a962172a93a9",
  "customerId": "97a1aee4-c7e0-45a4-a298-193b5dfc19c7",
  "address": "(8209) 서울특별시 구로구 경인로66길 19 , 203호 (신도림동, 신도림 아르디에)"
 },
 "51ac0dfd-0f77-401d-bdde-071343ac6515": {
  "contractId": "19803315-29aa-430a-ae1a-13d55682eb61",
  "customerId": "ed728a01-29af-40a0-bec0-d912f0e08b43",
  "address": "(26105) 강원특별자치도 정선군 여량면 지경동길 36-53 ."
 },
 "089ef609-1184-4236-a629-061189ba16c0": {
  "contractId": "f58c55d3-9dff-484e-83d6-bf6c06255865",
  "customerId": "81cf18bf-623f-4a2c-ad33-0c7f6693e32c",
  "address": "(14305) 경기도 광명시 금당로 13 , 706동 1403호 (하안동, 하안7단지고층주공아파트)"
 },
 "b13ab1e0-d641-4e90-acee-0fac22b4f15f": {
  "contractId": "f02441c9-32f5-4275-86b3-710822ceca29",
  "customerId": "02614ba2-f631-4620-8964-04572317f056",
  "address": "(51213) 경상남도 창원시 마산회원구 내서읍 광려천북로 198 , 401호 (중리 한백아파트)"
 },
 "bd2f33a7-ccfc-4782-9b5f-75c593ab548b": {
  "contractId": "1902e599-012f-4093-a76b-d9bf2231b3f9",
  "customerId": "f851c1af-d8d3-46c0-9c93-9004c5f675e6",
  "address": "(15529) 경기도 안산시 상록구 해안로 1323 , 102호 (팔곡이동)"
 },
 "273e2213-65f6-456d-a3fc-c0fada97e350": {
  "contractId": "2314e3f9-69e0-4ba1-abeb-23b9eb196852",
  "customerId": "3725c7f5-2f61-43bf-ad87-86ea6d05e278",
  "address": "(17965) 경기도 평택시 포승읍 포승남로 520 , 102동 903호 (반도보라빌아파트)"
 },
 "ea127e4d-807a-4fc0-a36a-a3a76da5357e": {
  "contractId": "c38a2ff1-311c-4873-bc36-4f48f242f0fe",
  "customerId": "3aa78e7e-87d0-4e4d-a4fa-7c134359b4e2",
  "address": "(34127) 대전광역시 유성구 죽동로 321 , 101동 105호 (죽동, 금성백조예미지)"
 },
 "02ff4385-4878-4fcf-9034-dccf1fbacb82": {
  "contractId": "727fab7f-2cef-41ba-91b8-410ade17a9bf",
  "customerId": "bde73c52-6a28-475a-a1ca-398329a78abb",
  "address": "(14269) 경기도 광명시 새터로 90 , 110동 1106호 (광명동, 광명 푸르지오 포레나)"
 },
 "06c35403-6f28-44eb-8894-570ae1dc2a5b": {
  "contractId": "525f32e7-dae6-4c68-b227-388664b75835",
  "customerId": "f39ca388-b47e-4065-b156-752fc1cf8794",
  "address": "(27839) 충청북도 진천군 진천읍 남산7길 37 , 205호"
 },
 "c76517fa-dde2-44ce-8dad-6c61459ce2b8": {
  "contractId": "eb7ad792-6dc1-4f66-9fd7-5b95385c3127",
  "customerId": "4189353d-c818-4712-ae7f-044bde9d583f",
  "address": "(31233) 충청남도 천안시 동남구 목천읍 충절로 867 , 101동 206호 (이스트블루)"
 },
 "61081455-cfa8-48c0-8bec-166d9fcdec4a": {
  "contractId": "bcb9857a-514f-4fb4-aca2-1ada4c8f3ed8",
  "customerId": "9e166965-ad23-41b0-9430-13a65c2a3fc4",
  "address": "(18616) 경기도 화성시 향남읍 손개2길 4-16 , 301호"
 },
 "9c3b931b-62d9-427a-a966-dd38637616c2": {
  "contractId": "d92b20bd-73d6-4003-9e50-1946cb04bcbb",
  "customerId": "2a548527-96cb-45c4-96e6-206c91e388bc",
  "address": "(22871) 인천광역시 서구 이음2로 30 , 601동 1902호 (당하동, 대방디에트르 더 펠리체)"
 },
 "07697cea-c536-49b4-982a-2f0c2c181470": {
  "contractId": "5afef233-c813-453e-a530-4d87d8ec60e4",
  "customerId": "1794be88-ed86-4b4f-92f6-843c9ddb0597",
  "address": "(31486) 충청남도 아산시 배방읍 북수로25번길 33 , 103동 1201호 (배방메이루즈아파트)"
 },
 "fad5bdf3-4994-4ca7-92dc-5b769ef88c03": {
  "contractId": "56f6eed8-7ad3-44a7-b19a-65ea3f01dfa8",
  "customerId": "0a031854-f4b8-47bb-9871-c1179fd353fa",
  "address": "(13609) 경기도 성남시 분당구 내정로129번길 11 , 101호 (정자동)"
 },
 "87287eb3-ac74-4b9c-bbe1-bc9c0346b563": {
  "contractId": "087e03e2-2b0e-42fa-ac49-6f941ab6be25",
  "customerId": "14096694-ca41-46db-a4c8-b4861e0a4c1b",
  "address": "(44749) 울산광역시 남구 수암로 124 , 지하 1호 (야음동)"
 },
 "0fa428a5-d887-41e0-b980-92936f3ee512": {
  "contractId": "ddbfac0f-ad0e-40d2-87e7-eadb98ec1396",
  "customerId": "4b73a433-fe8b-4772-8363-4784f7e083d1",
  "address": "(17943) 경기도 평택시 안중읍 안현로서8길 14 , 303동 1701호 (동신아름마을아파트)"
 },
 "32d1c83c-c19f-4156-a41d-e39a594594bf": {
  "contractId": "720bf89f-9f61-4a84-8baa-c6f675d3cd71",
  "customerId": "49b2ecad-0063-4e5f-ba8f-1dab4715d35d",
  "address": "(18586) 경기도 화성시 장안면 온수골1길 75-1 ."
 },
 "5e1e1169-365f-4d73-bdc9-88356c172db1": {
  "contractId": "b0657d62-7f04-4896-8791-32b79540d3cf",
  "customerId": "c43c65c7-5654-4b02-bafa-c640047f2701",
  "address": "(15630) 경기도 안산시 상록구 장화3길 33 , 202호 (사동, 우정주택)"
 },
 "0fc3a3bc-21b6-4b31-865a-52a1510222e5": {
  "contractId": "cec6f3ca-6492-48cd-8325-a481cf67d9a1",
  "customerId": "f67472b2-dced-4f0e-9032-b408c94ae36b",
  "address": "(47549) 부산광역시 연제구 고분로13번길 25 , 1607호 (연산동, 연산동 쌍용아파트)"
 },
 "7effd2fa-d966-43a9-be5a-040db4cd4116": {
  "contractId": "a7939da8-ffcd-45e8-820f-5181861500b7",
  "customerId": "b15973b5-9dd6-4e72-8d76-77283786530b",
  "address": "(54835) 전북특별자치도 전주시 덕진구 솔내9길 7 , 102동 1108호 (송천동1가, 우림아파트)"
 },
 "5808aaa3-c5bd-4d52-901c-ee9faced8774": {
  "contractId": "66dbbfca-a45f-4080-8678-81266785500f",
  "customerId": "1b9fdca0-28dd-408a-a3b4-8b89bb146b16",
  "address": "(16439) 경기도 수원시 팔달구 동말로57번길 20-11 , 501호 (화서동, 신영주택)"
 },
 "163718e2-8ad8-49d0-b20b-4c5f3f8d6ac7": {
  "contractId": "df7cace5-6730-452e-8495-956532630bab",
  "customerId": "e84d4ecd-f10b-4f58-9e29-32ad9c96bdb0",
  "address": "(11932) 경기도 구리시 원수택로64번길 9 , 101동 209호 (수택동, 수택동 성원상떼빌)"
 },
 "7e24da91-8666-4207-b51c-ec4e83bf83b8": {
  "contractId": "031b8b12-186c-46db-949d-0708f32ed4b9",
  "customerId": "64d33196-d8dc-424d-bb95-27e1eb995797",
  "address": "(10120) 경기도 김포시 유현로 19 , 120동 102호 (풍무동, 유현마을신동아아파트)"
 },
 "1f6d53eb-8e38-4ec9-8d34-3406ec7fd93d": {
  "contractId": "d6e0c43f-8678-4347-803e-b3de0dece593",
  "customerId": "9b1974e5-aaac-4613-a045-4874fe934eec",
  "address": "(17941) 경기도 평택시 안중읍 송담9길 35-14 , 202호"
 },
 "0937e28c-e623-4044-bbcd-4b2594a25fa4": {
  "contractId": "34fe1c2f-6032-4cbe-aea6-f81ed573a2e0",
  "customerId": "b33f528b-e035-428c-9187-dfaae351ef81",
  "address": "(22787) 인천광역시 서구 새오개로 19 , 2동 619호 (석남동, 동남아파트)"
 },
 "69969864-e0d1-4aa6-99d5-8f709d374e0c": {
  "contractId": "a13a2937-aa4e-47d4-b9c1-cb666e77960a",
  "customerId": "7fead359-2365-4d75-94ee-bb121e6fdbb4",
  "address": "(7415) 서울특별시 영등포구 도림로39길 11-3 , 302호 (대림동)"
 },
 "60d190ff-5e11-46fb-bc57-053bb5bdf356": {
  "contractId": "0d327115-d3b2-46f8-b768-45555aa7d669",
  "customerId": "8611375f-bccd-47c5-a83d-663219222c42",
  "address": "(7754) 서울특별시 강서구 강서로16길 78 , 402호 (화곡동, 태화빌라)"
 },
 "e448ce33-9fe1-4b17-b9cd-ef4350a85c7d": {
  "contractId": "ee9e8ccb-0bf6-4bc7-b080-a826f58c9d6b",
  "customerId": "a9e068b7-1e95-4423-84d0-20e2ebb796e6",
  "address": "(8569) 서울특별시 금천구 독산로32나길 17 (시흥동)"
 },
 "23d3ef28-af1e-435c-ac04-a51a046f5ef0": {
  "contractId": "b28d0f0f-ed57-49dc-b32d-fcf29ef5f664",
  "customerId": "2246668f-6b40-4642-aec6-5a2deecd03ba",
  "address": "(10116) 경기도 김포시 풍무로93번길 30 , 306동 902호 (풍무동, 양도마을대림아파트)"
 },
 "24f212c2-e709-40d2-968d-3839550873c5": {
  "contractId": "a1e33e36-bc92-4536-a5f4-166d76c0387b",
  "customerId": "40fb07ac-197d-40cf-9c6d-12119521576e",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 102동 503호 (부영사랑으로)"
 },
 "40af27ae-5d00-4ab6-87d1-2c202b7b2ead": {
  "contractId": "ce4c8233-e094-4c12-ae10-3b5c6305f947",
  "customerId": "eeb6a523-1528-4f21-b129-9eb1f3e732f7",
  "address": "(13647) 경기도 성남시 수정구 위례서일로1길 8-9 , 4층 (창곡동)"
 },
 "4975ee1a-3499-4a1c-bf10-161751b53646": {
  "contractId": "651174c3-680b-41c6-be9d-b996af9946e0",
  "customerId": "61a6fa18-116e-4418-8db7-24a8a6872a78",
  "address": "(17797) 경기도 평택시 청북읍 청원로 210-84 ."
 },
 "eecbed33-41d1-4f81-b0cf-f6cc07c9f051": {
  "contractId": "bd4ae02a-a2cd-4b47-a25a-cea780be64ac",
  "customerId": "1e9417da-d625-4130-ab3c-31aca7d002ab",
  "address": "(10116) 경기도 김포시 풍무로93번길 30 , 306동 902호 (풍무동, 양도마을대림아파트)"
 },
 "af2b06af-bbe8-48ec-ad74-865aaaa83a5e": {
  "contractId": "22116a10-c4ba-45f1-9785-5754da945877",
  "customerId": "199e8600-5d01-4e34-948a-935b71d8c195",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 111 , 301동 903호 (현대아파트)"
 },
 "b9f01d1b-6c71-400f-a441-262c1e750fda": {
  "contractId": "967c5e95-78f2-4c72-94ad-7d9e8e7a2c44",
  "customerId": "6e0b9517-4207-4bd3-b7c7-3b8deadf9ba3",
  "address": "(18568) 경기도 화성시 우정읍 조암서로29번길 19-4 , 1동 305호"
 },
 "db43076d-64c7-453f-a8f4-0c4dc9d2d4a7": {
  "contractId": "a26628c1-16d5-4724-926a-1cf95ef66b55",
  "customerId": "df08b706-90c3-42e4-869d-d62f76d962d9",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로328번길 21 , 307동 203호 (화성향남서봉마을사랑으로부영3단지)"
 },
 "6a2d298f-ec30-4fdd-84c3-90bb3ad5a051": {
  "contractId": "f7d39e32-7246-4bf0-9f4c-f5ceb6591894",
  "customerId": "67e80196-af89-40c4-88ef-e544d2e073dd",
  "address": "(17938) 경기도 평택시 안중읍 현화중앙길 53 , 104동 303호 (성원아파트)"
 },
 "20717698-f492-4e50-93c4-9bdda713b11b": {
  "contractId": "78f7bb12-661d-41ec-b07f-caabadd4f42d",
  "customerId": "70703d29-42ec-4beb-a9ac-7223a68bdfa9",
  "address": "(15805) 경기도 군포시 산본천로225번길 55 , 3층 (산본동)"
 },
 "a500254b-f1b1-404d-a5db-ba320e7f1eef": {
  "contractId": "d1001c49-c337-4b30-95d8-ed4ac5ebb882",
  "customerId": "ab892177-f486-469d-90d4-545afc1a3336",
  "address": "(18496) 경기도 화성시 동탄순환대로17길 31 , 2409동 1002호 (산척동, 중흥에스클래스에듀하이)"
 },
 "d7a55592-34a2-421e-a0a8-699c33e8cc0c": {
  "contractId": "24da34e7-9395-4491-b8b6-291e54ee0cdf",
  "customerId": "c5a05054-8946-4ddc-bdb6-f9b2c881e47c",
  "address": "(17814) 경기도 평택시 포승읍 석정로 58-10 , 금하빌라 104동 201호"
 },
 "6f161057-71a5-4090-a153-52ea24489149": {
  "contractId": "4b406849-ce51-4ca6-9c21-cd6ebf0910ae",
  "customerId": "5968d713-2ffa-4346-986d-3569fc6275da",
  "address": "(17939) 경기도 평택시 안중읍 안현로서7길 46 , 202동 1105호 (주공아파트)"
 },
 "16de9b8a-a356-4e23-911f-e95e78744d9d": {
  "contractId": "4e0ff41c-6ee9-49b3-bd8f-ddf265ef3e14",
  "customerId": "5f7a5dff-2be3-4f68-aa4c-10ecf3d093b0",
  "address": "(31724) 충청남도 당진시 송악읍 신복운로3길 28 , 102동 1003호 (신성당진미소지움아파트)"
 },
 "3f20f661-0d60-4113-a98f-307d49100f67": {
  "contractId": "8ea8cb03-90bd-4430-92ba-eaee989dd968",
  "customerId": "16dd35f3-fb76-4d59-8148-3fd7084f1502",
  "address": "(38438) 경상북도 경산시 하양읍 대학로298길 20-9 , 110동 104호 (경산하양롯데아파트)"
 },
 "c089c2b4-d309-4c36-be63-22ef71363118": {
  "contractId": "00a88343-7ca8-4734-8389-b3b6d32dbe04",
  "customerId": "e33cf175-f9a5-4c49-9848-ce5c8dbf14a5",
  "address": "(17942) 경기도 평택시 안중읍 현덕로 7 , 102동 1101호 (신창아파트)"
 },
 "7d5c63ec-1a62-4c32-9c6c-c00b744bfe4b": {
  "contractId": "51bd8f49-4386-4f32-a459-1cf69586f366",
  "customerId": "69cc30b1-745f-4c49-a91f-3907c9efdc17",
  "address": "(8726) 서울특별시 관악구 은천로39길 56 , 4동 604호 (봉천동, 일두아파트)"
 },
 "564c45d7-ec03-4927-ae2b-a355319964dc": {
  "contractId": "3633cb6e-e51b-4bb7-a9b9-35586206d4c5",
  "customerId": "a4a227e0-5cbe-4ac5-bbff-37504b77e7f1",
  "address": "(8541) 서울특별시 금천구 독산로101길 11 , 102동 301호 (우노빌) (독산동)"
 },
 "84ca432a-3986-4b35-8a45-1a3be89708fe": {
  "contractId": "d114ff0d-16ad-4814-83c9-4c268edaf248",
  "customerId": "b4ef7647-4fd4-464b-bd4c-ec19b8e58811",
  "address": "(18610) 경기도 화성시 향남읍 하길로 69 , 902동 2003호 (화성향남오색마을사랑으로부영9단지)"
 },
 "075d9b61-f50d-4bbd-9925-d741dce8cf72": {
  "contractId": "3438ed10-05b8-4143-9261-acd66b3484e4",
  "customerId": "c5de46c2-accb-43b1-ba9e-56fb079bdf3c",
  "address": "(15304) 경기도 안산시 상록구 정재로6길 17 , 301호 (부곡동)"
 },
 "2203d5e9-74e4-4e02-9794-4414cc518f0b": {
  "contractId": "32f89be8-5aae-49ed-b277-b25558f02d09",
  "customerId": "adc3deca-8505-4cb4-9dc9-1ad98b3ecff6",
  "address": "(16569) 경기도 수원시 권선구 세지로112번길 33-4 , 1층 (권선동)"
 },
 "45d48a73-9c7e-4663-8eb1-da51e5e16549": {
  "contractId": "5816e30e-b352-475e-8244-46dda243b5a4",
  "customerId": "85f67e52-ca88-44bc-abea-7cc4c9ff9747",
  "address": "(18133) 경기도 오산시 운암로 89 , 209동 102호 (오산동, 오산운암2단지 주공아파트)"
 },
 "de850543-850b-4b7a-a1df-ca1711188221": {
  "contractId": "5bec208f-f002-42c3-b208-b1912b9fe825",
  "customerId": "f59466c5-7e7b-4e2f-973f-d595c576ec7b",
  "address": "(17936) 경기도 평택시 안중읍 안중로84번길 71 ."
 },
 "225810a5-6f27-4b84-83d3-5ca61f5c6c12": {
  "contractId": "fd421a9a-5a83-485a-8ebf-5643e520824a",
  "customerId": "72519547-5209-42a2-9b21-1f26f38ddf38",
  "address": "(18254) 경기도 화성시 남양읍 화성로1081번길 11 , 더스테이 B-204"
 },
 "49889ea3-40f2-4aa2-bc96-4cd21111cada": {
  "contractId": "9a88ffb1-ea36-4515-b0ab-0b6997b2030b",
  "customerId": "3a67bdc1-a3a5-4dcf-8720-821d95de7578",
  "address": "(18008) 경기도 평택시 고덕국제대로 232 , 202동2007호 (고덕동, 평택고덕엘에이치2단지)"
 },
 "22ed391e-e0d4-44b4-b6a6-a8ee4da925b6": {
  "contractId": "78044452-40c5-4a09-95ee-c9ecc53bb02b",
  "customerId": "c00ef597-e9f9-474d-9745-5d5e6c16448b",
  "address": "(1337) 서울특별시 도봉구 마들로 616 , 103동 602호 (방학동, 대상타운현대아파트)"
 },
 "90eace4e-30ac-4995-833e-5bf30ab9bc67": {
  "contractId": "982d5869-8533-480c-b371-a44fac79e3ce",
  "customerId": "1fe15f80-c5b5-446a-bad4-7b1dac355890",
  "address": "(15292) 경기도 안산시 상록구 충장로 533 , 1103동 507호 (성포동, 주공아파트)"
 },
 "d4fd26b2-e25a-4598-b080-09ba01185241": {
  "contractId": "9f0c1f55-9766-4a2b-a246-7b7a1b116cac",
  "customerId": "88d58a18-a389-41b3-a2ce-c52a696cbb91",
  "address": "(17869) 경기도 평택시 현촌3길 21 , 119동 302호 (용이동, 평택용이금호어울림 1단지)"
 },
 "e594e104-f30c-47f7-912b-a0f60349db07": {
  "contractId": "6001860d-ff85-4d8c-a472-814b95a046ce",
  "customerId": "f62cfb89-3b8a-422e-bcfd-2d50f76f01f9",
  "address": "(17898) 경기도 평택시 어인남로8번길 43-13 , 2층 102호 (비전동)"
 },
 "4c616d01-f294-4af4-8bea-7852abf4d8ad": {
  "contractId": "a26e42f5-df86-4a28-ac6d-90f6c46e5d00",
  "customerId": "1b360405-e376-4f09-9476-689918a98018",
  "address": "(1344) 서울특별시 도봉구 방학로 122-7 , 402호 (방학동, 청구빌라)"
 },
 "776d663b-127e-4154-93e4-13888644eab9": {
  "contractId": "38c9cdd3-47b6-47b0-8167-994551add16b",
  "customerId": "fecbb0ad-4ff8-4257-b3d0-090fc42c4d58",
  "address": "(17955) 경기도 평택시 포승읍 여술1길 100 , 1025호 평택스마트빌포레"
 },
 "e7ada73f-237b-40c1-91d6-ebfa73e69724": {
  "contractId": "45214c0f-e718-416a-87da-62a849df209a",
  "customerId": "ca2b88a6-3c8b-4cee-bead-5d9ecc1e69bf",
  "address": "(18569) 경기도 화성시 우정읍 남양만로 867-10 , 기아2차 202동 207호 (기아자동차(주)사원임대아파트)"
 },
 "74513056-35be-4f8c-9f1c-eab00cea47b0": {
  "contractId": "87168e05-0343-4dda-b66b-efc14deb2570",
  "customerId": "44c06c9c-bd36-4e3f-a631-4dbdd829007d",
  "address": "(27387) 충청북도 충주시 성서1길 30 , 4층 (성서동)"
 },
 "1525ccf3-d10d-4b92-b925-aab31f28b3aa": {
  "contractId": "59f17120-a147-4797-9398-a3b964e5b839",
  "customerId": "ecc86aa4-4d36-46a1-8095-6929804f3286",
  "address": "(17747) 경기도 평택시 모곡길 40 , (모곡동)"
 },
 "74fa9357-982e-4866-9836-6480a7c254d3": {
  "contractId": "6deea45b-ef22-4920-a674-265eef4efbee",
  "customerId": "ab8cf646-6b1b-4fd2-8b25-a70ff713f814",
  "address": "(22165) 인천광역시 미추홀구 경인북길485번길 32 , 111동 501호 (도화동, 쑥골마을아파트)"
 },
 "58ee5f19-41dc-4ab0-a26f-8f410acabe8f": {
  "contractId": "657b11e0-9a9c-4033-8095-74c9292b3b85",
  "customerId": "c59fceef-d21a-4ad0-a935-c621860972f4",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 203동 1401호 (동신 사랑마을 아파트)"
 },
 "4bc7c461-e828-4ffd-be27-2dcb216b77e7": {
  "contractId": "3df814f0-66c6-4d1b-aebc-c67897b36cbe",
  "customerId": "c4398b7b-8028-4aee-a9d0-3693b5d43f4e",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 105동 706호"
 },
 "c2494440-9a58-473d-b912-798f0960a89d": {
  "contractId": "fc3e963d-6659-4c68-ae31-9ff915cc9752",
  "customerId": "0c35bca6-8bee-49b9-9f75-83534550354d",
  "address": "(1060) 서울특별시 강북구 한천로130길 46 , 6층 602호 (번동, 메종빌라2)"
 },
 "b0cffbed-7ce0-43a7-a8ab-ef1d476d2b4e": {
  "contractId": "3f643e5c-86f8-4d7f-bdbf-857a133d781a",
  "customerId": "1f231f67-16a5-41ea-95f4-80da9e70d153",
  "address": "(21545) 인천광역시 남동구 남동대로916번길 76 , 805호 (간석동, 유영아파트)"
 },
 "ede113b4-7053-40c8-85c7-6274f4246ed8": {
  "contractId": "cc88043e-e5f6-4855-93f9-914005dafcd3",
  "customerId": "0a673c0c-924d-4085-835c-04ed41ed5ef3",
  "address": "(18623) 경기도 화성시 향남읍 발안공단로5길 99-10 , 201호"
 },
 "89f7653a-35de-4919-8630-8a3dae027ba7": {
  "contractId": "ed8c5c25-cac5-4c6a-8050-14cc88348015",
  "customerId": "3dbd76ff-38b0-4709-a207-98a2ccc531db",
  "address": "(31037) 충청남도 천안시 서북구 직산읍 삼은4길 18-20 , 204호"
 },
 "177fa28b-8df2-434f-9b1f-9330261b8579": {
  "contractId": "97dda735-af0c-4b46-8c15-f18ae4a1b440",
  "customerId": "3817767d-48ea-45d8-87d6-52d57a144b13",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로356번길 15 , 103동 1706호 (서봉마을1단지아파트)"
 },
 "2f8dde35-e489-487e-93bf-fee6534a1af2": {
  "contractId": "74b879ed-81c2-4d8b-800e-69c682a4e18f",
  "customerId": "0c1b4887-3428-455d-9b33-677a5afc5c2b",
  "address": "(26304) 강원특별자치도 원주시 소초면 백교길 105 ."
 },
 "e3c23db1-54bc-466a-b169-0df3421ce04a": {
  "contractId": "a248e65e-730a-49e3-9829-baab336b51a4",
  "customerId": "4df1c2f3-390d-4031-af26-abae266f2631",
  "address": "(8548) 서울특별시 금천구 남부순환로128길 33 , 201호 (독산동)"
 },
 "32b7f17b-6a99-48c3-9923-f1404933fc83": {
  "contractId": "40aa40ad-2e57-46b4-885b-331b9f769ba9",
  "customerId": "18a059d8-9b2c-4645-98fa-fa6bba4d5503",
  "address": "(18412) 경기도 화성시 태안로 85 , 104동 902호 (병점동, 병점역 한일타운)"
 },
 "b0b38ed0-787c-4ee3-be5d-a2c258b25789": {
  "contractId": "b7647a4f-f90a-46a0-b6f5-88f88f7afdf7",
  "customerId": "a9a37123-afa6-4f51-a868-fbdf38ce6419",
  "address": "(18004) 경기도 평택시 고덕갈평3로 50 , 302동 1503호 (고덕동, 평택고덕 센트레빌 엔에이치에프 3단지)"
 },
 "5540fc39-ed99-40ad-9137-b61ec631c019": {
  "contractId": "4b6d8fbf-c658-44e5-a777-828d2019e5c4",
  "customerId": "70c6f301-3728-4735-a3b4-f96b1c6ca462",
  "address": "(31711) 충청남도 당진시 송산면 송산로 765-18 , 107동 1015호 (현대제철(주)독신자숙소)"
 },
 "0cfff36d-12a6-48d2-960d-4d9fc4a93fec": {
  "contractId": "b096882a-8255-4d61-8310-d06dca6acb3e",
  "customerId": "070a62c4-04b8-4c3a-b95b-2b5024dff868",
  "address": "(18420) 경기도 화성시 동탄숲속로 19 , 892동 402호 (능동, 동탄숲속마을 능동역 리체 더 포레스트)"
 },
 "90cb3e7a-24b0-4c23-8853-d81eef272c0f": {
  "contractId": "53a551eb-ad14-4c6c-b19b-1f4492ae28fa",
  "customerId": "e136e7c9-a81f-40de-ae9b-b3a49f210f54",
  "address": "(35200) 대전광역시 서구 만년로12번길 40 , 302호 (만년동)"
 },
 "fe8b15ae-b4ec-46c2-ba46-cbb76b039c85": {
  "contractId": "1c275b75-b694-41c3-967c-3b77bd2a5e75",
  "customerId": "7d56a5a5-eec7-441b-8c96-d8eb1dbd1b4b",
  "address": "(22190) 인천광역시 미추홀구 낙섬서로18번길 30 , 302호(명성빌) (용현동)"
 },
 "0115d700-1114-4373-adfe-d08146e6856c": {
  "contractId": "353809b6-7bb8-42ad-8848-ff92d8e55a07",
  "customerId": "2ce9d5bb-6de2-4bd8-8915-b11a4ec1ddcd",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 102동 102호"
 },
 "a083b544-9c1b-4ffa-970a-51e839c77155": {
  "contractId": "1252824b-adc5-4121-9b17-98904b5cf159",
  "customerId": "289e34ff-c774-4cfc-9b21-daaf905d8685",
  "address": "(34007) 대전광역시 유성구 봉산로32번길 32 , 302호 (봉산동)"
 },
 "0df9bb42-16e8-4b07-9daa-24d68d531aee": {
  "contractId": "d4a81cd7-366a-45e9-bd59-198cd4965301",
  "customerId": "5fb3d8fc-3cb8-4bfc-a01f-ffb83ff2d5df",
  "address": "(17966) 경기도 평택시 포승읍 직산동길 112 ."
 },
 "0e30f8c8-b12f-45f1-ac8d-0dca941e0fa5": {
  "contractId": "cd431c64-de37-4a3f-bc8a-b63c08949a84",
  "customerId": "9d8fbc5a-3ee3-413a-bbec-3e9aee92ea33",
  "address": "(1448) 서울특별시 도봉구 우이천로24길 50 , 106동701호 (쌍문동, 힐트리움 아파트)"
 },
 "0648714b-83e1-4afe-82f0-bb70ac06c986": {
  "contractId": "4c81d9b8-77d4-4e5d-9e09-0b6a068a865d",
  "customerId": "25ad9c88-fde1-40ee-97e8-a663dbfa2cc0",
  "address": "(1606) 서울특별시 노원구 동일로239나길 31 , 101동 1103호 (상계동, 상록수아파트)"
 },
 "e73b8b13-ece4-4e12-a13b-c13501382d52": {
  "contractId": "7a15c4bc-e909-4f6d-bf09-89e2b8fe4f24",
  "customerId": "f147e671-2f6a-4b9b-93ed-e899ec9bb5f6",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 108동 301호 (화현마을우림필유)"
 },
 "34514186-3703-4fff-a0a5-5f2d844c73a9": {
  "contractId": "eef70904-bc9e-4134-9304-721bb3aac8ae",
  "customerId": "d9088476-a128-411a-90ac-06169f1da8d7",
  "address": "(8793) 서울특별시 관악구 낙성대역3길 25 , 301호 (봉천동)"
 },
 "2aab53d2-0d62-4a91-a751-27626358ea16": {
  "contractId": "5dfb39b2-948d-41eb-97d9-b5532729de85",
  "customerId": "e3874719-bb83-4969-9074-6118f2b51915",
  "address": "(15011) 경기도 시흥시 서울대학로278번길 19-13 , 106동 503호 (배곧동, 시흥배곧 C1 호반 써밋플레이스)"
 },
 "e721c74c-079f-4b59-9e11-e5c351575417": {
  "contractId": "a720dea8-5ff7-4a4b-9a67-184360a41bcb",
  "customerId": "c3057a72-d2ef-418d-9d02-9c4adf8b3d2f",
  "address": "(18596) 경기도 화성시 향남읍 발안남로 66 , 102동 506호 (화성발안우림필유)"
 },
 "13fdf18e-85b1-4549-9cc3-ffd917b80006": {
  "contractId": "2c7917a2-24d3-413b-89b0-628496b3077b",
  "customerId": "39fdf893-bf4f-4d27-a196-159d8e2be8e1",
  "address": "(18611) 경기도 화성시 향남읍 상신하길로274번길 21 , 701동 1301호 (화성향남서봉마을사랑으로부영7단지)"
 },
 "04775d64-e1db-4c56-842f-3f5f5d046b49": {
  "contractId": "1c358b3b-3722-4774-8ac0-1dbea2dfd8e3",
  "customerId": "78a74be8-0579-4476-8b53-44b04898bc00",
  "address": "(14999) 경기도 시흥시 장현천로 170 , 804동 901호 (군자동, 장현 동원로얄듀크 메트로포레)"
 },
 "afb07733-2e9a-436b-a007-7e31ec620b9b": {
  "contractId": "7a1a40e9-4ab5-435b-97b7-729d77b3b3e9",
  "customerId": "92d99f5e-abdd-411a-aa0e-97a8307c9917",
  "address": "(50652) 경상남도 양산시 물금읍 백호로 91 , 101동 2101호 (반도유보라4차아파트)"
 },
 "f59e716c-bd98-4024-b0aa-69b2028fe32c": {
  "contractId": "fa58eccb-e3bc-43b1-888c-c2a0428ec073",
  "customerId": "f352c219-13ce-4373-bd5d-2e57c980acc3",
  "address": "(17922) 경기도 평택시 원평로25번길 61 , 206동 1102호 (군문동, 평택군문2단지 주공아파트)"
 },
 "63d647cd-9073-4adc-8e3b-f7e37ca1d5fb": {
  "contractId": "7e00e27e-b9ab-4cab-a519-bf46d4e86637",
  "customerId": "3ac9d865-06eb-435f-9c53-18c036937d5f",
  "address": "(12615) 경기도 여주시 북내면 여강로 149-1 ."
 },
 "c55a5a62-adf3-4845-95d2-469d4aa9b02a": {
  "contractId": "13d998de-bf07-4510-a19a-97b1e4547b95",
  "customerId": "766dbcc4-c98d-4ad6-af65-164c739db179",
  "address": "(35228) 대전광역시 서구 둔산로 15 , 112동 704호 (둔산동, 향촌아파트)"
 },
 "d8559ca0-31b3-4732-aa4a-9819a7927217": {
  "contractId": "877d6259-b1a9-4386-aa1f-b79bcb014776",
  "customerId": "dcb89f2b-72d7-47ec-8c39-1ef8b0ca0f16",
  "address": "(22716) 인천광역시 서구 봉오대로318번길 18 , 11동 105호 (가정동, 하나아파트)"
 },
 "3524f045-92aa-4771-96ca-579f9dfc64e8": {
  "contractId": "d43263b5-07e1-4e1f-83c8-37b69f61cd68",
  "customerId": "7858acac-dd34-4c2e-ba35-8d23e0fa9029",
  "address": "(18581) 경기도 화성시 장안면 감나무길 18 ."
 },
 "4795e470-5919-4e0d-a8f3-8c1d85029730": {
  "contractId": "00606fd5-da42-49c5-a0f1-5d3dd5f71fdd",
  "customerId": "7f101beb-daf1-4957-bf43-042e94e169f1",
  "address": "(22734) 인천광역시 서구 청라라임로138번길 15 , 301호 (청라동)"
 },
 "16a67b3d-d320-4963-bdbc-80193824a332": {
  "contractId": "96b1f9c6-6bfe-449d-9f67-f6270ccce36b",
  "customerId": "512a1b8f-323f-4246-b7af-494d18ffa821",
  "address": "(7246) 서울특별시 영등포구 국회대로54길 10 , 102동 2603호 (영등포동7가, 아크로타워 스퀘어)"
 },
 "e0e8e30a-8909-447a-8222-80421ac9a933": {
  "contractId": "d78ffa82-f09d-4156-a5de-83fe3ed80589",
  "customerId": "4cb11380-511b-4c4d-a361-fbb0d2afb57f",
  "address": "(17805) 경기도 평택시 청북읍 안청로4길 42 , 101동 401호 (평택청북 이지더원)"
 },
 "73d064b0-7a37-4178-843e-f51f99bca139": {
  "contractId": "39fb7f3b-409e-4c80-b550-03e8e0a92f7e",
  "customerId": "8b8fe3d8-28a7-4095-9baf-9fa308f5e961",
  "address": "(36753) 경상북도 안동시 강남로 480-12 , 101동 203호 (정상동, 더힐 101)"
 },
 "10c1c0c1-e32c-4018-a7e7-8ebc1738aece": {
  "contractId": "50614d24-eefb-49bc-9301-c88cd76020a4",
  "customerId": "5c2b9bbf-2cd5-4136-a537-553a070b2460",
  "address": "(12639) 경기도 여주시 도예로 40 , 105동 404호 (현암동, 이안여주강변아파트)"
 },
 "f51e4a62-20f0-45b6-896e-2286b19b3dd5": {
  "contractId": "fa4d1359-b9fc-4fb3-8c9b-30763768505d",
  "customerId": "cfd1aafd-9384-4e70-91aa-011763060989",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 108 , 304호"
 },
 "16ef546e-2939-4539-b17b-b34d2e77e5c2": {
  "contractId": "02510029-cf90-4e75-ab76-b65a9beb417a",
  "customerId": "238c08a1-97b5-41d2-87de-2840f881b467",
  "address": "(16336) 경기도 수원시 장안구 장안로 271 , 112동 1205호(정자동, 북수원자이)"
 },
 "00108668-bc2d-4a81-b21a-e220134a1ee5": {
  "contractId": "41edfce1-0e41-4bcd-9cc0-7c127bbe3790",
  "customerId": "1d19a7bb-16f1-4138-9efd-1f8531bb8321",
  "address": "(25495) 강원특별자치도 강릉시 가작로 78 ,102동 1001호 (교동, 강릉 교동(1)주공아파트)"
 },
 "f694ac49-32c1-45bd-9b71-0613d407f333": {
  "contractId": "0bec2c0e-bf18-4142-b321-864248a8525f",
  "customerId": "deed4543-4b03-4b44-a3d6-f0d603a81459",
  "address": "(4416) 서울특별시 용산구 보광로 14 , 에이동 1005호 (보광동, 신동아아파트)"
 },
 "1d66d5bb-e43f-4328-b638-a1e293d223f2": {
  "contractId": "a6c27998-3b4f-442a-8b1c-4ce85337af4a",
  "customerId": "07b901ef-823b-48b2-8244-23e57e4bd69f",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 110동 403호"
 },
 "0f778fa6-eb28-4653-870a-2a8bf486033a": {
  "contractId": "23b60b89-16c4-4662-bfbb-c1304c458d4f",
  "customerId": "a50ed479-8d0f-4ec0-9a21-4f1edfb49563",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 213동 703호 (부영사랑으로)"
 },
 "3cee1e2b-10a6-4b49-a9f7-ca9b7b1b56ac": {
  "contractId": "f93321c4-e069-461b-bfdd-da6381bb224c",
  "customerId": "c28d898e-3f1e-4c6b-9ba5-4ecff4f745a1",
  "address": "(17804) 경기도 평택시 청북읍 청북남로 278 , 304동 901호 (부영사랑으로)"
 },
 "0ad3f73c-632f-4c9b-b49e-df09e18633d4": {
  "contractId": "ff579f55-97a7-423c-8bb7-7010c8566f27",
  "customerId": "a8b320f5-99c0-4bba-a3fd-47a815014a3e",
  "address": "(17951) 경기도 평택시 포승읍 불당길 114 ."
 },
 "094cacb2-d241-4cfd-8bf0-082d707ab6d0": {
  "contractId": "7552a304-1976-401d-82c5-32b236839279",
  "customerId": "d3468f5b-abe0-47b5-8804-b071d763d639",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 104동 1901호 (이안평택안중역)"
 },
 "69338fc7-d8a1-47a9-b7d2-3248d34acd8c": {
  "contractId": "26a3454b-0057-49a8-887b-767f43ffebba",
  "customerId": "46eec1ab-aa4d-4ab9-934f-024b34400e59",
  "address": "(16375) 경기도 수원시 권선구 당진로14번길 37 , 101동 909호 (당수동, 삼정아파트)"
 },
 "fe657d2c-c477-46d8-b181-33ab38c1482b": {
  "contractId": "ea156dc3-d7e6-4cf9-a106-f4ca1db2de5f",
  "customerId": "eef67922-d05a-4a5a-976f-37fd898cf5be",
  "address": "(17949) 경기도 평택시 포승읍 포승원정4길 24 , 303호"
 },
 "c0f73de5-44dc-44c9-b7c1-b391d9fd8560": {
  "contractId": "bd46cf38-e3e7-440e-88a0-ae166cff9043",
  "customerId": "0cfe78b9-e568-4958-83a6-00e279a893e5",
  "address": "(15399) 경기도 안산시 단원구 신각길 18 , 101동 1501호 (신길동, 안산신길온천역휴먼빌아파트)"
 },
 "e6e4d261-0c4f-4d09-81fa-9fcce848b24f": {
  "contractId": "990e1d44-e92d-4d11-844f-40f33de5a951",
  "customerId": "40ec23dd-49cd-42f8-bea9-6ee804bbfc6d",
  "address": "(17877) 경기도 평택시 소사7로 8 , 102동 2702호 (소사동, 뉴비전엘크루)"
 },
 "a4abe969-9671-4960-8203-9d677d1316fc": {
  "contractId": "7e2b15ef-aa0e-418f-acf0-8fdd2cc4fceb",
  "customerId": "54a44604-87fe-45c1-a65a-1d380dae5aa2",
  "address": "(17821) 경기도 평택시 고덕면 효덕새싹길 55 , 102동 802호 (고덕하늘채 시그니처)"
 },
 "60495744-8caf-4f56-9273-e255a9d65f1e": {
  "contractId": "b49fdb0c-015d-41a8-b3d8-80e38cf31784",
  "customerId": "fa9a88dc-2300-49f9-9e88-13e39e517030",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 , 202동 202호 (포승삼부르네상스2단지)"
 },
 "0f4f279b-f4eb-4cfb-8b87-47ce7d7b4652": {
  "contractId": "51456333-4345-4dde-82e0-e3fe955eae7c",
  "customerId": "e9b20d56-ef12-4354-8312-0f5d60fe1b4e",
  "address": "(28037) 충청북도 괴산군 괴산읍 읍내로 194 , 101동 202호"
 },
 "8c6b2188-aa3c-48d1-b9b9-a809b64da508": {
  "contractId": "8cd8efc1-d2f2-4ddf-850e-4e4fe247248c",
  "customerId": "29bf896b-e474-4f64-afa0-047a7a6fe1d8",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 112동 1701호 (힐스테이트 송담)"
 },
 "ea09cb2b-a20a-4d61-939f-9c4c7d8b0046": {
  "contractId": "943c228a-d2d3-4655-8e76-5b9d27dcf430",
  "customerId": "36b647fd-23b5-49b8-82ab-66ff4697437d",
  "address": "(8751) 서울특별시 관악구 은천로 86 , 211동 1204호 (봉천동, 두산아파트)"
 },
 "6cdbf907-8326-4d14-b92e-30bf4683d5e8": {
  "contractId": "bd13de9d-690c-4a01-8359-b5ac0b071797",
  "customerId": "e1ec54e7-fb20-4f0c-a47b-58c391a5038f",
  "address": "(17816) 경기도 평택시 안중읍 덕우로 39 , 102동 1503호 (안중 지엔하임 스테이)"
 },
 "14ade6bc-7666-4351-994a-53c58832c12b": {
  "contractId": "3d07f819-b151-4e9b-adc9-496f38d9db9d",
  "customerId": "34e6b6cd-739d-4c8e-b9b1-89ffe567aab4",
  "address": "(18598) 경기도 화성시 향남읍 행정서로1길 27-67 , 203호"
 },
 "33b7f098-ed8c-4eb7-9094-32bf16605f06": {
  "contractId": "8891090b-feb2-4021-aa3f-67db558cb753",
  "customerId": "2447dda1-75d7-4d7e-977d-1e6dce773f22",
  "address": "(17812) 경기도 평택시 청북읍 현곡산단로 130 ."
 },
 "4a8b5325-b6db-48db-a512-b393052dc0ab": {
  "contractId": "e88ea8d3-1445-4eff-b7bb-d100f157f3f5",
  "customerId": "cb187b9d-fa06-47fa-8903-5542d0a5dcab",
  "address": "(17963) 경기도 평택시 포승읍 황해희곡3로 23 ."
 },
 "5414cf3c-d0ce-479c-a5b6-8d47b15cc009": {
  "contractId": "6bd80802-7758-4cf5-956a-17d92dede3ac",
  "customerId": "0d1a8848-e29f-45ef-807f-eaf2702b453d",
  "address": "(15874) 경기도 군포시 삼성로 31 , 403동 201호 (부곡동, 삼성마을 센트럴파크)"
 },
 "e9d1ab97-ea69-48b3-b8a4-f6cb9fdf6ca2": {
  "contractId": "ccddab38-2237-471d-9eb0-66976195cd62",
  "customerId": "79d048c0-50bd-452d-97a4-56db6129970e",
  "address": "(39658) 경상북도 김천시 무실7길 45 , 103동 702호 (덕곡동, 코아루푸르나임)"
 },
 "17fa957f-b270-4f76-b985-a6b972d774f7": {
  "contractId": "b399dc2d-2e5f-49b9-9001-0588b0344c95",
  "customerId": "503e5721-55f6-4509-a9fe-de918c90ff60",
  "address": "(31406) 충청남도 아산시 둔포면 아산밸리중앙로 58-5 , 202동 1602호 (아산테크노밸리이지더원2단지아파트)"
 },
 "d6bb7487-64b2-4af3-bb34-64673d4ebddf": {
  "contractId": "8fd9d9e9-9fc1-4fb7-8fc3-d70c54909772",
  "customerId": "ffaa5b10-5d7b-45de-ac33-b5fff278696c",
  "address": "(32609) 충청남도 공주시 탄천면 통산로 200-9 ."
 },
 "8fa6cbf5-2c47-4f8b-a7aa-4d430ee3cb50": {
  "contractId": "57174129-7801-433c-b23d-15c9a2d9ecb5",
  "customerId": "474e26e2-ab7e-49f8-99a6-70486e0d5c5d",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 65 , 1707동 1104호 (화성향남언덕마을사랑으로부영17단지)"
 },
 "bceeeaeb-e0e2-42f7-a1aa-1dbea851779f": {
  "contractId": "88ed9e8d-af9f-4a6a-81ce-c82f9b69a9d8",
  "customerId": "b6fbd44f-0ac6-41c8-a84a-9027e50db947",
  "address": "(31406) 충청남도 아산시 둔포면 아산밸리중앙로 47 , 307동 2104호 (아산테크노밸리이지더원3단지아파트)"
 },
 "6dc08635-1cac-4f60-be72-3bfc9af4f23f": {
  "contractId": "392a321b-4150-464c-917f-e2637c8642a8",
  "customerId": "1061b63a-d488-46e3-a76e-1f32dc607e34",
  "address": "(17949) 경기도 평택시 포승읍 포승원정5길 30-20 , 205호"
 },
 "708ec69a-30aa-41d4-ba65-352372ffde8e": {
  "contractId": "67332919-1e49-4e76-b616-bc309e7dd5b3",
  "customerId": "22fcd19f-f8e2-4da4-bd7b-f61dadddfe14",
  "address": "(15594) 경기도 안산시 상록구 해양1로 11 , 622동 901호 (사동, 안산고잔6차푸르지오)"
 },
 "baabbd3f-cb72-4f5b-b222-3f1a373701ca": {
  "contractId": "10a25a53-a204-4898-b036-def79b6e3834",
  "customerId": "84481ad4-2395-4df3-a451-a96a5711fd45",
  "address": "(17961) 경기도 평택시 포승읍 서동대로 784 , 102동 1203호 (SR 친오애 아파트)"
 },
 "13c7ae09-8f86-46ad-a17b-c78979dc1410": {
  "contractId": "65f3d167-a14c-4c05-bf9c-530591e9aa99",
  "customerId": "0408af78-96ac-4727-b5e5-d7829ec6c64c",
  "address": "(21358) 인천광역시 부평구 부평대로 124 , 씨티원 801호 (부평동)"
 },
 "dd5ddd11-51d6-48ad-a71b-fa691698b81b": {
  "contractId": "aa03880d-91fc-44b1-a3fc-d45daa9b3948",
  "customerId": "a993a791-6bf2-424c-9291-4a37783fb61a",
  "address": "(17814) 경기도 평택시 포승읍 서동대로 1297-19 , 11동 101호 (석정아파트)"
 },
 "8a87fa1e-f9b9-4a3e-a1d8-abbd32bb536d": {
  "contractId": "6fed67e3-1bd3-4bab-8c7c-aff15a4715d4",
  "customerId": "a5d12fa0-4c30-41a0-815e-186506f2af06",
  "address": "(18025) 경기도 평택시 신촌1로 9 , 104동 304호 (칠원동, 평택지제역동문굿모닝힐맘시티1단지)"
 },
 "4ffb7d41-81e3-4717-bffd-f9b0021e9d2a": {
  "contractId": "b4a5c483-0782-47b0-96d8-caf644daf9ed",
  "customerId": "13bc8c26-b393-488a-84bf-06ef3b9a5d28",
  "address": "(44046) 울산광역시 동구 봉수로 250 , 2106동 1801호 (전하동, 울산전하푸르지오)"
 },
 "c372bee3-5a89-412b-aa80-52916da7956b": {
  "contractId": "047300cb-0bfc-4402-9a78-25ec14671dc0",
  "customerId": "a21ec669-01f4-4fac-8db7-56028da170ce",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 110동 1703호 (힐스테이트 송담)"
 },
 "d2508f9d-16d9-436a-a250-91dc8322c645": {
  "contractId": "3aaabe9c-eefb-4bff-9e69-b43180e0c5ae",
  "customerId": "5bd000d4-3e08-4195-a6b5-f11af533119c",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 91 , 202호"
 },
 "15df6b4c-f91f-4245-82d9-435b7a7a35cf": {
  "contractId": "1b8afdc1-7737-4adc-9b23-15053878ea0a",
  "customerId": "f690dea4-0833-469a-a5db-bc900f0dfa32",
  "address": "(17949) 경기도 평택시 포승읍 호암길 64-6 , 206호"
 },
 "8dc668a9-f8bd-4adf-9431-c493cc3a95e5": {
  "contractId": "d598f6a5-d28b-47ed-ba33-e95386d2a558",
  "customerId": "f0de88c5-b1e6-4d62-a605-2be30dbdc3ff",
  "address": "(7238) 서울특별시 영등포구 국회대로74길 20 , 1011호 (여의도동, 맨하탄21리빙텔)"
 },
 "74e82275-f108-4bf6-8014-4dd84e9fc6e7": {
  "contractId": "b710dcde-9a0a-4237-9436-9da0eda1bd58",
  "customerId": "73a9f0d9-c087-467c-8d7c-1a929c83e2e6",
  "address": "(17935) 경기도 평택시 안중읍 경성2길 96 , 경성주택"
 },
 "6dd09f2c-ab7d-4bc0-a56a-2b5eb82e990a": {
  "contractId": "666a8490-9959-4f84-82d2-c42e4551832b",
  "customerId": "8e2ea0b2-0580-4eff-ab3f-71732bc8352c",
  "address": "(16392) 경기도 수원시 권선구 서수원로591번길 43 , 102동 205호 (금곡동, 거산아파트)"
 },
 "214927ed-cfb9-4d9b-8a7b-e0a9f6181371": {
  "contractId": "5a15dca6-7174-481e-9c09-42245c70766f",
  "customerId": "04fde8dd-a88e-4176-828c-1b55a0803ef3",
  "address": "(7777) 서울특별시 강서구 강서로7길 34-9 , 304호 (화곡동)"
 },
 "e53d6ed7-12f1-49c4-9875-be44f4a424b0": {
  "contractId": "9094c8fa-fa6f-49a1-a0a6-6ff16c247aa0",
  "customerId": "148ee9aa-7245-48f3-b92d-076099005868",
  "address": "(17151) 경기도 용인시 처인구 진덕로 36 , 나동 401호 (고림동, 명가타운)"
 },
 "2fa26773-3cf0-47c0-a284-1c3416f18bbe": {
  "contractId": "a7112547-1f9c-4792-8403-3e039ee170b1",
  "customerId": "735768c8-2f61-4534-a4bc-0f6a4be7ba11",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 35 , 1802동 1303호 (언덕마을18단지)"
 },
 "7f548269-5410-4772-b621-9812814754a9": {
  "contractId": "72c3d153-1abd-4a41-9968-427833c41f46",
  "customerId": "267bff88-7124-4d5f-9620-3593444fef5b",
  "address": "(30022) 세종특별자치시 조치원읍 침산로 11-1 , 502호"
 },
 "a474d893-7615-4ad9-ac94-d839b29269bc": {
  "contractId": "e3bc4a14-7971-4529-8574-1565ff61d4c3",
  "customerId": "c8b2e8c1-18a0-411f-b15e-573cb771fe66",
  "address": "(18596) 경기도 화성시 향남읍 발안서로 11 , 112동 901호 (발안마을)"
 },
 "53227214-02eb-48fb-b94f-91aa76d01982": {
  "contractId": "0ab2063b-4a6f-460d-960c-36dedccc6c2d",
  "customerId": "586262f0-8456-4f0c-a6c9-eb80dee548e7",
  "address": "(10306) 경기도 고양시 일산동구 숲속마을1로 115 , 805동 1301호 (풍동, 숲속마을8단지아파트)"
 },
 "e27e66f3-2167-4e66-b5c5-c0898b5f9932": {
  "contractId": "87b3e740-dbd0-44d5-bb82-3a615f65b8a3",
  "customerId": "92ef195e-4f9f-4938-89f2-509109530d4a",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 9 , 203동 603호 (동신 사랑마을 아파트)"
 },
 "a0c34c06-93c6-4baf-9da5-f0042f0fb7df": {
  "contractId": "4db467b0-8154-4164-9b4f-6b4989b9398f",
  "customerId": "f262f91a-e040-41e8-8ffd-2855e99f9c05",
  "address": "(17932) 경기도 평택시 안중읍 안현로서3길 77 , 1층"
 },
 "a79b0bd8-7474-430e-b55a-c7a4a9c3069f": {
  "contractId": "e3ce36ea-d641-4e0c-a910-9c150976d920",
  "customerId": "4c534f93-38f2-4c6c-b25b-465f9de55c8f",
  "address": "(32012) 충청남도 서산시 인지면 방고개길 135-1 ."
 },
 "f2bdf702-1dae-4436-b431-125d2db1d049": {
  "contractId": "eb275b47-01c5-4a6b-927f-06956665402a",
  "customerId": "20fc0023-f149-4cc0-b48e-af9c8cb540c3",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 105동 403호 (이안평택안중역)"
 },
 "20ea98a2-e5d8-49dd-95be-32db59fbe194": {
  "contractId": "f44e5118-f1a6-474c-8624-fc3e57898aba",
  "customerId": "e88cd247-d926-480d-b61b-e8122a73b739",
  "address": "(18569) 경기도 화성시 우정읍 남양만로 867-10 , 202동B동 1001호 (기아자동차 (주)사원임대아파트)"
 },
 "c7059892-93d1-42cd-8553-a0b51a3817f4": {
  "contractId": "149cdb77-4c48-4615-9171-44114c926d20",
  "customerId": "008eb04a-7f9e-44c6-b50d-e5859994b906",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 112동 803호 (늘푸른마을)"
 },
 "3f622345-1922-444a-8f8b-96e17a28e59c": {
  "contractId": "23b8af13-3035-42a8-99cb-93643a678d6b",
  "customerId": "8aca8c20-8538-496f-92e4-6301b66496b3",
  "address": "(17816) 경기도 평택시 안중읍 용성3길 199-5 ."
 },
 "7bd1e2ea-18ac-45c8-9087-57b1b7d81be6": {
  "contractId": "3ce62216-583f-4184-9d0c-4142fa932dad",
  "customerId": "bf34a656-867d-4ef9-8758-b10e0e1e7b38",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 51 , 904동 1202호 (한양수자인아파트)"
 },
 "1e18ada5-3346-47d3-b389-3958116e2898": {
  "contractId": "1965eac8-3386-41c7-a377-68d92b645c80",
  "customerId": "a17fae7d-8116-43c7-9175-cd81b240c057",
  "address": "(15033) 경기도 시흥시 정왕대로143번길 32 , 407동 402호 (정왕동, 주공4단지아파트)"
 },
 "0dbb26ff-ec05-4c61-9834-cbb872f20ed9": {
  "contractId": "fa43be79-dd8f-4387-98df-012015d6303e",
  "customerId": "1326e36a-ea1e-409a-975d-41f18a68593e",
  "address": "(18606) 경기도 화성시 향남읍 상신하길로328번길 21 , 311동 1904호 (화성향남서봉마을사랑으로부영3단지)"
 },
 "ba669308-b824-4524-871a-e8094d1e9083": {
  "contractId": "1068214a-d576-4449-b598-bdd210c1bd16",
  "customerId": "4c620485-3e4e-44d5-be8c-0244c73096a9",
  "address": "(56324) 전북특별자치도 부안군 줄포면 덕성길 138-1 ."
 },
 "4c8a8437-d89d-42be-8170-2bc646d52f07": {
  "contractId": "a2a8069f-067f-41cf-b4e8-110edb5ead66",
  "customerId": "d2d8c127-5159-4a8b-8528-5415b37b5d94",
  "address": "(34899) 대전광역시 중구 계백로 1643 , 302동 1202호 (유천동, 남촌아파트)"
 },
 "324eba1c-fc34-4c2b-944f-5c303dd7e8bb": {
  "contractId": "c472e45b-9383-42d5-9401-f8f9eeaeee27",
  "customerId": "b6ecc6c9-72d1-4b92-a9ec-b545cdca1b30",
  "address": "(17928) 경기도 평택시 안중읍 서동대로 1832-23 , 106동 1601호 (안중우림아파트)"
 },
 "0b26279f-271e-4a0c-9088-a705c3ed8752": {
  "contractId": "41160a56-b3a1-46ba-8d6f-0dd86a4616aa",
  "customerId": "dfc48245-0b81-44b7-be52-538b3e2d5dc3",
  "address": "(17736) 경기도 평택시 이충로35번길 19 , 210동 1103호 (이충동, 정암마을뜨란채)"
 },
 "f8bd6439-813e-44a2-a831-ae4b0348fc86": {
  "contractId": "82ff1d29-4cf7-41ef-b423-86b47cba03c7",
  "customerId": "b8c68f6a-93a9-4bea-b40a-007654a77c0e",
  "address": "(17302) 경기도 이천시 신둔면 황무로 563-94 , 101동 401호"
 },
 "b40de59d-5a28-4fef-bfb5-184d2de832af": {
  "contractId": "2a2b7abd-88dc-4ae0-9b9f-44a01fb9d6b0",
  "customerId": "3f60979c-d834-46e5-a3b7-2959c90886d8",
  "address": "(16517) 경기도 수원시 영통구 광교호수공원로 277 , 102동 1602호 (원천동, 광교중흥에스클래스)"
 },
 "f2c9039b-34dd-4d08-952c-87640ea42e1c": {
  "contractId": "477dfce4-0cc8-45ea-9910-4d97589bc0cb",
  "customerId": "a756b156-4dbd-476d-bba9-4d4a4693cf05",
  "address": "(13975) 경기도 안양시 만안구 와룡로3번길 15 , 301호 (석수동, 동선빌라)"
 },
 "77b21e67-5c19-4449-8cad-0f0c136284ef": {
  "contractId": "9b5c33eb-3526-4aa5-ac5c-9fa279970f76",
  "customerId": "d124f729-1892-4b0b-b025-790f8cb3dc8e",
  "address": "(18238) 경기도 화성시 수노을1로 235 , 110동 1402호 (새솔동, 더 펠리체 휴먼빌)"
 },
 "882fa042-c23e-4f36-84ce-0e7961fceab3": {
  "contractId": "07b485eb-75c7-4277-9b54-cd565e2ab1cd",
  "customerId": "c833da44-0163-4160-9653-9a3895d2eb24",
  "address": "(17799) 경기도 평택시 청북읍 오금길 80 ."
 },
 "b5966a8a-5a12-4c5f-b767-96c37e627614": {
  "contractId": "1a659475-3e07-4792-8712-2122f77f93a3",
  "customerId": "df5814e2-cd5d-443c-a57e-7b0671005de3",
  "address": "(18007) 경기도 평택시 고덕국제대로 179 , 128동 503호 (고덕동, 고덕국제신도시 제일풍경채)"
 },
 "e72d8a86-4611-4ebf-b37d-8961618bdcaa": {
  "contractId": "be91e5a7-53d5-40a3-9b2e-90540f8f2f1b",
  "customerId": "388fcd16-6cbc-43d7-b32b-4861e3196ba7",
  "address": "(15862) 경기도 군포시 산본로 299 , 209동 1406호 (금정동, 주공2단지)"
 },
 "e14a96cb-b005-47d3-b206-589bc485028f": {
  "contractId": "70d5c55b-4050-4061-9439-a88ae6867f08",
  "customerId": "35771b71-fcaa-41d0-9123-55dc3dc6eb60",
  "address": "(14999) 경기도 시흥시 장현천로 133 , 604동503호 (군자동, 시흥 장현 금강펜테리움 센트럴파크)"
 },
 "079346fb-4bc6-4595-8157-dd01884382a8": {
  "contractId": "490134eb-ee58-435d-aee8-a00b22aece5a",
  "customerId": "ea18bcd2-34d0-4166-a642-9233a8120fa4",
  "address": "(17935) 경기도 평택시 안중읍 안현로 438-9 , A동 401호"
 },
 "52d421a5-ab79-4e9c-b108-3901fed73376": {
  "contractId": "0be263ae-d925-42e8-a3b4-ce17f010dc5c",
  "customerId": "ed197625-b00e-44f8-99b3-f197776b05c8",
  "address": "(17803) 경기도 평택시 청북읍 안청로1길 91 , 109동 1303호 (평택 청북 이안아파트)"
 },
 "f2b9327f-4eba-4439-b09c-a97fa8307fa7": {
  "contractId": "089bbe0e-83ef-4356-a624-868a8110af19",
  "customerId": "904a9183-47b7-4527-82f3-8adace628fa5",
  "address": "(12246) 경기도 남양주시 홍유릉로 156 , 1동 101호 (이패동)"
 },
 "f2526414-a554-4eec-818a-2f5386c07d25": {
  "contractId": "99574900-d371-467a-ac72-e12fffa41088",
  "customerId": "2f4e6cd4-13e2-4499-aced-be96bb761e15",
  "address": "(14442) 경기도 부천시 오정구 오정로 245 , 103동 104호 (오정동, 창보아파트)"
 },
 "df13520a-5f8c-4d5d-8eb3-7384ec194027": {
  "contractId": "4da5f5aa-8dcd-480a-b27e-888538a82fc4",
  "customerId": "664e7bb8-b89f-4912-9f1b-daa47035733d",
  "address": "(10598) 경기도 고양시 덕양구 동산2로 18 , 2012동 104호 (동산동, 동산마을 호반베르디움)"
 },
 "6a7c35f6-0b71-451e-a0bb-ac3670b5e6af": {
  "contractId": "093cb809-d3f9-47c6-ba32-3fd7ed34740b",
  "customerId": "b6eeafc0-944d-4bdd-a8cd-27096250b522",
  "address": "(30101) 세종특별자치시 마음안로 190 , 1504동 902호 (고운동, 가락마을15단지)"
 },
 "22018dec-fe50-4472-bb40-93e4339df11f": {
  "contractId": "b49e3fec-83e3-48d1-8057-72f79b9e7dbe",
  "customerId": "d806a1e1-73ce-44bb-a046-205473d5e850",
  "address": "(11444) 경기도 양주시 고덕로 15 , 101동 402호 (덕계동, 덕계역 금강펜테리움 센트럴파크)"
 },
 "07a2fde7-deff-4c13-ac42-763b0dc7acff": {
  "contractId": "1651dac2-bc99-4fd5-8c30-deb603bcdfa3",
  "customerId": "630dd64b-74cf-47c2-8d4e-94e237e0b371",
  "address": "(22808) 인천광역시 서구 가석로 130-8 (가좌동)"
 },
 "692df178-af98-42db-bdd8-6048cebbf971": {
  "contractId": "7dc2c7cb-325e-41f7-8813-02265c20b8e6",
  "customerId": "3cedd0f2-a6c3-4fff-98ac-0f8ad2400774",
  "address": "(17965) 경기도 평택시 포승읍 승학동길 25 , 203동 806호 (명지미래힐아파트 2단지)"
 },
 "f03e4a6a-d334-4400-ad74-20db3709de82": {
  "contractId": "508998f2-1f56-4abc-967d-9310439951c5",
  "customerId": "e80c7a32-dfab-4098-a28d-d6f503b6b4f1",
  "address": "(12995) 경기도 하남시 감일순환로 40 , 901동 904호 (감이동, 감일 한라비발디 2차)"
 },
 "5b0d108f-df51-4be6-bee4-5a462f2ec4f3": {
  "contractId": "7f53effe-b6e9-4225-aea7-169dcdd12875",
  "customerId": "6bab277c-791b-4f2d-bb4c-0a8c355dc26c",
  "address": "(18599) 경기도 화성시 향남읍 행정중앙2로 38 , 208동 301호 (향남시범넓은들마을향남지웰2차아파트)"
 },
 "e99ba336-6ee3-49e0-9539-041c29f1b412": {
  "contractId": "d5fb1198-469d-426a-8839-8fcf2cedfd53",
  "customerId": "19bd1c63-ca11-4eaa-a367-1623515839ac",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 35 , 104호"
 },
 "e7da27a8-7254-4d5e-86ec-92fd08c07f58": {
  "contractId": "2fb63808-5a5e-43fe-a963-9c6d0e1f4212",
  "customerId": "5260de9d-e59d-4574-a429-3ccc270480e0",
  "address": "(17857) 경기도 평택시 비전2로 317 , 201동 804호 (죽백동, 평택소사벌 반도유보라 아이비파크 2단지)"
 },
 "a1b2a09a-6f98-45fe-bdc8-1c0925e5a227": {
  "contractId": "88326d46-d31c-4449-a340-943b82b3850b",
  "customerId": "9d104bbe-e545-4958-925b-f2a49b93f430",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 108동 1604호 (힐스테이트 송담)"
 },
 "abe5eaf1-01e4-4c17-b6f6-476b5b6ba0f5": {
  "contractId": "0f920c44-0582-455f-9211-4245073e59f6",
  "customerId": "d833a0e4-6ef8-47c0-864c-1cbfe9f056e2",
  "address": "(17928) 경기도 평택시 안중읍 대반길 22 ."
 },
 "2587076b-46ee-4b89-a10e-a554c7a763a4": {
  "contractId": "b41c24d6-ff5d-4a0c-960d-53ba985a5576",
  "customerId": "eacc5a1c-5222-4481-8c83-3d4a14d84d8b",
  "address": "(2168) 서울특별시 중랑구 봉우재로65길 25 (망우동)"
 },
 "abf03020-7907-4bc1-8b74-dfff31a5144e": {
  "contractId": "a1661900-5eeb-499c-abd3-0f14444dbe30",
  "customerId": "24413983-a15a-4151-ba14-b1035fd583a7",
  "address": "(39210) 경상북도 구미시 봉곡남로18길 5-44 , 102동 103호 (봉곡동)"
 },
 "f753055c-9393-4ce4-bc71-ac4af8383ed0": {
  "contractId": "8a2e8505-6583-404c-94db-402788c69be3",
  "customerId": "c099234f-1081-4289-8804-4594f28c1521",
  "address": "(18566) 경기도 화성시 우정읍 쌍봉로 80-15 , 아이린캐슬 105동 202호"
 },
 "8fde51eb-0914-470c-8469-39e341473a33": {
  "contractId": "8ade6321-4237-4e66-b870-dbc29a1973d3",
  "customerId": "a9012295-5e57-46dd-9ce1-caa2c08c27c6",
  "address": "(7401) 서울특별시 영등포구 대림로34다길 14 , 102호 (대림동, 성락아파트)"
 },
 "4db75e86-e04b-4b47-afb6-ee5af9c98608": {
  "contractId": "01592a2b-f69a-4325-9beb-a3ab7898e191",
  "customerId": "73195305-a614-4579-abdd-f8428191d0d1",
  "address": "(17963) 경기도 평택시 포승읍 황해희곡6로 36 , 202동 1409호 (평택BIX 경기행복주택)"
 },
 "345543b0-27e0-4ad7-b290-43e919743af3": {
  "contractId": "6bde7c72-adda-4b69-872f-e55457c7b6a0",
  "customerId": "ef1caa42-2bf8-4b27-8a3e-cebba30e9e75",
  "address": "(14729) 경기도 부천시 소사구 경인로 49-12 , 102호 (송내동)"
 },
 "f557568d-bacd-4db9-972e-0db254cc3e77": {
  "contractId": "3146b7d8-9e5a-4660-8e03-9f71c9ea31f3",
  "customerId": "ce164b93-fe57-49ea-803d-2cb59df50891",
  "address": "(17785) 경기도 평택시 경기대로 1155 , 101동 1703호 (장당동, 제일하이빌1차아파트)"
 },
 "fb910456-4086-477c-abf5-3727b8d169be": {
  "contractId": "57843153-3bef-4c22-bcac-0daf98e977c2",
  "customerId": "5ed5ecc6-8189-4c2d-b454-fb84f823292a",
  "address": "(17937) 경기도 평택시 안중읍 안현로서9길 164-20 , 105동 604호 (화현마을우림필유)"
 },
 "1a67603d-9a86-4d86-855d-4e1d95444063": {
  "contractId": "a54f5004-5bb1-4da7-b513-b5a2dea93473",
  "customerId": "1afbdd21-c32e-4139-925e-e189548c6bd7",
  "address": "(12771) 경기도 광주시 상태길 51 , 103동 401호 (신현동, 휴먼시아빌)"
 },
 "c6e62268-e151-472e-95e0-09defc73f3ca": {
  "contractId": "d7c301a3-1120-4e59-a40c-baecd9e31232",
  "customerId": "40e28a36-8379-4fe3-8257-5bef1c047907",
  "address": "(6581) 서울특별시 서초구 동광로33길 10-17 , 202호 (반포동, 반포빌라)"
 },
 "6d7708de-df12-40aa-93e9-0a68a7a9acae": {
  "contractId": "0be03629-f6dc-4c2c-8100-2fa5b5ca9548",
  "customerId": "bdea743b-7816-4557-87a4-84cdffa728ac",
  "address": "(15002) 경기도 시흥시 장곡로53번길 10 , 212동 404호 (장곡동, 숲속마을 아파트)"
 },
 "a59978fa-e217-4bd7-aed3-defefe53f43a": {
  "contractId": "7614846a-34d0-4d5c-a1b0-bf7769941e82",
  "customerId": "85b7a5ef-7857-4730-bccb-4fe58be3651f",
  "address": "(17961) 경기도 평택시 포승읍 서동대로 784 , 101동 1202호 (SR 친오애 아파트)"
 },
 "a8b3a514-a86b-48a4-8512-955e95bb1c1e": {
  "contractId": "f4568e00-4b98-4c9b-aa22-e83c51270907",
  "customerId": "c9630791-b1d3-460c-8d85-baab96d4b2ce",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 202동 1302호 (부영사랑으로)"
 },
 "912047c8-26c2-46fa-9470-3108dadbaffe": {
  "contractId": "1239f354-cb97-4a8a-b97a-556e6bf29263",
  "customerId": "61a29a96-39d9-4c75-90db-3de352c4338e",
  "address": "(21059) 인천광역시 계양구 계산새로5번길 14 , 101동 1506호 (계산동, 인정프린스아파트)"
 },
 "76eccd1e-3449-420a-8a10-e7fa57198b25": {
  "contractId": "033823e2-ee4f-4e2c-92cc-ddda28cbe943",
  "customerId": "034adbcb-3719-44c9-8ea5-58164a52f39e",
  "address": "(17932) 경기도 평택시 안중읍 안중믿음길 31-1 , 401호"
 },
 "a43eec9b-bada-48b6-a037-8af72870b277": {
  "contractId": "9630c908-5ef3-43e0-8b11-118777304501",
  "customerId": "4b13be81-76cd-4478-ac1e-e59d4277f3fe",
  "address": "(55148) 전북특별자치도 전주시 덕진구 세병로 85 , 501동 1202호 (송천동2가, 에코시티 데시앙 5블럭)"
 },
 "963ce500-d80d-4ca3-869d-9d805442b92f": {
  "contractId": "fc5f670e-7ab1-4e9a-9c10-8a899ef56137",
  "customerId": "818e1d1d-de67-4de0-bd23-392ea542febe",
  "address": "(17949) 경기도 평택시 포승읍 포승원정5길 12 , 301호"
 },
 "2d53ec69-387c-4911-a351-6055156d9718": {
  "contractId": "d1636e47-5116-464d-8cb2-e81d63794856",
  "customerId": "c0c81b8a-ed3a-476a-a6e9-785d2a83afbe",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 53 , 102동 1802호 (유승한내들퍼스트뷰)"
 },
 "5871ad07-f645-4052-8db6-56eb6737c7e0": {
  "contractId": "00420242-aa5c-4fc0-909e-20915432a9b8",
  "customerId": "5c28bbf7-866d-4646-a173-dfb9917bf798",
  "address": "(18613) 경기도 화성시 향남읍 상신하길로 295 , 603동 1502호 (서봉마을사랑으로부영6단지)"
 },
 "00f6d38e-321f-4c80-be48-a808713ae121": {
  "contractId": "71441d1d-9089-478f-9e9f-ed05631bd8f8",
  "customerId": "55f191ea-bf03-452f-aebb-7a7445a6f8aa",
  "address": "(16640) 경기도 수원시 권선구 서수원로 99 , 201동 1303호 (오목천동, 수원권선 꿈에그린 아파트)"
 },
 "518fe74c-bf13-451d-a43e-bdc843115b5a": {
  "contractId": "d633a188-f786-4f69-9ced-5993d6cc5a57",
  "customerId": "f017a63e-fc05-467f-a156-8d0e8424df08",
  "address": "(46762) 부산광역시 강서구 명지오션시티10로 16 , 203동 1401호 (명지동, 영어도시 퀸덤1차)"
 },
 "7c677f53-2c80-46ce-b265-aeb4c6075efd": {
  "contractId": "0831164d-523d-4a5c-94e7-a7cd35510f12",
  "customerId": "25851a3a-0b88-4ff6-9932-04952be8cdff",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 108동 103호 (부영사랑으로)"
 },
 "1c7f9e7a-8704-4ed3-874c-e2cce4be8e63": {
  "contractId": "f567eb90-dec1-469b-b9a4-488f8e984b87",
  "customerId": "4a60af36-230b-407a-bfb2-235a0a693a1c",
  "address": "(17936) 경기도 평택시 안중읍 안중로84번길 6-1 , 302호"
 },
 "1b11e04e-22d1-47a1-ab43-1204233864c7": {
  "contractId": "8ca75f76-b177-489b-90be-1a6cf4fbc29c",
  "customerId": "e017c221-4185-4737-bdc5-ce67caeaef49",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 101동 106호 (늘푸른마을)"
 },
 "b5970625-1d9a-4155-9675-ef1019f542c4": {
  "contractId": "31352b0b-8d5b-4366-ae72-6ce40c5af101",
  "customerId": "74f772f8-aa10-4fad-bfda-62f5b2bfaaa2",
  "address": "(18310) 경기도 화성시 봉담읍 상리3길 90 , 105동 1302호"
 },
 "59c72ffd-60f1-439b-9ed5-b780899b3e6a": {
  "contractId": "d2c5f43c-87f8-4d9d-beeb-fc55bba1650d",
  "customerId": "4657bb22-9a01-40ab-b0fd-a35752bdd3a8",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 , 202동 905호 (포승삼부르네상스2단지)"
 },
 "2fc8fdd9-c4ce-4219-a881-5d46db07745e": {
  "contractId": "91bde4d4-57ac-49f1-997a-003c2710527d",
  "customerId": "d0dcbc4a-65bf-459e-914a-4e710e650915",
  "address": "(21604) 인천광역시 남동구 독곡로48번길 9 , 101동 801호 (서창동, 서해그랑블아파트)"
 },
 "35124d63-68ec-41dc-8f74-a0e2258d1546": {
  "contractId": "47f47aee-6b70-4dcf-9832-b3210c1b328b",
  "customerId": "fae8c644-1a1a-4156-9e13-0282fbab3599",
  "address": "(32428) 충청남도 예산군 예산읍 벚꽃로155번길 50 , 103동 502호 (예산발연계룡리슈빌아파트)"
 },
 "c88c8368-6f1d-45e2-a566-730938ecdabb": {
  "contractId": "154f2f66-28da-4d3b-b7bb-fd318fcb3299",
  "customerId": "12a33187-64a9-4769-925c-add675411e3e",
  "address": "(27386) 충청북도 충주시 중앙로 85-1 (충인동)"
 },
 "f9b1310c-dcfd-4be0-9bbb-64e6c96c3419": {
  "contractId": "7f9987a2-607d-4fdf-90a0-610f045e5118",
  "customerId": "1c643663-277c-4ba5-b307-e62cd5aff9f3",
  "address": "(31502) 충청남도 아산시 온천대로 1323-25 , 101동 701호 (방축동, 아산KD아람채)"
 },
 "3a7e5660-fbd2-41c3-b49d-f7ac3dc38ee3": {
  "contractId": "2db819c6-8a40-4d78-a0cd-d7069cff4ced",
  "customerId": "5b827553-0a13-4816-877c-bd2d16e3a6a6",
  "address": "(18610) 경기도 화성시 향남읍 하길로 9 , 1111동 603호 (화성향남오색마을사랑으로부영11단지)"
 },
 "c74959e6-2f7a-47b8-97cb-6df3193ddc27": {
  "contractId": "eced699f-3e52-4667-a4cf-b98705c6417a",
  "customerId": "d8669d47-ab6d-421b-aac6-421201c2256e",
  "address": "(21434) 인천광역시 부평구 아트센터로 118 , 115동 502호 (십정동, 동암신동아아파트)"
 },
 "7ffefb06-e47d-41b9-b20f-d176196eb93a": {
  "contractId": "3021c34c-c675-4964-917e-8b8a3d3bc2bf",
  "customerId": "4e43a901-89c1-4aad-97a6-c0b11e7cd168",
  "address": "(8569) 서울특별시 금천구 독산로32가길 9-10 , 103호 (시흥동)"
 },
 "6bb026d4-21cc-4a95-af5f-c6e2acfd4812": {
  "contractId": "978d6e0a-b8c7-4504-ac13-6d13f67c11e9",
  "customerId": "14d14637-9082-4254-b946-f2afbcde0c83",
  "address": "(17941) 경기도 평택시 안중읍 송담5길 64-9 , 202호"
 },
 "60cee336-d727-4549-9f7d-cda516493da7": {
  "contractId": "cd760492-f288-4b6e-83e3-11efaefd1095",
  "customerId": "34ff480a-8a77-49e5-b0b1-7dcd1c56128e",
  "address": "(17955) 경기도 평택시 포승읍 여술1길 96 , 1007호 (서평택 삼익 마에스트로)"
 },
 "3a98e0db-bf27-45e0-9468-35951613fe93": {
  "contractId": "dcee582d-3664-467e-bea5-bc50475ae5de",
  "customerId": "91fdfa46-3574-45a2-86cb-20a793ff68c8",
  "address": "(17977) 경기도 평택시 팽성읍 신흥북로49번길 27 , 102동 1105호 (평택브라운스톤험프리스)"
 },
 "6d8f99be-e202-4e8a-8d05-e91a615409ea": {
  "contractId": "7b22f213-2c38-4ac3-86b2-23536d059208",
  "customerId": "6ef743e8-2aeb-44b0-8fc0-e7839ccff497",
  "address": "(8251) 서울특별시 구로구 고척로21다길 34-11 , 402호 (개봉동, 이레팰리스4차)"
 },
 "5115b021-ccfa-4344-a7b9-8a719af8cc72": {
  "contractId": "1359f5f5-bea8-4dd0-a805-bb6be72861c1",
  "customerId": "6a77dae1-8dac-4b1b-972a-d15725f9e126",
  "address": "(16667) 경기도 수원시 권선구 동수원로146번길 101 , 204호 (곡반정동)"
 },
 "0dd1765c-6975-46a1-9acc-8250bf1e8adb": {
  "contractId": "a1f28a7d-65ee-42e1-ac1e-5d20ec6950ec",
  "customerId": "2ab6267f-ca96-4fdb-a572-80aab91dd017",
  "address": "(17955) 경기도 평택시 포승읍 여술1길 100 , 516호"
 },
 "4d852e4f-8298-4f9e-be4c-9942be47b9d4": {
  "contractId": "ff5e62bd-93d0-43a8-8cd5-e5a9fb0dcc9e",
  "customerId": "0a218ee3-e804-44e3-a892-0c02eb1a813b",
  "address": "(18616) 경기도 화성시 향남읍 손개1길 3-38 , 301호"
 },
 "b75fb1c8-2bba-42fc-8b62-515c855f8fe9": {
  "contractId": "364db464-c2f5-4c1b-8d34-edcaa34e5102",
  "customerId": "0b01a161-0c44-4ca6-b099-d45c7bca1456",
  "address": "(32589) 충청남도 공주시 의당면 연수원길 115-21 , 102동 303호 (청룡신한1차아파트)"
 },
 "daa7d457-4f26-42b2-ac37-7e709a184927": {
  "contractId": "8bf69a26-d270-465f-b19e-0829377fc311",
  "customerId": "b6eeb472-d36d-4582-b7db-8a6b28a72fb6",
  "address": "(18610) 경기도 화성시 향남읍 하길로 9 , 1111동 902호 (화성향남오색마을사랑으로부영11단지)"
 },
 "d68a56a6-7f54-4d7d-b887-2d64eb58d53a": {
  "contractId": "ac50fefd-983c-427b-a961-e534969f3cf6",
  "customerId": "5f78d7a3-48ec-4263-b25b-040305b32f8b",
  "address": "(17737) 경기도 평택시 이충로 38 , 109동 1701호 (이충동, 반지마을주공아파트)"
 },
 "d7872459-3381-46ee-8175-37d6fc1ca6f7": {
  "contractId": "770d9ce2-9da1-4f61-97fb-d678f405b648",
  "customerId": "303e9dae-cda0-4d44-97da-444bf8615627",
  "address": "(5262) 서울특별시 강동구 암사길 32 , 4층 (암사동)"
 },
 "97192102-d4f0-4069-b1b9-d4933d147745": {
  "contractId": "fcd99566-f25a-468f-9a05-ba3b83ba8963",
  "customerId": "f3890c54-67b1-4a84-be63-97b5e19481c1",
  "address": "(17556) 경기도 안성시 원곡면 만세로 1409 , 310동 1604호 (원곡 제일 오투그란데)"
 },
 "c9363120-023f-4e93-9656-12ca8a81265e": {
  "contractId": "0c243267-1e35-4a1e-9aa0-6c44e03e6f10",
  "customerId": "28ed6d64-f76b-42bf-8817-ac136b2dcea1",
  "address": "(10097) 경기도 김포시 사우중로73번길 11 , 210동 903호 (북변동, 풍년마을청구한라아파트)"
 },
 "f37d6b5b-d420-4657-836d-4a9649f53e7b": {
  "contractId": "2c6ab4cb-36af-4d89-b2db-72c1a0b02d12",
  "customerId": "8ed58a29-33f3-4d50-b0ee-5931209a1909",
  "address": "(8207) 서울특별시 구로구 신도림로 78 , 302동 1902호 (신도림동, 신도림3차동아아파트)"
 },
 "d206b997-a90d-4cb4-8691-992dcc6acfa5": {
  "contractId": "12076025-90d4-4901-acf7-41e8794935df",
  "customerId": "199d7524-82d6-4b96-ab67-51a690dee341",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 103동 2304호 (힐스테이트 송담)"
 },
 "ffa5f970-f01e-4197-837d-96e909779c82": {
  "contractId": "ecbccb79-8103-4ad4-b06b-ea6cc5a92b63",
  "customerId": "854d0a22-b0c0-4e37-80b4-6901044ced1a",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 114동 601호 (부영사랑으로)"
 },
 "f7869467-c1b1-4137-b1fd-f38b63f836fa": {
  "contractId": "f8a14ce0-2b9e-46c3-aa59-a04bce4a9079",
  "customerId": "45a03355-5b7f-4611-a00b-746e4658a428",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 106동 206호 (이화마을 건영캐스빌)"
 },
 "74a7a266-a97d-4630-9b4c-a08a96d4fa66": {
  "contractId": "4c34db52-be3f-4684-acd5-7868d4ac3c02",
  "customerId": "eef5d635-e6d3-4460-ade0-0fb810a90b7b",
  "address": "(8309) 서울특별시 구로구 구로동로29길 16-15 (구로동)"
 },
 "39773612-e399-4819-b84b-1840b71981ba": {
  "contractId": "64befcd5-26ac-4117-aec8-643519bb9952",
  "customerId": "5455dd63-d388-49ae-b844-ad62df6b0e97",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 102동 906호 (늘푸른마을)"
 },
 "d8201008-2abf-41d6-bc83-47952d63cfcb": {
  "contractId": "2ccbbc7c-ed44-438e-8885-12bc262161c3",
  "customerId": "abf1d36b-9f88-4673-bc56-909339ca3cf8",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 , 202동 1101호 (포승삼부르네상스2단지)"
 },
 "ff4fdd10-da8a-4548-b7a0-8ad059f1a3c3": {
  "contractId": "cf169684-1f70-4f8b-965f-647bdbee9ffd",
  "customerId": "f2d6f749-2134-472f-b35c-35b50f30cb86",
  "address": "(22871) 인천광역시 서구 이음2로 30 , 614동 501호 (당하동, 대방디에트르 더 펠리체)"
 },
 "956b2b94-6a8f-4023-96c9-c4caaaeaa93b": {
  "contractId": "2b6d4148-7c87-4d23-b50e-ffc4eb79f23a",
  "customerId": "8f17464f-9279-43ef-8003-c694d226bb6e",
  "address": "(15855) 경기도 군포시 군포역1길 54 , 비씨팰리스 2차 901호 (당동)"
 },
 "aa369680-09fc-48da-932a-fecee7ab7d7b": {
  "contractId": "bb1bdce5-99c3-4c6c-8fb2-c3532f45907c",
  "customerId": "d80bc301-cc29-4590-ae5d-2b7f6def2f8e",
  "address": "(17941) 경기도 평택시 안중읍 송담2로 106 , 401호"
 },
 "8dce8899-0187-475c-8b0f-6c573376ac64": {
  "contractId": "7f07b14a-3bcc-4e42-b982-8e061c825db9",
  "customerId": "9fcdb8b9-3307-4721-af4f-47df50c48b89",
  "address": "(31122) 충청남도 천안시 동남구 복자1길 12 (성황동)"
 },
 "440df5b4-262c-4af1-b4c2-75ebf310555d": {
  "contractId": "dac2e3bd-e592-4fe7-becf-16e4776f5234",
  "customerId": "89c706c6-4c74-4207-a4c8-77ee76196585",
  "address": "(15231) 경기도 안산시 단원구 석수로 6 , 1007동 501호 (선부동, 주공아파트)"
 },
 "720ad62f-8c81-456b-b326-3a8cf5e6c955": {
  "contractId": "2216f4e1-4e83-4bdf-87c5-c09912bc4773",
  "customerId": "4eb7f64f-d677-4549-8cd1-1aff0713a023",
  "address": "(21539) 인천광역시 남동구 구월로372번길 90 , 104동 1904호 (만수동, 하우스토리 만수)"
 },
 "9f48ffd7-d5b0-4e11-a7e4-d2642940d58e": {
  "contractId": "a25c4031-e1d1-4475-a483-3ef3a88339ec",
  "customerId": "9d316e42-8cdd-41f7-890a-69a0e23ddd52",
  "address": "(17399) 경기도 이천시 진상미로2345번길 25 205호 (장록동)"
 },
 "36b5e0b9-ae7c-4e3a-b1d3-50ddc3376c6d": {
  "contractId": "39b28861-5b73-4791-bdcb-aa56a213c3fd",
  "customerId": "b5f9c240-d16f-4e3e-b066-0503951872a7",
  "address": "(17079) 경기도 용인시 기흥구 사은로126번길 46 , 302동 502호 (보라동, 민속마을 현대모닝사이드 아파트)"
 },
 "0360159e-c389-4756-81e4-8ab407047094": {
  "contractId": "7d785995-ad5f-4793-8c48-df3d4b30de26",
  "customerId": "37724e99-2514-40e1-96f6-d03aac8df420",
  "address": "(2475) 서울특별시 동대문구 제기로 22 , 302호 (제기동)"
 },
 "05a9deb2-5c7e-40ec-a98a-6c75f2e7c503": {
  "contractId": "6e843609-2571-494a-bba4-30235c4c0a3a",
  "customerId": "bcd52819-81fb-4364-942f-264f0cb5c777",
  "address": "(17971) 경기도 평택시 현덕면 서해로 470-27 ."
 },
 "8ff89a91-134c-4d91-bebd-b27cb2b7f287": {
  "contractId": "827d4792-8a1f-448e-a869-b902cf404a1a",
  "customerId": "ed5763f1-d6db-4fc8-891d-45ef28490e3b",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 102동 305호 (해군아파트)"
 },
 "4de96fb0-1768-4549-8124-a3f0f42b1b80": {
  "contractId": "c02689a8-3b0a-4d16-a418-2a1d4b24a9f1",
  "customerId": "35581b33-c305-445c-a4cc-58713ce39270",
  "address": "(16579) 경기도 수원시 권선구 세지로28번길 9 , 202호 (세류동)"
 },
 "559fe393-c239-411a-9409-514ce7b9b370": {
  "contractId": "505243d5-336e-43e2-8572-970ba146e798",
  "customerId": "733504d6-c2f3-4a3f-926e-be646adc3a69",
  "address": "(4400) 서울특별시 용산구 이태원로54길 58-9 , 2층 (한남동)"
 },
 "4f1836b3-1658-421a-9339-362636709509": {
  "contractId": "0bbab3f3-9cfe-4987-8181-c4579bfe1490",
  "customerId": "98d993fa-5b46-41e4-94d5-cefa324da6d1",
  "address": "(18560) 경기도 화성시 만세구 우정읍 수정고개길 102-5 ."
 },
 "a78138f8-0ec8-4b54-ac27-6dbf9de4e075": {
  "contractId": "9c055678-3ce5-4048-b848-2ec13cb90250",
  "customerId": "b3a18bc8-e8da-4dec-b90a-697f16c5d23e",
  "address": "(17928) 경기도 평택시 안중읍 서동대로 1832-23 , 104동 801호 (안중우림아파트)"
 },
 "c6c444f1-7eaa-4d8c-844c-ddaf037378d9": {
  "contractId": "52f8ca06-6eae-494e-8784-c648ba4942f6",
  "customerId": "98342d54-8f7f-41ec-bb4e-8b82f0425a54",
  "address": "(54405) 전북특별자치도 김제시 신풍길 146 , 103동 1001호 (신풍동, 제일오투그란데아파트)"
 },
 "57525d36-b6bb-400e-9995-461c0c033157": {
  "contractId": "f5386f2a-1358-4b4c-9609-1746b32ec304",
  "customerId": "26332d4e-47b6-4616-9c6a-6f39bd04e613",
  "address": "(14966) 경기도 시흥시 월곶중앙로70번길 12 , 102동 2001호 (월곶동, 부성파인 하버뷰)"
 },
 "73957b0e-3e65-4260-bd75-ad863c1a5582": {
  "contractId": "620ac3b0-0383-4924-9591-4df6a72deaa3",
  "customerId": "e73922ec-2f74-4cf7-aec4-4a1bb5260e18",
  "address": "(18615) 경기도 화성시 향남읍 상신하길로 65 , 1711동 1603호 (화성향남언덕마을사랑으로부영17단지)"
 },
 "b77a6040-a16a-45d0-899a-29e579a3f09a": {
  "contractId": "90cbead6-9e66-4b97-b1e4-b59d47b3ed87",
  "customerId": "a0a7a9a7-fe93-4283-b8bc-44b9221342d4",
  "address": "(17944) 경기도 평택시 안중읍 안현로서7길 79 , 107동 1201호 (늘푸른마을)"
 },
 "1d177ef8-7257-4c70-b898-43ce51c7e0d2": {
  "contractId": "5da0623a-b326-4fd8-aca4-5672db39a2c6",
  "customerId": "2ab71e29-3af7-49cc-92e4-3ae829f78b8c",
  "address": "(17809) 경기도 평택시 청북읍 청북남로 277 , 205동 603호 (부영사랑으로)"
 },
 "45843f0d-0b85-43b1-a5f7-421e168492f1": {
  "contractId": "ec6d5308-752c-43fc-9c89-a5758f1770ff",
  "customerId": "754817d2-ff0d-4bed-8443-92459f6131d5",
  "address": "(17802) 경기도 평택시 청북읍 청북남로 365 , 109동 901호 (브라운스톤청북)"
 },
 "446b5ef3-f9ad-40d2-a991-154a14fc84e1": {
  "contractId": "7e9bdcfa-2297-4d43-83dd-ab2e89ee1d90",
  "customerId": "636f9d1c-c616-4830-a617-6034f33edbcb",
  "address": "(27386) 충청북도 충주시 중앙로 85-1 (충인동)"
 },
 "35088513-6af4-480a-9006-644fd1fd6e1f": {
  "contractId": "b7c2868e-f867-4d56-8769-d5fd05c25cde",
  "customerId": "91791b35-5313-4d9f-9fe0-cc13ab4a56e7",
  "address": "(17931) 경기도 평택시 안중읍 현화중앙길 103 , 103동 1301호 (현대3차아파트)"
 },
 "f18aff31-240a-4042-8440-dc1bc86cfc73": {
  "contractId": "5af51d63-eb5d-4468-8aea-5d69a6c8dd43",
  "customerId": "c7b21223-74f5-4eab-a933-39103f766b64",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 103동 403호 (힐스테이트 송담)"
 },
 "c30f753c-e9ec-4b22-b2af-8d2d38385e05": {
  "contractId": "d5818ecf-f93e-48c4-8177-f945eb0a771d",
  "customerId": "26fd6cbc-0afb-4ebc-a54a-bbef3d5d57d7",
  "address": "(39650) 경상북도 김천시 공절길 41-17 , 102동 404호 (지좌동, 융석멤버스)"
 },
 "4b50b8a4-499d-4aca-9a70-913effdfc38a": {
  "contractId": "c3efd8b5-7a7f-4afd-8a4a-df98b8cd47ea",
  "customerId": "4be7468d-3591-4d5a-b645-d545fda7d55f",
  "address": "(22144) 인천광역시 미추홀구 경원대로864번길 114 , 205동 503호 (주안동, 주안더월드스테이트)"
 },
 "62ce2e84-bacd-4abe-acc1-ea717e86a72c": {
  "contractId": "04a31989-4902-4fa7-acdd-beee4311f9aa",
  "customerId": "748d2bf6-32d6-4a94-bb6a-eba7306197ab",
  "address": "(17870) 경기도 평택시 용죽1로 14 , 103동 201호 (용이동, 평택 비전 푸르지오)"
 },
 "4fc59662-95b2-4ff5-b886-a41876d0b352": {
  "contractId": "9d42f1d9-8758-40f3-a078-5c941f9ce0e0",
  "customerId": "cdb92521-7c0f-4671-b474-d8e467efe31a",
  "address": "(17158) 경기도 용인시 처인구 양지면 양지로63번길 17-8 , B동 301호 (더 스카이)"
 },
 "a8936e43-c801-4c6f-a81e-973449a86cde": {
  "contractId": "10861394-f2f2-4a68-8983-4141260e6c4d",
  "customerId": "fdcac7d9-d93a-4b3d-8021-0d1892c7d3eb",
  "address": "(17857) 경기도 평택시 비전2로 317 , 206동 1202호 (죽백동, 평택소사벌 반도유보라 아이비파크 2단지)"
 },
 "07131ba1-39a1-4a6a-888d-ab2c91c22790": {
  "contractId": "1c7a4c68-f3b1-4899-add7-d8114d6ebd5d",
  "customerId": "f45e4c36-4a0f-41c7-b9d4-928909465205",
  "address": "(31965) 충청남도 서산시 향교4로 8-13 , 110동 1401호 (동문동, 현진에버빌)"
 },
 "8260e57e-afe0-4141-837a-9317252dd6a1": {
  "contractId": "643f6057-a8de-4d99-ba77-d358ca0ce72e",
  "customerId": "0708da2d-62b5-4972-9702-0ef8b2c06505",
  "address": "(17962) 경기도 평택시 포승읍 연암길 59 , 115동 201호 (만도아파트)"
 },
 "b7ae72eb-3333-407d-9e4c-183cc76812e9": {
  "contractId": "cbdc76eb-9b72-4638-9121-d1eefdd34313",
  "customerId": "acda5364-8401-4cc2-bb0d-68f7567413f7",
  "address": "(17813) 경기도 평택시 포승읍 외원길 33-93 ."
 },
 "ed547668-6043-4332-99c0-9e70d344757f": {
  "contractId": "3815877e-a477-48bc-8857-5b34944bd44f",
  "customerId": "eb2aee5d-fc92-47ef-b7e4-9c82b0885c06",
  "address": "(17557) 경기도 안성시 원곡면 주정길 35-31 ."
 },
 "be5446a8-a094-4811-a566-41f3b5cbc064": {
  "contractId": "26f5deee-bb38-499d-929c-1594b45274ab",
  "customerId": "a2129588-3474-4f4b-b705-7c6198f63adc",
  "address": "(17804) 경기도 평택시 청북읍 안청로1길 92 , 504동 1304호 (사랑으로부영5차)"
 },
 "75d7cc1a-5bb8-4fae-85d7-ca9d650eeba0": {
  "contractId": "c5e45ba7-dd68-4487-bba9-22e63096a93a",
  "customerId": "6ad28e18-3867-4898-a7e2-6672a0c76de4",
  "address": "(17954) 경기도 평택시 포승읍 여술로43번길 18 , 205동 902호 (포승삼부르네상스2단지)"
 },
 "5478e59a-b1f2-4b5e-bb40-a41194922ab0": {
  "contractId": "7006bab1-0b09-44ca-ab7e-278dd9e6e95c",
  "customerId": "5edc5234-5da0-49b1-8007-cf42d3ad5579",
  "address": "(12197) 경기도 남양주시 화도읍 수레로1092번길 20 , 나동 404호 (약수빌라나동)"
 },
 "1e369167-92ff-4c26-a658-12bd21882c59": {
  "contractId": "02b0dadd-8de5-4215-8540-a76b824aaf0f",
  "customerId": "87488554-5338-42a1-b86f-51db8cd6ce58",
  "address": "(15473) 경기도 안산시 단원구 광덕2로 121 , 512동 302호 (고잔동, 안산고잔5차푸르지오)"
 },
 "8a85abd8-c127-4536-bad7-c9f92c23e79e": {
  "contractId": "7e1354b1-f312-4842-8e15-3bd1c2fe1807",
  "customerId": "607071fc-3492-4e4d-a1a8-ab3b647f0582",
  "address": "(2451) 서울특별시 동대문구 이문로9가길 14 , 401호 (이문동)"
 },
 "7c7cff1f-851f-497f-a0c7-359a5936106c": {
  "contractId": "c9eb138e-7dc6-4615-a6af-c5448ca020c3",
  "customerId": "59f0f052-2462-4a63-8632-78eb57fdfaf3",
  "address": "(11801) 경기도 의정부시 서광로 210 , 104동 1204호 (고산동, 의정부 고산 대방노블랜드 에듀파크 아파트)"
 },
 "1d2d3d7a-2954-4599-9ad5-101dfd98d1e8": {
  "contractId": "86e7bf45-3461-420a-8750-b19c38df72cb",
  "customerId": "d4aa03ae-67f5-42f5-b9c9-0b8eb574f423",
  "address": "(17802) 경기도 평택시 청북읍 청북남로 365 , 106동 304호 (브라운스톤청북)"
 },
 "112eccc6-d004-4c2a-838d-b9cef8477ae0": {
  "contractId": "4f1a7a70-5522-4563-8561-07280b6da4fb",
  "customerId": "1dbbf3b6-0313-48b7-a206-4cd0561fdcf5",
  "address": "(18014) 경기도 평택시 고덕국제2로 73 , 771동 2702호 (고덕동, 고덕신동아파밀리에엔에이치에프7단지)"
 },
 "8d60d180-d38b-4f78-abce-179b60b096c0": {
  "contractId": "f295d9fe-b2fd-46c7-abdd-9b8abc4edafc",
  "customerId": "f4ac7369-6b57-4820-9e50-ff65005bc004",
  "address": "(17954) 경기도 평택시 포승읍 포승공단순환로 403 , 106동 603호 (포승삼부르네상스1단지)"
 },
 "f5a05d90-ee69-449f-a811-9c6b8566bb3f": {
  "contractId": "d9f8e26b-011a-49f6-8b4d-45b0de5bddc2",
  "customerId": "e3b64627-b9e7-48b1-87c5-a0d03c0068da",
  "address": "(17950) 경기도 평택시 포승읍 2함대길 20 , 116동 803호"
 },
 "6afa7b92-efd8-47b0-be1f-229583e651bd": {
  "contractId": "e1d5a827-279a-4c77-b346-1512eefdff4b",
  "customerId": "1e490b9e-c63a-419e-bf04-2331936b7811",
  "address": "(17943) 경기도 평택시 안중읍 안현로서7길 45 , 102동 2003호 (서광미소마을)"
 },
 "59cc4206-d45d-49c8-9741-dce72c8eac6e": {
  "contractId": "982a8842-1cc6-4b12-b584-fd2eacdecbc0",
  "customerId": "6a73c904-71cb-439f-8c70-8264ec7c48af",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 108동 501호 (이화마을 건영캐스빌)"
 },
 "07a68aa7-c478-44e1-a9a0-a174f8de5d79": {
  "contractId": "c265aab5-4369-4a62-ab68-c1e8842e8c53",
  "customerId": "b4ef8faf-1984-4eb6-b4aa-7e35d8798e3a",
  "address": "(17884) 경기도 평택시 평택5로114번길 13 , 111동 1001호 (비전동, 현대이화아파트)"
 },
 "128dccdc-e2bf-4d86-b27f-65fc29e3ea8e": {
  "contractId": "f36a9cde-5d43-4ace-88bd-7410148446c0",
  "customerId": "be758c6e-cbc7-4b33-9d3d-c9acbf061814",
  "address": "(17794) 경기도 평택시 청북읍 고렴1길 80-5 ."
 },
 "ade41cf2-16f3-4956-9f89-759054d2e2d6": {
  "contractId": "cad282dd-82cc-4045-a6ef-e990e8ef122d",
  "customerId": "4b86bb70-c8ff-4234-ae9a-31b6d3613462",
  "address": "(17939) 경기도 평택시 안중읍 안현로서6길 61 , 106동 101호 (주공아파트)"
 },
 "f1dae7f7-0286-439c-8c6a-0f66c5e42a9c": {
  "contractId": "3f8817c9-d026-4e23-975f-6de1a59cc6fb",
  "customerId": "93a2b975-37f3-48f0-82b9-1c90c705d835",
  "address": "(12916) 경기도 하남시 미사강변서로 45 , 2205동 2205호 (풍산동, 미사강변동원로얄듀크)"
 },
 "ea69e004-72cc-43a9-bdc1-39b6836dd181": {
  "contractId": "595d65b0-e799-41f7-8c51-bf8cb7b27f1d",
  "customerId": "5ebf03fe-e756-42ea-8b1b-1636e29453be",
  "address": "(17809) 경기도 평택시 청북읍 안청로1길 12 , 111동 1501호 (부영사랑으로)"
 },
 "fb114167-0fb3-4188-a265-17bc9673b9a2": {
  "contractId": "df97c14a-4f73-4e38-b5c8-2ae4a91de02b",
  "customerId": "eb064edc-97f4-4101-8419-76ac9416996e",
  "address": "(51628) 경상남도 창원시 진해구 충장로 645 , 105동 1701호 (풍호동, 바다마을)"
 },
 "075c7e08-a4e2-46a0-99e7-97448766e981": {
  "contractId": "8b5d361d-07ec-401b-9ef9-b66346411e8a",
  "customerId": "5f963a1f-bf22-4a8d-96f6-bb1c56dc07d4",
  "address": "(17801) 경기도 평택시 청북읍 안청로4길 33 , 104동 401호 (풍림아이원아파트)"
 },
 "feebfd65-12c1-48f6-bda9-3eb882e25cb9": {
  "contractId": "9c40d551-871e-4e5a-bd3d-c2591c24647c",
  "customerId": "bface0a5-ee4f-4ea1-b9f7-67aaeb54f6a2",
  "address": "(17968) 경기도 평택시 현덕면 황산3길 28-3 ."
 },
 "8e2ccd8b-2387-49b1-bade-d5a65c0d6787": {
  "contractId": "b907d19c-aef4-4354-99bc-46c13bc022d3",
  "customerId": "a4c64686-e278-473d-bd9a-f313ff5ad1cb",
  "address": "(17945) 경기도 평택시 현덕면 운정1길 80 ."
 },
 "00bc0cce-d379-4c1a-b9aa-615bac79e589": {
  "contractId": "b53ade6a-7eb6-4e24-888e-5d8a38dde332",
  "customerId": "5da04490-718a-4f29-95f8-c4e91b0fa019",
  "address": "(17962) 경기도 평택시 포승읍 연암길 102 ."
 },
 "3c88b38b-9e29-451b-a229-b63a1fc6f552": {
  "contractId": "ee351c26-c24c-45b5-8107-c47ecb454ab8",
  "customerId": "b1f43a3b-1ac2-4a23-bf93-34e0a8e7acf0",
  "address": "(36305) 경상북도 울진군 북면 흥부길 77 , 다동 402호 (한중울진사원아파트)"
 },
 "43256a06-6332-4beb-b290-6a1ee16076b2": {
  "contractId": "7948b9dc-461b-4238-ba31-2105eb115a8e",
  "customerId": "65359896-2e48-4d85-ab7b-ede6c001cc18",
  "address": "(18305) 경기도 화성시 봉담읍 상리3길 111 , 403동 307호"
 },
 "17ff95ac-b4bf-48b1-ac63-ad9ad48ef70f": {
  "contractId": "b81a9d10-033e-42df-99f4-20d31e293a11",
  "customerId": "f6d43c28-866e-4479-b7fe-7302aa954b47",
  "address": "(17806) 경기도 평택시 청북읍 안청로4길 53 , 106동 1704호 (유승한내들퍼스트뷰)"
 },
 "7594bf2f-48d5-4057-a41e-024365773cf4": {
  "contractId": "18451cb1-fca9-4951-a071-be3b3a71f0e5",
  "customerId": "0ed0cffe-e6bd-41f8-a2ae-745a8aeba228",
  "address": "(4722) 서울특별시 성동구 금호로 173 , 109동 1104호 (금호동2가, 신금호파크자이)"
 },
 "8ea1d0da-5bde-4475-a58f-b7139db138c7": {
  "contractId": "1709529b-860d-4e8a-bc03-62576cdba051",
  "customerId": "a9e8a970-e669-49c1-a7c0-50f4539d2128",
  "address": "(2233) 서울특별시 중랑구 동일로95나길 12-3 (면목동)"
 },
 "600e5037-2f50-4e96-a62e-f27a5401ca9c": {
  "contractId": "960bb23c-b3f9-46fd-bac0-726a1089695d",
  "customerId": "16c4affb-63db-442c-8d0e-69496bcea587",
  "address": "(17946) 경기도 평택시 현덕면 현덕로 1251 , 108동 1003호 (이안평택안중역)"
 },
 "907a95fc-baa0-41fe-8923-21fe2fb38f75": {
  "contractId": "eff284a5-c10b-4390-ba36-13db313d0aa3",
  "customerId": "e661a89f-0ce9-4dc7-916e-cfc446bce0a4",
  "address": "(7263) 서울특별시 영등포구 선유동1로 14-16 , 301호 (당산동2가)"
 },
 "1debafdd-e267-467f-b620-d68846c3d931": {
  "contractId": "a2fed514-d6f1-458a-95fa-00c7c23aff05",
  "customerId": "7f3d18d5-aaae-4109-b274-c0f1da341a57",
  "address": "(18573) 경기도 화성시 우정읍 이화뱅곳길 49 , A동 101호 (이화원룸주택)"
 },
 "f21d15fe-487f-48ec-8a25-ac42632ff462": {
  "contractId": "4c84f7a4-59e7-4a38-b63d-f913ee830fd3",
  "customerId": "6ba652f8-c00e-4f00-a7ce-9b093c146789",
  "address": "(17931) 경기도 평택시 안중읍 안현로서9길 164-9 , 103동 1502호 (이화마을 건영캐스빌)"
 },
 "992ab547-3266-4836-92b2-5ec2b7cd3794": {
  "contractId": "caa330b6-eedc-45a3-aba2-d1b8a1b83184",
  "customerId": "50b8ff7a-5c60-4e10-bdb8-a8cc7d45fae6",
  "address": "(17952) 경기도 평택시 포승읍 포승공단순환로 462-13 , 402호"
 },
 "8ff84afd-1006-40af-b4a7-394cf88043f3": {
  "contractId": "ed52692e-cceb-41f3-bb00-dd02f22924f2",
  "customerId": "89f89d61-4102-46d8-b844-166dba5b3f48",
  "address": "(15629) 경기도 안산시 상록구 장화3길 19 , 301호 (사동, 태영아트빌)"
 },
 "1107529b-f86d-422d-a0c7-c9cfa6be5bb0": {
  "contractId": "25c7bdb1-ac3b-44f5-865e-543d9026f82c",
  "customerId": "ea6a2ea6-16cf-43bf-8cf4-f0b033fb7760",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 108동 1602호 (힐스테이트 송담)"
 },
 "b7922c8a-e5d0-48c1-bc35-646fdfded6ee": {
  "contractId": "6fbf82bb-d26d-446a-903b-f350ca1fb245",
  "customerId": "c1775807-7c4d-4ec9-a29f-ac391df7eac8",
  "address": "(13534) 경기도 성남시 분당구 동판교로 92 , 303동 602호 (백현동, 백현마을3단지)"
 },
 "432c68ac-cd66-44be-9fc5-586701f3f757": {
  "contractId": "2aee3dc4-2b2d-490c-b006-90bdf1db109b",
  "customerId": "d58abd1d-00e0-4866-9452-fa6db73316b3",
  "address": "(7648) 서울특별시 강서구 공항대로 382 , 203동 402호 (화곡동, 우장산롯데캐슬)"
 },
 "010b0842-e30f-440d-8e24-8e4422fcd10c": {
  "contractId": "f1588b97-6c28-48d0-8ba7-24920a6e7f19",
  "customerId": "bdff1fdd-4d50-43dc-b5a7-516e9f04e744",
  "address": "(18017) 경기도 평택시 고덕여염5길 30 , 3동 402호 (고덕동)"
 },
 "89c52f8c-dff1-4ff8-b2f3-e177228aebc3": {
  "contractId": "ca0708e1-b4b5-46d1-86c8-bcb592e8313c",
  "customerId": "296e7878-dac3-42d7-97f4-4ca769f2778a",
  "address": "(62246) 광주광역시 광산구 왕버들로132번길 35 , 609동 1701호 (수완동, 광주 수완6차 대방 노블랜드)"
 },
 "c84e3177-7aa4-4157-a66a-aa842c17efa5": {
  "contractId": "73716a4c-c21b-42fc-81e4-9459ded035ca",
  "customerId": "b4d7216d-c1d2-45d0-ad68-00fcccc549a1",
  "address": "(15399) 경기도 안산시 단원구 신각길 18 , 103동 2302호 (신길동, 안산신길온천역휴먼빌아파트)"
 },
 "b591dc03-09b7-480a-add0-7239416f0fab": {
  "contractId": "48fd9daf-0e6e-4b64-8468-1c907d621780",
  "customerId": "aeb44e09-3a85-4178-92f0-138ef5ac0830",
  "address": "(18284) 경기도 화성시 비봉면 비봉로 90-8 , 303호"
 },
 "f1b3a1e6-c652-426d-a980-a30a6e100c0c": {
  "contractId": "01a79c52-c249-4e2d-9798-4c514dd1b62b",
  "customerId": "ab3a3c9f-a120-4fe2-b195-e16c2959c91f",
  "address": "(18616) 경기도 화성시 향남읍 손개1길 8-1 , 203호"
 },
 "ffa0205c-03be-4cc7-84fa-fe9a5cc3c38c": {
  "contractId": "e3369805-ef5d-4b3f-8cfb-a643ad3ca7dc",
  "customerId": "76528dc4-e42c-4661-bb5a-d1abb80112bd",
  "address": "(15010) 경기도 시흥시 배곧4로 106-26 , 1005동 2601호 (배곧동, 시흥배곧한신더휴)"
 },
 "63106c73-ac09-45ae-a1c8-105a882f16bf": {
  "contractId": "cf4716d9-b03c-443f-a83b-66e3481ef47b",
  "customerId": "fb0c00e8-9f8c-4651-98fc-1db69b1345ee",
  "address": "(17954) 경기도 평택시 포승읍 여술로 74 , 101동 102호 (모아미래도1차)"
 },
 "5efc7e3c-89ce-4919-8f0a-4dd8767f7a43": {
  "contractId": "b9b81859-6bcf-4d9b-8a46-990bedbc5a78",
  "customerId": "941c1adb-5dca-43a4-9799-180859937e72",
  "address": "(17847) 경기도 평택시 평남로 996 , 101동 1302호 (비전동, 평택소사벌푸르지오)"
 },
 "b6f4eab6-25f5-4624-ac9f-f96ea6f1973b": {
  "contractId": "8ed66fd3-72ce-46c4-9aed-f17d9cb2ac95",
  "customerId": "c4c47f6a-d5d1-4e8b-83f2-39cf63c60f8b",
  "address": "(17941) 경기도 평택시 안중읍 송담1로 65 , 109동 701호 (힐스테이트 송담)"
 },
 "fe17096e-e71a-4ac7-a2de-2f9de9f26843": {
  "contractId": "88d8507f-df64-40d5-837b-a3512d4b406b",
  "customerId": "d19fd1f1-4ffb-486b-ad3a-978965df4a7c",
  "address": "(17938) 경기도 평택시 안중읍 안현로서6길 105 , 201동 302호 (현대아파트)"
 },
 "c6319f47-dd3f-4747-ab2b-35234214025d": {
  "contractId": "33aff27a-c1c9-4466-8e1d-2add3defc660",
  "customerId": "d562a289-8925-43a3-ad71-081f20b57503",
  "address": "(31530) 충청남도 아산시 신창면 서부북로 844 , 101동 1306호 (신일아파트)"
 }
};
