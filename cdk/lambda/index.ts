import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createSamlMetadata,
  createSAMLResponse,
  parseSamlAuthnRequest,
  samlRequestParse,
  signXML,
} from "./saml";
import { authenticateUser, createLoginForm } from "./login";
import { config } from "./const";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const path = event.rawPath || event.requestContext.http.path;
  const method = event.requestContext.http.method;

  if (method === "GET" && path === "/") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
      },
      body: "<Response><Message>saml idp with lambda!</Message></Response>",
    };
  } else if (method === "GET" && path === "/metadata") {
    const endpoint = process.env.ENDPOINT!;
    const entityId = process.env.ENTITY_ID!;
    const metadata = await createSamlMetadata(endpoint, entityId);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
      },
      body: metadata,
    };
  } else if (method === "GET" && path.startsWith("/sso")) {
    return {
      statusCode: 302,
      headers: {
        Location: `/login?${event.rawQueryString}`,
      },
      body: "",
    };
  } else if (method === "GET" && path.startsWith("/login")) {
    // Loginフォームの表示
    const loginForm = createLoginForm(event.rawQueryString, "");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      body: loginForm,
    };
  } else if (method === "POST" && path.startsWith("/login")) {
    const body = Buffer.from(event.body!, "base64").toString("utf-8");
    if (!authenticateUser(body)) {
      const loginForm = createLoginForm(
        event.rawQueryString,
        "ユーザー名若しくは、パスワードが無効です"
      );
      // 認証に失敗した場合、Loginフォームを再表示
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        body: loginForm,
      };
    }
    // 認証に成功した場合の処理をここに追加
    const samlRequest = event.queryStringParameters?.SAMLRequest || "";
    const relayState = event.queryStringParameters?.RelayState || "";
    const saml = samlRequestParse(samlRequest);

    const authnRequest = parseSamlAuthnRequest(saml);
    // cinfig.acsUrlに設定されたURLとSPのリクエストが一致しない場合は受け付けない
    if (
      config.acsUrl !== "" &&
      config.acsUrl !== authnRequest.assertionConsumerServiceURL
    ) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        body: "Invalid ACS URL",
      };
    }
    // SAMLResponseを生成する
    const samlResponse = createSAMLResponse(config.issuer, authnRequest);
    //署名する
    const signedXml = await signXML(samlResponse);
    const encodedResponse = Buffer.from(signedXml).toString("base64");
    const html = `
          <html>
            <head><title>Keep Calm and Single Sign-On!</title></head>
            <body>
              <form method="post" name="hiddenform" action="${config.acsUrl}">
                <input type="hidden" name="SAMLResponse" value="${encodedResponse}">
                ${
                  relayState
                    ? `<input type="hidden" name="RelayState" value="${relayState}">`
                    : ""
                }
                <noscript>
                  <p>JavaScript is disabled. Click Submit to continue.</p>
                  <input type="submit" value="Submit">
                </noscript>
              </form>
              <script language="javascript" type="text/javascript">
                window.setTimeout(function(){document.forms[0].submit();}, 0);
              </script>
            </body>
          </html>
        `;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      body: html,
    };
  }
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Not Found" }),
  };
};
