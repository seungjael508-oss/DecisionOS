import 'server-only';
import { createManagementSourceLookup, type ManagementIdentity } from '@/lib/move-in/ledger-management-source';

/** Immutable display source. Reservation dates never update payment or actual move-in. */
export const FLOORPLAN_RESERVATION_METADATA = {"source":"예약현황_2026_11_03_09_32_57.xlsx","sourceAsOf":"2026-11-03","sha256":"9bc82adc1d7aae05b0e074b1bb051244a1453811318319ec3f96b58a1788f906","completed":282,"duplicates":0} as const;
const reservations = [
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "9c3b931b-62d9-427a-a966-dd38637616c2",
    "buildingNo": "106",
    "unitNo": "203",
    "currentContractId": "d92b20bd-73d6-4003-9e50-1946cb04bcbb",
    "currentCustomerId": "2a548527-96cb-45c4-96e6-206c91e388bc",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7a2c4f14-1690-4509-86b3-a31e85b33a41",
    "buildingNo": "104",
    "unitNo": "2903",
    "currentContractId": "a94787fe-2cc1-4746-8a2a-c95ce3ca8d51",
    "currentCustomerId": "926b987e-8c7d-4431-a67f-2ae1b4ae59d0",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "543cec3e-900c-4928-990e-39c1eaf11c65",
    "buildingNo": "104",
    "unitNo": "2301",
    "currentContractId": "f0a9b9bb-4226-4594-9ad7-daa1923cf60d",
    "currentCustomerId": "da4aba89-60b2-4f9a-82f2-5d46177648f0",
    "movingDate": "2026-11-29"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c5ddd12d-9c0a-4dd2-9deb-5129118ae508",
    "buildingNo": "103",
    "unitNo": "801",
    "currentContractId": "7dc0d067-bfd6-4822-a6c7-73996dd4d09d",
    "currentCustomerId": "c9511e23-23f7-43ec-9909-12b612cf765d",
    "movingDate": "2026-11-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f51e4a62-20f0-45b6-896e-2286b19b3dd5",
    "buildingNo": "106",
    "unitNo": "2404",
    "currentContractId": "fa4d1359-b9fc-4fb3-8c9b-30763768505d",
    "currentCustomerId": "cfd1aafd-9384-4e70-91aa-011763060989",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1a2317e2-8340-462e-afb0-8113b188e20f",
    "buildingNo": "105",
    "unitNo": "2304",
    "currentContractId": "eb5d2348-9708-42ef-b738-950cec92e417",
    "currentCustomerId": "18909731-5771-449f-b75a-8307aa5ed630",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1d66d5bb-e43f-4328-b638-a1e293d223f2",
    "buildingNo": "106",
    "unitNo": "2504",
    "currentContractId": "a6c27998-3b4f-442a-8b1c-4ce85337af4a",
    "currentCustomerId": "07b901ef-823b-48b2-8244-23e57e4bd69f",
    "movingDate": "2026-11-15"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "be391f27-52ec-4c9d-be81-da5ac28e1471",
    "buildingNo": "101",
    "unitNo": "904",
    "currentContractId": "3e78c904-54fb-447a-8a21-dd89c75c1505",
    "currentCustomerId": "55a8619c-27fa-47cb-9585-14dd39a863b3",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a219f12a-244c-4c4c-af3d-98cafda5143a",
    "buildingNo": "103",
    "unitNo": "1002",
    "currentContractId": "1a84d2aa-445c-479b-a66d-e20efa40f11c",
    "currentCustomerId": "a5b5abc2-3997-4174-a413-45d13c4ca91e",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "cc8450e6-9194-4b70-bedf-d63c061c4e3f",
    "buildingNo": "104",
    "unitNo": "901",
    "currentContractId": "ee3d87a0-1137-4751-8437-296e2b48b258",
    "currentCustomerId": "f91da88c-1529-48de-bc9a-b3760f8f2aa8",
    "movingDate": "2026-12-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2f7563cb-540e-4793-a6ef-bbc13710faf6",
    "buildingNo": "105",
    "unitNo": "904",
    "currentContractId": "1418398f-bad5-44fb-a2b1-f31240bca2e5",
    "currentCustomerId": "9355979a-7817-49d4-9e43-a75eb465a917",
    "movingDate": "2027-01-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a0c34c06-93c6-4baf-9da5-f0042f0fb7df",
    "buildingNo": "107",
    "unitNo": "1004",
    "currentContractId": "4db467b0-8154-4164-9b4f-6b4989b9398f",
    "currentCustomerId": "f262f91a-e040-41e8-8ffd-2855e99f9c05",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "273e2213-65f6-456d-a3fc-c0fada97e350",
    "buildingNo": "105",
    "unitNo": "2803",
    "currentContractId": "2314e3f9-69e0-4ba1-abeb-23b9eb196852",
    "currentCustomerId": "3725c7f5-2f61-43bf-ad87-86ea6d05e278",
    "movingDate": "2026-11-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b88bd177-01a8-4771-9c2c-7e616eb50dba",
    "buildingNo": "101",
    "unitNo": "2501",
    "currentContractId": "ac5d9651-7d6c-4f68-9f5b-0e7c2ec7647e",
    "currentCustomerId": "bc36c488-17cb-40c5-9235-1c42a3b27eb3",
    "movingDate": "2026-12-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4248d077-1661-4cc1-8c55-e5f675b648ee",
    "buildingNo": "104",
    "unitNo": "1101",
    "currentContractId": "80ed0a59-39c3-4bed-9905-a21268ec6fa3",
    "currentCustomerId": "da04a13e-3920-41fe-bb4d-33c3cfde454d",
    "movingDate": "2026-12-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a2a48899-8ef7-46a5-a79a-d75f3dab90c3",
    "buildingNo": "102",
    "unitNo": "303",
    "currentContractId": "6356af76-11a7-46c0-bce2-400c3e5189d0",
    "currentCustomerId": "1bf04389-9f92-4d96-8c48-ee6162e130ea",
    "movingDate": "2027-01-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "600e5037-2f50-4e96-a62e-f27a5401ca9c",
    "buildingNo": "108",
    "unitNo": "2403",
    "currentContractId": "960bb23c-b3f9-46fd-bac0-726a1089695d",
    "currentCustomerId": "16c4affb-63db-442c-8d0e-69496bcea587",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "bf4ba32e-dbe0-4a0e-915f-3ab376fa0143",
    "buildingNo": "105",
    "unitNo": "204",
    "currentContractId": "b2c79848-21f7-4b5e-9e4f-e0ae5399e7fb",
    "currentCustomerId": "d2b7417b-0e44-474a-adea-6764a182e3e0",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1d5e33db-d618-4d74-a3c2-f7a874eaa472",
    "buildingNo": "101",
    "unitNo": "2502",
    "currentContractId": "27fdaa68-5ef4-4ac8-a94c-8249b17126fe",
    "currentCustomerId": "5716adff-5639-4f37-a412-18e1b4387326",
    "movingDate": "2026-12-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "05c186ad-e409-4491-a9ca-9c10ed8b5f56",
    "buildingNo": "105",
    "unitNo": "2403",
    "currentContractId": "e666c5fb-1770-47ee-b6a7-b3e5b66b8d04",
    "currentCustomerId": "b52cffa0-9292-40d7-b197-f9a634cf51cf",
    "movingDate": "2026-12-26"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c9a0d6e5-de7a-42ee-9110-0f7bda959a9b",
    "buildingNo": "103",
    "unitNo": "2101",
    "currentContractId": "5c01460b-9389-4e82-bd3c-c9ee04a5edd1",
    "currentCustomerId": "b686e509-1997-4f66-a75b-4148355e0d98",
    "movingDate": "2026-12-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "69b2ab43-f3dd-42ba-ba07-182395666c98",
    "buildingNo": "104",
    "unitNo": "2602",
    "currentContractId": "8d5127e8-84b2-4eb5-b95f-e9211ad4b3e7",
    "currentCustomerId": "bdbef915-d461-42e7-b259-45bce1fb8e84",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "32f6a830-eaca-4271-9ed9-01a8ba5fef03",
    "buildingNo": "104",
    "unitNo": "704",
    "currentContractId": "fedbba63-2543-4741-b402-091e9369ff93",
    "currentCustomerId": "11b2730f-4576-40d7-b994-af61c101c10a",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "32a16e95-fd7a-4a27-9999-c7150a4bc4cb",
    "buildingNo": "104",
    "unitNo": "1904",
    "currentContractId": "d8450fe5-176d-4f1f-ae5d-3eb4c8018a23",
    "currentCustomerId": "d7d50bcb-2691-4675-9595-1ef8b2ed1f3f",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e53d6ed7-12f1-49c4-9875-be44f4a424b0",
    "buildingNo": "107",
    "unitNo": "902",
    "currentContractId": "9094c8fa-fa6f-49a1-a0a6-6ff16c247aa0",
    "currentCustomerId": "148ee9aa-7245-48f3-b92d-076099005868",
    "movingDate": "2026-11-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "84ca432a-3986-4b35-8a45-1a3be89708fe",
    "buildingNo": "106",
    "unitNo": "1102",
    "currentContractId": "d114ff0d-16ad-4814-83c9-4c268edaf248",
    "currentCustomerId": "b4ef7647-4fd4-464b-bd4c-ec19b8e58811",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "62eb6121-17e9-4033-bb0a-67334d5caad2",
    "buildingNo": "103",
    "unitNo": "2704",
    "currentContractId": "6c9ed020-c6c7-4b97-92fd-890f517a4503",
    "currentCustomerId": "dbc1af58-0a43-4511-a6bc-f8e3efded0cb",
    "movingDate": "2026-12-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5878a0b6-45d5-4294-a5a1-d686adb7056c",
    "buildingNo": "103",
    "unitNo": "2203",
    "currentContractId": "6e127cca-1ce0-43f9-b708-64ccbf089e94",
    "currentCustomerId": "3db3f84b-ff86-4819-a265-2d3d52f6c0bb",
    "movingDate": "2026-12-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0115d700-1114-4373-adfe-d08146e6856c",
    "buildingNo": "106",
    "unitNo": "1902",
    "currentContractId": "353809b6-7bb8-42ad-8848-ff92d8e55a07",
    "currentCustomerId": "2ce9d5bb-6de2-4bd8-8915-b11a4ec1ddcd",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "386980f7-47fb-42cb-932c-8f9256cf9165",
    "buildingNo": "101",
    "unitNo": "1001",
    "currentContractId": "915eea8c-087f-436a-a502-df42ba49cc6e",
    "currentCustomerId": "74df125f-7cbc-488c-b4d4-57453609a04e",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "35088513-6af4-480a-9006-644fd1fd6e1f",
    "buildingNo": "108",
    "unitNo": "1501",
    "currentContractId": "b7c2868e-f867-4d56-8769-d5fd05c25cde",
    "currentCustomerId": "91791b35-5313-4d9f-9fe0-cc13ab4a56e7",
    "movingDate": "2026-11-23"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8dc668a9-f8bd-4adf-9431-c493cc3a95e5",
    "buildingNo": "107",
    "unitNo": "802",
    "currentContractId": "d598f6a5-d28b-47ed-ba33-e95386d2a558",
    "currentCustomerId": "f0de88c5-b1e6-4d62-a605-2be30dbdc3ff",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "720ad62f-8c81-456b-b326-3a8cf5e6c955",
    "buildingNo": "108",
    "unitNo": "1004",
    "currentContractId": "2216f4e1-4e83-4bdf-87c5-c09912bc4773",
    "currentCustomerId": "4eb7f64f-d677-4549-8cd1-1aff0713a023",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "af2b06af-bbe8-48ec-ad74-865aaaa83a5e",
    "buildingNo": "106",
    "unitNo": "801",
    "currentContractId": "22116a10-c4ba-45f1-9785-5754da945877",
    "currentCustomerId": "199e8600-5d01-4e34-948a-935b71d8c195",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2f53a701-a745-4636-bb7e-5c5b5f3485f5",
    "buildingNo": "104",
    "unitNo": "2701",
    "currentContractId": "68a9f0a1-a2bd-4cd3-8255-96938d095d7c",
    "currentCustomerId": "c07fb9dc-9cdc-4ec8-aeab-d9e611ed6af5",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d68a56a6-7f54-4d7d-b887-2d64eb58d53a",
    "buildingNo": "108",
    "unitNo": "604",
    "currentContractId": "ac50fefd-983c-427b-a961-e534969f3cf6",
    "currentCustomerId": "5f78d7a3-48ec-4263-b25b-040305b32f8b",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "19790c67-643b-4d23-8331-c590b1a402dc",
    "buildingNo": "105",
    "unitNo": "1103",
    "currentContractId": "15ff1a89-ec7e-4324-a29b-48b361df736f",
    "currentCustomerId": "fb62be7d-275c-4cc7-add0-b42fe4245938",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7c677f53-2c80-46ce-b265-aeb4c6075efd",
    "buildingNo": "107",
    "unitNo": "2503",
    "currentContractId": "0831164d-523d-4a5c-94e7-a7cd35510f12",
    "currentCustomerId": "25851a3a-0b88-4ff6-9932-04952be8cdff",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2e63ebdf-b35b-40af-9d80-40ebbc46e10c",
    "buildingNo": "102",
    "unitNo": "1601",
    "currentContractId": "bb054ae7-86ee-4da7-a5a2-f52f6caa5828",
    "currentCustomerId": "89353191-8b8e-4b91-8433-308e3437b4e4",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "77ce43d0-8eca-4b9a-b5c5-a6381b422583",
    "buildingNo": "102",
    "unitNo": "901",
    "currentContractId": "3466cb49-681d-4a2c-8d3e-73e0f652a3dc",
    "currentCustomerId": "320337fa-eb71-409f-8ed9-fa842b087b94",
    "movingDate": "2026-11-15"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8e5f8fd1-8d2a-4452-a72e-8f763318f9f1",
    "buildingNo": "101",
    "unitNo": "1401",
    "currentContractId": "1a622205-dee7-40c5-bf9f-58694996e7b5",
    "currentCustomerId": "141f1f0e-cafa-4c67-8973-a5e5a84335fa",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "00f6d38e-321f-4c80-be48-a808713ae121",
    "buildingNo": "107",
    "unitNo": "2403",
    "currentContractId": "71441d1d-9089-478f-9e9f-ed05631bd8f8",
    "currentCustomerId": "55f191ea-bf03-452f-aebb-7a7445a6f8aa",
    "movingDate": "2026-12-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c7059892-93d1-42cd-8553-a0b51a3817f4",
    "buildingNo": "107",
    "unitNo": "1104",
    "currentContractId": "149cdb77-4c48-4615-9171-44114c926d20",
    "currentCustomerId": "008eb04a-7f9e-44c6-b50d-e5859994b906",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "52d421a5-ab79-4e9c-b108-3901fed73376",
    "buildingNo": "107",
    "unitNo": "1602",
    "currentContractId": "0be263ae-d925-42e8-a3b4-ce17f010dc5c",
    "currentCustomerId": "ed197625-b00e-44f8-99b3-f197776b05c8",
    "movingDate": "2026-12-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c4ac3ff2-d3f9-4923-ae5f-54dbe91cb7a0",
    "buildingNo": "102",
    "unitNo": "1702",
    "currentContractId": "08dccb39-6c81-4bf0-8014-00f36436e65e",
    "currentCustomerId": "a350ed4d-7bb1-4dda-82ee-b007c7d81da1",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ba669308-b824-4524-871a-e8094d1e9083",
    "buildingNo": "107",
    "unitNo": "1301",
    "currentContractId": "1068214a-d576-4449-b598-bdd210c1bd16",
    "currentCustomerId": "4c620485-3e4e-44d5-be8c-0244c73096a9",
    "movingDate": "2026-11-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "bd61d36e-506a-4876-b5e9-0dd643161f1b",
    "buildingNo": "101",
    "unitNo": "2604",
    "currentContractId": "0b9ade8d-7b6d-4e14-a74d-b2947d644b28",
    "currentCustomerId": "89e42538-5cbc-42e0-a3f9-6bd5715f058a",
    "movingDate": "2026-12-31"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "51e046fb-d04e-49cc-be47-b42ffd247b7b",
    "buildingNo": "101",
    "unitNo": "404",
    "currentContractId": "5ad8b738-3ade-4676-803b-20f4bbafda1d",
    "currentCustomerId": "2a87fdfd-813a-4808-b4e1-65773cee8359",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5693e1d0-cb61-4602-ae17-1ba95dcf7209",
    "buildingNo": "105",
    "unitNo": "1403",
    "currentContractId": "01639b9b-a4bd-41aa-baea-fbd07cae4b8c",
    "currentCustomerId": "2df87e0b-79bf-4830-9be0-124f00113083",
    "movingDate": "2026-12-23"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8ff89a91-134c-4d91-bebd-b27cb2b7f287",
    "buildingNo": "108",
    "unitNo": "1201",
    "currentContractId": "827d4792-8a1f-448e-a869-b902cf404a1a",
    "currentCustomerId": "ed5763f1-d6db-4fc8-891d-45ef28490e3b",
    "movingDate": "2026-11-15"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "725bbf92-edbc-43e5-abb6-9df4c5ffd95f",
    "buildingNo": "103",
    "unitNo": "2201",
    "currentContractId": "7014c136-26a1-4164-b317-77372cb64ca0",
    "currentCustomerId": "dcd99e15-c995-47ee-a45c-d444e1f281ab",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "537a437a-9599-4ab8-b6b8-513f8755b8d5",
    "buildingNo": "104",
    "unitNo": "1404",
    "currentContractId": "d0d3e0eb-c333-4241-895d-33dd26b1136e",
    "currentCustomerId": "e1498e3b-d890-43b9-9e52-103dd22c7aab",
    "movingDate": "2026-12-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "cc3df856-8f11-4799-ab61-0518b35c457c",
    "buildingNo": "101",
    "unitNo": "2302",
    "currentContractId": "f82db3c0-477a-4b30-a7ab-ac33fc469b9a",
    "currentCustomerId": "a26f9614-9f82-42f1-83f8-bf5f1ac3eb82",
    "movingDate": "2026-12-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "495056c7-8c86-45d3-b310-d3bd9f687610",
    "buildingNo": "105",
    "unitNo": "1804",
    "currentContractId": "4deb5a3a-c71c-486a-a099-2919cfa69b0f",
    "currentCustomerId": "8857fe07-df14-486f-bfc7-1652d560e8a6",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ca66c814-b218-4d9c-9064-d7876d8826b8",
    "buildingNo": "105",
    "unitNo": "2204",
    "currentContractId": "9c440e43-754a-45ba-bd0b-973c68706d87",
    "currentCustomerId": "01f84500-1686-4545-99b7-0bf6e249623d",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5871ad07-f645-4052-8db6-56eb6737c7e0",
    "buildingNo": "107",
    "unitNo": "2402",
    "currentContractId": "00420242-aa5c-4fc0-909e-20915432a9b8",
    "currentCustomerId": "5c28bbf7-866d-4646-a173-dfb9917bf798",
    "movingDate": "2026-11-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3a7e5660-fbd2-41c3-b49d-f7ac3dc38ee3",
    "buildingNo": "108",
    "unitNo": "304",
    "currentContractId": "2db819c6-8a40-4d78-a0cd-d7069cff4ced",
    "currentCustomerId": "5b827553-0a13-4816-877c-bd2d16e3a6a6",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "21d0e1ee-655a-4968-8fcd-bd98bca70679",
    "buildingNo": "102",
    "unitNo": "2002",
    "currentContractId": "958c599e-c1bb-49aa-9d02-49c6fdb64efa",
    "currentCustomerId": "ddcfe1b9-1a14-44de-83d0-c5b988c40054",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "440df5b4-262c-4af1-b4c2-75ebf310555d",
    "buildingNo": "108",
    "unitNo": "1003",
    "currentContractId": "dac2e3bd-e592-4fe7-becf-16e4776f5234",
    "currentCustomerId": "89c706c6-4c74-4207-a4c8-77ee76196585",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ea238b60-a6ca-43da-98af-7acc31bd721a",
    "buildingNo": "101",
    "unitNo": "2504",
    "currentContractId": "ea761cb6-d3a9-4c5a-b16c-721ca30f8ad3",
    "currentCustomerId": "27ac7433-6a22-4d3b-a480-ce6f58b3e738",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "45f5c6c3-53a6-494c-ae5c-83c9363bb0b8",
    "buildingNo": "104",
    "unitNo": "1202",
    "currentContractId": "eb1c2d1d-7f29-434a-99c2-da42b9e2f33c",
    "currentCustomerId": "3c06a65b-020b-46a4-91ad-d7f13e310589",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "58ee5f19-41dc-4ab0-a26f-8f410acabe8f",
    "buildingNo": "106",
    "unitNo": "1503",
    "currentContractId": "657b11e0-9a9c-4033-8095-74c9292b3b85",
    "currentCustomerId": "c59fceef-d21a-4ad0-a935-c621860972f4",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3fe6b867-eb89-4a4f-a7d4-dbfc2f86a022",
    "buildingNo": "103",
    "unitNo": "1502",
    "currentContractId": "6c450362-63e9-41f1-9e6b-1fe5f3fd5d13",
    "currentCustomerId": "6290dc3e-d5f5-4054-9837-732591be745d",
    "movingDate": "2026-12-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5d4145a2-aef2-45c9-97d4-dabdc6dfdc5b",
    "buildingNo": "105",
    "unitNo": "801",
    "currentContractId": "801be069-6907-4d4a-bdb9-6b17918b0faf",
    "currentCustomerId": "9469b6d8-b85d-48de-bc77-25663d834a52",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ef42fe12-dc0a-4ca4-bccf-f281ca452c6c",
    "buildingNo": "104",
    "unitNo": "1704",
    "currentContractId": "d6cac865-108a-49da-a1d5-5ebc48b2e3be",
    "currentCustomerId": "49669646-fc87-44c7-9afe-b099146016c1",
    "movingDate": "2026-11-29"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b77a6040-a16a-45d0-899a-29e579a3f09a",
    "buildingNo": "108",
    "unitNo": "1401",
    "currentContractId": "90cbead6-9e66-4b97-b1e4-b59d47b3ed87",
    "currentCustomerId": "a0a7a9a7-fe93-4283-b8bc-44b9221342d4",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "fe657d2c-c477-46d8-b181-33ab38c1482b",
    "buildingNo": "106",
    "unitNo": "2702",
    "currentContractId": "ea156dc3-d7e6-4cf9-a106-f4ca1db2de5f",
    "currentCustomerId": "eef67922-d05a-4a5a-976f-37fd898cf5be",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "808e023f-c501-4d54-96f1-94af907b64d4",
    "buildingNo": "101",
    "unitNo": "2201",
    "currentContractId": "982984fd-3dd0-4b48-b5b4-6396124d1316",
    "currentCustomerId": "52b1a62c-207c-44ab-b065-f71233906b17",
    "movingDate": "2026-11-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e968df1a-3c3f-43ab-8667-91bdd3f49d2e",
    "buildingNo": "103",
    "unitNo": "402",
    "currentContractId": "cc1a7813-0289-4e94-a48a-a6df56d12596",
    "currentCustomerId": "c0c926e0-3fe4-4416-bdda-755c8aa3a75f",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "9d2f66a5-26e1-4639-9113-ee646367d339",
    "buildingNo": "103",
    "unitNo": "902",
    "currentContractId": "ef19efab-2e1b-4c08-a7d2-87bab7b0e941",
    "currentCustomerId": "9f57b19d-ffe9-4ceb-be3b-1d847a7394d8",
    "movingDate": "2026-12-24"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b5966a8a-5a12-4c5f-b767-96c37e627614",
    "buildingNo": "107",
    "unitNo": "1502",
    "currentContractId": "1a659475-3e07-4792-8712-2122f77f93a3",
    "currentCustomerId": "df5814e2-cd5d-443c-a57e-7b0671005de3",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4f1836b3-1658-421a-9339-362636709509",
    "buildingNo": "108",
    "unitNo": "1204",
    "currentContractId": "0bbab3f3-9cfe-4987-8181-c4579bfe1490",
    "currentCustomerId": "98d993fa-5b46-41e4-94d5-cefa324da6d1",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c7304a8c-e742-4c82-8efa-b556adb3dbb3",
    "buildingNo": "104",
    "unitNo": "2003",
    "currentContractId": "fa5c152b-3e8d-49dc-aa6c-30db2c1a74f7",
    "currentCustomerId": "d79f885c-100d-4ef5-9996-a93eee64a24a",
    "movingDate": "2026-11-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f18aff31-240a-4042-8440-dc1bc86cfc73",
    "buildingNo": "108",
    "unitNo": "1502",
    "currentContractId": "5af51d63-eb5d-4468-8aea-5d69a6c8dd43",
    "currentCustomerId": "c7b21223-74f5-4eab-a933-39103f766b64",
    "movingDate": "2026-11-26"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "adc3c129-9a63-4f49-b675-0055a6def3de",
    "buildingNo": "103",
    "unitNo": "1703",
    "currentContractId": "258507fa-c31f-46f2-b940-f4ffcb0acbc7",
    "currentCustomerId": "9dc46059-f2a8-4bad-a7f2-a2ee3145a1eb",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0360159e-c389-4756-81e4-8ab407047094",
    "buildingNo": "108",
    "unitNo": "1103",
    "currentContractId": "7d785995-ad5f-4793-8c48-df3d4b30de26",
    "currentCustomerId": "37724e99-2514-40e1-96f6-d03aac8df420",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f6baac02-d244-4b20-a1aa-624134f719c0",
    "buildingNo": "104",
    "unitNo": "1201",
    "currentContractId": "9be3ca92-87b1-4e14-a13c-24b79ac54e8e",
    "currentCustomerId": "b2a2234e-54b5-4dce-994d-994080ddbd7f",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f1b3a1e6-c652-426d-a980-a30a6e100c0c",
    "buildingNo": "108",
    "unitNo": "2704",
    "currentContractId": "01a79c52-c249-4e2d-9798-4c514dd1b62b",
    "currentCustomerId": "ab3a3c9f-a120-4fe2-b195-e16c2959c91f",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0fa428a5-d887-41e0-b980-92936f3ee512",
    "buildingNo": "106",
    "unitNo": "303",
    "currentContractId": "ddbfac0f-ad0e-40d2-87e7-eadb98ec1396",
    "currentCustomerId": "4b73a433-fe8b-4772-8363-4784f7e083d1",
    "movingDate": "2026-12-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e99ba336-6ee3-49e0-9539-041c29f1b412",
    "buildingNo": "107",
    "unitNo": "1804",
    "currentContractId": "d5fb1198-469d-426a-8839-8fcf2cedfd53",
    "currentCustomerId": "19bd1c63-ca11-4eaa-a367-1623515839ac",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b250afbd-56be-42f4-99a8-465d12e27fd2",
    "buildingNo": "104",
    "unitNo": "702",
    "currentContractId": "49d11b22-7e2b-4718-ab3d-9bd19a31eeb3",
    "currentCustomerId": "49ffb555-fa38-4f1b-98e2-b7a6bd68fef7",
    "movingDate": "2026-12-31"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "177fa28b-8df2-434f-9b1f-9330261b8579",
    "buildingNo": "106",
    "unitNo": "1701",
    "currentContractId": "97dda735-af0c-4b46-8c15-f18ae4a1b440",
    "currentCustomerId": "3817767d-48ea-45d8-87d6-52d57a144b13",
    "movingDate": "2026-11-22"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a1163685-443e-471f-bd09-056245b2f94a",
    "buildingNo": "101",
    "unitNo": "1203",
    "currentContractId": "999913f1-2809-47e4-97f6-fd141a2078d8",
    "currentCustomerId": "5eb77f0e-1420-4d9d-9bf1-4d4cdb01893c",
    "movingDate": "2026-12-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ab96e50c-d8d9-4911-82e4-fec4bd49f67b",
    "buildingNo": "104",
    "unitNo": "1304",
    "currentContractId": "0cf17a59-a17e-473d-8664-20b6dbeec3a8",
    "currentCustomerId": "40db23dc-f768-40d8-8c4a-44b51888c6ec",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "992ab547-3266-4836-92b2-5ec2b7cd3794",
    "buildingNo": "108",
    "unitNo": "2503",
    "currentContractId": "caa330b6-eedc-45a3-aba2-d1b8a1b83184",
    "currentCustomerId": "50b8ff7a-5c60-4e10-bdb8-a8cc7d45fae6",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c6c83766-716c-45a5-937b-6a48f09fc8f0",
    "buildingNo": "105",
    "unitNo": "1904",
    "currentContractId": "3651fb0f-1385-45bf-96bd-d0b70e606ae9",
    "currentCustomerId": "64927e6d-84ca-48b3-a9a9-9f869a1a23d2",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "687919cb-514f-41f0-bb37-c0d49175f7e5",
    "buildingNo": "102",
    "unitNo": "1404",
    "currentContractId": "f3fda28d-0ba2-48f2-a8d7-84cd3e334ae6",
    "currentCustomerId": "d10841b0-3777-4128-a064-1fee616a381f",
    "movingDate": "2026-12-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5414cf3c-d0ce-479c-a5b6-8d47b15cc009",
    "buildingNo": "107",
    "unitNo": "402",
    "currentContractId": "6bd80802-7758-4cf5-956a-17d92dede3ac",
    "currentCustomerId": "0d1a8848-e29f-45ef-807f-eaf2702b453d",
    "movingDate": "2026-12-22"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "094cacb2-d241-4cfd-8bf0-082d707ab6d0",
    "buildingNo": "106",
    "unitNo": "2604",
    "currentContractId": "7552a304-1976-401d-82c5-32b236839279",
    "currentCustomerId": "d3468f5b-abe0-47b5-8804-b071d763d639",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8c6b2188-aa3c-48d1-b9b9-a809b64da508",
    "buildingNo": "107",
    "unitNo": "204",
    "currentContractId": "8cd8efc1-d2f2-4ddf-850e-4e4fe247248c",
    "currentCustomerId": "29bf896b-e474-4f64-afa0-047a7a6fe1d8",
    "movingDate": "2026-12-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7947a052-2f71-40d4-9b7c-13e213252357",
    "buildingNo": "104",
    "unitNo": "504",
    "currentContractId": "ab07627c-0e5c-4720-940d-2388e7ce59f8",
    "currentCustomerId": "0b1d8ba6-e88e-49b7-8002-41a8ee1d714c",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c01d68d2-8218-49ba-85b0-c6f32a71b482",
    "buildingNo": "104",
    "unitNo": "2204",
    "currentContractId": "daea2106-dfcd-48c1-a651-b451de3deace",
    "currentCustomerId": "307bf412-feed-465a-8a50-b8d76a976cd9",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e14a96cb-b005-47d3-b206-589bc485028f",
    "buildingNo": "107",
    "unitNo": "1504",
    "currentContractId": "70d5c55b-4050-4061-9439-a88ae6867f08",
    "currentCustomerId": "35771b71-fcaa-41d0-9123-55dc3dc6eb60",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "75d7cc1a-5bb8-4fae-85d7-ca9d650eeba0",
    "buildingNo": "108",
    "unitNo": "1801",
    "currentContractId": "c5e45ba7-dd68-4487-bba9-22e63096a93a",
    "currentCustomerId": "6ad28e18-3867-4898-a7e2-6672a0c76de4",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c6c444f1-7eaa-4d8c-844c-ddaf037378d9",
    "buildingNo": "108",
    "unitNo": "1302",
    "currentContractId": "52f8ca06-6eae-494e-8784-c648ba4942f6",
    "currentCustomerId": "98342d54-8f7f-41ec-bb4e-8b82f0425a54",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ba2aa3c0-e82b-4115-9c2b-0dfceed3c225",
    "buildingNo": "101",
    "unitNo": "504",
    "currentContractId": "466a9349-e65c-4f66-b254-ef478494d716",
    "currentCustomerId": "d35fbae4-d9bd-489f-a770-7920cd2517f1",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2450c395-a45d-4c7b-9e26-6a65b6a2c3f2",
    "buildingNo": "101",
    "unitNo": "203",
    "currentContractId": "86f54b04-aec4-456a-ad59-e90d7cfb7044",
    "currentCustomerId": "dc88466b-cf5c-4095-a6c5-c1605b2327d5",
    "movingDate": "2026-12-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "fe8542af-5b87-4ca7-bd6c-7a30f1de755c",
    "buildingNo": "101",
    "unitNo": "1201",
    "currentContractId": "aad16897-963a-49c8-8a5e-546b5c83a5d6",
    "currentCustomerId": "382bf879-6daf-46cf-9602-77dd0a1ffe46",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ffa5f970-f01e-4197-837d-96e909779c82",
    "buildingNo": "108",
    "unitNo": "802",
    "currentContractId": "ecbccb79-8103-4ad4-b06b-ea6cc5a92b63",
    "currentCustomerId": "854d0a22-b0c0-4e37-80b4-6901044ced1a",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "32c716fd-ba72-4b21-b79b-4bc96f1a6735",
    "buildingNo": "102",
    "unitNo": "2403",
    "currentContractId": "e9f3a37d-b511-4292-bcbf-7ad9c21ddc6b",
    "currentCustomerId": "67ca7f14-d4b4-4b23-b0e1-b1105159d1e0",
    "movingDate": "2026-12-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "71d7df53-a7eb-4d3f-984a-6c299460e2c3",
    "buildingNo": "102",
    "unitNo": "2503",
    "currentContractId": "888a6205-22f1-448d-9a47-5ad9c857e8cd",
    "currentCustomerId": "ba2821bc-d49c-436e-8c2d-f755ce84f7d2",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ad0be78d-12af-46ad-8d60-e0cfb3d60058",
    "buildingNo": "102",
    "unitNo": "1902",
    "currentContractId": "9111e0da-e059-4cd1-a708-04d4d20be196",
    "currentCustomerId": "56058385-b363-4a67-ba43-c87127bf757d",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8d60d180-d38b-4f78-abce-179b60b096c0",
    "buildingNo": "108",
    "unitNo": "1904",
    "currentContractId": "f295d9fe-b2fd-46c7-abdd-9b8abc4edafc",
    "currentCustomerId": "f4ac7369-6b57-4820-9e50-ff65005bc004",
    "movingDate": "2026-11-15"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2f988082-8e00-473f-b533-c701f6919468",
    "buildingNo": "101",
    "unitNo": "2503",
    "currentContractId": "f30a619e-4efe-4683-96c0-e3f96a25a974",
    "currentCustomerId": "693e2812-9f20-467e-b1e7-d0b6846d2106",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e7da27a8-7254-4d5e-86ec-92fd08c07f58",
    "buildingNo": "107",
    "unitNo": "1901",
    "currentContractId": "2fb63808-5a5e-43fe-a963-9c6d0e1f4212",
    "currentCustomerId": "5260de9d-e59d-4574-a429-3ccc270480e0",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3927fa70-39c2-407f-a1c0-b432c002685a",
    "buildingNo": "102",
    "unitNo": "1403",
    "currentContractId": "b6b161cf-4d5c-4b0d-8f2c-d8ad11af4d84",
    "currentCustomerId": "b7fccd0e-ae70-4e99-8434-ed07afa805e6",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ce6346ff-4869-4932-8696-d681ce559dc8",
    "buildingNo": "103",
    "unitNo": "202",
    "currentContractId": "b624208d-92ad-4341-89db-c83a5715a026",
    "currentCustomerId": "f623b178-7f34-4bcf-82cb-561297a9ece0",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6bb026d4-21cc-4a95-af5f-c6e2acfd4812",
    "buildingNo": "108",
    "unitNo": "403",
    "currentContractId": "978d6e0a-b8c7-4504-ac13-6d13f67c11e9",
    "currentCustomerId": "14d14637-9082-4254-b946-f2afbcde0c83",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4db75e86-e04b-4b47-afb6-ee5af9c98608",
    "buildingNo": "107",
    "unitNo": "2004",
    "currentContractId": "01592a2b-f69a-4325-9beb-a3ab7898e191",
    "currentCustomerId": "73195305-a614-4579-abdd-f8428191d0d1",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0f4f279b-f4eb-4cfb-8b87-47ce7d7b4652",
    "buildingNo": "107",
    "unitNo": "203",
    "currentContractId": "51456333-4345-4dde-82e0-e3fe955eae7c",
    "currentCustomerId": "e9b20d56-ef12-4354-8312-0f5d60fe1b4e",
    "movingDate": "2026-11-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7036a346-484a-402a-b1c2-21443c0ff3bb",
    "buildingNo": "102",
    "unitNo": "404",
    "currentContractId": "cb02dfec-b705-4095-8911-bd92216280ca",
    "currentCustomerId": "dfa392be-0597-4e05-99f3-380a59db1bc0",
    "movingDate": "2026-12-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7e47a6fa-31e3-4cbd-a97d-ef52bc1b5f1a",
    "buildingNo": "103",
    "unitNo": "2501",
    "currentContractId": "b2bd6443-3684-4716-881c-e9b163aa8634",
    "currentCustomerId": "8128c47c-a2d5-4359-bf23-1b03351a7031",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7d73e2bf-ae85-413f-8f88-257df2f6cdeb",
    "buildingNo": "101",
    "unitNo": "2103",
    "currentContractId": "f3d19c75-f4c3-48f7-9b6c-c97117691bf5",
    "currentCustomerId": "17b1a267-9d14-4147-bcc7-fdda713b8622",
    "movingDate": "2026-12-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "254fc02d-3eec-47f1-a50c-8b49fd79b8dd",
    "buildingNo": "103",
    "unitNo": "2401",
    "currentContractId": "5a588421-d5db-44ae-9189-eea4e7a13405",
    "currentCustomerId": "dd7881e5-1354-4ecb-bb98-26cf26150229",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "60549998-0f38-4092-a2d8-041fd9496f75",
    "buildingNo": "101",
    "unitNo": "802",
    "currentContractId": "5ead96de-181f-4ecb-b86a-6ecfa27f1842",
    "currentCustomerId": "d3ed8f1e-f7f2-4719-8326-cc7bb100a157",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "daa7d457-4f26-42b2-ac37-7e709a184927",
    "buildingNo": "108",
    "unitNo": "603",
    "currentContractId": "8bf69a26-d270-465f-b19e-0829377fc311",
    "currentCustomerId": "b6eeb472-d36d-4582-b7db-8a6b28a72fb6",
    "movingDate": "2026-12-05"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ba2bea53-103b-46d8-848e-9c94a69d7de7",
    "buildingNo": "105",
    "unitNo": "401",
    "currentContractId": "6f93d2eb-a010-42a8-bac8-8a1051bd116e",
    "currentCustomerId": "25247aca-0aa6-4abb-b4af-d025e230cdc0",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "af48e1e9-241b-40d6-846d-33d64e141a99",
    "buildingNo": "101",
    "unitNo": "1803",
    "currentContractId": "9107cd89-1f5b-4ff0-8515-db18ed152abf",
    "currentCustomerId": "4f1c713d-1d0b-4196-81a7-d4d7ac85234d",
    "movingDate": "2026-12-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "07a68aa7-c478-44e1-a9a0-a174f8de5d79",
    "buildingNo": "108",
    "unitNo": "2004",
    "currentContractId": "c265aab5-4369-4a62-ab68-c1e8842e8c53",
    "currentCustomerId": "b4ef8faf-1984-4eb6-b4aa-7e35d8798e3a",
    "movingDate": "2026-12-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "07131ba1-39a1-4a6a-888d-ab2c91c22790",
    "buildingNo": "108",
    "unitNo": "1604",
    "currentContractId": "1c7a4c68-f3b1-4899-add7-d8114d6ebd5d",
    "currentCustomerId": "f45e4c36-4a0f-41c7-b9d4-928909465205",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "fb910456-4086-477c-abf5-3727b8d169be",
    "buildingNo": "107",
    "unitNo": "2103",
    "currentContractId": "57843153-3bef-4c22-bcac-0daf98e977c2",
    "currentCustomerId": "5ed5ecc6-8189-4c2d-b454-fb84f823292a",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3f038a53-9028-44aa-ada5-89d7a3617fe0",
    "buildingNo": "104",
    "unitNo": "1303",
    "currentContractId": "93d9fa57-9cd6-489f-80ff-bd1099f3a96f",
    "currentCustomerId": "0c380ccc-0da9-4e84-aa9d-5528280d3cd2",
    "movingDate": "2026-12-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4313b0dc-5257-4ecd-84c5-c927c5171cce",
    "buildingNo": "104",
    "unitNo": "1003",
    "currentContractId": "fb66487a-e448-4a7c-b770-acb27d7325b3",
    "currentCustomerId": "de071152-333c-48d0-b758-77cbff2b987c",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0dbb26ff-ec05-4c61-9834-cbb872f20ed9",
    "buildingNo": "107",
    "unitNo": "1204",
    "currentContractId": "fa43be79-dd8f-4387-98df-012015d6303e",
    "currentCustomerId": "1326e36a-ea1e-409a-975d-41f18a68593e",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "cf068619-a377-4af2-bc8c-6b825b599892",
    "buildingNo": "101",
    "unitNo": "1104",
    "currentContractId": "d511db12-abbf-448f-81a1-2b80c98e3708",
    "currentCustomerId": "d3261a69-5ab4-463c-ba26-9447b3900a91",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "debf53af-06e9-4599-9b15-e1d255c1034c",
    "buildingNo": "103",
    "unitNo": "2504",
    "currentContractId": "0f72d30e-df28-4d45-a3ea-8d8188cf6456",
    "currentCustomerId": "d843fa4c-4fda-40c6-9ab6-f6d83601057f",
    "movingDate": "2026-12-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4c8a8437-d89d-42be-8170-2bc646d52f07",
    "buildingNo": "107",
    "unitNo": "1302",
    "currentContractId": "a2a8069f-067f-41cf-b4e8-110edb5ead66",
    "currentCustomerId": "d2d8c127-5159-4a8b-8528-5415b37b5d94",
    "movingDate": "2026-11-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "895da3c1-6c04-4fc5-b57f-2f96f144fa8f",
    "buildingNo": "101",
    "unitNo": "1804",
    "currentContractId": "0abdf85c-9b14-4a1a-86c5-533507daf8e7",
    "currentCustomerId": "1c143333-5f2c-4f1a-87c0-b25da377c573",
    "movingDate": "2026-11-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "74513056-35be-4f8c-9f1c-eab00cea47b0",
    "buildingNo": "106",
    "unitNo": "1404",
    "currentContractId": "87168e05-0343-4dda-b66b-efc14deb2570",
    "currentCustomerId": "44c06c9c-bd36-4e3f-a631-4dbdd829007d",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "aec41501-d298-411d-afba-388817945e96",
    "buildingNo": "104",
    "unitNo": "1501",
    "currentContractId": "9d24b057-7a47-4bee-a0a8-6875ddbf082c",
    "currentCustomerId": "c1130b4d-1333-41a6-a2e4-bc8eb5055aca",
    "movingDate": "2026-12-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b0f2cfa2-46cd-4a27-beb3-cebd50e5de56",
    "buildingNo": "104",
    "unitNo": "1203",
    "currentContractId": "cb1010cf-6ee3-4482-9a6d-f18679397b45",
    "currentCustomerId": "ee568a73-8cd8-40bb-92eb-a5063a8afba1",
    "movingDate": "2026-12-26"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1c041837-1f27-4c19-9e36-f4b6ce88e16a",
    "buildingNo": "104",
    "unitNo": "1302",
    "currentContractId": "8fb271ba-1a29-483c-999e-53b93dfe8032",
    "currentCustomerId": "613c8c4e-b205-4b51-b23c-11fbfe032fb0",
    "movingDate": "2026-11-29"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "869900d9-7d76-448b-aea7-25e025fb9ce6",
    "buildingNo": "105",
    "unitNo": "1501",
    "currentContractId": "7253883b-e31c-449e-ba52-f03664106c60",
    "currentCustomerId": "c4dabc69-954c-4acf-a0d0-7b278773e0ef",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "07401947-8601-44a3-aa60-54a14387e34a",
    "buildingNo": "104",
    "unitNo": "2102",
    "currentContractId": "885ea05d-df44-4093-8a51-dea687b32baa",
    "currentCustomerId": "7aaa2729-ab1f-42d3-87f3-b83dcb325ce2",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7ad0dab8-b6e2-4bd7-8359-cd94ba71a641",
    "buildingNo": "102",
    "unitNo": "1603",
    "currentContractId": "39053176-2c33-495f-ae05-b0e14345705e",
    "currentCustomerId": "88f2368b-699e-4924-b075-7d8bfb76fb4a",
    "movingDate": "2026-12-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b886bb87-42b1-426f-8fd4-0d0eda1c0920",
    "buildingNo": "104",
    "unitNo": "2504",
    "currentContractId": "709de5e1-47a0-442d-9fbf-c207d2901af8",
    "currentCustomerId": "6d71912c-3026-4829-84f9-1c6b60c6da20",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6a7c35f6-0b71-451e-a0bb-ac3670b5e6af",
    "buildingNo": "107",
    "unitNo": "1702",
    "currentContractId": "093cb809-d3f9-47c6-ba32-3fd7ed34740b",
    "currentCustomerId": "b6eeafc0-944d-4bdd-a8cd-27096250b522",
    "movingDate": "2026-12-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8582f16c-a4ae-41e1-a122-050988819c93",
    "buildingNo": "101",
    "unitNo": "602",
    "currentContractId": "3ea19602-f71a-48a2-8f63-c11e7c27e6fe",
    "currentCustomerId": "d2898761-69b3-4f65-a180-7f1c0323ca40",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "10099c3d-03de-405d-a9e0-34ae86bf1478",
    "buildingNo": "101",
    "unitNo": "1604",
    "currentContractId": "c17105e2-ebc6-4c1e-856e-55f9cc818cd8",
    "currentCustomerId": "6f4168fc-218a-4a43-a89a-b58fd8c94398",
    "movingDate": "2026-12-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3f044fee-8720-46ce-9b3a-8135958a9bc4",
    "buildingNo": "103",
    "unitNo": "2602",
    "currentContractId": "a0526fde-438a-4dc5-a74a-4636c1bfa9f6",
    "currentCustomerId": "59d35b53-873c-458c-a634-204be45660ea",
    "movingDate": "2026-12-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7594bf2f-48d5-4057-a41e-024365773cf4",
    "buildingNo": "108",
    "unitNo": "2401",
    "currentContractId": "18451cb1-fca9-4951-a071-be3b3a71f0e5",
    "currentCustomerId": "0ed0cffe-e6bd-41f8-a2ae-745a8aeba228",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "36e339e9-fdd6-4bbd-88fb-00da472fce04",
    "buildingNo": "101",
    "unitNo": "2303",
    "currentContractId": "6d5c0f6b-7134-482c-9c3f-385403a227d7",
    "currentCustomerId": "463676cf-48fc-4bc8-b65f-b09eef4d957e",
    "movingDate": "2026-11-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1d57a0ba-e448-403a-adcb-ba8c679e111d",
    "buildingNo": "103",
    "unitNo": "401",
    "currentContractId": "d9b1d3e0-a9f2-4db4-8dde-d9b24446e51f",
    "currentCustomerId": "956fb66c-fc14-4f52-aa27-2da23e462dd8",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "59cc4206-d45d-49c8-9741-dce72c8eac6e",
    "buildingNo": "108",
    "unitNo": "2003",
    "currentContractId": "982a8842-1cc6-4b12-b584-fd2eacdecbc0",
    "currentCustomerId": "6a73c904-71cb-439f-8c70-8264ec7c48af",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d9869a5a-8894-40b5-8abb-e4927dde0c1c",
    "buildingNo": "104",
    "unitNo": "1803",
    "currentContractId": "a21101ff-2412-4572-8b4a-15b37cfdbdbd",
    "currentCustomerId": "31999f00-d092-473e-a118-a965f9dfc2a8",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d4fd26b2-e25a-4598-b080-09ba01185241",
    "buildingNo": "106",
    "unitNo": "1303",
    "currentContractId": "9f0c1f55-9766-4a2b-a246-7b7a1b116cac",
    "currentCustomerId": "88d58a18-a389-41b3-a2ce-c52a696cbb91",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b3686a7b-643d-4103-a2bd-21e77b4ee373",
    "buildingNo": "101",
    "unitNo": "603",
    "currentContractId": "f3ade911-ec7e-49ac-843d-f3e39d6b76fe",
    "currentCustomerId": "9dec642c-4dea-4193-89b7-c3cbd065b216",
    "movingDate": "2026-11-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6c0b43f0-30ce-41ab-abe3-fed68d6d0714",
    "buildingNo": "101",
    "unitNo": "2204",
    "currentContractId": "56f30171-52b7-48f4-bd96-8ee19d6e4c3f",
    "currentCustomerId": "8821ba1b-e4bd-4260-8f24-f045bb4f059a",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2a55e411-6bf7-4cfc-bbe6-d150d7767d1a",
    "buildingNo": "101",
    "unitNo": "2802",
    "currentContractId": "19c59dd5-6ef4-4ce3-9a30-feae80412f90",
    "currentCustomerId": "f7eb6032-e63d-48dc-8e4d-f39808e8574a",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2fc8fdd9-c4ce-4219-a881-5d46db07745e",
    "buildingNo": "108",
    "unitNo": "204",
    "currentContractId": "91bde4d4-57ac-49f1-997a-003c2710527d",
    "currentCustomerId": "d0dcbc4a-65bf-459e-914a-4e710e650915",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "9da5cf9f-343d-479f-b602-2d7793983aa7",
    "buildingNo": "103",
    "unitNo": "2701",
    "currentContractId": "c115c417-0626-4d05-874c-4cefc1509a57",
    "currentCustomerId": "07bf25a1-2b2f-4d1a-8a1f-84dc7f94dc4e",
    "movingDate": "2026-12-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ea69e004-72cc-43a9-bdc1-39b6836dd181",
    "buildingNo": "108",
    "unitNo": "2104",
    "currentContractId": "595d65b0-e799-41f7-8c51-bf8cb7b27f1d",
    "currentCustomerId": "5ebf03fe-e756-42ea-8b1b-1636e29453be",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "12798c36-e9dc-41b9-9151-da5f8f51542d",
    "buildingNo": "101",
    "unitNo": "2401",
    "currentContractId": "10f5c415-a33a-4f05-8a08-9b7821035ab5",
    "currentCustomerId": "a8c62c33-d2ff-472c-b4d3-1dde90c061ea",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8163cff8-53a9-466f-a56b-6735f306cded",
    "buildingNo": "101",
    "unitNo": "804",
    "currentContractId": "b85b9311-1054-4e99-85af-e1fc6102adb0",
    "currentCustomerId": "930cc90a-62e2-4f13-a08f-de4a26d308ba",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c7f02835-7abc-4fac-adb3-06cfc5798b67",
    "buildingNo": "104",
    "unitNo": "802",
    "currentContractId": "95aa017d-89c1-45d7-94bc-0071dc4d3b06",
    "currentCustomerId": "cf563f8d-932a-40aa-9c1b-96da9c6fc869",
    "movingDate": "2026-11-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b04522bf-8960-4c65-b80e-c91b49c4b44f",
    "buildingNo": "102",
    "unitNo": "1503",
    "currentContractId": "cb6362a7-1713-4ffd-ba1c-dbacf05c8ef4",
    "currentCustomerId": "ede6cb67-8acb-4e0b-8dcf-f2b737c41316",
    "movingDate": "2026-11-24"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "cacf50fe-25a9-4443-affe-6f020222f4b2",
    "buildingNo": "103",
    "unitNo": "1701",
    "currentContractId": "ee649fc1-1c83-4a87-9b58-1b9e9bd7dbcc",
    "currentCustomerId": "f08842d8-009d-46e0-97f3-fc5b8ea46979",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "aa369680-09fc-48da-932a-fecee7ab7d7b",
    "buildingNo": "108",
    "unitNo": "1001",
    "currentContractId": "bb1bdce5-99c3-4c6c-8fb2-c3532f45907c",
    "currentCustomerId": "d80bc301-cc29-4590-ae5d-2b7f6def2f8e",
    "movingDate": "2026-12-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2587076b-46ee-4b89-a10e-a554c7a763a4",
    "buildingNo": "107",
    "unitNo": "1904",
    "currentContractId": "b41c24d6-ff5d-4a0c-960d-53ba985a5576",
    "currentCustomerId": "eacc5a1c-5222-4481-8c83-3d4a14d84d8b",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8ea1d0da-5bde-4475-a58f-b7139db138c7",
    "buildingNo": "108",
    "unitNo": "2402",
    "currentContractId": "1709529b-860d-4e8a-bc03-62576cdba051",
    "currentCustomerId": "a9e8a970-e669-49c1-a7c0-50f4539d2128",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0cbcf92c-5f3a-4d3c-aa93-33c71d0dcdb5",
    "buildingNo": "102",
    "unitNo": "1302",
    "currentContractId": "0f84b0cb-080d-41a7-9e1c-23117e324edd",
    "currentCustomerId": "37c0e9e3-8048-42ba-8650-3fec037afc19",
    "movingDate": "2026-12-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "53227214-02eb-48fb-b94f-91aa76d01982",
    "buildingNo": "107",
    "unitNo": "1002",
    "currentContractId": "0ab2063b-4a6f-460d-960c-36dedccc6c2d",
    "currentCustomerId": "586262f0-8456-4f0c-a6c9-eb80dee548e7",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6e0eacd1-3fae-49b6-9211-22b67866fbe5",
    "buildingNo": "101",
    "unitNo": "503",
    "currentContractId": "c6170360-20d7-4489-bcba-b80789f9bcf4",
    "currentCustomerId": "4e02b1c3-c855-4bdd-a3ff-7e92059255b0",
    "movingDate": "2026-12-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "630265b9-12e3-4080-ad41-9292376c3e3b",
    "buildingNo": "102",
    "unitNo": "402",
    "currentContractId": "3b4b71e5-0a5c-4f4c-add0-f75dd37b8eb1",
    "currentCustomerId": "b3c017de-fe1f-4670-a16f-65ce20e6a7a3",
    "movingDate": "2026-12-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "57525d36-b6bb-400e-9995-461c0c033157",
    "buildingNo": "108",
    "unitNo": "1303",
    "currentContractId": "f5386f2a-1358-4b4c-9609-1746b32ec304",
    "currentCustomerId": "26332d4e-47b6-4616-9c6a-6f39bd04e613",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b5970625-1d9a-4155-9675-ef1019f542c4",
    "buildingNo": "108",
    "unitNo": "202",
    "currentContractId": "31352b0b-8d5b-4366-ae72-6ce40c5af101",
    "currentCustomerId": "74f772f8-aa10-4fad-bfda-62f5b2bfaaa2",
    "movingDate": "2026-12-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "520c313f-166b-49ad-bea6-7693f3b513e9",
    "buildingNo": "103",
    "unitNo": "1704",
    "currentContractId": "f96c72d8-c3a8-4166-84c3-081f3d0375df",
    "currentCustomerId": "d451dab6-4cff-4278-a9f6-586999f1f1ba",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8b033afc-f06e-45c2-9cbd-96f1d2fd4861",
    "buildingNo": "104",
    "unitNo": "1104",
    "currentContractId": "d1b042e8-8dc9-46a1-b512-c38ffcde568e",
    "currentCustomerId": "3a2286ff-66a1-4373-a598-c63d11c04b6b",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "dff2636b-e43d-411a-b011-6ba48e89b9e6",
    "buildingNo": "101",
    "unitNo": "903",
    "currentContractId": "cdbac913-cbe7-420d-bdc4-90df419534f6",
    "currentCustomerId": "5089421a-0b10-45f9-b10b-6c27dd815660",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "38b256b9-dd23-4113-ab69-ff9362ad23b3",
    "buildingNo": "103",
    "unitNo": "201",
    "currentContractId": "5bb67912-36ab-4e5a-9441-7bf490ea9941",
    "currentCustomerId": "434eb633-5721-48ec-b2ee-6623092944fd",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ae4e6a71-d630-4348-b94e-1386574bfd34",
    "buildingNo": "102",
    "unitNo": "703",
    "currentContractId": "d56f4131-2679-4bc8-a400-33c10ef66b75",
    "currentCustomerId": "d0ce938d-0eed-430c-b7cf-3d76106defe1",
    "movingDate": "2026-12-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4244771b-d4e9-4787-ae3c-6d9422e5de7d",
    "buildingNo": "102",
    "unitNo": "1803",
    "currentContractId": "b54f004c-68c4-4d1c-97ab-9c074b40acc5",
    "currentCustomerId": "f2545984-3e04-480e-8ba1-f2ff68e28af5",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "fda7c591-62c2-496b-bdee-8c47067b53ec",
    "buildingNo": "102",
    "unitNo": "2001",
    "currentContractId": "8d5ae16f-857b-41d7-8511-73732b609ff5",
    "currentCustomerId": "cdbe51c4-6381-4ede-89d7-6e87b870a8c0",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "17ff95ac-b4bf-48b1-ac63-ad9ad48ef70f",
    "buildingNo": "108",
    "unitNo": "2304",
    "currentContractId": "b81a9d10-033e-42df-99f4-20d31e293a11",
    "currentCustomerId": "f6d43c28-866e-4479-b7fe-7302aa954b47",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "07025ad3-4bc8-42b9-965d-2be15e14d467",
    "buildingNo": "104",
    "unitNo": "303",
    "currentContractId": "510db29c-d8e6-47e4-a1f8-02b487e36773",
    "currentCustomerId": "6206bb77-e993-4e36-8474-78baaa6b282f",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a529ce6e-bfdf-4ee9-b915-0bc1bf36f69e",
    "buildingNo": "105",
    "unitNo": "302",
    "currentContractId": "829bf869-c493-4cbb-b0f4-5084b86c8c47",
    "currentCustomerId": "cd200c84-7fcd-46b2-a0e9-4f1932174002",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2d53ec69-387c-4911-a351-6055156d9718",
    "buildingNo": "107",
    "unitNo": "2401",
    "currentContractId": "d1636e47-5116-464d-8cb2-e81d63794856",
    "currentCustomerId": "c0c81b8a-ed3a-476a-a6e9-785d2a83afbe",
    "movingDate": "2026-11-05"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c1f16c52-d3cd-4fec-8401-170ccb2aa8cd",
    "buildingNo": "103",
    "unitNo": "1102",
    "currentContractId": "62cf4360-5d06-447f-9c30-2b9215ee2ad1",
    "currentCustomerId": "7eb2d630-3a73-4ac4-b498-a8276ff41ad5",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b6f4eab6-25f5-4624-ac9f-f96ea6f1973b",
    "buildingNo": "108",
    "unitNo": "2804",
    "currentContractId": "8ed66fd3-72ce-46c4-9aed-f17d9cb2ac95",
    "currentCustomerId": "c4c47f6a-d5d1-4e8b-83f2-39cf63c60f8b",
    "movingDate": "2026-12-24"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "90a7bc08-be23-49a0-8d8b-9161bd571b30",
    "buildingNo": "103",
    "unitNo": "2104",
    "currentContractId": "6e07b95d-da3a-4aab-bdc8-d7dbf06f9826",
    "currentCustomerId": "37f98fe5-9867-4b8b-8b8f-9ef20906f457",
    "movingDate": "2026-11-22"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1d9d2e54-de96-4f47-b4ee-e61091653715",
    "buildingNo": "104",
    "unitNo": "902",
    "currentContractId": "3e4367e8-b9a9-4ef5-985f-04bd0d0d2bc1",
    "currentCustomerId": "e635e382-7aaa-4a47-8ec6-3ba9487b2f43",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "82cba8d1-6751-4635-857d-e8a658c93cfe",
    "buildingNo": "101",
    "unitNo": "2402",
    "currentContractId": "bd55e936-3b22-4441-8281-947b2bbb314f",
    "currentCustomerId": "4bc2fcc7-3caf-4032-82a3-a911b6d36370",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5478e59a-b1f2-4b5e-bb40-a41194922ab0",
    "buildingNo": "108",
    "unitNo": "1802",
    "currentContractId": "7006bab1-0b09-44ca-ab7e-278dd9e6e95c",
    "currentCustomerId": "5edc5234-5da0-49b1-8007-cf42d3ad5579",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "44e05da1-0f02-41bf-baf4-99e994a92eb5",
    "buildingNo": "102",
    "unitNo": "2304",
    "currentContractId": "32871fc9-e2bb-4de9-8fef-8c6f4bd3403b",
    "currentCustomerId": "912e61f4-26ca-445a-8f7a-d8a367f1852a",
    "movingDate": "2026-12-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b315bd3b-911b-4d49-ace8-ab8e525afc5b",
    "buildingNo": "102",
    "unitNo": "501",
    "currentContractId": "7951c6a5-3906-4e44-b2fb-e4dd2dde5505",
    "currentCustomerId": "fbfb8c16-a5f3-44bd-85ae-f7a40bc3214f",
    "movingDate": "2026-11-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c79f4a74-25b9-42a2-87d1-b0fd81c264b5",
    "buildingNo": "104",
    "unitNo": "1301",
    "currentContractId": "f896bd99-cfe5-4ed4-83de-0ffc6a9697e0",
    "currentCustomerId": "be6eb431-19ab-4fc0-997d-59212bcce309",
    "movingDate": "2026-11-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1e0bb57c-93f5-4151-80b8-dd425c95c7d6",
    "buildingNo": "102",
    "unitNo": "1001",
    "currentContractId": "e32312b4-224c-461e-bd3e-02399c6a2e13",
    "currentCustomerId": "007981b2-6804-440a-86c0-bae2b2db1dd6",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "b6bdc360-9e62-458b-89d6-3ae3672d2c54",
    "buildingNo": "105",
    "unitNo": "1401",
    "currentContractId": "fb8df3f3-c138-40a8-9bb9-68e974c8fd6f",
    "currentCustomerId": "ef25885c-3916-4dc8-a7a9-8c49c009ca8b",
    "movingDate": "2026-11-23"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8a85abd8-c127-4536-bad7-c9f92c23e79e",
    "buildingNo": "108",
    "unitNo": "1804",
    "currentContractId": "7e1354b1-f312-4842-8e15-3bd1c2fe1807",
    "currentCustomerId": "607071fc-3492-4e4d-a1a8-ab3b647f0582",
    "movingDate": "2026-12-12"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f5643f19-f058-4fc1-b634-598c1e9a5b9f",
    "buildingNo": "105",
    "unitNo": "402",
    "currentContractId": "e5f6f651-ce16-4b2e-9aa6-bb19a55d2cf6",
    "currentCustomerId": "84de0fec-0c2b-459a-b515-0c5ba0f2ad2f",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ed94fd32-7f4f-4e43-8971-b2530f418351",
    "buildingNo": "105",
    "unitNo": "1901",
    "currentContractId": "246ca068-2f5d-482a-a57c-6158798d3b23",
    "currentCustomerId": "3a29835e-2f6f-405e-bfb7-f1687952d639",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0cfff36d-12a6-48d2-960d-4d9fc4a93fec",
    "buildingNo": "106",
    "unitNo": "1803",
    "currentContractId": "b096882a-8255-4d61-8310-d06dca6acb3e",
    "currentCustomerId": "070a62c4-04b8-4c3a-b95b-2b5024dff868",
    "movingDate": "2026-11-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e01ebb09-a338-4372-a379-a484342c30ed",
    "buildingNo": "101",
    "unitNo": "1503",
    "currentContractId": "b8669f3a-be77-4f81-b806-37dfa919e441",
    "currentCustomerId": "e17eef0f-6cda-46dc-ac55-56ccbac09678",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "dd6c7a2a-49bb-4455-b082-b9ea358c9c5a",
    "buildingNo": "104",
    "unitNo": "2002",
    "currentContractId": "85f99e3a-a05e-4400-b388-952d33954d9f",
    "currentCustomerId": "84cecf19-e710-4de2-b62b-61caf1c45727",
    "movingDate": "2026-11-30"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e0e8e30a-8909-447a-8222-80421ac9a933",
    "buildingNo": "106",
    "unitNo": "2401",
    "currentContractId": "d78ffa82-f09d-4156-a5de-83fe3ed80589",
    "currentCustomerId": "4cb11380-511b-4c4d-a361-fbb0d2afb57f",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f557568d-bacd-4db9-972e-0db254cc3e77",
    "buildingNo": "107",
    "unitNo": "2102",
    "currentContractId": "3146b7d8-9e5a-4660-8e03-9f71c9ea31f3",
    "currentCustomerId": "ce164b93-fe57-49ea-803d-2cb59df50891",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "38cb0fdd-c4f7-4cc2-a87c-cfdca8f977ff",
    "buildingNo": "103",
    "unitNo": "701",
    "currentContractId": "d37daacb-6614-40f0-952b-0ccfda05d0f9",
    "currentCustomerId": "421656a7-668c-4300-b76a-a68c3b8036cd",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a1b2a09a-6f98-45fe-bdc8-1c0925e5a227",
    "buildingNo": "107",
    "unitNo": "1902",
    "currentContractId": "88326d46-d31c-4449-a340-943b82b3850b",
    "currentCustomerId": "9d104bbe-e545-4958-925b-f2a49b93f430",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6afa7b92-efd8-47b0-be1f-229583e651bd",
    "buildingNo": "108",
    "unitNo": "2002",
    "currentContractId": "e1d5a827-279a-4c77-b346-1512eefdff4b",
    "currentCustomerId": "1e490b9e-c63a-419e-bf04-2331936b7811",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a4182268-e49f-4818-bbad-a88da44fce6d",
    "buildingNo": "105",
    "unitNo": "604",
    "currentContractId": "b97b19f5-158e-42e9-a203-0d4d458bd716",
    "currentCustomerId": "2f5d1d6f-a64f-4468-89c7-4b3482d8f2fb",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1b11e04e-22d1-47a1-ab43-1204233864c7",
    "buildingNo": "108",
    "unitNo": "201",
    "currentContractId": "8ca75f76-b177-489b-90be-1a6cf4fbc29c",
    "currentCustomerId": "e017c221-4185-4737-bdc5-ce67caeaef49",
    "movingDate": "2026-12-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ad4ca02d-b801-4154-82ce-baaa4ae722b6",
    "buildingNo": "101",
    "unitNo": "2001",
    "currentContractId": "fd58ad82-fbbc-4873-a36a-11ec11e0c16a",
    "currentCustomerId": "c259ecc9-f086-4d2b-9598-49667cc0ecd6",
    "movingDate": "2026-11-29"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ff21ba05-a6a5-4977-9d14-d37b6457cc51",
    "buildingNo": "105",
    "unitNo": "901",
    "currentContractId": "b8fd1162-c505-43d0-97c0-c3dc3d15cc78",
    "currentCustomerId": "5b3ccaad-ccb6-4aec-b359-67484a4d1ab2",
    "movingDate": "2026-11-05"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a59978fa-e217-4bd7-aed3-defefe53f43a",
    "buildingNo": "107",
    "unitNo": "2203",
    "currentContractId": "7614846a-34d0-4d5c-a1b0-bf7769941e82",
    "currentCustomerId": "85b7a5ef-7857-4730-bccb-4fe58be3651f",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a92e7d31-001f-4bd4-aac8-2084c739e973",
    "buildingNo": "101",
    "unitNo": "1502",
    "currentContractId": "a1659f43-ceac-491b-801a-8ec2c92162c2",
    "currentCustomerId": "7c462b55-1c28-4d56-a110-3aa381f710d6",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c1be356f-3c44-43d4-87e0-ed8ca80ec7c8",
    "buildingNo": "104",
    "unitNo": "2304",
    "currentContractId": "be0845bc-2264-4a7d-8438-32d2ef506327",
    "currentCustomerId": "1aef5d45-4a92-4a6d-91a2-8c0e1d6753a9",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "5977555c-422d-41be-9f8a-e63b49181852",
    "buildingNo": "104",
    "unitNo": "2202",
    "currentContractId": "9cb8762c-f003-462c-8a17-377000ae75c0",
    "currentCustomerId": "ae5e4c65-227a-43f1-9557-d3c40f52031b",
    "movingDate": "2026-12-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "89c52f8c-dff1-4ff8-b2f3-e177228aebc3",
    "buildingNo": "108",
    "unitNo": "2701",
    "currentContractId": "ca0708e1-b4b5-46d1-86c8-bcb592e8313c",
    "currentCustomerId": "296e7878-dac3-42d7-97f4-4ca769f2778a",
    "movingDate": "2026-12-15"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "bf772472-081e-406f-8d42-792474bcb980",
    "buildingNo": "104",
    "unitNo": "104",
    "currentContractId": "d967503d-9427-4600-b078-13e59878c6be",
    "currentCustomerId": "40b6968a-2e01-4af0-b3dc-5f515faceab6",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f37d6b5b-d420-4657-836d-4a9649f53e7b",
    "buildingNo": "108",
    "unitNo": "704",
    "currentContractId": "2c6ab4cb-36af-4d89-b2db-72c1a0b02d12",
    "currentCustomerId": "8ed58a29-33f3-4d50-b0ee-5931209a1909",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8fa6cbf5-2c47-4f8b-a7aa-4d430ee3cb50",
    "buildingNo": "107",
    "unitNo": "502",
    "currentContractId": "57174129-7801-433c-b23d-15c9a2d9ecb5",
    "currentCustomerId": "474e26e2-ab7e-49f8-99a6-70486e0d5c5d",
    "movingDate": "2026-12-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ba327772-dbe1-422d-98e1-41c839595797",
    "buildingNo": "104",
    "unitNo": "903",
    "currentContractId": "759e5617-4c3b-4657-af92-042244e3335c",
    "currentCustomerId": "01edc7ac-f580-4b4e-8bb9-a24a4820454c",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a4abe969-9671-4960-8203-9d677d1316fc",
    "buildingNo": "107",
    "unitNo": "201",
    "currentContractId": "7e2b15ef-aa0e-418f-acf0-8fdd2cc4fceb",
    "currentCustomerId": "54a44604-87fe-45c1-a65a-1d380dae5aa2",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "23cb32e6-3b3a-4596-b806-93b5c23ae57e",
    "buildingNo": "101",
    "unitNo": "1304",
    "currentContractId": "e34b6efd-c70f-43da-8e64-88eda80f95e0",
    "currentCustomerId": "f8612ec7-ffed-4641-83b0-dd1c1bc40974",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1c970009-5792-468f-bd02-bdb67c06dd9b",
    "buildingNo": "101",
    "unitNo": "1301",
    "currentContractId": "ba412ced-d1fe-4b73-9c54-c50e016e7460",
    "currentCustomerId": "beb04f90-8c84-4015-a21b-da34673de132",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3b07c630-f8c1-4f61-a1e7-27cc7bcad635",
    "buildingNo": "105",
    "unitNo": "702",
    "currentContractId": "17d90dc3-3ed6-4dc0-a278-409795ec3a36",
    "currentCustomerId": "51b5db73-1a56-43d6-9a86-32c152c84de6",
    "movingDate": "2026-12-29"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f55dfd1d-f893-4ea8-ae57-80161ce773c8",
    "buildingNo": "104",
    "unitNo": "1004",
    "currentContractId": "19c93dfb-212c-49ca-a1a5-55a1fa896ea8",
    "currentCustomerId": "ecf333c7-5717-4882-964f-bf342bd93d1c",
    "movingDate": "2026-12-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "fb114167-0fb3-4188-a265-17bc9673b9a2",
    "buildingNo": "108",
    "unitNo": "2201",
    "currentContractId": "df97c14a-4f73-4e38-b5c8-2ae4a91de02b",
    "currentCustomerId": "eb064edc-97f4-4101-8419-76ac9416996e",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1d475f82-020d-47f7-a1b8-cbcc0e2f45dc",
    "buildingNo": "101",
    "unitNo": "2803",
    "currentContractId": "cda2f2ff-7264-40f6-a6b6-9dedf5defb24",
    "currentCustomerId": "c5bc1346-4f8c-49b2-ac2a-170ad35fc256",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a8b3a514-a86b-48a4-8512-955e95bb1c1e",
    "buildingNo": "107",
    "unitNo": "2204",
    "currentContractId": "f4568e00-4b98-4c9b-aa22-e83c51270907",
    "currentCustomerId": "c9630791-b1d3-460c-8d85-baab96d4b2ce",
    "movingDate": "2026-11-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2072cbf8-1ed0-4fec-8787-86b832abcb9f",
    "buildingNo": "104",
    "unitNo": "503",
    "currentContractId": "6b0edafe-5ed4-405e-868a-008ec404b33f",
    "currentCustomerId": "bc2a787a-31c3-473c-9504-a6d39a70ed44",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4f7e8c6d-921b-4575-9b3f-f732920ba6e2",
    "buildingNo": "102",
    "unitNo": "1604",
    "currentContractId": "53fbbd37-d562-480a-be64-295565162fed",
    "currentCustomerId": "9dcfd007-7784-4b5d-804b-cd0c83b140ea",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "918f2555-c492-4e55-acb2-f5ef82f32696",
    "buildingNo": "102",
    "unitNo": "701",
    "currentContractId": "c9bb6e9a-7cc5-4dbc-9b3d-408cb082cea3",
    "currentCustomerId": "c776917a-b969-4618-ad30-4b76438a8229",
    "movingDate": "2026-11-23"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f6873d9e-1c57-4230-871d-4fbba9b2f37b",
    "buildingNo": "104",
    "unitNo": "2303",
    "currentContractId": "b223bf2b-792d-4ccb-8186-2866aeebb6bf",
    "currentCustomerId": "d6dfda58-d8e7-4efc-affa-f8b1cac92aed",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "338f57cf-e47a-4228-b54a-dc3eea8cb70a",
    "buildingNo": "103",
    "unitNo": "2303",
    "currentContractId": "bddd1b5d-770f-4c92-aaac-7f5f4a3dc26e",
    "currentCustomerId": "fa56472e-79f1-4859-9f2a-2a8b21f064ea",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8d307202-17ff-4919-90e8-c59a06e5a15e",
    "buildingNo": "105",
    "unitNo": "2402",
    "currentContractId": "dd7f8c3e-e7ec-4c90-aa97-1429cb701979",
    "currentCustomerId": "c9bd6d49-1a1b-4433-a7f8-eb21f125b14d",
    "movingDate": "2026-11-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0c36be31-2c4a-4e76-9091-693100599599",
    "buildingNo": "102",
    "unitNo": "1204",
    "currentContractId": "92fcd227-87b8-4279-bc63-df4c99a660fe",
    "currentCustomerId": "982c508c-dc6f-4c7e-bfff-944604bf5671",
    "movingDate": "2026-11-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f2b021bc-9c51-40cb-976f-7fb090f3e7cd",
    "buildingNo": "104",
    "unitNo": "603",
    "currentContractId": "0edeac6a-7096-49b7-b384-30b052d33b6b",
    "currentCustomerId": "96120739-5375-49ac-8662-35e23e619346",
    "movingDate": "2026-11-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7effd2fa-d966-43a9-be5a-040db4cd4116",
    "buildingNo": "106",
    "unitNo": "403",
    "currentContractId": "a7939da8-ffcd-45e8-820f-5181861500b7",
    "currentCustomerId": "b15973b5-9dd6-4e72-8d76-77283786530b",
    "movingDate": "2026-11-23"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f80d7e9b-9426-4a76-959b-d4135a059f7b",
    "buildingNo": "104",
    "unitNo": "2302",
    "currentContractId": "bdfde151-1964-4b54-9b30-9afb09fdb4b3",
    "currentCustomerId": "786be387-8a5d-4397-a6d7-56047362c6b8",
    "movingDate": "2026-12-22"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e9fef98e-cd1f-4cda-98b7-19d9e70d4e42",
    "buildingNo": "104",
    "unitNo": "2203",
    "currentContractId": "564834a2-0ad0-4f5d-8cf3-8f4997e5f71e",
    "currentCustomerId": "ceec81d6-ca92-451a-b4f2-c4a54834c221",
    "movingDate": "2026-12-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7c7cff1f-851f-497f-a0c7-359a5936106c",
    "buildingNo": "108",
    "unitNo": "1901",
    "currentContractId": "c9eb138e-7dc6-4615-a6af-c5448ca020c3",
    "currentCustomerId": "59f0f052-2462-4a63-8632-78eb57fdfaf3",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d1162262-0990-46dd-9568-56ef06090172",
    "buildingNo": "101",
    "unitNo": "1501",
    "currentContractId": "61f8924d-e8d2-45e6-b328-d5fcb8fa1a4a",
    "currentCustomerId": "50a40d83-ced5-4279-a8b9-32ac3f8dcee6",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "00bc0cce-d379-4c1a-b9aa-615bac79e589",
    "buildingNo": "108",
    "unitNo": "2301",
    "currentContractId": "b53ade6a-7eb6-4e24-888e-5d8a38dde332",
    "currentCustomerId": "5da04490-718a-4f29-95f8-c4e91b0fa019",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "509a4cb8-e021-4097-91c7-1d9c6c17ccbe",
    "buildingNo": "101",
    "unitNo": "201",
    "currentContractId": "475439ff-baa6-4b7b-a659-ec9ff6e81203",
    "currentCustomerId": "a42e76d5-c9e7-4195-871b-67d3b596c619",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f5a05d90-ee69-449f-a811-9c6b8566bb3f",
    "buildingNo": "108",
    "unitNo": "2001",
    "currentContractId": "d9f8e26b-011a-49f6-8b4d-45b0de5bddc2",
    "currentCustomerId": "e3b64627-b9e7-48b1-87c5-a0d03c0068da",
    "movingDate": "2026-11-04"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "6ff3af5a-c866-417c-abcb-479499eab6e0",
    "buildingNo": "103",
    "unitNo": "301",
    "currentContractId": "01edb690-2e9b-458b-acf1-c8852f5bb383",
    "currentCustomerId": "e766e071-3343-4adb-b5ff-19f271b27ff0",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "811f4d10-30c9-4ff4-be0a-380cc3be6e67",
    "buildingNo": "101",
    "unitNo": "2403",
    "currentContractId": "a2cade8d-2f86-4e9a-986d-93b38c551d6e",
    "currentCustomerId": "8b6d458d-3a3e-49f2-9386-a028f8b3a778",
    "movingDate": "2026-12-24"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ccb8af1b-963d-444b-be6a-c977fbf61338",
    "buildingNo": "103",
    "unitNo": "904",
    "currentContractId": "e3ef7d4e-9706-4198-9113-59ec83d4e634",
    "currentCustomerId": "93f9e39b-3e0a-4b29-8292-64c71776eb9a",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "4c240ef2-47c6-43f1-84dc-e6dcfa52737d",
    "buildingNo": "105",
    "unitNo": "902",
    "currentContractId": "e5e3b6ba-a637-4603-9b47-c117750cb1ec",
    "currentCustomerId": "786f14a0-df0c-46a7-9aff-b9e5e1e2a723",
    "movingDate": "2026-12-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f8c5744d-84ae-404b-a80a-42c1e6a5a1c3",
    "buildingNo": "105",
    "unitNo": "1602",
    "currentContractId": "941a9e12-8dce-42eb-839f-99f336d0a61f",
    "currentCustomerId": "599c064a-6d10-4d28-b5ca-26b5366e209b",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3f6fe3ed-040b-4395-91fc-36649b934d6b",
    "buildingNo": "101",
    "unitNo": "1801",
    "currentContractId": "3ccf2af2-838f-4510-824b-8c241f8566e2",
    "currentCustomerId": "fd49ada4-93c3-4451-9eb0-f6f5cc48212d",
    "movingDate": "2026-11-10"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "dd5ddd11-51d6-48ad-a71b-fa691698b81b",
    "buildingNo": "107",
    "unitNo": "604",
    "currentContractId": "aa03880d-91fc-44b1-a3fc-d45daa9b3948",
    "currentCustomerId": "a993a791-6bf2-424c-9291-4a37783fb61a",
    "movingDate": "2026-11-08"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "17fa957f-b270-4f76-b985-a6b972d774f7",
    "buildingNo": "107",
    "unitNo": "404",
    "currentContractId": "b399dc2d-2e5f-49b9-9001-0588b0344c95",
    "currentCustomerId": "503e5721-55f6-4509-a9fe-de918c90ff60",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "248b8ad7-4f44-48da-af49-9d14bbf94b70",
    "buildingNo": "101",
    "unitNo": "2004",
    "currentContractId": "017a5de8-85c5-4448-bfd3-8e8f061bbba2",
    "currentCustomerId": "b0cb5d94-529b-42cd-ad6c-04a1a6bf1d14",
    "movingDate": "2026-11-25"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8260e57e-afe0-4141-837a-9317252dd6a1",
    "buildingNo": "108",
    "unitNo": "1701",
    "currentContractId": "643f6057-a8de-4d99-ba77-d358ca0ce72e",
    "currentCustomerId": "0708da2d-62b5-4972-9702-0ef8b2c06505",
    "movingDate": "2026-11-06"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "69338fc7-d8a1-47a9-b7d2-3248d34acd8c",
    "buildingNo": "106",
    "unitNo": "2701",
    "currentContractId": "26a3454b-0057-49a8-887b-767f43ffebba",
    "currentCustomerId": "46eec1ab-aa4d-4ab9-934f-024b34400e59",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "ceadd803-aa41-4fc7-9607-591c6b1e2fc8",
    "buildingNo": "105",
    "unitNo": "1502",
    "currentContractId": "b1f38006-0aea-4bff-849b-d9e3fad966d8",
    "currentCustomerId": "859d75e8-b88b-4922-bfa6-354ca8f68e69",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "a12e2ae2-18b8-4b62-b12e-9fd3666bc7f7",
    "buildingNo": "104",
    "unitNo": "904",
    "currentContractId": "ea59ba85-ad9c-4491-ba90-03caa2a616bc",
    "currentCustomerId": "ceb55d9e-7a55-4d53-ae22-d81d0c0b10c2",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "9c0c3683-9602-4167-a59a-888fe438ab25",
    "buildingNo": "103",
    "unitNo": "2903",
    "currentContractId": "187ec08b-a881-4916-98c5-ccb12a32fcfe",
    "currentCustomerId": "3086e08d-3870-43b4-baea-734508823855",
    "movingDate": "2026-11-21"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "559915f9-de8a-41f9-bb52-b711cf16cfce",
    "buildingNo": "105",
    "unitNo": "1704",
    "currentContractId": "eb67cd99-d072-47eb-a482-e082e8580568",
    "currentCustomerId": "16e63dcb-ac1f-4858-8318-831fd58e2ca0",
    "movingDate": "2026-11-07"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1e496f66-a606-45fc-a650-951493ef973e",
    "buildingNo": "102",
    "unitNo": "2003",
    "currentContractId": "28049248-7285-4dde-ae69-4371a0bfe73a",
    "currentCustomerId": "78608ee4-384d-4951-9ff3-bd0fb9122dba",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1107529b-f86d-422d-a0c7-c9cfa6be5bb0",
    "buildingNo": "108",
    "unitNo": "2601",
    "currentContractId": "25c7bdb1-ac3b-44f5-865e-543d9026f82c",
    "currentCustomerId": "ea6a2ea6-16cf-43bf-8cf4-f0b033fb7760",
    "movingDate": "2026-12-01"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7f548269-5410-4772-b621-9812814754a9",
    "buildingNo": "107",
    "unitNo": "904",
    "currentContractId": "72c3d153-1abd-4a41-9968-427833c41f46",
    "currentCustomerId": "267bff88-7124-4d5f-9620-3593444fef5b",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "075c7e08-a4e2-46a0-99e7-97448766e981",
    "buildingNo": "108",
    "unitNo": "2202",
    "currentContractId": "8b5d361d-07ec-401b-9ef9-b66346411e8a",
    "currentCustomerId": "5f963a1f-bf22-4a8d-96f6-bb1c56dc07d4",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3efac2f1-eeaa-4f66-9d8e-a36d122f2a80",
    "buildingNo": "102",
    "unitNo": "2103",
    "currentContractId": "a252281f-1e2e-4e88-a254-4b7e851f19e4",
    "currentCustomerId": "cff4936d-c8f7-4f85-b072-d327fdc7190b",
    "movingDate": "2026-12-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3504bdab-b036-4c89-9540-3274e2655633",
    "buildingNo": "101",
    "unitNo": "1202",
    "currentContractId": "00cef81c-817c-4dc9-b2e1-837a5feae1d6",
    "currentCustomerId": "f0eff380-2eb3-4130-a7a5-3e840d49b370",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "232d555f-3f45-45cf-9564-99153c827bfb",
    "buildingNo": "103",
    "unitNo": "2802",
    "currentContractId": "d1a2ffbe-87e1-47aa-8517-b2aa3c2249f2",
    "currentCustomerId": "1a4e49d2-8962-4f85-af3e-78a1dfc15f22",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7680e8b2-f9b0-4519-bf36-cc503c80e5b6",
    "buildingNo": "102",
    "unitNo": "1101",
    "currentContractId": "1d6a88d0-87f4-4493-8cc3-18b1e9dfa788",
    "currentCustomerId": "522cc781-1ab8-43bf-bd6a-5161f1c496b0",
    "movingDate": "2026-11-27"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "adad2c0f-19cf-4bae-aa71-785a00973b2c",
    "buildingNo": "104",
    "unitNo": "1602",
    "currentContractId": "63c6eeff-ede3-49dc-a28a-b54aac4c534d",
    "currentCustomerId": "384c7235-c9d0-4c75-82b0-b3dec681c3e1",
    "movingDate": "2026-11-18"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "85a3fe5b-a708-4c2d-bbb4-2a583c1779fc",
    "buildingNo": "102",
    "unitNo": "903",
    "currentContractId": "bed3b3d3-29c5-4ef4-a298-32d05b3e6d6f",
    "currentCustomerId": "ab110701-a0f7-4d21-866f-7495b22a97bf",
    "movingDate": "2026-12-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "36b5e0b9-ae7c-4e3a-b1d3-50ddc3376c6d",
    "buildingNo": "108",
    "unitNo": "1102",
    "currentContractId": "39b28861-5b73-4791-bdcb-aa56a213c3fd",
    "currentCustomerId": "b5f9c240-d16f-4e3e-b066-0503951872a7",
    "movingDate": "2026-11-20"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "85ae7849-1363-46fd-b822-bd6f51416b27",
    "buildingNo": "105",
    "unitNo": "2103",
    "currentContractId": "35fbfe2b-6fb0-4f04-8e9e-dc72a5b6767c",
    "currentCustomerId": "541631af-387c-47fd-a213-076283f563af",
    "movingDate": "2026-11-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8f5d0a6e-d9d3-4417-9fc9-c7022ff73b52",
    "buildingNo": "101",
    "unitNo": "502",
    "currentContractId": "2f40a576-f99b-43ef-b6a7-7963f3ed810c",
    "currentCustomerId": "343bf19a-f89a-463f-907d-e68c831187c2",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "02ff4385-4878-4fcf-9034-dccf1fbacb82",
    "buildingNo": "105",
    "unitNo": "2901",
    "currentContractId": "727fab7f-2cef-41ba-91b8-410ade17a9bf",
    "currentCustomerId": "bde73c52-6a28-475a-a1ca-398329a78abb",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e4f4c68c-0a51-4951-aa44-fbc783884ebd",
    "buildingNo": "105",
    "unitNo": "2501",
    "currentContractId": "3c4665c0-25f3-4c1a-b86e-e224e7535a30",
    "currentCustomerId": "dc0699d3-150a-446a-8040-804f27e87e38",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "8ff84afd-1006-40af-b4a7-394cf88043f3",
    "buildingNo": "108",
    "unitNo": "2504",
    "currentContractId": "ed52692e-cceb-41f3-bb00-dd02f22924f2",
    "currentCustomerId": "89f89d61-4102-46d8-b844-166dba5b3f48",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2823fd6f-e071-4932-941e-08ad50338161",
    "buildingNo": "105",
    "unitNo": "1101",
    "currentContractId": "75147d49-27dc-406b-ab05-4b93ea640b66",
    "currentCustomerId": "6ce0fd31-48bb-426a-b6e9-eb9606ceffc2",
    "movingDate": "2026-11-11"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "845abc3d-6a40-4fa1-94ed-0b71f5462be8",
    "buildingNo": "104",
    "unitNo": "2201",
    "currentContractId": "c3d98f8f-3e05-41fd-9c27-3fbbf335212b",
    "currentCustomerId": "dba954d0-8cb8-4a2f-8db1-515bde94b5d1",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1debafdd-e267-467f-b620-d68846c3d931",
    "buildingNo": "108",
    "unitNo": "2501",
    "currentContractId": "a2fed514-d6f1-458a-95fa-00c7c23aff05",
    "currentCustomerId": "7f3d18d5-aaae-4109-b274-c0f1da341a57",
    "movingDate": "2026-11-28"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "1352d846-9678-4c7a-b119-aa8884915180",
    "buildingNo": "101",
    "unitNo": "2704",
    "currentContractId": "2c44a0ff-510e-434c-935b-497077e9d779",
    "currentCustomerId": "dcb9d6d0-6f26-4b84-a312-6a367db51045",
    "movingDate": "2026-11-09"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c69e5ad1-db35-4727-a184-91cd9f45f032",
    "buildingNo": "103",
    "unitNo": "702",
    "currentContractId": "9d4faa4a-40bf-4a80-9b8d-58aa70d985f3",
    "currentCustomerId": "2fdf0a16-c230-4aab-8d6d-6023a58b4db2",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "c61d44fe-f200-43f8-9ce3-c4fa9b594a2c",
    "buildingNo": "103",
    "unitNo": "102",
    "currentContractId": "39b32d5b-a4b7-4d94-a086-1ac02587ae5b",
    "currentCustomerId": "ae8ca48a-c564-4162-a18a-2c910194deaa",
    "movingDate": "2026-11-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "0f778fa6-eb28-4653-870a-2a8bf486033a",
    "buildingNo": "106",
    "unitNo": "2601",
    "currentContractId": "23b60b89-16c4-4662-bfbb-c1304c458d4f",
    "currentCustomerId": "a50ed479-8d0f-4ec0-9a21-4f1edfb49563",
    "movingDate": "2026-11-14"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "2013e0ca-7db9-4a74-b867-e5f87bdc0852",
    "buildingNo": "103",
    "unitNo": "1202",
    "currentContractId": "84dd77c3-3901-4678-a5e9-fd1182f41a0a",
    "currentCustomerId": "1f2229ba-8a90-4b83-9bd2-e1f254417616",
    "movingDate": "2026-12-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "3e62ff23-90fa-4f27-840b-9d30b59a2f96",
    "buildingNo": "102",
    "unitNo": "1303",
    "currentContractId": "48742abb-7f97-45a0-b635-dfeb168cd2e5",
    "currentCustomerId": "8fcaff41-9fe2-4708-87aa-200fb2721930",
    "movingDate": "2026-11-17"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "e7ada73f-237b-40c1-91d6-ebfa73e69724",
    "buildingNo": "106",
    "unitNo": "1403",
    "currentContractId": "45214c0f-e718-416a-87da-62a849df209a",
    "currentCustomerId": "ca2b88a6-3c8b-4cee-bead-5d9ecc1e69bf",
    "movingDate": "2026-12-13"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "f2526414-a554-4eec-818a-2f5386c07d25",
    "buildingNo": "107",
    "unitNo": "1604",
    "currentContractId": "99574900-d371-467a-ac72-e12fffa41088",
    "currentCustomerId": "2f4e6cd4-13e2-4499-aced-be96bb761e15",
    "movingDate": "2026-11-19"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "7d9fade3-923e-4639-a16c-bd835ce3895d",
    "buildingNo": "102",
    "unitNo": "1504",
    "currentContractId": "6b22ec50-fbf3-456e-9d5b-bdeef577b938",
    "currentCustomerId": "3ffbb205-a6d8-4adc-bb56-5debfafcc459",
    "movingDate": "2026-11-16"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d2508f9d-16d9-436a-a250-91dc8322c645",
    "buildingNo": "107",
    "unitNo": "704",
    "currentContractId": "3aaabe9c-eefb-4bff-9e69-b43180e0c5ae",
    "currentCustomerId": "5bd000d4-3e08-4195-a6b5-f11af533119c",
    "movingDate": "2026-12-03"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "45843f0d-0b85-43b1-a5f7-421e168492f1",
    "buildingNo": "108",
    "unitNo": "1403",
    "currentContractId": "ec6d5308-752c-43fc-9c89-a5758f1770ff",
    "currentCustomerId": "754817d2-ff0d-4bed-8443-92459f6131d5",
    "movingDate": "2026-11-02"
  },
  {
    "projectId": "1283e198-5043-4027-96d6-edcc7a6686c6",
    "unitId": "d206b997-a90d-4cb4-8691-992dcc6acfa5",
    "buildingNo": "108",
    "unitNo": "801",
    "currentContractId": "12076025-90d4-4901-acf7-41e8794935df",
    "currentCustomerId": "199d7524-82d6-4b96-ab67-51a690dee341",
    "movingDate": "2026-11-25"
  }
] as const;

// Existing identity guard rejects another project, unit, holder, contract or coordinate.
const lookup = createManagementSourceLookup(reservations.map(r => ({...r, loanAgreement: 'UNKNOWN' as const, moveReservation: 'BOOKED' as const, problemHousehold: 'UNKNOWN' as const, managementReasons: []})));
export function floorplanReservationFor(identity: ManagementIdentity) {
  const row = lookup(identity);
  return { moveReservation: row.moveReservation, movingDate: row.movingDate };
}
