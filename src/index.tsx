import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import parse, { HTMLElement } from "node-html-parser";
import { useMemo } from "react";

const fundsOverviewPartialURL = `https://get.cbord.com/utdallas/full/funds_overview_partial.php`;
const fundsTransactionHistoryPartialURL = `https://get.cbord.com/utdallas/full/funds_transaction_history_partial.php`;

const headers = {
  Cookie:
    "no_login_guest_user=; AWSELB=<truncated>; PHPSESSID=<truncated>; _shibsession_<truncated>>=_<truncated>",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

const body = "userId=<truncated>&formToken=<truncated>";
const tableToJson = (table: HTMLElement) => {
  const [header, ...rows] = table.querySelectorAll("tr");
  const headerNames = header.querySelectorAll("th").map((e) => e.text);
  const json = rows.map((e) =>
    Object.fromEntries(e.querySelectorAll("td").map((column, index) => [headerNames[index], column.text])),
  );
  return json;
};
export default function Command() {
  const fundsOverview = useFetch<string>(fundsOverviewPartialURL, {
    method: "POST",
    headers: headers,
    body
  });


  const transactionHistory = useFetch<string>(fundsTransactionHistoryPartialURL, {
    method: "POST",
    headers: headers,
    body,
  });

  const md = useMemo(() => {
    if (fundsOverview.isLoading || transactionHistory.isLoading) {
      return "Loading...";
    }

    if (fundsOverview.error || transactionHistory.error || !fundsOverview.data || !transactionHistory.data) {
      return "Error";
    }

    console.log(fundsOverview.data);
    // const fundsOverviewHTML = parse(fundsOverview.data);
    // const transactionHistoryHTML = parse(transactionHistory.data);
    
    // const b1 = tableToJson(fundsOverviewHTML);
    // const b2 = tableToJson(transactionHistoryHTML);
    // console.log({b1, b2});

    const sample = {
      b1: [
        { 'Account Name': 'Meal Money', Balance: '$100.00' },
        { 'Account Name': 'Comet Cash', Balance: '$0.09' },
        { 'Account Name': 'Meal Swipe', Balance: '11' },
        { 'Account Name': 'Guest Pass', Balance: '2' }
      ],
      b2: [
        {
          'Account Name': 'Meal Swipe',
          'Date & Time': 'January 17, 2024 | 9:47AM',
          'Activity Details': 'FS Dining West Epic III 2',
          'Amount ($ / Meals)': '- 1'
        },
        {
          'Account Name': 'Meal Swipe',
          'Date & Time': 'January 16, 2024 | 10:05PM',
          'Activity Details': 'FS Taco Bell Cantina',
          'Amount ($ / Meals)': '- 1'
        },
        {
          'Account Name': 'Meal Swipe',
          'Date & Time': 'January 16, 2024 | 4:43PM',
          'Activity Details': 'Simphony - Dining Hall West',
          'Amount ($ / Meals)': '- 1'
        },
        {
          'Account Name': 'Meal Swipe',
          'Date & Time': 'January 15, 2024 | 2:33AM',
          'Activity Details': 'End of Day Console',
          'Amount ($ / Meals)': '- 12'
        }
      ]
    }



    return "rahhh";
  }, [fundsOverview.data, transactionHistory.data, fundsOverview.error, transactionHistory.error, fundsOverview.isLoading, transactionHistory.isLoading]);

  return <Detail markdown={md} />;

}
