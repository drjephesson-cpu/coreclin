# CoreClin

Projeto em Next.js para apoio à decisão farmacêutica com:

- Login com sessão HTTP-only.
- Cadastro de profissional, equipe e paciente.
- Vínculo do paciente ao profissional responsável via login.
- Dados variáveis de paciente (peso e altura) com cálculo de IMC e superfície corporal.
- Histórico persistido no Neon (PostgreSQL).

## Variáveis de ambiente (Vercel)

- `DATABASE_URL` (Neon)
- `AUTH_SECRET`
- `AUTH_USERNAME` (seed inicial, padrão: `jephesson`)
- `AUTH_PASSWORD` (seed inicial, padrão: `ufpb2010`)

## Seed inicial

Na primeira execução com banco conectado, o sistema cria automaticamente:

- **Dr. Jephesson Alex Floriano dos Santos**
- Profissão: **Farmacêutico**
- Conselho: **CRF/RS 18913**
- Instituição: **HE-UFPel**
- Login: `AUTH_USERNAME` (ou `jephesson`)
- Senha: `AUTH_PASSWORD` (ou `ufpb2010`)

## Deploy (GitHub + Vercel + Neon)

1. Push no GitHub.
2. Importar o repositório na Vercel.
3. Garantir `Framework Preset: Next.js`.
4. Configurar as variáveis acima.
5. Deploy.
