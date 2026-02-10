# Sistema de Suporte Interno

Software de tickets de suporte (Helpdesk) desenvolvido para uso interno corporativo, focado em simplicidade, identidade visual personalizada e funcionamento 100% local (sem dependência de banco de dados externos complexos).

## Funcionalidades Principais

### Gestão de Chamados
*   **Abertura de Chamados:** Funcionários podem abrir tickets detalhando setor, problema e procedimentos já realizados.
*   **Upload de Arquivos:** Suporte a anexos (Imagens, PDF, TXT, OFX, etc.).
*   **Workflow de Status:** Fluxo de trabalho: Pendente ➝ Aceito ➝ Resolvido (ou Rejeitado).
*   **Notas de Resolução:** O TI pode adicionar notas técnicas ao marcar um chamado como resolvido.

### Controle de Acesso e Usuários
*   **Login Simplificado:** Acesso via Nome de Usuário (não requer formato de e-mail estrito no login) e Senha.
*   **Papéis (Roles):**
    *   **Funcionário:** Apenas abre e visualiza seus próprios chamados.
    *   **TI (Admin):** Visualiza todos os chamados, gerencia usuários e acessa estatísticas.
*   **Gestão de Usuários (Admin):**
    *   Criar novos usuários com definição de função e e-mail de contato.
    *   Listar todos os usuários e recuperar senhas.
    *   Excluir usuários (mantendo o histórico de chamados salvo para backup).

### Painel Administrativo (Dashboard)
*   **Visualização:** Organização visual dos chamados por status.
*   **Estatísticas:** Gráficos e indicadores de performance (tickets por setor, total de atendimentos).
*   **Filtros:** Filtragem rápida de chamados por setor.
*   **Downloads:** Botão exclusivo para o perfil TI baixar anexos diretamente (além da opção de visualizar no navegador).

### Notificações Automáticas (E-mail)
O sistema envia notificações automáticas (configurável via SMTP/Office 365):
*   **Para o Suporte:** Alerta imediato via e-mail quando **um novo chamado é aberto**.
*   **Para o Usuário:** Alerta via e-mail quando o chamado dele é **marcado como Resolvido**, contendo as notas da solução.

### Identidade Visual
*   Personalizado com as cores corporativas (`#367588`).
*   Ícones e Logos da empresa integrados (Login, Barra Superior, Favicon).

## 🛠 Tecnologias Utilizadas
*   **Frontend:** React (Vite), Tailwind CSS (Estilização), Lucide (Ícones), Recharts (Gráficos).
*   **Backend:** Node.js (Express).
*   **Banco de Dados:** Sistema de Arquivos Local (JSON). Os dados são persistidos em arquivos `JSON` na pasta `LOG/`. Não requer instalação de bancos SQL/NoSQL.
*   **Uploads:** Multer (Gerenciamento de arquivos locais).
*   **E-mails:** Nodemailer.

## 📂 Estrutura de Pastas e Backup
O sistema mantém todos os dados importantes na pasta **`LOG/`**.
*   `LOG/tickets/`: Contém os chamados (organizados por pasta de usuário).
*   `LOG/uploads/`: Contém os arquivos anexados pelos usuários.
*   `LOG/users_db.json`: Banco de dados de usuários e senhas.

> **IMPORTANTE:** Para backup, basta copiar a pasta `LOG` inteira para um local seguro.

## ▶️ Como Rodar o Projeto

### Pré-requisitos
*   Node.js instalado na máquina.

### Iniciando o Servidor
1.  Para facilitar, utilize o arquivo executável **`iniciar_sistema.bat`** na raiz do projeto.
2.  Ou execute via terminal:
    ```bash
    node server.js
    ```
3.  Acesse no navegador: `http://localhost:3000`

### Configuração de E-mail (.env)
Para ativar os e-mails, edite o arquivo `.env` na raiz:
```ini
SMTP_HOST=smtp.office365.com
SMTP_USER=suporte@prontasc.com.br
SMTP_PASS=sua_senha_aqui
```

---
*Atualizado em: 10/02/2026*
