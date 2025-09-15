# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AWS CDK infrastructure project that deploys a serverless SAML Identity Provider (IdP) using AWS Lambda. The Lambda function serves as a minimal but functional SAML IdP for development and testing purposes.

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test

# Deploy the CDK stack
npm run cdk deploy

# View CDK diff
npm run cdk diff

# Destroy the CDK stack
npm run cdk destroy

# Watch mode for TypeScript compilation
npm run watch
```

## Architecture

### CDK Infrastructure
- **Entry Point**: `bin/cdk.ts` - Instantiates the CDK app and stack
- **Stack Definition**: `lib/cdk-stack.ts` - Defines the `SamlIdpLambdaStack`
- **Configuration**: `cdk.json` - Contains deployment parameters and CDK settings

### Deployed Resources
1. **Lambda Function**
   - Runtime: Node.js 20.x
   - Memory: 256 MB
   - Timeout: 30 seconds
   - Handler: `lambda/index.handler`
   - Public access via Function URL

2. **IAM Permissions**
   - Lambda execution role
   - SSM Parameter Store read access for certificates

3. **Environment Variables**
   - `PROJECT_NAME` - Project identifier
   - `ENDPOINT` - SAML IdP endpoint URL
   - `ENTITY_ID` - SAML entity identifier
   - `PUBLIC_CRT` - SSM parameter path for public certificate
   - `PRIVATE_KEY` - SSM parameter path for private key

### Lambda Application Structure
The Lambda function code is in the `/lambda/` directory:
- `index.ts` - Main handler with HTTP routing
- `saml.ts` - SAML protocol implementation
- `login.ts` - Authentication logic
- `const.ts` - Configuration constants
- `types.ts` - TypeScript type definitions
- `util.ts` - Utility functions

## Configuration

Key configuration is stored in `cdk.json`:
```json
{
  "context": {
    "projectName": "lambda-saml-idb",
    "entityId": "urn:example:idp",
    "publicCrt": "/saml-idp/certificate",
    "privateKey": "/saml-idp/private-key"
  }
}
```

## Certificate Management

The SAML IdP requires X.509 certificates for signing. These are stored in AWS Systems Manager Parameter Store:
- Public certificate: `/saml-idp/certificate`
- Private key: `/saml-idp/private-key`

To generate new certificates:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```

Store them in Parameter Store before deploying:
```bash
aws ssm put-parameter --name "/saml-idp/certificate" --value "$(cat server.crt)" --type "SecureString"
aws ssm put-parameter --name "/saml-idp/private-key" --value "$(cat server.key)" --type "SecureString"
```

## Deployment

1. Ensure AWS credentials are configured
2. Create certificates and store in SSM Parameter Store
3. Run `npm run cdk deploy`
4. The Lambda Function URL will be output after deployment

## Testing the SAML IdP

After deployment:
1. Access the metadata endpoint: `<Function URL>/metadata`
2. Configure your Service Provider with the metadata
3. Test SSO flow through your SP

## Common Issues

- **Certificate errors**: Ensure certificates are properly stored in SSM Parameter Store
- **Deployment failures**: Check AWS credentials and CDK bootstrap status
- **Lambda timeouts**: Consider increasing timeout in stack definition if needed