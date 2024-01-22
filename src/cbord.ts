import { LocalStorage } from "@raycast/api";
import type { PartialDeep } from "type-fest";
import axios from "axios";

const SESSION_TOKEN_STORAGE_KEY = "sessionToken";
const SESSION_TOKEN_IS_TEMPORARY_STORAGE_KEY = "sessionTokenIsTemporary";
const getActiveSession = async () => await LocalStorage.getItem<string>(SESSION_TOKEN_STORAGE_KEY);
const checkSessionTokenDoesNotExist = async () => (await getActiveSession()) === undefined;
const checkSessionTokenIsTemporary = async () => {
  const returned = await LocalStorage.getItem<0 | 1>(SESSION_TOKEN_IS_TEMPORARY_STORAGE_KEY);
  return returned === 1;
};
const setActiveSession = async (sessionToken: string, sessionTokenIsTemporary: boolean) => {
  await LocalStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
  await LocalStorage.setItem(SESSION_TOKEN_IS_TEMPORARY_STORAGE_KEY, sessionTokenIsTemporary ? 1 : 0);
};
const clearActiveSession = async () => {
  await LocalStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  await LocalStorage.removeItem(SESSION_TOKEN_IS_TEMPORARY_STORAGE_KEY);
};

const getAuthURL = (cbordOrgShortName: string) =>
  `https://get.cbord.com/${cbordOrgShortName}/full/login.php?mobileapp=1`;

const getSessionIdFromValidatorURL = (url: string) => {
  const urlObject = new URL(url);
  return urlObject.searchParams.get("sessionId");
};

const cbord = axios.create({
  method: "POST",

  baseURL: `https://services.get.cbord.com/GETServices/services/json/`,
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
});

const method = async <BodyParams extends Record<string, unknown>>(
  method: string,
  params?: BodyParams,
  includeSessionId: boolean = true,
) => {
  const axiosOptions = {
    data: {
      method,
      params: {
        ...(params ?? {}),
      },
    },
  };
  if (includeSessionId) {
    axiosOptions.data.params.sessionId = await getActiveSession();
  }
  console.log(axiosOptions);
  return axiosOptions;
};

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
  const accounts = (await cbord<BaseResponse<ListAccountsResponse>>("commerce", await method("retrieveAccounts"))).data;
  return unwrapResponse(accounts);
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
  const user = (await cbord<BaseResponse<RetrieveUserResponse>>("user", await method("retrieve"))).data;
  return unwrapResponse(user);
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

  const transactions = (
    await cbord<BaseResponse<ListRecentTransactionsResponse>>(
      "commerce",
      await method("retrieveTransactionHistoryWithinDateRange", mergedParams),
    )
  ).data;
  return unwrapResponse(transactions);
};

const createTemporarySession = async () => {
  const session = (
    await cbord<BaseResponse<string>>(
      "authentication",
      await method(
        "authenticateSystem",
        {
          systemCredentials: {
            domain: "",
            userName: "get_mobile",
            password: "NOTUSED",
          },
        },
        false,
      ),
    )
  ).data;
  return unwrapResponse(session);
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
  const institutions = (
    await cbord<BaseResponse<GetInstitutionsResponse>>("institution", await method("retrieveLookupList"))
  ).data;
  return unwrapResponse(institutions);
};

const unwrapResponse = <T>(response: BaseResponse<T>) => {
  console.log({ response });
  if (response.exception) {
    throw new Error(response.exception);
  }
  if (!response.response) {
    throw new Error("No response");
  }
  return response.response;
};

const initSession = async () => {
  console.log("Checking if session token exists");
  const sessionTokenDoesNotExist = await checkSessionTokenDoesNotExist();
  console.log({ sessionTokenDoesNotExist });
  let sessionTokenIsTemporary = false;
  if (sessionTokenDoesNotExist) {
    sessionTokenIsTemporary = true;
    console.log("Creating temporary session token");
    const sessionToken = await createTemporarySession();
    console.log("Setting active session");
    setActiveSession(sessionToken, true);
    console.log("Session saved");
  } else {

      console.log("Checking if current session is temporary");
      sessionTokenIsTemporary = await checkSessionTokenIsTemporary();
  }
  console.log({ sessionTokenIsTemporary });
  return sessionTokenIsTemporary;
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
  checkSessionTokenDoesNotExist as sessionTokenDoesNotExist,
  checkSessionTokenIsTemporary as sessionTokenIsTemporary,
  initSession,
};
