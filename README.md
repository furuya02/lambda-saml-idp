# Lambda SAML IdP

A serverless SAML Identity Provider (IdP) implementation built with AWS Lambda and CDK, designed for development and testing with AWS Grafana workspaces and other SAML Service Providers.

Blog:https://dev.classmethod.jp/articles/amazon-grafana-lambda-url-saml-2-0-identity-provider-idp/

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/furuya02/lambda-saml-idp.git
cd lambda-saml-idp
```

### 2. Generate Certificates

Create self-signed certificates for SAML signing:

```bash
mkdir cert && cd cert

# Generate private key
openssl genpkey -algorithm RSA -out private.key -pkeyopt rsa_keygen_bits:2048

# Generate certificate signing request
openssl req -new -key private.key -out server.csr

# Generate self-signed certificate (valid for 1 year)
openssl req -x509 -days 365 -key private.key -in server.csr -out public.crt

# Clean up CSR file
rm server.csr

# Verify files created
ls -la
# Expected output:
# -rw-r--r--  public.crt   (certificate)
# -rw-------  private.key  (private key)

cd ..
```

### 3. Store Certificates in Parameter Store

Store the generated certificates in AWS Systems Manager Parameter Store as SecureString parameters:

```bash
# Store public certificate
aws ssm put-parameter \
  --name "lambda-saml-idp-public-crt" \
  --value "$(cat cert/public.crt)" \
  --type "SecureString" \
  --overwrite

# Store private key
aws ssm put-parameter \
  --name "lambda-saml-idp-private-key" \
  --value "$(cat cert/private.key)" \
  --type "SecureString" \
  --overwrite
```

**Parameter Names:**
- `lambda-saml-idp-public-crt` - Public certificate
- `lambda-saml-idp-private-key` - Private key

### 4. Deploy Infrastructure

Deploy the CDK stack to create the Lambda function and required resources:

```bash
cd cdk

# Install dependencies
npm install

# Build TypeScript
npm run build

# Preview changes (optional)
npx cdk diff

# Deploy the stack
npx cdk deploy
```

After the initial deployment, update the `cdk.json` file with the Lambda Function URL endpoint and redeploy:

```json
{
  "context": {
    "app": {
      "projectName": "lambda-saml-idp",
      "endpoint": "https://xxxxx.lambda-url.ap-northeast-1.on.aws/",
      "entityId": "urn:example:idp",
      "publicCrt": "lambda-saml-idp-public-crt",
      "privateKey": "lambda-saml-idp-private-key"
    },
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true
  }
}
```

Then redeploy with the updated configuration:

```bash
# Build and deploy with updated endpoint
npm run build
npx cdk diff
npx cdk deploy
```

## 🔧 Grafana Configuration

### SAML Settings

Configure your AWS Grafana workspace with the following SAML settings:

| Setting | Value |
|---------|-------|
| **Metadata URL** | `https://xxxxx.lambda-url.ap-northeast-1.on.aws/metadata` |
| **Assertion Attribute Role** | `role` |
| **Admin Role Values** | `Admin` |
| **Assertion Attribute Name** | `displayName` |
| **Assertion Attribute Login** | `email` |
| **Assertion Attribute Email** | `email` |
| **Login Validity Period (minutes)** | `1440` |

### User Accounts

Test user accounts are configured in `cdk/lambda/const.ts`. Login to Grafana using these credentials:

```typescript
export const userAccountList: USER_ACCOUNT[] = [
  {
    name: "user1",
    password: "15234#xAx",
    role: "admin",
    displayName: "ユーザー1",
    email: "user1@example.com",
  },
  {
    name: "user2",
    password: "15ads#xxss",
    role: "admin",
    displayName: "ユーザー2",
    email: "user2@example.com",
  },
];
```

### Optional Configuration

You can optionally specify ACS URL validation in the configuration:

```typescript
export const config: CONFIG = {
  issuer: "urn:example:idp",        // Required
  endpoint: "http://localhost:8888", // Required
  acsUrl: "",                       // Optional - leave empty to disable ACS validation
};
```

## 📋 Available Endpoints

- `GET /` - Health check (returns "OK")
- `GET /metadata` - SAML IdP metadata XML
- `GET /sso` - SAML SSO endpoint (handles AuthnRequest)
- `GET /login` - Login form
- `POST /login` - Process authentication

## 🏗️ Architecture

This implementation provides:
- **Serverless SAML IdP** using AWS Lambda
- **Certificate management** via AWS Systems Manager Parameter Store
- **SAML 2.0 compliance** with XML digital signatures
- **Configurable user accounts** and Service Provider settings
- **CORS support** for cross-origin requests

## 📖 Development

For detailed development instructions, see [CLAUDE.md](./CLAUDE.md).
