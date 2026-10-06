# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos com `multipart/form-data`.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, com validação de propriedade.
- Armazenamento local com `multer` e `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.
- Interface web para upload, listagem e download.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento, edição ou exclusão de documentos.
- Persistência de metadados em banco de dados.
- Cadastro de usuários e autenticação completa.
- Compartilhamento e pré-visualização de documentos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um documento no campo `file` de uma requisição `multipart/form-data`. |
| RF-02 | O sistema rejeita arquivo ausente ou vazio e informa o erro. |
| RF-03 | O sistema rejeita uploads acima do limite configurado. |
| RF-04 | O sistema gera identificador único e nome físico que não depende do nome original. |
| RF-05 | Um upload bem-sucedido retorna os metadados públicos do documento criado. |
| RF-06 | O usuário pode listar apenas os documentos associados à sua identidade da requisição. |
| RF-07 | A listagem é ordenada do documento mais recente para o mais antigo. |
| RF-08 | O usuário pode baixar pelo identificador somente documentos de sua propriedade. |
| RF-09 | O download é enviado como anexo e sugere o nome original ao cliente. |
| RF-10 | Documento inexistente, arquivo ausente ou documento de outro usuário resulta em `404`, sem revelar a condição. |
| RF-11 | A interface permite selecionar e enviar um documento, apresenta o resultado e atualiza a listagem. |
| RF-12 | A interface inicia o download e apresenta erros da API. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Arquivos são gravados no filesystem local com `multer` e `diskStorage`; provedores externos não são permitidos. |
| RNF-02 | O diretório padrão é `backend/storage` e pode ser alterado com `STORAGE_DIR`. |
| RNF-03 | Metadados ficam em memória; não adicionar banco ou persistência alternativa nesta fase. |
| RNF-04 | Porta, diretório e limite de upload são configuráveis por variáveis de ambiente. |
| RNF-05 | Nome físico gerado pelo sistema evita colisões e traversal; o nome original nunca define um caminho. |
| RNF-06 | Erros da API usam JSON consistente e não expõem caminhos locais ou stack traces. |
| RNF-07 | Downloads são anexos, não conteúdo inline. |
| RNF-08 | Backend segue `routes -> controllers -> services -> repositories`. |
| RNF-09 | Frontend chama a API pelo prefixo `/api`, encaminhado pelo proxy do Vite durante o desenvolvimento. |
| RNF-10 | Falhas no tratamento de arquivos não devem deixar metadados apontando para arquivos inexistentes. |

## 5. Modelo de dados

### Metadados públicos

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único e opaco do documento. |
| `originalName` | string | Nome original para exibição e download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora de criação em ISO 8601 UTC. |
| `owner` | string | Identificador do usuário associado à requisição. |

### Dados internos

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storedName` | string | Nome físico gerado; não é exposto pela API. |
| `storagePath` | string | Caminho local, mantido somente pela persistência. |

O repositório mantém os registros indexados por `id`. Os dados internos não fazem parte das respostas da API.

### Identidade do usuário

Nesta fase sem autenticação, os endpoints usam o cabeçalho `X-User-Id`, não vazio e com até 128 caracteres após remoção dos espaços nas extremidades. Essa identidade é demonstrativa e falsificável; não representa controle de segurança de produção. Uma futura camada de autenticação deve fornecer `owner` a partir da identidade validada, nunca de um campo livre do corpo.

## 6. Contratos de API

Os caminhos a seguir são atendidos pelo backend. O frontend usa o prefixo `/api` no desenvolvimento, removido pelo proxy do Vite. Todos os endpoints de documentos exigem `X-User-Id`; ausência ou valor inválido resulta em `400 Bad Request`.

### `POST /upload`

- Entrada: um arquivo no campo `file` de `multipart/form-data`.
- Limite: `MAX_FILE_SIZE_BYTES`; padrão `10485760` bytes (10 MiB).
- Sucesso: `201 Created` com os metadados públicos do documento.
- Erros: `400` para arquivo ausente/vazio ou requisição inválida; `413` para tamanho excedido; `500` para falha inesperada.

### `GET /documents`

- Sucesso: `200 OK` com array dos metadados pertencentes ao usuário, em ordem decrescente de `uploadedAt`; sem documentos, array vazio.
- Erros: `400` para identidade inválida; `500` para falha inesperada.

### `GET /documents/:id/download`

- Sucesso: `200 OK`, conteúdo binário e `Content-Disposition: attachment` com o nome original sugerido.
- Erros: `400` para identidade ou identificador inválido; `404` para documento inexistente, alheio ou arquivo ausente; `500` para falha inesperada de leitura.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

O campo `code` é estável para consumo pelo frontend; a mensagem é destinada à apresentação ao usuário. Erros internos não expõem detalhes de implementação.

## 7. Decisões arquiteturais e riscos

- `routes/` declara endpoints e encaminha requisições aos controllers.
- `controllers/` valida entrada HTTP, chama services e traduz resultados para respostas HTTP.
- `services/` concentra regras de propriedade e operações de negócio.
- `repositories/` trata filesystem local e metadados em memória.
- Multer usa `diskStorage`; arquivos permanecem estritamente locais.
- A reinicialização remove os metadados em memória, embora arquivos possam permanecer. Recuperação ou limpeza abrangente de arquivos órfãos fica fora desta fase.
- A aplicação tenta remover arquivo quando o registro dos metadados falha.
- `X-User-Id` não autentica o solicitante; disponibilizar o serviço fora de ambiente controlado requer uma camada de identidade confiável.

## 8. Plano de execução

1. **Especificação:** consolidar requisitos, dados, contratos, decisões e critérios neste documento. Critério: escopo local e limites da fase estão explícitos.
2. **Backend:** implementar upload, listagem, download, validações, propriedade e erros conforme os contratos. Critério: testes comprovam os fluxos, o isolamento e o limite de tamanho.
3. **Frontend:** disponibilizar envio, listagem, estados de carregamento/erro e download usando `/api`. Critério: sucesso e falha são comunicados e a lista é atualizada após upload.
4. **Integração:** verificar fluxos completos e configuração local. Critério: upload, listagem filtrada e download funcionam; entradas inválidas e acesso indevido produzem os resultados definidos.