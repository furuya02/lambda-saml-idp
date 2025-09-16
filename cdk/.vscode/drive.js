// TypeScriptサポート（esbuild使用でより高速）
require("ts-node").register({
  transpileOnly: true,
  esm: false,
  experimentalSpecifierResolution: "node",
  compilerOptions: {
    module: "CommonJS",
    target: "ES2020",
    moduleResolution: "node",
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
  },
});

const path = require("path");
const eventFile = process.argv[2] || "event.json";
const event = require(path.join(__dirname, eventFile));

async function run() {
  try {
    console.log("-------------REQUEST-------------");
    console.log(JSON.stringify(event, null, 2));

    // TypeScriptファイルを直接実行
    const { handler } = require("../lambda/index.ts");
    const result = await handler(event, {});

    console.log("-------------RESPONSE-------------");
    console.log(JSON.stringify(result, null, 2));

    // Content-Typeがapplication/xmlの場合は、bodyも表示
    if (
      result.headers &&
      result.headers["Content-Type"] === "application/xml"
    ) {
      console.log("-------------XML BODY-------------");
      console.log(result.body);
    }
  } catch (error) {
    console.log("-------------ERROR-------------");
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  }
}

run();
