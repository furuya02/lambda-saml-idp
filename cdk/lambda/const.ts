import { CONFIG, USER_ACCOUNT } from "./types";

export const config: CONFIG = {
  issuer: "urn:example:idp",
  acsUrl: "",
};

export const userAccountList: USER_ACCOUNT[] = [
  {
    name: "user1",
    password: "15234#xAx",
    grafana_role: "Admin",
    displayName: "ユーザー1",
    email: "user1@example.com",
  },
  {
    name: "user2",
    password: "15ads#xxss",
    grafana_role: "Viewer",
    displayName: "ユーザー2",
    email: "user2@example.com",
  },
];
