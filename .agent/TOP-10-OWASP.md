# TOP-10-OWASP.md — secure coding para LLMs (OWASP Top 10:2025)

Público: LLMs, code review, refatoração automática, CI/CD. Objetivo: identificar, mitigar e gerar código imune ao [OWASP Top 10:2025](https://owasp.org/Top10/2025/).

Premissa: toda entrada externa (URL, JSON, header, form) é hostil até validada por allow-list estrita.

## A01 — Broken Access Control (CWE-200, 201, 284, 285, 639/IDOR, 918/SSRF)
Deny-by-default: nunca confie em id vindo do cliente; autorize contra a sessão/JWT no servidor, por endpoint e por recurso.
✗ `Invoice.find({ userId: req.params.id })` → ✓ `if (req.user.id !== id && !isAdmin) return 403`.

## A02 — Security Misconfiguration (CWE-16, 2, 209, 1004)
Subiu para #2 (nuvem/IaC). `DEBUG=False`, sem credencial default, headers `CSP`, `HSTS`, `nosniff`, `DENY`, CORS só para origens confiáveis, nunca stack trace em prod.
✗ `CORS("*")` + `DEBUG=True` → ✓ allow-list de origins + headers setados em `after_request`.

## A03 — Supply Chain Failures (CWE-1357, 1104, 829, 937)
Expande "componentes vulneráveis": typosquatting, dependency confusion, CI sem proteção, sem SBOM. Versões exatas + lockfile com hash; audite sempre.
✗ `"express": "*"` → ✓ `"express": "4.19.2"` + `npm audit` + SBOM.

## A04 — Cryptographic Failures (CWE-259, 326, 327, 328, 330)
Sem segredo hardcoded; senhas só com Argon2id/bcrypt/scrypt (nunca MD5/SHA1/DES/RC4); repouso com AES-256-GCM ou ChaCha20-Poly1305; segredos via env/vault.
✗ `MD5(senha)` + `KEY = "abc123"` → ✓ `bcrypt.hashpw(senha, gensalt(12))` + `getenv("KEY")`.

## A05 — Injection (CWE-79/XSS, 89/SQLi, 78/comando, 94, 943)
SQL/NoSQL parametrizado, subprocess sem shell (lista de args), output encoding contextual no HTML, nunca `eval`/`exec`/`system` com input.
✗ `f"SELECT ... '{u}'"` + `os.system(f"ping {x}")` → ✓ `execute(q, (u,))` + `run(["ping", "-c", "1", ip])`.

## A06 — Insecure Design (CWE-209, 256, 501, 602)
Falha antes do código: threat modeling, rate limit e validação de estado no servidor, defesa contra automação nos fluxos (recuperar conta, compra, limite).
✗ reset com código de 4 dígitos e tentativas ilimitadas → ✓ token CSPRNG hasheado, expira em 15min, 3 tent./hora, uso único.

## A07 — Authentication Failures (CWE-287, 384, 613, 798)
Sessão com `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, expiração fixa; rate limit + bloqueio progressivo no login; nunca token na URL.
✗ `res.cookie("sess", token)` sem flags → ✓ cookie com flags + `loginRateLimiter`.

## A08 — Integrity Failures (CWE-345, 353, 502, 494)
Nunca desserialize input com `pickle`/`unserialize`/`ObjectInputStream` (RCE); use JSON/Protobuf + validação de schema; update crítico só com assinatura/HMAC.
✗ `pickle.loads(request.data)` → ✓ `Schema.model_validate_json(...)`.

## A09 — Logging & Alerting Failures (CWE-117, 223, 532, 778)
Log estruturado (JSON: timestamp UTC, user, IP, ação) de auth/acesso/erros + alerta; redija credenciais, chaves e PII antes de logar.
✗ `console.log(req.body)` (vaza cartão/CVV) → ✓ `logger.info({ event, userId, amount, ip })`.

## A10 — Mishandling of Exceptional Conditions (CWE-390, 391, 636, 703, 754, 755)
Nova em 2025. Fail-Closed: exceção em permissão/transação nega e faz rollback; erro genérico ao usuário, detalhe só no log interno.
✗ `except: print(e)` e o delete continua → ✓ `rollback()` + `raise RuntimeError("...")` genérico.

## Árvore de decisão (toda geração/auditoria)
1. Entrada: allow-list estrita em tudo que vem de fora. 2. Autorização: validar no servidor por endpoint/recurso. 3. Erros: estado, dinheiro e permissão sempre fail-closed. 4. Cripto: só primitivas modernas (Argon2id, AES-GCM, TLS 1.3).
