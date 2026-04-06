# Allumni - Sistema de Rede de Ex-Alunos

Sistema completo de rede social para ex-alunos com funcionalidades de login, perfis, vagas, grupos e chat. **Funciona completamente no navegador, sem necessidade de servidor!**

## 🚀 Funcionalidades

- **Autenticação**: Sistema de login e cadastro com senhas criptografadas
- **Perfis**: Gerenciamento completo de perfis de usuários com upload de foto
- **Vagas**: Sistema de publicação e candidatura a vagas de emprego
- **Grupos**: Criação e participação em grupos temáticos
- **Chat**: Sistema de mensagens em grupos com suporte a texto, imagens e áudio
- **Administração**: Painel administrativo para gerenciar usuários e contas
- **Dashboard**: Interface moderna e responsiva

## Como Usar

**Simplesmente abra o arquivo `index.html` no seu navegador!**

Tudo funciona diretamente no navegador usando IndexedDB para armazenamento local.


## 🗄️ Armazenamento de Dados

O projeto usa **IndexedDB** para armazenar todos os dados localmente no navegador:

- **Usuários**: Dados de login, perfis e configurações
- **Vagas**: Todas as vagas de emprego
- **Grupos**: Grupos e membros
- **Mensagens**: Chat com texto, imagens e áudio
- **Candidaturas**: Candidaturas a vagas

**Nota**: Os dados são armazenados localmente no navegador. Se você limpar os dados do navegador, os dados serão perdidos. Para backup, você pode exportar os dados do IndexedDB usando as ferramentas de desenvolvedor do navegador.

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Armazenamento**: IndexedDB (nativo do navegador)
- **Segurança**: Web Crypto API para hash de senhas
- **Mídia**: MediaRecorder API para gravação de áudio
- **Upload**: FileReader API para imagens e arquivos

## Funcionalidades Detalhadas

### Autenticação
- Cadastro de novos usuários
- Login com validação de senha
- Logout
- Verificação de conta fechada

### Perfis
- Visualização de perfil completo
- Edição de informações pessoais
- Upload de foto de perfil
- Links para LinkedIn e GitHub

### Vagas
- Listagem de todas as vagas ativas
- Criação de novas vagas
- Candidatura a vagas
- Detalhes completos de cada vaga

### Grupos
- Listagem de grupos disponíveis
- Criação de novos grupos
- Entrada em grupos
- Visualização de membros
- Chat em tempo real com:
  - Mensagens de texto
  - Envio de imagens
  - Gravação e envio de áudio

### Administração
- Listagem de todos os usuários
- Remover contas permanentemente
- Promover usuários a administradores
- Remover privilégios de administrador
- Criar e remover grupos
- Criar e remover vagas

**Credenciais Padrão do Admin:**
- Email: `admin@unisantos.br`
- Senha: `123456`

## Segurança

- Senhas são criptografadas usando SHA-256 (Web Crypto API)
- Validação de dados no frontend
- Verificação de permissões para ações administrativas
- Proteção contra acesso não autorizado

## Notas Importantes

- **Dados Locais**: Todos os dados são armazenados localmente no navegador
- **Sem Sincronização**: Os dados não são sincronizados entre dispositivos
- **Limpeza de Dados**: Limpar dados do navegador apagará todos os dados da aplicação
- **Compatibilidade**: Funciona em todos os navegadores modernos que suportam IndexedDB
