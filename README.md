# CoreClin

Projeto inicial em Next.js para o CoreClin, com tela de login e sessão via cookie HTTP-only.

## Login inicial

- Usuário: `jephesson`
- Senha: `ufpb2010`

As credenciais estão configuráveis por variáveis de ambiente.

## Rodando localmente

1. Instale dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo de ambiente:
   ```bash
   cp .env.example .env.local
   ```
3. Inicie o servidor:
   ```bash
   npm run dev
   ```
4. Acesse [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel + GitHub)

1. Crie um repositório no GitHub e faça push:
   ```bash
   git init
   git add .
   git commit -m "feat: base do CoreClin com login"
   git branch -M main
   git remote add origin <URL_DO_REPOSITORIO>
   git push -u origin main
   ```
2. Na Vercel, importe o repositório e configure as variáveis:
   - `AUTH_USERNAME`
   - `AUTH_PASSWORD`
   - `AUTH_SECRET`
3. Faça deploy.

## Próxima etapa: Neon

Para substituir o login fixo por autenticação real:

1. Criar projeto no Neon e obter `DATABASE_URL`.
2. Configurar ORM (`Prisma` ou `Drizzle`).
3. Criar tabela de usuários/perfis.
4. Trocar a validação fixa do arquivo `lib/auth.ts` por consulta no banco.
