import { LocalStorage } from "@raycast/api";
import ky from "ky";
import type { PartialDeep } from "type-fest";

const SESSION_TOKEN_STORAGE_KEY = "sessionToken";
const getActiveSession = () => LocalStorage.getItem<string>(SESSION_TOKEN_STORAGE_KEY);
const setActiveSession = (sessionToken: string) => LocalStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
const clearActiveSession = () => LocalStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);

const getAuthURL = (cbordOrgShortName: string) =>
  `https://get.cbord.com/${cbordOrgShortName}/full/login.php?mobileapp=1`;

const getSessionIdFromValidatorURL = (url: string) => {
  const urlObject = new URL(url);
  return urlObject.searchParams.get("sessionId");
};

const cbord = ky.extend({
  prefixUrl: `https://services.get.cbord.com/GETServices/services/json/`,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("accept", "application/json");
        request.headers.set("content-type", "application/json");
      },
    ],
    // TODO: is there a way to throw an error if the json exception is not null?
  },
});

const method = <BodyParams extends Record<string, unknown>>(method: string, params?: BodyParams) => ({
  json: {
    method,
    params: {
      ...(params ?? {}),
      sessionId: getActiveSession(),
    },
  },
});

type BaseResponse<T> =
  | {
      exception: string;
      response: null;
    }
  | {
      exception: null;
      response: T;
    };

type ListAccountsResponse = {
  accounts: Array<{
    id: string;
    institutionId: string;
    paymentSystemId: string;
    userId: string;
    isActive: boolean;
    accountDisplayName: string;
    paymentSystemType: number;
    accountTender: string;
    isAccountTenderActive: boolean;
    accountType: number;
    depositAccepted: boolean;
    lastFour: unknown;
    nameOnMedia: unknown;
    expirationMonth: unknown;
    expirationYear: unknown;
    billingAddressId: unknown;
    balance: number;
  }>;
};

const listAccounts = async () => {
  const accounts = await cbord.post("commerce", method("retrieveAccounts")).json<BaseResponse<ListAccountsResponse>>();
  return accounts;
};

type RetrieveUserResponse = {
  id: string;
  userName: string;
  objectRevision: number;
  institutionId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  status: number;
  staleProfile: boolean;
  active: boolean;
  timeZone: string;
  locale: string;
  cashlessMediaStatus: number;
  guestUser: boolean;
  hasCashlessCard: boolean;
  lastUpdatedProfile: string | null;
  lastUpdatedCashless: string | null;
  emailBounceMessage: string | null;
  emailBounceStatus: string | null;
  childUserInfoList: Array<unknown>;
  userNotificationInfoList: Array<unknown>;
  userMediaInfoList: unknown;
  email: string;
  phone: string;
};
const retrieveUser = async () => {
  const user = await cbord.post("user", method("retrieve")).json<BaseResponse<RetrieveUserResponse>>();
  return user;
};

const DATE_6_MONTHS_AGO_ISO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6).toISOString();

const listRecentTransactionsDefaultParams = {
  paymentSystemType: 0 as number | null,
  queryCriteria: {
    maxReturnMostRecent: 10 as number | null,
    newestDate: null as string | null,
    oldestDate: DATE_6_MONTHS_AGO_ISO as string | null,
    accountId: null as string | null,
  },
};

type ListRecentTransactionsResponse = {
  totalCount: number;
  returnCapped: boolean;
  transactions: Array<{
    transactionId: string;
    transactionSequence: number;
    transactionType: number;
    amount: number;
    resultingBalance: number | null;
    postedDate: string | null;
    actualDate: string;
    patronId: string;
    planId: string | null;
    tenderId: string;
    locationId: string | null;
    locationName: string;
    patronFullName: string;
    accountType: number;
    accountName: string;
    paymentSystemType: number;
  }>;
};

const listRecentTransactions = async (
  params: PartialDeep<typeof listRecentTransactionsDefaultParams> = listRecentTransactionsDefaultParams,
) => {
  const mergedParams = {
    ...listRecentTransactionsDefaultParams,
    ...params,
    queryCriteria: {
      ...listRecentTransactionsDefaultParams.queryCriteria,
      ...params.queryCriteria,
    },
  };

  const transactions = await cbord
    .post("commerce", method("retrieveTransactionHistoryWithinDateRange", mergedParams))
    .json<BaseResponse<ListRecentTransactionsResponse>>();
  return transactions;
};

const createTemporarySession = async () => {
  const session = await cbord
    .post(
      "session",
      method("authenticateSystem", {
        systemCredentials: {
          domain: "",
          userName: "get_mobile",
          password: "NOTUSED",
        },
      }),
    )
    .json<BaseResponse<string>>();
  return session;
};

type GetInstitutionsResponse = {
  institutions: {
    id: string;
    name: string;
    shortName: string;
    environmentName: unknown;
    type: number;
    guestDeposit: number;
    guestLogin: number;
    guestLoginNotRequired: number;
  }[];
};
const getInstitutions = async () => {
  const institutions = await cbord
    .post("institution", method("retrieveLookupList"))
    .json<BaseResponse<GetInstitutionsResponse>>();
  return institutions;
};

export {
  getAuthURL,
  getSessionIdFromValidatorURL,
  listAccounts,
  retrieveUser,
  listRecentTransactions,
  getInstitutions,
  createTemporarySession,
  getActiveSession,
  setActiveSession,
  clearActiveSession,
};
