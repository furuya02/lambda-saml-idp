import { userAccountList } from "./const";

export function authenticateUser(body: string): boolean {
  const params = new URLSearchParams(body);
  const username = params.get("username");
  const password = params.get("password");

  if (username === null || password === null) {
    return false;
  }
  let loginSucceeded = false;
  userAccountList.forEach((account) => {
    if (account.name === username && account.password === password) {
      loginSucceeded = true;
    }
  });
  return loginSucceeded;
}

export function createLoginForm(
  queryString: string,
  errorMessage: string
): string {
  const loginForm = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ログイン - SAML IdP</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a1a 0%, #0d1117 100%);
        }
        .login-container {
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h2 {
            text-align: center;
            margin-bottom: 30px;
            color: #ffffff;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #e0e0e0;
            font-weight: bold;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            background: rgba(0, 0, 0, 0.5);
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        .error {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>SAML Identity Provider by Lambda</h2>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
        <form action="/login?${queryString}" method="POST" autocomplete="off">
            <div class="form-group">
                <label for="username">User:</label>
                <input type="text" id="username" name="username" required autocomplete="off">
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required autocomplete="off">
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>`;
  return loginForm;
}
