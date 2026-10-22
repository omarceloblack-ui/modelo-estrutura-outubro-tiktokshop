#!/usr/bin/env python3
"""Inicialização pela matriz GitHub. Sem cobrança, push ou publicação."""
import argparse
import hashlib
import json
import re
import stat
import shutil
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import quote

SKILL = Path(__file__).resolve().parents[1]
DEFAULT_REPO = None
REQUIRED = {"dist/index.html", "dist/pagamento.html", "dist/rastreio.html", "dist/admin.html",
            "dist/_worker.js", "loja.config.json", "wrangler.jsonc", "package.json",
            "AGENTS.md", "INSTRUCOES.md", "OPERACAO.md", "RASTREAMENTO.md"}
SECRET_NAMES = {"UMBRELLA_API_KEY", "RESEND_API_KEY", "WEBHOOK_SECRET", "META_ACCESS_TOKEN"}
SECRET_VALUE = re.compile(r"\bre_[A-Za-z0-9_]{20,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|Bearer\s+[A-Za-z0-9_-]{35,}")
BRIEF = ["loja.nome", "loja.slug", "loja.emailAdministrador", "loja.emailRemetente",
         "produto.nome", "produto.produtoUmbrellaId", "produto.precoCentavos", "produto.descricao",
         "produto.variantes", "produto.fotos", "identidade.logo", "identidade.corPrincipal",
         "oferta.frete", "oferta.prazoDias", "servicos.repositorio", "servicos.projetoCloudflare",
         "servicos.bancoD1"]


def jsonc(raw):
    """JSON com comentários e vírgula final, preservando strings e URLs."""
    out, i, quoted = [], 0, False
    while i < len(raw):
        c = raw[i]
        if quoted:
            out.append(c)
            if c == "\\" and i + 1 < len(raw):
                i += 1
                out.append(raw[i])
            elif c == '"':
                quoted = False
        elif c == '"':
            quoted = True
            out.append(c)
        elif raw[i:i+2] == "//":
            end = raw.find("\n", i)
            i = len(raw) if end < 0 else end
            out.append("\n")
            continue
        elif raw[i:i+2] == "/*":
            end = raw.find("*/", i+2)
            if end < 0:
                raise ValueError("Comentário JSONC não encerrado.")
            out.append(" ")
            i = end + 2
            continue
        else:
            out.append(c)
        i += 1
    raw, out, quoted, i = "".join(out), [], False, 0
    while i < len(raw):
        c = raw[i]
        if quoted:
            out.append(c)
            if c == "\\" and i + 1 < len(raw):
                i += 1
                out.append(raw[i])
            elif c == '"':
                quoted = False
        elif c == '"':
            quoted = True
            out.append(c)
        elif c == "," and raw[i+1:].lstrip()[:1] in ("}", "]"):
            pass
        else:
            out.append(c)
        i += 1
    return json.loads("".join(out))


def read_json(path):
    return jsonc(path.read_text(encoding="utf-8-sig"))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def absolute(value):
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise ValueError("Use um caminho absoluto para o projeto.")
    return path.resolve()


def safe_members(zf):
    seen, files = set(), set()
    if len(zf.infolist()) > 5000 or sum(i.file_size for i in zf.infolist()) > 250 * 1024 * 1024:
        raise ValueError("Base excede o tamanho permitido.")
    for info in zf.infolist():
        name, item = info.filename, PurePosixPath(info.filename)
        if "\\" in name or ":" in name or item.is_absolute() or ".." in item.parts:
            raise ValueError("Caminho inseguro na base.")
        if stat.S_ISLNK(info.external_attr >> 16):
            raise ValueError("Base não pode conter links simbólicos.")
        if name.casefold() in seen:
            raise ValueError("Caminho duplicado na base.")
        seen.add(name.casefold())
        if any(p.casefold() in {".git", "node_modules", "secrets", ".wrangler"} for p in item.parts):
            raise ValueError("Pasta privada indevida na base.")
        reserved = {"con", "prn", "aux", "nul"} | {f"com{n}" for n in range(1, 10)} | {f"lpt{n}" for n in range(1, 10)}
        if any(p.endswith((".", " ")) or p.split(".")[0].casefold() in reserved or any(ord(c) < 32 for c in p) for p in item.parts):
            raise ValueError("Caminho incompatível ou inseguro no Windows.")
        low = item.name.lower()
        if low.startswith((".env", ".dev.vars")) or low.endswith((".pdf", ".db", ".sqlite", ".sqlite3")):
            raise ValueError("Base contém arquivo privado ou apresentação indevida.")
        if not info.is_dir():
            files.add(name)
    if not REQUIRED.issubset(files):
        raise ValueError("Base incompleta: faltam arquivos essenciais.")
    return zf.infolist()


def new_destination(destination):
    dest = absolute(destination)
    if dest.exists():
        raise ValueError("A pasta já existe. Nada foi sobrescrito; escolha uma pasta nova.")
    if dest == SKILL or SKILL in dest.parents or dest in SKILL.parents:
        raise ValueError("A nova loja não pode sobrepor a instalação da skill.")
    return dest


def github_archive(repository, ref, folder):
    if not isinstance(repository, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) or not ref or len(ref) > 200:
        raise ValueError("Repositório ou referência GitHub inválidos.")
    gh = shutil.which("gh")
    if not gh:
        raise ValueError("GitHub CLI indisponível. Use uma integração autorizada para obter a matriz do GitHub. Não há cópia local alternativa.")
    base = [gh, "api", "--hostname", "github.com"]
    try:
        result = subprocess.run(base + [f"repos/{repository}/commits/{quote(ref, safe='')}", "--jq", ".sha"],
                                capture_output=True, timeout=45, check=False)
        if result.returncode:
            raise ValueError("Não foi possível ler a matriz privada. Confira login, permissão do repositório e referência. A cópia local não foi usada automaticamente.")
        commit = result.stdout.decode("ascii", errors="replace").strip()
        if not re.fullmatch(r"[a-f0-9]{40}", commit):
            raise ValueError("O GitHub não retornou um commit válido.")
        raw = folder / "github.zip"
        with raw.open("xb") as output:
            result = subprocess.run(base + [f"repos/{repository}/zipball/{commit}"], stdout=output,
                                    stderr=subprocess.PIPE, timeout=120, check=False)
        if result.returncode or raw.stat().st_size > 100 * 1024 * 1024:
            raise ValueError("Falha ou tamanho excessivo ao baixar a matriz. Nenhuma loja foi criada.")
    except subprocess.TimeoutExpired as error:
        raise ValueError("Tempo de consulta ao GitHub esgotado. Nenhuma loja foi criada; tente novamente após conferir o acesso.") from error
    normalized = folder / "matriz.zip"
    with zipfile.ZipFile(raw) as source, zipfile.ZipFile(normalized, "w", compression=zipfile.ZIP_DEFLATED) as target:
        members = source.infolist()
        if len(members) > 5001 or sum(i.file_size for i in members) > 250 * 1024 * 1024:
            raise ValueError("Arquivo do GitHub excede o limite da base.")
        roots = {PurePosixPath(i.filename).parts[0] for i in members if PurePosixPath(i.filename).parts}
        if len(roots) != 1:
            raise ValueError("Estrutura inesperada no arquivo do GitHub.")
        for info in members:
            parts = PurePosixPath(info.filename).parts
            if len(parts) < 2:
                continue
            name = "/".join(parts[1:]) + ("/" if info.is_dir() else "")
            entry = zipfile.ZipInfo(name)
            entry.external_attr = info.external_attr
            entry.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(entry, source.read(info))
    return normalized, {"commit": commit, "sha256": hashlib.sha256(normalized.read_bytes()).hexdigest(),
                        "fonte": "github", "repositorio": repository, "referenciaSolicitada": ref}


def initialize(destination, repository=DEFAULT_REPO, ref="main"):
    new_destination(destination)
    with tempfile.TemporaryDirectory(prefix="matriz-github-") as folder:
        archive, manifest = github_archive(repository, ref, Path(folder))
        return materialize(destination, archive, manifest)


def materialize(destination, archive, manifest):
    dest = new_destination(destination)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest["sha256"]:
        raise ValueError("A base não corresponde ao manifesto. Interrompido antes de criar arquivos.")
    with zipfile.ZipFile(archive) as zf:
        members = safe_members(zf)
        config = jsonc(zf.read("wrangler.jsonc").decode("utf-8-sig"))
        if config.get("vars", {}).get("STORE_MODE") != "template" or config.get("d1_databases"):
            raise ValueError("A base não está isolada em modo template.")
        variables = config.get("vars", {})
        for key in SECRET_NAMES | {"ADMIN_EMAIL", "ORDER_FROM_EMAIL", "REDELIVERY_PRODUCT_ID", "META_PIXEL_ID"}:
            if variables.get(key):
                raise ValueError("A base possui configuração privada ativa.")
        if variables.get("META_ENABLED") not in ("false", False):
            raise ValueError("A Meta da base deve estar desativada.")
        dest.mkdir(parents=True)
        for info in members:
            target = dest.joinpath(*PurePosixPath(info.filename).parts)
            if not target.resolve().is_relative_to(dest):
                raise ValueError("Caminho fora do projeto.")
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open("xb") as output:
                    output.write(zf.read(info))
    state = read_json(SKILL / "assets/estado-inicial.json")
    state["origem"] = {"tipo": "github", "commit": manifest["commit"],
                       "sha256": manifest["sha256"], "criadoEm": datetime.now(timezone.utc).isoformat()}
    if manifest.get("repositorio"):
        state["origem"].update({"repositorio": manifest["repositorio"], "referenciaSolicitada": manifest["referenciaSolicitada"]})
    write_json(dest / "PROJETO-LOJA.json", state)
    (dest / "ESTADO.md").write_text(
        "# Estado da nova loja\n\nFase: briefing. Modo template, pagamentos reais bloqueados e Meta desativada.\n"
        "Nenhum serviço desta nova loja foi conectado ou validado.\n"
        "Consultar PROJETO-LOJA.json e loja.config.json. Ler as instruções antes de personalizar.\n",
        encoding="utf-8")
    (dest / "RELATORIO-VALIDACAO.md").write_text(
        "# Validação da nova loja\n\nBase materializada localmente. Não há testes próprios desta implantação registrados ainda.\n"
        "Resultados da loja de referência não validam serviços, cobrança ou e-mails desta nova operação.\n"
        "Registrar inspeção, simulação, aceite de API, entrega de e-mail e homologação financeira separadamente.\n",
        encoding="utf-8")
    with (dest / "AGENTS.md").open("a", encoding="utf-8") as output:
        output.write("\n## Retomada da implantação\n\nLer PROJETO-LOJA.json, a ficha e os relatórios antes de repetir perguntas ou recriar recursos. Não registrar segredos nesses arquivos.\n")
    return {"criado": True, "projeto": str(dest), "modo": "template", "servicosConectados": False,
            "fonte": state["origem"]["tipo"], "commitBase": manifest["commit"], "proximoPasso": state["proximoPasso"]}


def field(data, dotted):
    for name in dotted.split("."):
        data = data.get(name) if isinstance(data, dict) else None
    return data


def missing_brief(data):
    return [key for key in BRIEF if field(data, key) in (None, "", [])]


def status(project):
    root = absolute(project)
    brief = read_json(root / "loja.config.json")
    state = read_json(root / "PROJETO-LOJA.json") if (root / "PROJETO-LOJA.json").is_file() else {}
    return {"fase": state.get("fase", "nao-registrada"), "camposAusentes": missing_brief(brief),
            "pendenciasRegistradas": len(state.get("pendencias", [])), "proximoPasso": state.get("proximoPasso"),
            "nota": "Sem exibir credenciais ou dados de compradores. Estado não concede autorização externa."}


def audit(project, mode):
    root, errors, warnings = absolute(project), [], []
    for item in sorted(REQUIRED):
        if not (root / item).is_file():
            errors.append("Arquivo essencial ausente: " + item)
    if errors:
        return {"diagnosticoEstaticoAprovado": False, "erros": errors, "avisos": warnings}
    config, brief = read_json(root / "wrangler.jsonc"), read_json(root / "loja.config.json")
    variables = config.get("vars", {})
    for key in SECRET_NAMES:
        if variables.get(key):
            errors.append("Segredo não pode estar em vars versionadas: " + key)
    for path in (root / "dist").rglob("*"):
        if path.is_symlink():
            errors.append("Link simbólico em conteúdo público.")
        elif path.is_file() and path.suffix.lower() in {".js", ".html", ".css", ".json", ".svg", ".txt"}:
            if SECRET_VALUE.search(path.read_text(encoding="utf-8-sig", errors="replace")):
                errors.append("Possível segredo em arquivo público: " + path.relative_to(root).as_posix())
    if mode == "matriz":
        if variables.get("STORE_MODE") != "template":
            errors.append("A base deve conservar STORE_MODE=template.")
        if variables.get("META_ENABLED") not in ("false", False):
            errors.append("A base deve conservar a Meta desativada.")
        if config.get("d1_databases"):
            errors.append("A matriz não deve conectar banco de produção.")
        for key in ("ADMIN_EMAIL", "ORDER_FROM_EMAIL", "META_PIXEL_ID", "REDELIVERY_PRODUCT_ID"):
            if variables.get(key):
                errors.append("Configuração real indevida na matriz: " + key)
        warnings.append("Conteúdo e mídia são exemplos. Personalizar e validar antes de ativar.")
    else:
        if variables.get("STORE_MODE") != "live":
            errors.append("Ativação ainda bloqueada pelo modo template/ausente.")
        errors += ["Briefing ausente: " + key for key in missing_brief(brief)]
        worker = (root / "dist/_worker.js").read_text(encoding="utf-8-sig")
        if "https://loja-exemplo.invalid" in worker or "produto-exemplo" in worker:
            errors.append("Servidor ainda possui domínio ou produto de exemplo.")
        for key in ("ADMIN_EMAIL", "ORDER_FROM_EMAIL"):
            if not variables.get(key) or ".invalid" in variables.get(key, ""):
                errors.append("Configurar valor real de " + key)
        if not config.get("d1_databases"):
            errors.append("Falta binding do D1 próprio.")
        for key in ("servicos.dominioResendVerificado", "servicos.webhookConfigurado",
                    "rastreamento.revisadoAntesDeploy", "rastreamento.utmValidado"):
            if field(brief, key) is not True:
                errors.append("Conferência pendente: " + key)
        decision = field(brief, "rastreamento.meta.decisao")
        if decision not in ("ativar", "desativar"):
            errors.append("Falta decisão explícita sobre a Meta.")
        if decision == "ativar":
            if variables.get("META_ENABLED") != "true" or not re.fullmatch(r"\d+", str(variables.get("META_PIXEL_ID", ""))):
                errors.append("Configuração pública da Meta incompleta ou desligada.")
            for key in ("rastreamento.meta.eventosValidados", "rastreamento.meta.credencialConfiguradaNaHospedagem"):
                if field(brief, key) is not True:
                    errors.append("Validação Meta pendente: " + key)
        elif decision == "desativar" and variables.get("META_ENABLED") != "false":
            errors.append("Decisão desativar não corresponde à configuração Meta.")
        state = read_json(root / "PROJETO-LOJA.json") if (root / "PROJETO-LOJA.json").exists() else {}
        for key in ("briefingAprovado", "conteudoRevisado", "privacidadeRevisada", "testesLocais", "servicosConferidos"):
            if state.get("validacoes", {}).get(key) is not True:
                errors.append("Evidência de implantação pendente: " + key)
        warnings.append("Conferir política/valor/produto de reentrega, autorização vigente e resultados reais. Chaves hospedadas não foram consultadas.")
    return {"diagnosticoEstaticoAprovado": not errors, "modo": mode, "erros": errors, "avisos": warnings,
            "limite": "Não autoriza publicar e não comprova integração, envio, pagamento ou entrega reais."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    start = commands.add_parser("iniciar", help="Baixar matriz pelo acesso GitHub autorizado e criar pasta nova isolada.")
    start.add_argument("--destino", required=True)
    start.add_argument("--repositorio", required=True, help="Repositório usado somente ao pedir explicitamente outra cópia.")
    start.add_argument("--ref", default="main")
    check = commands.add_parser("conferir", help="Diagnóstico estático; não autoriza deploy.")
    check.add_argument("--projeto", required=True)
    check.add_argument("--modo", choices=["matriz", "ativacao"], default="matriz")
    report = commands.add_parser("status", help="Listar campos ausentes, sem valores sensíveis.")
    report.add_argument("--projeto", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "iniciar":
            result = initialize(args.destino, args.repositorio, args.ref)
        elif args.command == "status":
            result = status(args.projeto)
        else:
            result = audit(args.projeto, args.modo)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result.get("diagnosticoEstaticoAprovado") is False else 0
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
        print(json.dumps({"erro": str(error)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
