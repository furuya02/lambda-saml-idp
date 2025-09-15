import zlib = require("zlib");
import { AUTHN_REQUEST } from "./types";
import { getSecret } from "./util";
import { SignedXml } from "xml-crypto";
import { userAccountList } from "./const";

export interface SAMLConfig {
  issuer: string;
  acsUrl: string;
  audience: string;
  privateKey: string;
  publicCert: string;
}

export interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
}

const SAML_NAMESPACE_2_0 = "urn:oasis:names:tc:SAML:2.0";

class SamlTimestampProvider {
  dt: Date;
  constructor() {
    this.dt = new Date();
  }

  getIssuedAt(): string {
    return this.dt.toISOString();
  }

  getNotOnOrAfter() {
    const dt_5min = new Date(this.dt.getTime() + 5 * 60 * 1000); // 5 minutes later
    return dt_5min.toISOString();
  }

  getSessionExpiry() {
    const dt_8hour = new Date(this.dt.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
    return dt_8hour.toISOString();
  }
}

export function parseSamlAuthnRequest(saml: string): AUTHN_REQUEST {
  const AuthnRequest: AUTHN_REQUEST = {
    id: undefined,
    version: undefined,
    issueInstant: undefined,
    destination: undefined,
    assertionConsumerServiceURL: undefined,
    issuer: undefined,
    nameIdFormat: undefined,
  };

  const idMatch = saml.match(/ID="([^"]+)"/);
  if (idMatch) {
    AuthnRequest.id = idMatch[1];
  }

  const versionMatch = saml.match(/Version="([^"]+)"/);
  if (versionMatch) {
    AuthnRequest.version = versionMatch[1];
  }

  const issueInstantMatch = saml.match(/IssueInstant="([^"]+)"/);
  if (issueInstantMatch) {
    AuthnRequest.issueInstant = issueInstantMatch[1];
  }

  const destinationMatch = saml.match(/Destination="([^"]+)"/);
  if (destinationMatch) {
    AuthnRequest.destination = destinationMatch[1];
  }

  const acsUrlMatch = saml.match(/AssertionConsumerServiceURL="([^"]+)"/);
  if (acsUrlMatch) {
    AuthnRequest.assertionConsumerServiceURL = acsUrlMatch[1];
  }

  const issuerMatch = saml.match(/<saml:Issuer[^>]*>([^<]+)<\/saml:Issuer>/);
  if (issuerMatch) {
    AuthnRequest.issuer = issuerMatch[1];
  }

  const nameIdPolicyMatch = saml.match(
    /<samlp:NameIDPolicy[^>]*Format="([^"]+)"/
  );
  if (nameIdPolicyMatch) {
    AuthnRequest.nameIdFormat = nameIdPolicyMatch[1];
  }

  return AuthnRequest;
}

export async function createSamlMetadata(
  endpoint: string,
  entityId: string
): Promise<string> {
  const publicCrt = await getSecret("PUBLIC_CRT");
  if (!publicCrt) {
    throw new Error("Failed to retrieve public certificate");
  }
  const X509Certificate = publicCrt
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\n/g, "");

  const samlMetaData = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${entityId}">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false"
                       protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${X509Certificate}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="${endpoint}sso"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${endpoint}sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;

  return samlMetaData;
}

export function samlRequestParse(base64str: string): string {
  // URLデコード
  const decodedUrl = decodeURIComponent(base64str);

  // base64デコード
  const decodedBytes = Buffer.from(decodedUrl, "base64");

  // zlibで解凍（raw deflateとzlib両方を試す）
  let decompressedData;
  try {
    // 通常のzlib形式を試す
    decompressedData = zlib.inflateSync(decodedBytes);
  } catch (error) {
    // raw deflate形式を試す
    decompressedData = zlib.inflateRawSync(decodedBytes);
  }

  const requestSaml = decompressedData.toString();

  return requestSaml;
}

export function createSAMLResponse(
  entityId: string,
  authnRequest: AUTHN_REQUEST
): string {
  const timestampProvider = new SamlTimestampProvider();

  const id = "_77c98a6d7cf16ed2f335fdc3654b1400"; //Responseで生成
  const assertionId = "_1cce79ceb713d22c12063183e1372545"; //Responseで生成
  const XMLS_SCHEMA = "http://www.w3.org/2001/XMLSchema";

  const inResponseTo = authnRequest.id; // Request のIDを指定
  const acsUrl = authnRequest.assertionConsumerServiceURL;
  const metadataUrl = authnRequest.issuer;

  let samlResponse = `
    <?xml version="1.0" encoding="UTF-8"?>
<saml2p:Response xmlns:saml2p="${SAML_NAMESPACE_2_0}:protocol" xmlns:saml2="${SAML_NAMESPACE_2_0}:assertion" ID="${id}" Version="2.0" IssueInstant="${timestampProvider.getIssuedAt()}" Destination="${acsUrl}" InResponseTo="${inResponseTo}">
  <saml2:Issuer>${entityId}</saml2:Issuer>
  <saml2p:Status>
    <saml2p:StatusCode Value="${SAML_NAMESPACE_2_0}:status:Success"/>
  </saml2p:Status>
  <saml2:Assertion xmlns:saml2="${SAML_NAMESPACE_2_0}:assertion" ID="${assertionId}" Version="2.0" IssueInstant="${timestampProvider.getIssuedAt()}">
    <saml2:Issuer>${entityId}</saml2:Issuer>
    <saml2:Subject>
      <saml2:NameID Format="${SAML_NAMESPACE_2_0}:nameid-format:emailAddress">admin@example.com</saml2:NameID>
      <saml2:SubjectConfirmation Method="${SAML_NAMESPACE_2_0}:cm:bearer">
        <saml2:SubjectConfirmationData NotOnOrAfter="${timestampProvider.getNotOnOrAfter()}" Recipient="${acsUrl}" InResponseTo="${inResponseTo}"/>
      </saml2:SubjectConfirmation>
    </saml2:Subject>
    <saml2:Conditions NotBefore="${timestampProvider.getIssuedAt()}" NotOnOrAfter="${timestampProvider.getNotOnOrAfter()}">
      <saml2:AudienceRestriction>
        <saml2:Audience>${metadataUrl}</saml2:Audience>
      </saml2:AudienceRestriction>
    </saml2:Conditions>
    <saml2:AuthnStatement AuthnInstant="${timestampProvider.getIssuedAt()}" SessionNotOnOrAfter="${timestampProvider.getSessionExpiry()}">
      <saml2:AuthnContext>
        <saml2:AuthnContextClassRef>${SAML_NAMESPACE_2_0}:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>
      </saml2:AuthnContext>
    </saml2:AuthnStatement>
    <saml2:AttributeStatement>
      </saml2:Attribute>`;

  userAccountList.forEach((account) => {
    Object.entries(account).forEach(([key, value]) => {
      if (key === "user" || key === "password") return; // ユーザ名・パスワードは含めない
      samlResponse += `
      <saml2:Attribute Name="${key}" NameFormat="${SAML_NAMESPACE_2_0}:uri">
        <saml2:AttributeValue xsi:type="xs:string" xmlns:xsi="${XMLS_SCHEMA}-instance" xmlns:xs="${XMLS_SCHEMA}">${value}</saml2:AttributeValue>
      </saml2:Attribute>
      `;
    });
  });
  samlResponse += `</saml2:AttributeStatement>
  </saml2:Assertion>
</saml2p:Response>`;
  // Remove whitespace and newlines for compact XML
  return samlResponse.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

export async function signXML(xml: string): Promise<string> {
  const privateKey = await getSecret("PRIVATE_KEY");
  const publicCert = await getSecret("PUBLIC_CRT");
  if (!privateKey || !publicCert) {
    throw new Error("Failed to retrieve keys");
  }
  const sig = new SignedXml();

  // Response全体に署名を適用
  sig.addReference(
    "//*[local-name()='Response']",
    [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    "http://www.w3.org/2001/04/xmlenc#sha256"
  );

  sig.signingKey = privateKey;
  sig.keyInfoProvider = {
    getKeyInfo: () => {
      const certFormatted = publicCert
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .replace(/\n/g, "");
      return `<X509Data><X509Certificate>${certFormatted}</X509Certificate></X509Data>`;
    },
    getKey: () => Buffer.from(privateKey),
  };

  sig.computeSignature(xml, {
    location: {
      reference: "//*[local-name()='Issuer']",
      action: "after",
    },
  });

  return sig.getSignedXml();
}
