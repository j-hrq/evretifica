import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const IS_WIN = process.platform === "win32";

function obterPythonVenv() {
  return IS_WIN
    ? path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    : path.join(BACKEND_DIR, ".venv", "bin", "python");
}

function detectarPythonSistema() {
  const candidatos = IS_WIN
    ? [
        ["python", ["--version"]],
        ["py", ["-3", "--version"]],
        ["python3", ["--version"]],
      ]
    : [
        ["python3", ["--version"]],
        ["python", ["--version"]],
      ];

  for (const [cmd, args] of candidatos) {
    const res = spawnSync(cmd, args, { encoding: "utf-8", stdio: "pipe" });
    if (res.status === 0 && (res.stdout.includes("Python 3.") || res.stderr.includes("Python 3."))) {
      const prefixArgs = args.slice(0, -1);
      return { cmd, prefixArgs };
    }
  }

  console.error(
    "Erro: Python 3.12+ não encontrado no PATH. Instale o Python em https://www.python.org/downloads/ e tente novamente.",
  );
  process.exit(1);
}

function executar(cmd, args, opcoes = {}) {
  const resultado = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: ROOT_DIR,
    shell: false,
    ...opcoes,
  });

  if (resultado.error) {
    console.error(`Erro ao executar '${cmd}': ${resultado.error.message}`);
    process.exit(1);
  }

  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
  }
}

function executarNpm(args, cwd) {
  if (IS_WIN) {
    executar("cmd.exe", ["/d", "/s", "/c", "npm", ...args], { cwd });
  } else {
    executar("npm", args, { cwd });
  }
}

function garantirVenv() {
  const venvPython = obterPythonVenv();
  if (!existsSync(venvPython)) {
    console.error(
      "Ambiente virtual não encontrado em backend/.venv. Execute 'npm run setup' primeiro.",
    );
    process.exit(1);
  }
  return venvPython;
}

function possuiUsuarioNoBanco(venvPython) {
  const codigo =
    "from app.db import SessionLocal; from app.seed import possui_usuario_cadastrado; " +
    "db = SessionLocal(); print('SIM' if possui_usuario_cadastrado(db) else 'NAO'); db.close()";
  const res = spawnSync(venvPython, ["-c", codigo], {
    cwd: BACKEND_DIR,
    encoding: "utf-8",
    stdio: "pipe",
  });
  return res.status === 0 && res.stdout.trim() === "SIM";
}

function executarSetup(argumentosExtras) {
  const pularUsuario = argumentosExtras.includes("--sem-usuario");

  console.log("\n=== [1/7] Verificando arquivo .env ===");
  const envPath = path.join(ROOT_DIR, ".env");
  const envExamplePath = path.join(ROOT_DIR, ".env.example");
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    console.log("Arquivo .env criado a partir de .env.example.");
  } else {
    console.log("Arquivo .env já existe.");
  }

  console.log("\n=== [2/7] Verificando ambiente virtual Python (backend/.venv) ===");
  const venvPython = obterPythonVenv();
  if (!existsSync(venvPython)) {
    const py = detectarPythonSistema();
    console.log(`Criando ambiente virtual em backend/.venv usando '${py.cmd}'...`);
    executar(py.cmd, [...py.prefixArgs, "-m", "venv", ".venv"], { cwd: BACKEND_DIR });
  } else {
    console.log("Ambiente virtual backend/.venv já existe.");
  }

  console.log("\n=== [3/7] Instalando dependências do backend ===");
  executar(venvPython, ["-m", "pip", "install", "-r", "requirements-dev.txt"], {
    cwd: BACKEND_DIR,
  });

  console.log("\n=== [4/7] Aplicando migrations do banco de dados (Alembic) ===");
  executar(venvPython, ["-m", "alembic", "upgrade", "head"], {
    cwd: BACKEND_DIR,
  });

  console.log("\n=== [5/7] Populando marcas iniciais de veículos ===");
  executar(venvPython, ["-m", "app.seed_marcas"], {
    cwd: BACKEND_DIR,
  });

  console.log("\n=== [6/7] Instalando dependências e gerando build do frontend ===");
  executarNpm(["install"], FRONTEND_DIR);
  executarNpm(["run", "build"], FRONTEND_DIR);

  console.log("\n=== [7/7] Verificando usuário da oficina ===");
  if (possuiUsuarioNoBanco(venvPython)) {
    console.log("Usuário da oficina já cadastrado no banco de dados.");
  } else if (!pularUsuario && process.stdin.isTTY) {
    console.log("Nenhum usuário cadastrado. Informe os dados do usuário da oficina:");
    executar(venvPython, ["-m", "app.seed", "--se-vazio"], {
      cwd: BACKEND_DIR,
    });
  } else {
    console.log(
      "Nenhum usuário cadastrado ainda. Para cadastrar o usuário da oficina, execute no terminal:\n  npm run seed",
    );
  }

  console.log("\nConfiguração concluída com sucesso!");
  console.log("Para iniciar o sistema completo em http://localhost:8000, execute:");
  console.log("  npm run backend\n");
}

const [acao, ...argsExtras] = process.argv.slice(2);

switch (acao) {
  case "setup":
    executarSetup(argsExtras);
    break;
  case "backend": {
    const venvPython = garantirVenv();
    executar(
      venvPython,
      ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", ...argsExtras],
      { cwd: BACKEND_DIR },
    );
    break;
  }
  case "dev:backend": {
    const venvPython = garantirVenv();
    executar(
      venvPython,
      ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000", ...argsExtras],
      { cwd: BACKEND_DIR },
    );
    break;
  }
  case "dev:frontend":
    executarNpm(["run", "dev", ...argsExtras], FRONTEND_DIR);
    break;
  case "seed": {
    const venvPython = garantirVenv();
    executar(venvPython, ["-m", "app.seed", ...argsExtras], { cwd: BACKEND_DIR });
    break;
  }
  case "seed:marcas": {
    const venvPython = garantirVenv();
    executar(venvPython, ["-m", "app.seed_marcas", ...argsExtras], { cwd: BACKEND_DIR });
    break;
  }
  case "seed:massa": {
    const venvPython = garantirVenv();
    executar(venvPython, ["-m", "app.seed_massa_dados", ...argsExtras], { cwd: BACKEND_DIR });
    break;
  }
  default:
    console.error(
      "Comando inválido. Comandos disponíveis: setup, backend, dev:backend, dev:frontend, seed, seed:marcas, seed:massa",
    );
    process.exit(1);
}
