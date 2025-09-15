import {
  SSMClient,
  GetParameterCommand,
  GetParameterCommandInput,
} from "@aws-sdk/client-ssm";

// パラメータストアからSecret文字列を取得する
export async function getSecret(
  target: "PRIVATE_KEY" | "PUBLIC_CRT"
): Promise<string | undefined> {
  const ssmClient = new SSMClient();

  const publicCrt = process.env.PUBLIC_CRT!;
  const privateKey = process.env.PRIVATE_KEY!;
  const name = target === "PRIVATE_KEY" ? privateKey : publicCrt;

  try {
    const input: GetParameterCommandInput = {
      Name: name,
      WithDecryption: true,
    };

    const command = new GetParameterCommand(input);
    const response = await ssmClient.send(command);

    if (!response.Parameter?.Value) {
      console.error(`Parameter ${name} not found or has no value`);
      return undefined;
    }

    return response.Parameter.Value;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Failed to get secret from parameter store: ${error.message}`
      );
      return undefined;
    }
    console.error("Failed to get secret from parameter store: Unknown error");
    return undefined;
  }
}
