import { Toast, showToast, updateCommandMetadata } from "@raycast/api";
import * as cbord from "./cbord";

export default async function Command() {
  if (await cbord.sessionTokenDoesNotExist() || await cbord.sessionTokenIsTemporary()) {
    showToast({ title: "Not authenticated", message: "Run the 'View Swipes' command to login.", style: Toast.Style.Failure, });
    return
  }
  const { accounts } = await cbord.listAccounts();
  const subtitle = accounts.map((account) => `${account.accountDisplayName}: ${account.balance}`).join(" | ");
  await updateCommandMetadata({ subtitle });
}
