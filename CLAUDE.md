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

# Run tests
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
- **`cdk/lib/`** - CDK infrastructure definitions
- **`cdk/bin/`** - CDK application entry point
- **`cdk/test/`** - Test files (minimal implementation currently)
- **`cert/`** - Certificate generation workspace

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
- **Lambda Function** - Node.js 22.x runtime with Function URL
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
2. Lambda validates destination and redirects to `/login` with RelayState
3. User submits credentials via POST to `/login`
4. Lambda validates against configured users in `const.ts`
5. Lambda generates signed SAML response with user attributes
6. User is redirected back to SP with SAML assertion via POST binding

## Configuration

### Environment Variables (set via CDK)
- `SAML_ENDPOINT` - Lambda Function URL (auto-configured during deployment)
- `SAML_ENTITY_ID` - SAML Entity ID (default: "urn:example:idp")
- `CERTIFICATE_PARAMETER_NAME` - SSM parameter name for certificate (default: "/saml-idp/certificate")

### User Management
Users are configured in `cdk/lambda/const.ts` with attributes:
- `username`, `password` - For authentication
- `role`, `displayName`, `email` - Included in SAML assertions
- All non-auth attributes are dynamically included in SAML responses

### Service Provider Configuration
Service Providers are defined in `const.ts` with:
- `name` - Identifier
- `acsUrl` - Assertion Consumer Service URL for validation

## Security Configuration

### Certificate Management
- Certificates stored in AWS Systems Manager Parameter Store
- Uses `/saml-idp/certificate` parameter by default
- Supports both public certificate and private key in single parameter
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
  --name "/saml-idp/certificate" \
  --value "$(cat public.crt)" \
  --type "SecureString" \
  --overwrite
```

### XML Signatures
- Enveloped signatures using xml-crypto library
- SHA-256 digest algorithm
- RSA-SHA256 signature algorithm

## Testing

Tests use Jest with ts-jest for TypeScript support:
- Test configuration in `jest.config.js`
- Currently minimal test implementation in `test/cdk.test.ts`
- Run tests with `npm run test` from `cdk/` directory

## Deployment

1. **Install dependencies**: `cd cdk && npm install`
2. **Generate certificates** and store in Parameter Store
3. **Deploy CDK stack**: `npm run cdk deploy`
4. **Update endpoint** (if needed) - Function URL is auto-configured
5. **Test metadata endpoint**: `curl https://your-function-url.lambda-url.region.on.aws/metadata`

## AWS Integration

- **Lambda Function** - Serverless compute with Function URL
- **Systems Manager Parameter Store** - Secure certificate storage
- **IAM** - Least-privilege permissions for Parameter Store access
- **CloudFormation** - Infrastructure as code via CDK

## Common Development Issues

### Certificate Errors
- Generate certificates in `cert/` directory using OpenSSL commands above
- Store certificate in Parameter Store with correct parameter name
- Ensure Lambda has SSM permissions (configured in CDK stack)

### "Destination is not valid" Error  
- Update Service Provider `acsUrl` in `cdk/lambda/const.ts` to match your SP's ACS URL

### Function URL Configuration
- Function URL is automatically created and configured during CDK deployment
- CORS is enabled for cross-origin requests
- Authentication is disabled for public access