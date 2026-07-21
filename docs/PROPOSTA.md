# Proposta de Projeto — Endovascular Hub

**Painel administrativo para cadastrar, editar e visualizar os dados do negócio de forma simples e segura.**

| | |
|---|---|
| **Preparado para** | Venus Org |
| **Preparado por** | Danilo Silveira |
| **Contato** | +1 647 233-6034 |
| **Data** | 30-06-2026 |
| **Versão do documento** | 1.0 |

> **Como usar este documento:** os campos entre colchetes `[ ]` e os valores `R$ [____]` são espaços a serem preenchidos antes do envio ao cliente. Revise também prazos e condições antes da assinatura.

---

## 1. Resumo executivo

Esta proposta descreve o desenvolvimento e a **finalização do Endovascular Hub** — uma interface web amigável e segura que permite à equipe **editar, adicionar e excluir** os dados da plataforma diretamente em um banco de dados moderno (Supabase), **sem necessidade de conhecimento técnico**.

Além da gestão dos cadastros do negócio (empresas, materiais, marcas, estados e procedimentos), o portal valoriza o acompanhamento dos **representantes comerciais** e seus respectivos **níveis (tiers)**, com painéis visuais que facilitam a leitura da operação. O projeto encontra-se em fase de **protótipo funcional**, e esta proposta cobre tanto o que já está entregue quanto as etapas para a versão final.

## 2. Contexto e problema

Hoje, as informações operacionais do negócio — empresas, representantes, materiais, marcas, procedimentos e suas relações — encontram-se armazenadas em um banco de dados (Supabase), cuja edição normalmente ocorre por **interfaces técnicas voltadas a desenvolvedores**. Isso gera:

- **Dependência técnica:** qualquer ajuste simples exige um profissional de TI.
- **Risco operacional:** a edição direta no banco, sem validações amigáveis, aumenta a chance de erros e de dados inconsistentes.
- **Baixa legibilidade:** não há visões consolidadas (por exemplo, distribuição de representantes por nível).

O portal resolve esses problemas entregando ao cliente uma **interface própria, visual e segura**, na qual o time cadastra e edita dados com poucos cliques — sempre com confirmações e feedback claros.

## 3. Objetivos

**Objetivo principal**

Disponibilizar ao cliente um portal web amigável para **criar, editar e excluir** (CRUD) os dados armazenados no Supabase, substituindo a edição técnica por uma experiência simples, validada e segura.

**Objetivos específicos**

- Centralizar a gestão de todos os cadastros do negócio em um único painel.
- Destacar a gestão dos **representantes** e seus **níveis (tiers)**, com dados de contato e endereço.
- Oferecer visões analíticas (dashboard) que resumam a operação de um golpe de vista.
- Garantir segurança por autenticação, com acesso restrito a usuários autorizados.
- Tornar a edição de arquivos (imagens e PDFs) simples e integrada ao cadastro.

## 4. Escopo e funcionalidades

### 4.1 Dashboard (painel geral)
- **Gráfico de representantes por nível (tier)**, com legenda e percentuais.
- **Tabela de materiais por marca e vendedor**, ordenável e pesquisável.
- **Filtro global por estado**, permitindo análises regionais.

### 4.2 Representantes / Vendedores ⭐ *(destaque)*
- Cadastro completo: nome, e-mail, telefone, **nível (tier)**, endereço, bairro, CEP e complemento.
- Upload da imagem/banner do representante.
- Exibição do nível (tier) de cada representante direto na listagem, facilitando a comparação.

### 4.3 Demais cadastros (CRUD completo)
- **Empresas** (com banner)
- **Materiais** (com brochura em PDF)
- **Marcas**
- **Tipos de Material**
- **Estados** (nome e UF)
- **Procedimentos**

### 4.4 Relacionamentos (muitos-para-muitos)
- **Material ↔ Vendedor**, com contexto de **estado** (qual material, de qual vendedor, em qual estado).
- **Procedimento ↔ Material**.

### 4.5 Recursos transversais
- **Autenticação segura** (login por e-mail e senha), com rotas protegidas — apenas usuários autorizados acessam o painel.
- **Upload de arquivos** integrado para imagens (banners) e documentos (brochuras em PDF).
- **Tabelas** com busca, ordenação e ações rápidas (editar / excluir).
- **Notificações** de sucesso e erro em todas as operações.

## 5. Tecnologia

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js (App Router) + React |
| Banco de dados / Backend | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Armazenamento de arquivos | Supabase Storage |
| Interface | CSS moderno, biblioteca de ícones e notificações em tempo real |

Trata-se de uma stack **moderna, escalável e de baixo custo de manutenção**, ideal para painéis administrativos, com hospedagem simples e atualizações descomplicadas.

## 6. Entregáveis

- Portal web responsivo (versão final, evoluída a partir do protótipo atual).
- Todas as telas de gestão descritas no escopo, plenamente funcionais.
- Código-fonte versionado em repositório, **entregue ao cliente**.
- Publicação em ambiente de produção (hospedagem e domínio).
- Documentação de uso e manual breve para a equipe.
- Sessão de **treinamento (onboarding)** com os usuários finais.

## 7. Status atual — protótipo funcional

O projeto **já está em estágio avançado**, com um protótipo funcional que contempla:

- ✅ Login e proteção de rotas
- ✅ Dashboard com gráfico de representantes por **tier** e tabela de materiais × marca × vendedor
- ✅ Cadastro, edição e exclusão de **representantes (com tier)**, empresas, materiais, marcas, tipos de material, estados e procedimentos
- ✅ Relacionamentos **Material ↔ Vendedor** (por estado) e **Procedimento ↔ Material**
- ✅ Upload de banners e brochuras
- ✅ Interface limpa, com busca, ordenação e notificações

Em suma: **o núcleo do produto já existe e pode ser demonstrado.** O restante desta proposta cobre o refinamento até a versão de produção.

## 8. Roadmap para a versão final

Para levar o protótipo à versão final, estão previstas as seguintes etapas (podem ser priorizadas conforme a necessidade do cliente):

1. **Refino de UI/UX e responsividade** — uso fluido em celular e tablet.
2. **Validações de formulário e tratamento de erros** mais robustos.
3. **Exclusão segura e confirmações** — evitar remoções acidentais.
4. **Gestão de usuários e permissões** — papéis (administrador, editor, leitor).
5. **Exportação de dados e relatórios** — CSV / planilhas.
6. **Auditoria / histórico** de alterações principais.
7. **Importação em massa** via planilha para cadastros.
8. **Revisão de segurança** — políticas de acesso (RLS) no banco de dados.
9. **Backup e recuperação** dos dados.
10. **Testes** funcionais e de aceitação.
11. **Publicação em produção** — domínio, hospedagem e SSL.
12. **Documentação final e treinamento** da equipe.

## 9. Cronograma

> Preencha os prazos conforme a sua disponibilidade. Sugestão de agrupamento por fases.

| Fase | Etapas (do roadmap) | Prazo estimado |
|---|---|---|
| Fase 1 — Refino e robustez | 1, 2, 3 | [XX] semanas |
| Fase 2 — Recursos adicionais | 4, 5, 6, 7 | [XX] semanas |
| Fase 3 — Segurança e qualidade | 8, 9, 10 | [XX] semanas |
| Fase 4 — Entrega e treinamento | 11, 12 | [XX] semanas |
| **Total estimado** | | **[XX] semanas** |

*Os prazos são estimativas e podem variar conforme alterações de escopo aprovadas durante o projeto.*

## 10. Investimento

> Preencha os valores antes do envio. Os itens abaixo são uma sugestão de estrutura.

| Item | Descrição | Valor |
|---|---|---|
| Desenvolvimento | Refino do protótipo até a versão final (escopo das seções 4 a 8) | R$ [____] |
| Recursos opcionais | Funcionalidades extras além do escopo (a combinar) | R$ [____] |
| **Subtotal (projeto)** | | **R$ [____]** |
| Suporte mensal *(opcional)* | Manutenção e suporte contínuo | R$ [____] /mês |

**Condições de pagamento (sugestão):**
- [XX]% na assinatura / início do projeto.
- [XX]% em [marco intermediário].
- [XX]% na entrega final.

*Outras condições podem ser negociadas.*

## 11. Suporte pós-entrega

- Garantia de **[XX] dias** para correção de bugs após a entrega, sem custo adicional.
- Suporte e manutenção contínuos disponíveis mediante contratação do plano mensal (seção 10).

## 12. Termos e condições

- **Escopo:** a proposta cobre exclusivamente as funcionalidades descritas no item 4 e o roadmap do item 8. Alterações de escopo serão tratadas como aditivos.
- **Prazos:** contam-se a partir da assinatura e do fornecimento das informações/acessos necessários.
- **Propriedade intelectual:** após a quitação, o código-fonte e os artefatos entregues passam a ser do cliente.
- **Confidencialidade e LGPD:** os dados tratados pelo portal são de responsabilidade do cliente; recomenda-se adequação à LGPD conforme o uso.
- **Hospedagem e serviços de terceiros:** custos de hospedagem (ex.: Vercel) e do Supabase, quando aplicáveis, são de responsabilidade do cliente.
- **Validade:** esta proposta é válida por **[XX] dias** a partir da data.

## 13. Próximos passos / aceite

Para iniciarmos, basta:

1. **Aprovação** desta proposta (por e-mail ou assinatura).
2. Definição do **cronograma e condições** finais.
3. Alinhamento dos **acessos** necessários ao banco/configurações.

Em caso de dúvidas, estou à disposição pelo contato informado no cabeçalho.

---

**Aceite**

Concordo com os termos desta proposta:

_____________________________________________
[NOME DO CLIENTE] — [DATA]

_____________________________________________
[SEU NOME / SUA EMPRESA] — [DATA]
