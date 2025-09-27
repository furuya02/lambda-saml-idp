# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SAML Identity Provider (IdP) implementation built as an AWS Lambda function using AWS CDK for infrastructure. It provides a serverless SAML IdP for development and testing purposes, designed to work with AWS Grafana workspaces and other SAML Service Providers.

## Development Commands

All development commands should be run from the `cdk/` directory:

```bash
# Navigate to project directory
cd cdk

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Watch for changes and rebuild
npm run watch

# Run tests (Note: No actual test implementations exist yet)
npm run test

# Deploy CDK stack
npm run cdk deploy
# or
npx cdk deploy

# Compare deployed stack with current state
npx cdk diff

# Generate CloudFormation template
npx cdk synth

# Clean up CDK resources
npx cdk destroy
```

## Architecture

This is an AWS Lambda-based SAML 2.0 IdP implementation with the following structure:

### Project Structure
- **`cdk/lambda/`** - Lambda function source code (TypeScript)
  - Compiled to `cdk/dist/lambda/` during build
- **`cdk/lib/`** - CDK infrastructure definitions
- **`cdk/bin/`** - CDK application entry point
- **`cdk/test/`** - Test directory (currently empty - no test implementations)
- **`cert/`** - Certificate generation workspace (not tracked in git)

### Core Lambda Modules (`cdk/lambda/`)
- **`index.ts`** - AWS Lambda handler (APIGatewayProxyEventV2)
  - Routes: `/` (health check), `/metadata`, `/sso`, `/login`
  - Handles both GET and POST requests with proper CORS
- **`saml.ts`** - SAML protocol implementation
  - `createSAMLResponse()` - Generates signed SAML responses with user attributes
  - `signXML()` - XML digital signature using xml-crypto
  - `parseSamlAuthnRequest()` - Extracts data from SAML AuthnRequest
  - `createSamlMetadata()` - Generates IdP metadata XML
  - `samlRequestParse()` - Decodes and decompresses SAML requests
- **`login.ts`** - Authentication logic and HTML login form generation
- **`util.ts`** - AWS SSM Parameter Store integration for certificate retrieval
- **`const.ts`** - Configuration constants and user account definitions
- **`types.ts`** - TypeScript type definitions for SAML data structures

### Infrastructure (`cdk/lib/cdk-stack.ts`)
- **Lambda Function** - Node.js 20.x runtime with Function URL
- **IAM Role** - Permissions for SSM Parameter Store access
- **Environment Variables** - Configurable endpoint, entity ID, and certificate parameter names
- **CORS Configuration** - Enabled for cross-origin requests

### Key Endpoints
- `GET /` - Health check returning "OK"
- `GET /metadata` - Returns SAML metadata XML
- `GET /sso` - Initiates SAML SSO flow, handles AuthnRequest and redirects to login
- `GET /login` - Displays styled login form with RelayState preservation
- `POST /login` - Processes authentication and returns signed SAML response

### Authentication Flow
1. Service Provider sends AuthnRequest to `/sso`
2. Lambda redirects to `/login` with query parameters preserved
3. User submits credentials via POST to `/login`
4. Lambda validates against configured users in `const.ts`
5. Lambda generates signed SAML response with authenticated user's attributes only
6. User is redirected to SP's ACS URL (from AuthnRequest) with SAML assertion via POST binding

## Configuration

### CDK Context Configuration (`cdk.json`)
```json
{
  "context": {
    "app": {
      "projectName": "lambda-saml-idp",
      "endpoint": "https://xxxxx.lambda-url.region.on.aws/",
      "entityId": "urn:example:idp",
      "publicCrt": "lambda-saml-idp-public-crt",
      "privateKey": "lambda-saml-idp-private-key"
    }
  }
}
```

### Environment Variables (set via CDK)
- `PROJECT_NAME` - Project identifier from CDK context
- `ENDPOINT` - Lambda Function URL (must be updated after initial deployment)
- `ENTITY_ID` - SAML Entity ID (default: "urn:example:idp")
- `PUBLIC_CRT` - SSM parameter name for public certificate
- `PRIVATE_KEY` - SSM parameter name for private key

### User Management
Users are configured in `cdk/lambda/const.ts` with attributes:
- `name`, `password` - For authentication
- `grafana_role`, `displayName`, `email` - Included in SAML assertions
- All non-auth attributes are dynamically included in SAML responses
- For Amazon Grafana: Use `grafana_role: "Admin"` for admin access

### ACS URL Configuration
- `config.acsUrl` in `const.ts` can be:
  - Set to specific URL for validation (security)
  - Empty string `""` to accept any Service Provider's ACS URL (flexibility)
- When empty, SAML Response uses `authnRequest.assertionConsumerServiceURL` directly

## Security Configuration

### Certificate Management
- Certificates stored in AWS Systems Manager Parameter Store as SecureString
- Default parameter names:
  - Public certificate: `lambda-saml-idp-public-crt`
  - Private key: `lambda-saml-idp-private-key`
- Generate certificates in `cert/` directory before deployment

### Certificate Generation Commands
```bash
mkdir cert && cd cert
openssl genpkey -algorithm RSA -out private.key -pkeyopt rsa_keygen_bits:2048
openssl req -new -key private.key -out server.csr
openssl req -x509 -days 365 -key private.key -in server.csr -out public.crt
rm server.csr

# Store in Parameter Store
aws ssm put-parameter \
  --name "lambda-saml-idp-public-crt" \
  --value "$(cat public.crt)" \
  --type "SecureString" \
  --overwrite

aws ssm put-parameter \
  --name "lambda-saml-idp-private-key" \
  --value "$(cat private.key)" \
  --type "SecureString" \
  --overwrite
```

### XML Signatures
- Enveloped signatures using xml-crypto library
- SHA-256 digest algorithm
- RSA-SHA256 signature algorithm

## Testing

### Test Framework
- Jest with ts-jest for TypeScript support
- Test command: `npm run test` (from `cdk/` directory)
- **Note**: No test implementations currently exist

### Manual Testing
After deployment:
1. Test metadata endpoint: `curl https://your-function-url.lambda-url.region.on.aws/metadata`
2. Configure your Service Provider with the metadata
3. Test SSO flow through your SP

## Deployment

### Initial Deployment
1. **Install dependencies**: `cd cdk && npm install`
2. **Generate certificates** and store in Parameter Store (see Certificate Generation Commands)
3. **Deploy CDK stack**: `npm run cdk deploy`
4. **Copy Lambda Function URL** from deployment output
5. **Update `cdk.json`** with the Lambda Function URL in `context.app.endpoint`
6. **Redeploy**: `npm run build && npm run cdk deploy`

### Subsequent Deployments
```bash
cd cdk
npm run build
npm run cdk deploy
```

## AWS Integration

- **Lambda Function** - Serverless compute with Function URL (no API Gateway)
- **Systems Manager Parameter Store** - Secure certificate storage
- **IAM** - Least-privilege permissions for Parameter Store access
- **CloudFormation** - Infrastructure as code via CDK

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext
- **Strict Mode**: Enabled
- **Source Directory**: `./` (relative to cdk/)
- **Output Directory**: `./dist` (relative to cdk/)

## Common Development Issues

### Certificate Errors
- Ensure certificates are properly generated and stored in SSM Parameter Store
- Verify parameter names match between CDK context and actual SSM parameters
- Check Lambda has IAM permissions for SSM:GetParameter with decryption

### ACS URL Configuration Issues
- Set `config.acsUrl` to empty string `""` for flexible SP support
- Or set to specific URL if you need validation for security
- SAML Response destination uses SP's actual ACS URL from AuthnRequest

### Function URL Configuration
- Function URL is automatically created during CDK deployment
- CORS is enabled for cross-origin requests
- Remember to update `cdk.json` with the Function URL after initial deployment

### Build Issues
- Always run build commands from the `cdk/` directory
- TypeScript compilation outputs to `dist/` directory
- Clean build: `rm -rf dist && npm run build`

## Development Workflow

1. Make changes to Lambda code in `cdk/lambda/`
2. Build TypeScript: `npm run build`
3. Test locally if needed
4. Deploy changes: `npm run cdk deploy`
5. Test the deployed function via its endpoints