import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as aws_lambda_nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";

type CdkStackProps = cdk.StackProps & {
  projectName: string;
  endpoint: string;
  entityId: string;
  publicCrt: string;
  privateKey: string;
};

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: CdkStackProps) {
    super(scope, id, props);

    const { projectName, endpoint, entityId, publicCrt, privateKey } = props!;

    // Lambda関数を作成
    const samlIdpFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "SamlIdpFunction",
      {
        functionName: `${projectName}-function`,
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "lambda/index.ts",
        handler: "handler",
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          PROJECT_NAME: projectName,
          ENDPOINT: endpoint,
          ENTITY_ID: entityId,
          PUBLIC_CRT: publicCrt,
          PRIVATE_KEY: privateKey,
        },
      }
    );

    // SSMパラメータへの読み取り権限を付与
    samlIdpFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${publicCrt}`,
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${privateKey}`,
        ],
      })
    );

    // Function URLを作成
    const functionUrl = samlIdpFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
      },
    });

    // Function URLを出力
    new cdk.CfnOutput(this, "SamlLdpFunctionUrl", {
      value: functionUrl.url,
      description: "SAML IdP Lambda Function URL",
    });
  }
}
