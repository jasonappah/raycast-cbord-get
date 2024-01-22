import { Action, ActionPanel, Detail, Form, List, confirmAlert, open, useNavigation } from "@raycast/api";
import * as cbord from "./cbord";
import { useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { useMemo } from "react";

export default function Command() {
  const { isLoading, data: sessionTokenIsTemporary, error } = usePromise(cbord.initSession);

  if (error) return <Detail markdown={`# An error occurred\n\n\`\`\`\n${error.message}\n\`\`\`\n`} />;
  if (isLoading) return <List isLoading searchBarPlaceholder="..." />;
  if (sessionTokenIsTemporary) return <InstitutionDetail />;
  return <AccountsView />;
}

function InstitutionDetail() {
  const institutions = useCachedPromise(() => cbord.getInstitutions(), []);
  const { push } = useNavigation();

  return (
    <List isLoading={institutions.isLoading} searchBarPlaceholder="Select your institution...">
      {institutions.data?.institutions.map((institution) => (
        <List.Item
          key={institution.id}
          title={institution.name}
          actions={
            <ActionPanel>
              <Action
                title="Login"
                onAction={() => {
                  confirmAlert({
                    title:
                      "Follow the instructions in the browser to login, then copy the URL of the page you are redirected to and paste it here.",
                    dismissAction: undefined,
                    primaryAction: {
                      title: "Continue",
                      onAction: () => {
                        push(<SessionURLInput />);
                        open(cbord.getAuthURL(institution.shortName));
                      },
                    },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const SessionURLInput = () => {
  const { pop } = useNavigation();
  const form = useForm<{ sessionURL: string }>({
    validation: {
      sessionURL: (value) => {
        if (!value) return "Session URL is required";
        try {
          const id = cbord.getSessionIdFromValidatorURL(value);
          if (!id) return "Session URL is invalid";
        } catch (e) {
          return "Failed to parse session URL";
        }
      },
    },
    onSubmit: async (values) => {
      const id = cbord.getSessionIdFromValidatorURL(values.sessionURL);
      if (!id) throw new Error("Failed to parse session URL");
      await cbord.setActiveSession(id, false);
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={form.handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField title="Session URL" placeholder="Paste URL here..." {...form.itemProps.sessionURL} />
    </Form>
  );
};

const AccountsView = () => {
  const accounts = useCachedPromise(() => cbord.listAccounts(), []);
  const transactions = useCachedPromise(() => cbord.listRecentTransactions(), []);
  const markdownTable = useMemo(() => {
    let output = "# Recent Transactions\n\n";
    if (transactions.isLoading) output += "Loading transactions...";
    if (transactions.error) output += `Failed to load transactions: \`${transactions.error.message}\``;
    output += "| Date | Description | Amount |\n";
    output += "| ---- | ----------- | ------ |\n";
    output += transactions.data?.transactions
      .map((transaction) => `| ${new Date(transaction.actualDate).toLocaleString()} | ${transaction.locationName} | ${transaction.amount} |`)
      .join("\n");
    return output;
  }, [transactions]);
  // const detail = (
  //   <List.Item.Detail
  //     metadata={
  //       <List.Item.Detail.Metadata>
  //         <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/grass.svg" text="Grass" />
  //         <List.Item.Detail.Metadata.Separator />
  //         <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/poison.svg" text="Poison" />
  //       </List.Item.Detail.Metadata>
  //     }
  //   />
  // );
  // const { push } = useNavigation();
  return (
    <List isLoading={accounts.isLoading} isShowingDetail>
      {accounts.data?.accounts.map((account) => (
        <List.Item
          key={account.id}
          title={account.accountDisplayName}
          accessories={[{ text: `${account.balance}` }]}
          detail={<List.Item.Detail markdown={markdownTable} />}
        />
      ))}
    </List>
  );
};
