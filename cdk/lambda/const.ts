import { CONFIG, USER_ACCOUNT } from "./types";

export const config: CONFIG = {
  issuer: "urn:example:idp", // 必須
  endpoint: "http://localhost:8888", // 必須
  acsUrl:
    "https://g-fbfb1471e3.grafana-workspace.ap-northeast-1.amazonaws.com/saml/acs", // オプション【空白にするとacsのチェックが無効化されます】
};

export const userAccountList: USER_ACCOUNT[] = [
  {
    name: "user1",
    password: "xxx12#xxx",
    role: "admin",
    displayName: "ユーザー1",
    email: "user1@example.com",
  },
  {
    name: "user2",
    password: "xxx12#xxx",
    role: "admin",
    displayName: "ユーザー2",
    email: "user2@example.com",
  },
];
