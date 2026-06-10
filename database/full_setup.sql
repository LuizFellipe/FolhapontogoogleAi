-- MySQL dump 10.13  Distrib 9.5.0, for Linux (x86_64)
--
-- Host: localhost    Database: folhaponto_db
-- ------------------------------------------------------
-- Server version	9.5.0

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
-- Current Database: `folhaponto_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `folhaponto_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `folhaponto_db`;

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
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_profissional_mes_ano` (`profissional_id`,`mes`,`ano`),
  KEY `idx_profissional_mes_ano` (`profissional_id`,`mes`,`ano`),
  CONSTRAINT `folhas_ponto_ibfk_1` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `folhas_ponto`
--

LOCK TABLES `folhas_ponto` WRITE;
/*!40000 ALTER TABLE `folhas_ponto` DISABLE KEYS */;
/*!40000 ALTER TABLE `folhas_ponto` ENABLE KEYS */;
UNLOCK TABLES;

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
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_feriado_dia` (`dia`,`mes`,`ano`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_lancamento`
--

DROP TABLE IF EXISTS `tipos_lancamento`;
CREATE TABLE `tipos_lancamento` (
  `valor`  varchar(80)  NOT NULL,
  `label`  varchar(150) NOT NULL,
  `codigo` varchar(20)  DEFAULT NULL,
  PRIMARY KEY (`valor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tipos_lancamento` (`valor`, `label`, `codigo`) VALUES
  ('TRABALHO',                    'TRABALHO NORMAL',                               NULL),
  ('FERIAS',                      'FÉRIAS',                                        '99902'),
  ('ATESTADO MEDICO DE ATE 03',   'ATESTADO MEDICO DE ATE 03 DIAS',                '00294'),
  ('LICENCA MEDICA OU',           'LICENCA MEDICA OU ODONTOLOGICA',                '00306'),
  ('FALTA',                       'FALTA',                                         '40010'),
  ('Abono TRE',                   'Abono TRE',                                     '00256'),
  ('ABONO DE PONTO ART 151 LEI',  'ABONO DE PONTO ART 151 LEI COMP 840/2011',     '00219'),
  ('CPIP',                        'CPIP',                                          NULL),
  ('CURSO',                       'CURSO FORMAÇÃO CONTINUADA',                     NULL),
  ('ABONO_NIVER',                 'ABONO ANIVERSÁRIO',                             NULL),
  ('FERIADO',                     'FERIADO',                                       NULL),
  ('FALTA PARALISAÇÃO',           'FALTA PARALISAÇÃO',                             '40034'),
  ('ATESTADO DE COMPARECIMENTO',  'ATESTADO COMPARECIMENTO SERVIDOR',              '00340'),
  ('LIC. ACOMP. PESSOA DOENTE',   'LIC. ACOMP. PESSOA DOENTE FAMILIA',            '99906'),
  ('AFAST DOACAO SANGUE ART 62',  'AFAST DOACAO SANGUE ART 62 LEI COMP 840/2011', '00310'),
  ('ABONO DE PONTO BIMESTRAL LEI','ABONO DE PONTO BIMESTRAL LEI 449/1993',         '00284'),
  ('RECESSO',                     'RECESSO',                                       '00258'),
  ('PONTO FACULTATIVO',           'PONTO FACULTATIVO',                             '00000'),
  ('ATESTADO COMPARECIMENTO A',   'ATESTADO COMPARECIMENTO A SUBSAUDE',            '00343'),
  ('ATESTADO COMPARECIMENTO P.',  'ATESTADO COMPARECIMENTO PESSOA DA FAMILIA',     '00341'),
  ('EXAME MEDICO PREV/PERIOD ART','EXAME MEDICO PREV/PERIOD ART 62 LEI COMP',      '00118'),
  ('TRACEJADO',                   '--- (Tracejado)',                               NULL);
INSERT IGNORE INTO `tipos_lancamento` (`valor`, `label`, `codigo`) VALUES ('AFAST FALECIMENTO FAMILIA LEI', 'AFAST FALECIMENTO FAMILIA LEI', NULL);

INSERT IGNORE INTO `tipos_lancamento` (`valor`, `label`, `codigo`) VALUES ('AFAST CASAMENTO ART 62 LEI', 'AFAST CASAMENTO ART 62 LEI', NULL);


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
  `tipo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRABALHO',
  `tipo_turno2` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_folha_dia` (`folha_ponto_id`,`dia`),
  KEY `idx_folha_dia` (`folha_ponto_id`,`dia`),
  KEY `idx_tipo_turno2` (`tipo_turno2`),
  CONSTRAINT `lancamentos_diarios_ibfk_1` FOREIGN KEY (`folha_ponto_id`) REFERENCES `folhas_ponto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1248 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ua` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exercicio` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carga_horaria` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidade_lotacao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turno1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `turno2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `idx_nome` (`nome`),
  KEY `idx_matricula` (`matricula`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profissionais`
--

LOCK TABLES `profissionais` WRITE;
/*!40000 ALTER TABLE `profissionais` DISABLE KEYS */;
/*!40000 ALTER TABLE `profissionais` ENABLE KEYS */;
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
  `operacao` enum('I','A','E','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `carga` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `meses` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `horas_dias` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dia_inicio` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `dia_fim` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_folha_ponto` (`folha_ponto_id`),
  CONSTRAINT `resumo_folha_ibfk_1` FOREIGN KEY (`folha_ponto_id`) REFERENCES `folhas_ponto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=321 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resumo_folha`
--

LOCK TABLES `resumo_folha` WRITE;
/*!40000 ALTER TABLE `resumo_folha` DISABLE KEYS */;
/*!40000 ALTER TABLE `resumo_folha` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'folhaponto_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-17 19:12:47
