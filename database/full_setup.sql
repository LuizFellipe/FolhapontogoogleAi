-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: folhaponto_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `feriados`
--

DROP TABLE IF EXISTS `feriados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feriados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dia` int NOT NULL,
  `mes` int NOT NULL,
  `ano` int NOT NULL,
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_feriado_dia` (`dia`,`mes`,`ano`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feriados`
--

LOCK TABLES `feriados` WRITE;
/*!40000 ALTER TABLE `feriados` DISABLE KEYS */;
INSERT INTO `feriados` VALUES (1,1,4,2026,'DIA DO TRABALHADOR','2026-05-03 21:38:39'),(2,3,3,2026,'PAIXÃO DE CRISTO','2026-05-04 12:55:05'),(3,21,3,2026,'TIRADENTES','2026-05-04 12:55:17'),(7,4,5,2026,'RECESSO','2026-06-02 18:49:44');
/*!40000 ALTER TABLE `feriados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `folhas_ponto`
--

DROP TABLE IF EXISTS `folhas_ponto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `folhas_ponto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profissional_id` int NOT NULL,
  `mes` int NOT NULL,
  `ano` int NOT NULL,
  `observacoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_profissional_mes_ano` (`profissional_id`,`mes`,`ano`),
  KEY `idx_profissional_mes_ano` (`profissional_id`,`mes`,`ano`),
  CONSTRAINT `folhas_ponto_ibfk_1` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=643 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folhas_ponto`
--

LOCK TABLES `folhas_ponto` WRITE;
/*!40000 ALTER TABLE `folhas_ponto` DISABLE KEYS */;
/*!40000 ALTER TABLE `folhas_ponto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lancamentos_diarios`
--

DROP TABLE IF EXISTS `lancamentos_diarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lancamentos_diarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folha_ponto_id` int NOT NULL,
  `dia` int NOT NULL,
  `tipo` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRABALHO',
  `tipo_turno2` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_folha_dia` (`folha_ponto_id`,`dia`),
  KEY `idx_folha_dia` (`folha_ponto_id`,`dia`),
  KEY `idx_tipo_turno2` (`tipo_turno2`),
  CONSTRAINT `lancamentos_diarios_ibfk_1` FOREIGN KEY (`folha_ponto_id`) REFERENCES `folhas_ponto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=81890 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lancamentos_diarios`
--

LOCK TABLES `lancamentos_diarios` WRITE;
/*!40000 ALTER TABLE `lancamentos_diarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `lancamentos_diarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profissionais`
--

DROP TABLE IF EXISTS `profissionais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profissionais` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ua` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exercicio` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `carga_horaria` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidade_lotacao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `turno1` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `turno2` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `idx_nome` (`nome`),
  KEY `idx_matricula` (`matricula`)
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profissionais`
--

LOCK TABLES `profissionais` WRITE;
/*!40000 ALTER TABLE `profissionais` DISABLE KEYS */;
/*!40000 ALTER TABLE `profissionais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recessos`
--

DROP TABLE IF EXISTS `recessos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recessos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dia_inicio` int NOT NULL,
  `mes_inicio` int NOT NULL,
  `ano_inicio` int NOT NULL,
  `dia_fim` int NOT NULL,
  `mes_fim` int NOT NULL,
  `ano_fim` int NOT NULL,
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_recesso_periodo` (`dia_inicio`,`mes_inicio`,`ano_inicio`,`dia_fim`,`mes_fim`,`ano_fim`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recessos`
--

LOCK TABLES `recessos` WRITE;
/*!40000 ALTER TABLE `recessos` DISABLE KEYS */;
INSERT INTO `recessos` VALUES (1,11,6,2026,26,6,2026,'RECESSO JULHO','2026-06-09 20:42:05'),(2,4,5,2026,4,5,2026,'CORPUS CHRISTI','2026-06-12 18:17:32');
/*!40000 ALTER TABLE `recessos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resumo_folha`
--

DROP TABLE IF EXISTS `resumo_folha`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resumo_folha` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folha_ponto_id` int NOT NULL,
  `operacao` enum('I','A','E','') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `codigo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `carga` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `meses` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `horas_dias` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dia_inicio` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dia_fim` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_folha_ponto` (`folha_ponto_id`),
  CONSTRAINT `resumo_folha_ibfk_1` FOREIGN KEY (`folha_ponto_id`) REFERENCES `folhas_ponto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resumo_folha`
--

LOCK TABLES `resumo_folha` WRITE;
/*!40000 ALTER TABLE `resumo_folha` DISABLE KEYS */;
/*!40000 ALTER TABLE `resumo_folha` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schema_migrations`
--

LOCK TABLES `schema_migrations` WRITE;
/*!40000 ALTER TABLE `schema_migrations` DISABLE KEYS */;
INSERT INTO `schema_migrations` VALUES ('001','2026-07-31 01:46:28'),('002','2026-07-31 01:46:28'),('003','2026-07-31 01:46:28'),('004','2026-07-31 01:46:28'),('005','2026-07-31 01:46:28'),('006','2026-07-31 01:46:28'),('007','2026-07-31 01:46:28'),('008','2026-07-31 01:46:28'),('009','2026-07-31 01:46:28'),('010','2026-07-31 01:46:28'),('011','2026-07-31 01:46:28'),('012','2026-07-31 01:46:28'),('013','2026-07-31 01:46:28'),('014','2026-07-31 01:46:28'),('015','2026-07-31 01:46:28'),('016','2026-07-31 01:46:28'),('017','2026-07-31 01:46:28'),('018','2026-07-31 01:46:28'),('019','2026-07-31 01:46:35'),('020','2026-07-31 01:46:49');
/*!40000 ALTER TABLE `schema_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_lancamento`
--

DROP TABLE IF EXISTS `tipos_lancamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_lancamento` (
  `valor` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`valor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_lancamento`
--

LOCK TABLES `tipos_lancamento` WRITE;
/*!40000 ALTER TABLE `tipos_lancamento` DISABLE KEYS */;
INSERT INTO `tipos_lancamento` VALUES ('ABONO DE PONTO ART 151 LEI','ABONO DE PONTO ART 151','00219'),('ABONO DE PONTO BIMESTRAL LEI','ABONO DE PONTO BIMESTRAL LEI 449/1993','00284'),('Abono TRE','Abono TRE','00256'),('ABONO_NIVER','ABONO ANIVERSÁRIO','00717'),('AFAST CASAMENTO ART 62 LEI','AFAST CASAMENTO ART 62 LEI','00317'),('AFAST DOACAO SANGUE ART 62','AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011','00310'),('AFAST FALECIMENTO FAMILIA LEI','AFAST FALECIMENTO FAMILIA LEI','00313'),('ATESTADO COMPARECIMENTO A','ATESTADO COMPARECIMENTO A SUBSAUDE','00343'),('ATESTADO COMPARECIMENTO P.','ATESTADO COMPARECIMENTO PESSOA DA FAMILIA','00341'),('ATESTADO DE COMPARECIMENTO','ATESTADO COMPARECIMENTO SERVIDOR','00340'),('ATESTADO MEDICO DE ATE 03','ATESTADO MEDICO DE ATE 03 DIAS','00294'),('CPIP','CPIP',NULL),('CURSO','CURSO FORMAÇÃO CONTINUADA',NULL),('EXAME MEDICO PREV/PERIOD ART','EXAME MEDICO PREV/PERIOD ART 62 LEI COMP','00118'),('FALTA','FALTA','40010'),('FALTA PARALISAÇÃO','FALTA PARALISAÇÃO','40034'),('FERIADO','FERIADO',NULL),('FERIAS','FÉRIAS','99902'),('LIC PATERNIDADE ART 150 LEI','LIC PATERNIDADE ART 150 LEI','00289'),('LIC. ACOMP. PESSOA DOENTE','LIC. ACOMP. PESSOA DOENTE FAMILIA','99906'),('LICENCA MEDICA OU','LICENCA MEDICA OU ODONTOLOGICA','00306'),('PONTO FACULTATIVO','PONTO FACULTATIVO','00000'),('RECESSO','RECESSO','00258'),('TRABALHO','TRABALHO NORMAL',NULL),('TRACEJADO','--- (Tracejado)',NULL);
/*!40000 ALTER TABLE `tipos_lancamento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_adicional_noturno`
--

DROP TABLE IF EXISTS `vw_adicional_noturno`;
/*!50001 DROP VIEW IF EXISTS `vw_adicional_noturno`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_adicional_noturno` AS SELECT 
 1 AS `id`,
 1 AS `matricula`,
 1 AS `carga_horaria`,
 1 AS `nome`,
 1 AS `dia`,
 1 AS `mes`,
 1 AS `ano`,
 1 AS `tipo`,
 1 AS `turno1`,
 1 AS `tipo_turno2`,
 1 AS `turno2`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_folhas_lancamento`
--

DROP TABLE IF EXISTS `vw_folhas_lancamento`;
/*!50001 DROP VIEW IF EXISTS `vw_folhas_lancamento`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_folhas_lancamento` AS SELECT 
 1 AS `id`,
 1 AS `matricula`,
 1 AS `carga_horaria`,
 1 AS `nome`,
 1 AS `dia`,
 1 AS `mes`,
 1 AS `ano`,
 1 AS `tipo`,
 1 AS `turno1`,
 1 AS `tipo_turno2`,
 1 AS `turno2`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_relatorio_atestados_bimestrais`
--

DROP TABLE IF EXISTS `vw_relatorio_atestados_bimestrais`;
/*!50001 DROP VIEW IF EXISTS `vw_relatorio_atestados_bimestrais`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_relatorio_atestados_bimestrais` AS SELECT 
 1 AS `matricula`,
 1 AS `nome`,
 1 AS `ano`,
 1 AS `bimestre1`,
 1 AS `bimestre2`,
 1 AS `bimestre3`,
 1 AS `bimestre4`,
 1 AS `bimestre5`,
 1 AS `bimestre6`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_relatorio_atestados_comparecimento`
--

DROP TABLE IF EXISTS `vw_relatorio_atestados_comparecimento`;
/*!50001 DROP VIEW IF EXISTS `vw_relatorio_atestados_comparecimento`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_relatorio_atestados_comparecimento` AS SELECT 
 1 AS `matricula`,
 1 AS `nome`,
 1 AS `ano`,
 1 AS `mes0`,
 1 AS `mes1`,
 1 AS `mes2`,
 1 AS `mes3`,
 1 AS `mes4`,
 1 AS `mes5`,
 1 AS `mes6`,
 1 AS `mes7`,
 1 AS `mes8`,
 1 AS `mes9`,
 1 AS `mes10`,
 1 AS `mes11`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_adicional_noturno`
--

/*!50001 DROP VIEW IF EXISTS `vw_adicional_noturno`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_adicional_noturno` AS select `fp`.`id` AS `id`,`p`.`matricula` AS `matricula`,`p`.`carga_horaria` AS `carga_horaria`,`p`.`nome` AS `nome`,`ld`.`dia` AS `dia`,`fp`.`mes` AS `mes`,`fp`.`ano` AS `ano`,(case when (`ld`.`tipo` = 'TRABALHO') then `ld`.`tipo` else NULL end) AS `tipo`,`p`.`turno1` AS `turno1`,(case when (`ld`.`tipo_turno2` = 'TRABALHO') then `ld`.`tipo_turno2` else NULL end) AS `tipo_turno2`,`p`.`turno2` AS `turno2` from ((`folhas_ponto` `fp` left join `lancamentos_diarios` `ld` on((`fp`.`id` = `ld`.`folha_ponto_id`))) left join `profissionais` `p` on((`p`.`id` = `fp`.`profissional_id`))) where ((`p`.`cargo` <> 'PROFESSOR TEMPORÁRIO') and ((`ld`.`tipo` = 'TRABALHO') or (`ld`.`tipo_turno2` = 'TRABALHO')) and ((`p`.`turno1` = 'Noturno') or (`p`.`turno2` = 'Noturno'))) order by `p`.`nome`,`fp`.`ano`,`fp`.`mes`,`fp`.`profissional_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_folhas_lancamento`
--

/*!50001 DROP VIEW IF EXISTS `vw_folhas_lancamento`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_folhas_lancamento` AS select `fp`.`id` AS `id`,`p`.`matricula` AS `matricula`,`p`.`carga_horaria` AS `carga_horaria`,`p`.`nome` AS `nome`,`ld`.`dia` AS `dia`,`fp`.`mes` AS `mes`,`fp`.`ano` AS `ano`,(case when (`ld`.`tipo` not in ('TRABALHO','CPIP','CURSO','TRACEJADO')) then `ld`.`tipo` else NULL end) AS `tipo`,`p`.`turno1` AS `turno1`,(case when (`ld`.`tipo_turno2` not in ('TRABALHO','CPIP','CURSO','TRACEJADO')) then `ld`.`tipo_turno2` else NULL end) AS `tipo_turno2`,`p`.`turno2` AS `turno2` from ((`folhas_ponto` `fp` left join `lancamentos_diarios` `ld` on((`fp`.`id` = `ld`.`folha_ponto_id`))) left join `profissionais` `p` on((`p`.`id` = `fp`.`profissional_id`))) where ((`ld`.`tipo` not in ('TRABALHO','CPIP','CURSO','TRACEJADO')) or (`ld`.`tipo_turno2` not in ('TRABALHO','CPIP','CURSO','TRACEJADO'))) order by `p`.`nome`,`fp`.`ano`,`fp`.`mes`,`fp`.`profissional_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_relatorio_atestados_bimestrais`
--

/*!50001 DROP VIEW IF EXISTS `vw_relatorio_atestados_bimestrais`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_relatorio_atestados_bimestrais` AS select `v1`.`matricula` AS `matricula`,`v1`.`nome` AS `nome`,`v1`.`ano` AS `ano`,sum((case when (`v1`.`mes` in (0,1)) then 1 else 0 end)) AS `bimestre1`,sum((case when (`v1`.`mes` in (2,3)) then 1 else 0 end)) AS `bimestre2`,sum((case when (`v1`.`mes` in (4,5)) then 1 else 0 end)) AS `bimestre3`,sum((case when (`v1`.`mes` in (6,7)) then 1 else 0 end)) AS `bimestre4`,sum((case when (`v1`.`mes` in (8,9)) then 1 else 0 end)) AS `bimestre5`,sum((case when (`v1`.`mes` in (10,11)) then 1 else 0 end)) AS `bimestre6` from `vw_folhas_lancamento` `v1` where (((`v1`.`tipo` = 'ATESTADO MEDICO DE ATE 03') or (`v1`.`tipo_turno2` = 'ATESTADO MEDICO DE ATE 03')) and (`v1`.`mes` between 0 and 11) and (`v1`.`dia` between 1 and 31) and exists(select 1 from `vw_folhas_lancamento` `v2` where ((`v2`.`matricula` = `v1`.`matricula`) and ((`v2`.`tipo` = 'ATESTADO MEDICO DE ATE 03') or (`v2`.`tipo_turno2` = 'ATESTADO MEDICO DE ATE 03')) and (`v2`.`mes` between 0 and 11) and (`v2`.`dia` between 1 and 31) and (str_to_date(concat(`v2`.`ano`,'-',lpad((`v2`.`mes` + 1),2,'0'),'-',lpad(`v2`.`dia`,2,'0')),'%Y-%m-%d') = (str_to_date(concat(`v1`.`ano`,'-',lpad((`v1`.`mes` + 1),2,'0'),'-',lpad(`v1`.`dia`,2,'0')),'%Y-%m-%d') - interval 1 day)))) is false) group by `v1`.`matricula`,`v1`.`nome`,`v1`.`ano` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_relatorio_atestados_comparecimento`
--

/*!50001 DROP VIEW IF EXISTS `vw_relatorio_atestados_comparecimento`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_relatorio_atestados_comparecimento` AS select `v1`.`matricula` AS `matricula`,`v1`.`nome` AS `nome`,`v1`.`ano` AS `ano`,sum((case when (`v1`.`mes` = 0) then 1 else 0 end)) AS `mes0`,sum((case when (`v1`.`mes` = 1) then 1 else 0 end)) AS `mes1`,sum((case when (`v1`.`mes` = 2) then 1 else 0 end)) AS `mes2`,sum((case when (`v1`.`mes` = 3) then 1 else 0 end)) AS `mes3`,sum((case when (`v1`.`mes` = 4) then 1 else 0 end)) AS `mes4`,sum((case when (`v1`.`mes` = 5) then 1 else 0 end)) AS `mes5`,sum((case when (`v1`.`mes` = 6) then 1 else 0 end)) AS `mes6`,sum((case when (`v1`.`mes` = 7) then 1 else 0 end)) AS `mes7`,sum((case when (`v1`.`mes` = 8) then 1 else 0 end)) AS `mes8`,sum((case when (`v1`.`mes` = 9) then 1 else 0 end)) AS `mes9`,sum((case when (`v1`.`mes` = 10) then 1 else 0 end)) AS `mes10`,sum((case when (`v1`.`mes` = 11) then 1 else 0 end)) AS `mes11` from `vw_folhas_lancamento` `v1` where (((`v1`.`tipo` in ('ATESTADO DE COMPARECIMENTO','ATESTADO COMPARECIMENTO P.')) or (`v1`.`tipo_turno2` in ('ATESTADO DE COMPARECIMENTO','ATESTADO COMPARECIMENTO P.'))) and (`v1`.`mes` between 0 and 11) and (`v1`.`dia` between 1 and 31)) group by `v1`.`matricula`,`v1`.`nome`,`v1`.`ano` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-21  1:07:51
