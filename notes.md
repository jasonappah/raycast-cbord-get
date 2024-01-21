some light documentation/work log things for myself in case i ever need to mess with this stuff again lol

---

Initially I reverse engineered the web site to try to figure out how I could get data. I was able to get a naive implementation (commit f5ee0bd58cf27d1b3891347fce3031aa6e2bb530) working fairly quickly using my browser cookies and fetching data from these endpoints which served some HTML tables.

```typescript
const fundsOverviewPartialURL = `https://get.cbord.com/utdallas/full/funds_overview_partial.php`;
const fundsTransactionHistoryPartialURL = `https://get.cbord.com/utdallas/full/funds_transaction_history_partial.php`;
```

The problem was that sessions expired too quickly without any way (to my knowledge) to refresh them and keep them active. I remembered that the GET mobile app is able to fetch the same information and doesn't require you to login frequently so I decided to investigate there.

I got my hands on an APK of the app, and used the APKLab VSCode extension to decompile it. I was hoping to be able to easily find for important endpoints just by using VSCode's search tool, but that didn't end up providing the conclusive results that I was hoping for. I then noticed that most of the business logic was actually JS, located in the `public` directory.

After some more digging, I found a capacitor.config.js file which made me believe that the app is written with Capacitor.js, which makes my job easier. From my understanding, Capacitor.js is a framework for developing cross platform apps using web tech. It essentially runs a website in a webview and supports native extensions for hardware access/other stuff not natively supported by the web platform. What this means for me is that I can just take the built JS assets from the decompiled APK, run a web server and run the app in my web browser.

This worked partially, but parts of the app that use native extensions (like logging in, which uses Capacitor's in-app `Browser`) break on regular web browsers. On the web, Capacitor `Browser` reverts to using window.open, which meant that the login tab opened, but event handlers that were supposed to run when the window closed and auth succeeded didn't run. After formatting the relevant source file with Prettier, it was a little easier to edit the code to work as intended. I ended up commenting out subscriptions, moving the event listeners to separate constants, and logging the event handler functions so I could manually call them in the console with the resulting session ID.

All you probably care about/want to know is that you can open this URL: `https://get.cbord.com/utdallas/full/login.php?mobileapp=1` , authenticate in your browser, and then get redirected to a URL like `https://get.cbord.com/utdallas/full/mobileapp_login_validator.php?sessionId=UUID-SESSION-HERE`. That session ID lasts for a while. You don't need anything else for auth as long as you specify the session ID in the body of your requests as shown below. You do need to specify the `application/json` content type in your requests. 


Here are some useful endpoints I found while using the app. All the endpoints below return JSON.


```javascript
const headers = {
    "accept": "application/json",
    "content-type": "application/json",
}


// POST https://services.get.cbord.com/GETServices/services/json/commerce
// Returns a list of accounts and their balances
const body = {
  "method": "retrieveAccounts",
  "params": {
    "sessionId": "UUID"
  }
}

// POST https://services.get.cbord.com/GETServices/services/json/user`
// Returns a bunch of info about the authenticated user
const body = {
    "method": "retrieve",
    "params": {
        "sessionId": "UUID"
    }
}

// POST https://services.get.cbord.com/GETServices/services/json/commerce
// Returns a list of recent transactions
const body = {
    "method": "retrieveTransactionHistoryWithinDateRange",
    "params": {
        "paymentSystemType": 0,
        "queryCriteria": {
            "maxReturnMostRecent": 10,
            "newestDate": null,
            "oldestDate": "2023-07-25T00:18:32.493Z",
            "accountId": null
        },
        "sessionId": "UUID"
    }
}
```
