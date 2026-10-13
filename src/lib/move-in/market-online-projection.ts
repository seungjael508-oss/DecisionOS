/**
 * PII-free market projections. The exact-unit projection is keyed by
 * building/unit and is safe to join to the ledger. 0913.매물현황.xlsx is
 * retained as a reference-only source because its rows contain building and
 * floor but no exact unit column; no floor/price heuristic is used to attach
 * those rows to a current unit.
 */
export type OnlineMarketTransaction = "SALE" | "JEONSE" | "MONTHLY_RENT";
export type OnlineMarketListing = { sourceRowNo:number; unitKey:string; transactionType:OnlineMarketTransaction; salePrice:number|null; deposit:number|null; rent:number|null; observedAt:string|null; };
export type MarketOnlineListing = OnlineMarketListing;
export const ONLINE_MARKET_SOURCE_MANIFEST = { sourceFileName:"매물 현황.xlsx", sourceSha256:"c46348daddfda69bd75022ffd7ccc20fa727c5ac4b5e994f96704ebdc8c9a72f", sourceSheet:"푸르지오매물_0912", sourceRows:500, exactRows:104, ambiguousRows:33, unmatchedRows:6 } as const;
export const ONLINE_MARKET_HISTORICAL_SOURCE_MANIFEST = {
  sourceFileName: "0913.매물현황.xlsx",
  sourceSha256: "6624d9b8c7f51d3d5bc4ffe678e25e6f722bca515db4afed466e2e2866fbadbb",
  latestSheet: "20260913",
  latestProjectRowCount: 143,
  integratedSheet: "통합DB",
  integratedProjectRowCount: 1297,
  hasExactUnitColumn: false,
  exactUnitRows: 0,
  referenceOnlyRows: 143,
  reason: "동·호수 컬럼이 없어 정확한 세대 매칭 불가",
} as const;
export const ONLINE_MARKET_PROJECT_ID = "1283e198-5043-4027-96d6-edcc7a6686c6";
export const ONLINE_MARKET_LISTINGS: readonly OnlineMarketListing[] = [
  {
    "sourceRowNo": 2,
    "unitKey": "102-1404",
    "transactionType": "SALE",
    "salePrice": 465420000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 3,
    "unitKey": "107-2403",
    "transactionType": "SALE",
    "salePrice": 440500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 4,
    "unitKey": "101-2301",
    "transactionType": "SALE",
    "salePrice": 470400000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 6,
    "unitKey": "101-1102",
    "transactionType": "SALE",
    "salePrice": 437100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 7,
    "unitKey": "107-701",
    "transactionType": "SALE",
    "salePrice": 435990000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 8,
    "unitKey": "103-1302",
    "transactionType": "SALE",
    "salePrice": 400700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 9,
    "unitKey": "107-2302",
    "transactionType": "SALE",
    "salePrice": 458120000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 11,
    "unitKey": "105-2703",
    "transactionType": "SALE",
    "salePrice": 451700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 12,
    "unitKey": "104-2401",
    "transactionType": "SALE",
    "salePrice": 464200000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 13,
    "unitKey": "104-2001",
    "transactionType": "SALE",
    "salePrice": 478900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 15,
    "unitKey": "107-2303",
    "transactionType": "SALE",
    "salePrice": 440500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 16,
    "unitKey": "105-1204",
    "transactionType": "SALE",
    "salePrice": 509090000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 17,
    "unitKey": "103-2602",
    "transactionType": "SALE",
    "salePrice": 390190000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 18,
    "unitKey": "103-1101",
    "transactionType": "SALE",
    "salePrice": 418750000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 19,
    "unitKey": "106-2002",
    "transactionType": "SALE",
    "salePrice": 456150000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 20,
    "unitKey": "102-902",
    "transactionType": "SALE",
    "salePrice": 366500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 22,
    "unitKey": "106-1203",
    "transactionType": "SALE",
    "salePrice": 436300000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 23,
    "unitKey": "105-303",
    "transactionType": "SALE",
    "salePrice": 443300000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 24,
    "unitKey": "108-2303",
    "transactionType": "SALE",
    "salePrice": 495120000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 25,
    "unitKey": "102-204",
    "transactionType": "MONTHLY_RENT",
    "salePrice": null,
    "deposit": 40000000,
    "rent": 800000,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 26,
    "unitKey": "105-1603",
    "transactionType": "SALE",
    "salePrice": 414500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 27,
    "unitKey": "108-2803",
    "transactionType": "SALE",
    "salePrice": 491350000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 29,
    "unitKey": "102-1702",
    "transactionType": "SALE",
    "salePrice": 387270000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 30,
    "unitKey": "102-1401",
    "transactionType": "SALE",
    "salePrice": 420500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 32,
    "unitKey": "101-601",
    "transactionType": "SALE",
    "salePrice": 484300000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 33,
    "unitKey": "106-1202",
    "transactionType": "SALE",
    "salePrice": 489700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 35,
    "unitKey": "102-901",
    "transactionType": "SALE",
    "salePrice": 438260000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 37,
    "unitKey": "103-1104",
    "transactionType": "SALE",
    "salePrice": 489500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 38,
    "unitKey": "105-2704",
    "transactionType": "SALE",
    "salePrice": 486090000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 40,
    "unitKey": "104-2701",
    "transactionType": "SALE",
    "salePrice": 512350000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 9"
  },
  {
    "sourceRowNo": 41,
    "unitKey": "103-2803",
    "transactionType": "SALE",
    "salePrice": 474100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 11"
  },
  {
    "sourceRowNo": 43,
    "unitKey": "101-2202",
    "transactionType": "SALE",
    "salePrice": 445900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 44,
    "unitKey": "105-2104",
    "transactionType": "SALE",
    "salePrice": 454300000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 45,
    "unitKey": "106-2303",
    "transactionType": "SALE",
    "salePrice": 405500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 47,
    "unitKey": "104-2302",
    "transactionType": "SALE",
    "salePrice": 509020000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 48,
    "unitKey": "104-2402",
    "transactionType": "SALE",
    "salePrice": 496700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 49,
    "unitKey": "105-2604",
    "transactionType": "SALE",
    "salePrice": 443500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 50,
    "unitKey": "103-602",
    "transactionType": "SALE",
    "salePrice": 406500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 51,
    "unitKey": "101-1701",
    "transactionType": "SALE",
    "salePrice": 487150000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 52,
    "unitKey": "108-2304",
    "transactionType": "SALE",
    "salePrice": 501760000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 10"
  },
  {
    "sourceRowNo": 54,
    "unitKey": "103-902",
    "transactionType": "SALE",
    "salePrice": 390430000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 55,
    "unitKey": "107-1802",
    "transactionType": "SALE",
    "salePrice": 489700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 9"
  },
  {
    "sourceRowNo": 56,
    "unitKey": "105-1704",
    "transactionType": "SALE",
    "salePrice": 489700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 58,
    "unitKey": "107-203",
    "transactionType": "SALE",
    "salePrice": 389600000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 59,
    "unitKey": "106-604",
    "transactionType": "SALE",
    "salePrice": 451030000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 60,
    "unitKey": "106-2503",
    "transactionType": "SALE",
    "salePrice": 443490000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 61,
    "unitKey": "104-1101",
    "transactionType": "SALE",
    "salePrice": 441770000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 62,
    "unitKey": "106-1103",
    "transactionType": "SALE",
    "salePrice": 420700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 63,
    "unitKey": "103-301",
    "transactionType": "SALE",
    "salePrice": 407900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 65,
    "unitKey": "102-1203",
    "transactionType": "SALE",
    "salePrice": 461900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 8"
  },
  {
    "sourceRowNo": 68,
    "unitKey": "108-1204",
    "transactionType": "SALE",
    "salePrice": 489110000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 69,
    "unitKey": "108-2703",
    "transactionType": "SALE",
    "salePrice": 492150000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 70,
    "unitKey": "106-1303",
    "transactionType": "SALE",
    "salePrice": 400700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 72,
    "unitKey": "103-2402",
    "transactionType": "SALE",
    "salePrice": 440500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 73,
    "unitKey": "101-2501",
    "transactionType": "SALE",
    "salePrice": 511250000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 7"
  },
  {
    "sourceRowNo": 74,
    "unitKey": "107-803",
    "transactionType": "SALE",
    "salePrice": 405050000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 4"
  },
  {
    "sourceRowNo": 75,
    "unitKey": "103-102",
    "transactionType": "SALE",
    "salePrice": 388700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 76,
    "unitKey": "108-1203",
    "transactionType": "SALE",
    "salePrice": 452490000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 5"
  },
  {
    "sourceRowNo": 78,
    "unitKey": "102-1201",
    "transactionType": "SALE",
    "salePrice": 399880000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 5"
  },
  {
    "sourceRowNo": 79,
    "unitKey": "105-2803",
    "transactionType": "SALE",
    "salePrice": 485900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 4"
  },
  {
    "sourceRowNo": 80,
    "unitKey": "102-2204",
    "transactionType": "SALE",
    "salePrice": 498990000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 4"
  },
  {
    "sourceRowNo": 82,
    "unitKey": "103-1201",
    "transactionType": "SALE",
    "salePrice": 415980000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 4"
  },
  {
    "sourceRowNo": 83,
    "unitKey": "101-2601",
    "transactionType": "SALE",
    "salePrice": 504120000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 84,
    "unitKey": "108-1503",
    "transactionType": "SALE",
    "salePrice": 438450000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 86,
    "unitKey": "107-2401",
    "transactionType": "SALE",
    "salePrice": 529990000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 87,
    "unitKey": "106-1004",
    "transactionType": "SALE",
    "salePrice": 436100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 88,
    "unitKey": "103-202",
    "transactionType": "SALE",
    "salePrice": 410600000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 3"
  },
  {
    "sourceRowNo": 89,
    "unitKey": "103-1401",
    "transactionType": "SALE",
    "salePrice": 424230000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 94,
    "unitKey": "103-103",
    "transactionType": "MONTHLY_RENT",
    "salePrice": null,
    "deposit": 20000000,
    "rent": 800000,
    "observedAt": "2026. 8. 31"
  },
  {
    "sourceRowNo": 95,
    "unitKey": "103-802",
    "transactionType": "SALE",
    "salePrice": 404170000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 31"
  },
  {
    "sourceRowNo": 97,
    "unitKey": "106-2101",
    "transactionType": "SALE",
    "salePrice": 494100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 31"
  },
  {
    "sourceRowNo": 99,
    "unitKey": "107-1504",
    "transactionType": "SALE",
    "salePrice": 440500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 29"
  },
  {
    "sourceRowNo": 100,
    "unitKey": "108-2603",
    "transactionType": "SALE",
    "salePrice": 510900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 29"
  },
  {
    "sourceRowNo": 101,
    "unitKey": "107-502",
    "transactionType": "SALE",
    "salePrice": 473520000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 27"
  },
  {
    "sourceRowNo": 102,
    "unitKey": "104-1001",
    "transactionType": "SALE",
    "salePrice": 485100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 28"
  },
  {
    "sourceRowNo": 105,
    "unitKey": "106-2503",
    "transactionType": "JEONSE",
    "salePrice": null,
    "deposit": 190000000,
    "rent": null,
    "observedAt": "2026. 8. 28"
  },
  {
    "sourceRowNo": 106,
    "unitKey": "107-1603",
    "transactionType": "SALE",
    "salePrice": 425600000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 28"
  },
  {
    "sourceRowNo": 107,
    "unitKey": "107-1203",
    "transactionType": "SALE",
    "salePrice": 437400000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 27"
  },
  {
    "sourceRowNo": 108,
    "unitKey": "102-2401",
    "transactionType": "SALE",
    "salePrice": 446780000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 27"
  },
  {
    "sourceRowNo": 109,
    "unitKey": "102-801",
    "transactionType": "SALE",
    "salePrice": 414460000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 27"
  },
  {
    "sourceRowNo": 110,
    "unitKey": "103-2103",
    "transactionType": "SALE",
    "salePrice": 489050000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 26"
  },
  {
    "sourceRowNo": 112,
    "unitKey": "103-1802",
    "transactionType": "SALE",
    "salePrice": 392000000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 1"
  },
  {
    "sourceRowNo": 114,
    "unitKey": "106-1604",
    "transactionType": "SALE",
    "salePrice": 434900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 24"
  },
  {
    "sourceRowNo": 115,
    "unitKey": "103-2701",
    "transactionType": "SALE",
    "salePrice": 444700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 24"
  },
  {
    "sourceRowNo": 116,
    "unitKey": "102-1601",
    "transactionType": "SALE",
    "salePrice": 423700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 24"
  },
  {
    "sourceRowNo": 119,
    "unitKey": "108-203",
    "transactionType": "SALE",
    "salePrice": 459500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 22"
  },
  {
    "sourceRowNo": 120,
    "unitKey": "102-2504",
    "transactionType": "SALE",
    "salePrice": 502840000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 22"
  },
  {
    "sourceRowNo": 121,
    "unitKey": "102-601",
    "transactionType": "SALE",
    "salePrice": 441200000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 122,
    "unitKey": "106-2104",
    "transactionType": "SALE",
    "salePrice": 444700000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 20"
  },
  {
    "sourceRowNo": 123,
    "unitKey": "106-2104",
    "transactionType": "JEONSE",
    "salePrice": null,
    "deposit": 170000000,
    "rent": null,
    "observedAt": "2026. 8. 20"
  },
  {
    "sourceRowNo": 124,
    "unitKey": "105-2503",
    "transactionType": "SALE",
    "salePrice": 483770000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 125,
    "unitKey": "103-1503",
    "transactionType": "SALE",
    "salePrice": 491050000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 19"
  },
  {
    "sourceRowNo": 126,
    "unitKey": "102-1302",
    "transactionType": "SALE",
    "salePrice": 443610000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 19"
  },
  {
    "sourceRowNo": 128,
    "unitKey": "102-1002",
    "transactionType": "SALE",
    "salePrice": 429500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 130,
    "unitKey": "106-604",
    "transactionType": "JEONSE",
    "salePrice": null,
    "deposit": 180000000,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 131,
    "unitKey": "101-1801",
    "transactionType": "SALE",
    "salePrice": 504350000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 132,
    "unitKey": "108-2003",
    "transactionType": "SALE",
    "salePrice": 523900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 18"
  },
  {
    "sourceRowNo": 134,
    "unitKey": "106-2302",
    "transactionType": "SALE",
    "salePrice": 488500000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 28"
  },
  {
    "sourceRowNo": 135,
    "unitKey": "107-404",
    "transactionType": "SALE",
    "salePrice": 436650000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 27"
  },
  {
    "sourceRowNo": 138,
    "unitKey": "102-1801",
    "transactionType": "JEONSE",
    "salePrice": null,
    "deposit": 160000000,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 139,
    "unitKey": "102-604",
    "transactionType": "SALE",
    "salePrice": 424900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 12"
  },
  {
    "sourceRowNo": 140,
    "unitKey": "102-1203",
    "transactionType": "SALE",
    "salePrice": 453900000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 5"
  },
  {
    "sourceRowNo": 141,
    "unitKey": "102-1702",
    "transactionType": "SALE",
    "salePrice": 387270000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 9. 5"
  },
  {
    "sourceRowNo": 144,
    "unitKey": "106-2604",
    "transactionType": "SALE",
    "salePrice": 489100000,
    "deposit": null,
    "rent": null,
    "observedAt": "2026. 8. 26"
  }
];
export const ONLINE_MARKET_BY_UNIT = new Map<string, readonly OnlineMarketListing[]>(ONLINE_MARKET_LISTINGS.reduce((map,row)=>{const rows=map.get(row.unitKey)??[]; map.set(row.unitKey,[...rows,row]); return map;},new Map<string, OnlineMarketListing[]>()));
