import { CONFIG, USER_ACCOUNT } from "./types";

export const config: CONFIG = {
  issuer: "urn:example:idp",
  endpoint: "http://localhost:8888",
  acsUrl:
    "https://xxxxxxxx.grafana-workspace.ap-northeast-1.amazonaws.com/saml/acs",
};

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
