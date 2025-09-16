export interface CONFIG {
  issuer: string;
  acsUrl: string;
}

export interface USER_ACCOUNT {
  name: string;
  password: string;
  displayName: string;
  email: string;
  role: string;
}

export interface AUTHN_REQUEST {
  id?: string;
  version?: string;
  issueInstant?: string;
  destination?: string;
  assertionConsumerServiceURL?: string;
  issuer?: string;
  nameIdFormat?: string;
}
