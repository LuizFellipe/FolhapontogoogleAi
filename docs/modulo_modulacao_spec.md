# Módulo de Modulação — Especificação Técnica

**Projeto:** SDD Merenda Escolar / CEP-ETG  
**Escola:** Centro de Ensino Profissional Escola Técnica do Guará (CEP-ETG)  
**Sistema:** SDD — Stack React+Vite (PWA), FastAPI, MySQL, SQLAlchemy  
**Status:** Especificação aprovada — aguardando implementação em branch  
**Data:** Agosto de 2026  

---

## 1. Contexto e Objetivo

A modulação é o processo semestral pelo qual a escola distribui as cargas horárias de disciplinas entre os professores. A cada semestre, uma nova modulação é publicada definindo:

- Quais turmas existem (curso + turno)
- Quais componentes curriculares cada carga contém e suas cargas horárias
- Quais professores estão ocupando cada carga
- Quais cargas são de estágio (regência APS), com campos e datas
- Quais servidores efetivos foram designados para funções administrativas (coordenação, supervisão, direção), liberando suas cargas para ocupação por temporários

O módulo de modulação tem como objetivo **vincular os profissionais cadastrados na modulação ao sistema de folhas de ponto**, permitindo o registro de ocorrências (recessos, atestados, licenças) por servidor, com repercussão rastreável na ocupação das cargas.

---

## 2. Regras de Negócio Fundamentais

### 2.1 A carga pertence ao semestre, não ao servidor
A cada semestre uma nova modulação redistribui todas as cargas. Um servidor efetivo pode receber cargas diferentes a cada semestre, a depender das necessidades das turmas.

### 2.2 Servidor efetivo × temporário
- O servidor **efetivo** recebe uma carga na modulação do semestre.
- Quando designado para uma função (coordenação, supervisão, direção, vice-direção), sua carga fica **vaga** e é ocupada por um **temporário**.
- O temporário pode ser devolvido antes do fim do semestre, deixando a carga vaga novamente até o próximo contrato.

### 2.3 Histórico de ocupação com vigência
Uma mesma carga pode ter **múltiplos ocupantes sequenciais** ao longo do semestre. Cada ocupação é registrada com `data_inicio` e `data_fim`, permitindo rastrear:
- Quem ocupou a carga em cada período
- Por qual motivo (modulação original, cobertura de designação, cobertura de afastamento)

Exemplos reais do documento de modulação (2º semestre 2026):
- Carga 08 Estágio ENF MAT: Servidora Exemplo D até 31/07/2026 → Servidora Exemplo E desde 30/07/2026
- Carga 14 Estágio ENF MAT: Anielly Rodrigues Cazé até 31/07/2026 → Angélica Sirqueira desde 30/07/2026

### 2.4 Cargas com dois profissionais listados
Quando o documento de modulação lista dois profissionais na mesma carga teórica (ex: Carga 02 — Servidora Exemplo C + Servidora Exemplo COORD ENF), a interpretação correta é:
- **Servidora Exemplo** é a servidora efetiva dona da carga neste semestre, designada para a função de Coordenadora de Enfermagem → registrada em `designacao_funcao`
- **Servidora Exemplo C** é a temporária ocupando a carga enquanto Servidora Exemplo está na função → registrada em `ocupacao_carga`

### 2.5 Cargas sem ocupante
Carências em aberto (cargas de estágio sem professor regente atribuído) são representadas pela **ausência de registro** em `ocupacao_carga` para aquela carga — não há valor nulo forçado na tabela de cargas.

### 2.6 Ocorrências vinculadas ao servidor
Atestados, licenças, recessos e demais ocorrências são registrados diretamente no servidor, independente da carga que ele ocupa. Quando uma ocorrência é longa o suficiente para gerar substituição, uma nova `ocupacao_carga` é criada para o substituto, com `motivo = 'cobertura_afastamento'`.

### 2.7 Cargas de estágio (Regência APS)
Cargas de estágio têm natureza diferente das cargas de teoria:
- O professor regente supervisiona alunos em campos externos (hospitais, UBS, etc.)
- Cada carga de estágio tem um campo específico, com datas de início e fim próprias
- Algumas carências têm "2ª carência" (campo substituto quando o primeiro encerra antes do semestre)

---

## 3. Tipos de Carga

| Tipo | Descrição | Exemplo |
|---|---|---|
| `teoria` | Componentes curriculares ministrados em sala | Carga 01 ENF MAT — Farmacologia, Anatomia |
| `estagio` | Regência APS em campo externo | Carga 09 ENF MAT — HRT Pediatria |
| `readaptado` | Servidor em readaptação funcional | Carga 41 — Servidora Exemplo K, Apoio à Coord. de Estágio |
| `orientacao_educacional` | Orientador educacional | Carga 50 — Servidora Exemplo H, OE Matutino |
| `interprete` | Intérprete de LIBRAS | Carga 141 — Servidora Exemplo M, NUT MAT 12h |
| `qualificacao_profissional` | QP — Operador de Computador, Prog. Web | Carga 39 — Servidor Exemplo L, QP Operador MAT |
| `desenvolvimento_sistemas` | Técnico em Desenvolvimento de Sistemas | Carga 88 — Servidor Exemplo G, DEV VESP |
| `alimentacao_escolar` | Técnico em Alimentação Escolar | Carga 137 — TAE NOT A |

---

## 4. Tipos de Designação de Função

| Código | Descrição |
|---|---|
| `coord_enf` | Coordenador(a) de Enfermagem |
| `coord_nut` | Coordenador(a) de Nutrição |
| `coord_nut_aps` | Coordenador(a) de Nutrição / APS |
| `coord_enf_aps` | Coordenador(a) de Enfermagem / APS |
| `coord_qp` | Coordenador(a) de Qualificação Profissional |
| `coord_dev` | Coordenador(a) Técnico de Desenvolvimento de Sistemas |
| `superv_ped` | Supervisora Pedagógica |
| `diretor` | Diretor(a) |
| `vice_diretor` | Vice-Diretor(a) |

---

## 5. Tipos de Motivo de Ocupação

| Código | Descrição |
|---|---|
| `modulacao_original` | Ocupação definida na modulação do semestre |
| `cobertura_designacao` | Temporário cobrindo efetivo designado para função |
| `cobertura_afastamento` | Temporário cobrindo afastamento/licença do ocupante |

---

## 6. Modelo de Dados — Entidades e Relacionamentos

### Diagrama de relacionamentos (notação textual)

```
modulacao ──< turma
modulacao ──< carga
modulacao ──< designacao_funcao

curso ──< turma
turno ──< turma
turma ──< carga

carga ──< carga_componente >── componente_curricular
carga ──── carga_estagio (1:1, apenas se tipo = 'estagio')
carga ──< ocupacao_carga >── servidor

servidor ──< designacao_funcao
servidor ──< ocorrencia
```

### Cardinalidades resumidas

| Relacionamento | Cardinalidade |
|---|---|
| modulacao → turma | 1 para muitos |
| modulacao → carga | 1 para muitos |
| curso → turma | 1 para muitos |
| turno → turma | 1 para muitos |
| turma → carga | 1 para muitos |
| carga → carga_componente | 1 para muitos |
| componente_curricular → carga_componente | 1 para muitos |
| carga → carga_estagio | 1 para 0 ou 1 |
| carga → ocupacao_carga | 1 para muitos |
| servidor → ocupacao_carga | 1 para muitos |
| servidor → designacao_funcao | 1 para muitos |
| servidor → ocorrencia | 1 para muitos |

---

## 7. Definição das Tabelas

### `modulacao`
Representa o semestre letivo. Âncora temporal de todo o modelo.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| ano | INT | Ano letivo (ex: 2026) |
| semestre | TINYINT | 1 ou 2 |
| descricao | VARCHAR(100) | Ex: "2º Semestre 2026" |
| data_inicio | DATE | Início do semestre |
| data_fim | DATE | Fim do semestre |

---

### `curso`
Cursos ofertados pela escola. Relativamente estável.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| codigo | VARCHAR(20) | Ex: ENF, NUT, DEV, QP, TAE |
| nome | VARCHAR(100) | Ex: Técnico em Enfermagem |

---

### `turno`
| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| codigo | VARCHAR(10) | MAT, VESP, NOT |
| nome | VARCHAR(50) | Matutino, Vespertino, Noturno |

---

### `turma`
Turma específica de um curso/turno em uma modulação.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| modulacao_id | INT FK | Modulação do semestre |
| curso_id | INT FK | Curso |
| turno_id | INT FK | Turno |
| codigo | VARCHAR(30) | Ex: 20262, 20252 |
| nome | VARCHAR(100) | Ex: Turma 20262 ENF MAT A |

---

### `componente_curricular`
Disciplinas/componentes. Relativamente estável entre semestres.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| nome | VARCHAR(150) | Ex: Farmacologia |

---

### `carga`
Unidade central da modulação. Existe dentro de um semestre.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| modulacao_id | INT FK | Semestre ao qual pertence |
| turma_id | INT FK | Turma vinculada |
| numero | INT | Número da carga (ex: 01, 02, ...) |
| tipo | ENUM | teoria, estagio, readaptado, orientacao_educacional, interprete, qualificacao_profissional, desenvolvimento_sistemas, alimentacao_escolar |
| ch_total | INT | Carga horária total da carga |
| qc | CHAR(5) | Código de 5 dígitos para integração com sistema externo (ex: 54869) |

---

### `carga_componente`
Componentes curriculares e suas cargas horárias dentro de uma carga de teoria.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| carga_id | INT FK | Carga de teoria |
| componente_id | INT FK | Componente curricular |
| ch | INT | Carga horária do componente nesta carga |

---

### `carga_estagio`
Detalhamento específico de cargas do tipo `estagio`.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| carga_id | INT FK | Carga (tipo estagio) |
| campo | VARCHAR(150) | Local do campo (ex: HRT - ORTOPEDIA) |
| modulo | VARCHAR(50) | Ex: APS ENF MAT 01 |
| data_inicio | DATE | Início do estágio no campo |
| data_fim | DATE | Fim do estágio no campo |
| segunda_carencia | BOOLEAN | Se é 2ª carência |

---

### `servidor`
Todos os profissionais — efetivos, temporários, readaptados.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| matricula | VARCHAR(20) | Matrícula funcional |
| nome | VARCHAR(150) | Nome completo |
| tipo | ENUM | efetivo, temporario, readaptado |
| ativo | BOOLEAN | Se está ativo no sistema |

---

### `designacao_funcao`
Registra quando um servidor efetivo foi designado para uma função, liberando sua carga.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| servidor_id | INT FK | Servidor efetivo designado |
| modulacao_id | INT FK | Semestre em que a designação vigora |
| tipo_funcao | ENUM | coord_enf, coord_nut, coord_nut_aps, coord_enf_aps, coord_qp, coord_dev, superv_ped, diretor, vice_diretor |
| data_inicio | DATE | Início da designação |
| data_fim | DATE | Fim da designação (NULL se ainda vigente) |

---

### `ocupacao_carga`
Histórico de todos os ocupantes de uma carga ao longo do semestre, com vigência.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| carga_id | INT FK | Carga ocupada |
| servidor_id | INT FK | Servidor ocupante |
| motivo | ENUM | modulacao_original, cobertura_designacao, cobertura_afastamento |
| data_inicio | DATE | Início da ocupação |
| data_fim | DATE | Fim da ocupação (NULL se ainda vigente) |

---

### `ocorrencia`
Registro de ocorrências funcionais do servidor (atestados, licenças, recessos).  
Vinculada diretamente ao servidor — a repercussão na carga é tratada via nova `ocupacao_carga`.

| Campo | Tipo | Descrição |
|---|---|---|
| id | INT PK | Identificador |
| servidor_id | INT FK | Servidor |
| tipo | ENUM | atestado, licenca_medica, licenca_gestante, recesso, falta, outros |
| data_inicio | DATE | Início da ocorrência |
| data_fim | DATE | Fim da ocorrência |
| observacao | TEXT | Detalhes adicionais |

---

## 8. Exemplo Real — 2º Semestre 2026 (CEP-ETG)

### Carga 02 — ENF MAT (Teoria)

| Atributo | Valor |
|---|---|
| Modulação | 2º Semestre 2026 |
| Número | 02 |
| Tipo | teoria |
| Turma | Turma 20262 ENF MAT |
| CH Total | 240h |
| Componentes | Anatomia e Fisiologia 60h, Psicologia Aplicada à Enfermagem 40h, Ética e Relações Humanas 40h, Farmacologia 40h, Fundamentos de Enfermagem II 60h |

**Servidor efetivo (dono da carga no semestre):** Servidora Exemplo — mat. 111.111-1  
**Designação:** `coord_enf` — ativa desde o início do semestre (`data_fim = NULL`)  
**Ocupante atual:** Servidora Exemplo C — mat. 0333.333-3 — `motivo = cobertura_designacao`

---

### Carga 08 — Estágio ENF MAT 08 (com substituição datada)

| Atributo | Valor |
|---|---|
| Campo | HRSAM - UMEI Ala A 2ª Carência |
| Data início | 27/07/2026 |
| Data fim | 16/11/2026 |
| Segunda carência | true |

**Ocupação 1:** Servidora Exemplo D — mat. 0444.444-4 — `data_inicio = 27/07/2026` / `data_fim = 31/07/2026`  
**Ocupação 2:** Servidora Exemplo E — mat. 0555.555-5 — `data_inicio = 30/07/2026` / `data_fim = NULL`

---

## 9. Próximos Passos (a desenvolver no branch)

- [ ] DDL SQL completo compatível com MySQL (CREATE TABLE com FKs e ENUMs)
- [ ] Models SQLAlchemy para cada entidade
- [ ] Schemas Pydantic (FastAPI) para entrada e saída
- [ ] Endpoints REST:
  - `GET /modulacao/{id}/cargas` — lista todas as cargas do semestre
  - `GET /carga/{id}/ocupacoes` — histórico de ocupantes da carga
  - `GET /servidor/{id}/cargas` — cargas ocupadas pelo servidor no semestre
  - `POST /ocupacao_carga` — registrar novo ocupante
  - `PATCH /ocupacao_carga/{id}/encerrar` — encerrar ocupação (setar data_fim)
  - `POST /ocorrencia` — registrar ocorrência no servidor
- [ ] Seed com dados reais da modulação de julho/2026 (a partir do PDF CARGA_JULHO_2026)
- [ ] Integração com o módulo de folhas de ponto existente via `servidor_id`

---

## 10. Observações e Pendências

- **Carga 58 / DEV VESP:** Servidor Exemplo F ocupa simultaneamente ENF VESP A (40h) e componentes de DEV VESP (200h), totalizando 240h. O modelo suporta isso via múltiplos registros em `carga_componente` e `ocupacao_carga` para cargas distintas.
- **Cargas sem número de carga definido (ex: Carga 59):** Informática Aplicada à Saúde NUT VESP completa carga junto com ENF VESP B. Modelar como carga única com componentes de turmas diferentes, ou cargas separadas vinculadas ao mesmo servidor — **pendente de decisão**.
- **Ajustes EducaDF (cargas 151–155):** Cargas administrativas sem professor atribuído e sem previsão de contratação. Representadas como cargas sem `ocupacao_carga` ativa.
- **Intérpretes de LIBRAS:** Têm carga horária fracionada por turno (8h, 12h, 24h). O campo `ch_total` em `carga` captura isso, mas pode ser necessário um campo `turno_detalhe` para registrar os horários parciais.
