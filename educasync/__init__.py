"""
EducaSync — Módulo de extração de dados de folhas de frequência/ponto em PDF.
"""

from .extrair_folhas import (
    extrair_dados_pagina,
    extrair_vinculo,
    imprimir_resumo,
    limpar_espacos,
    processar_pdf,
)

__all__ = [
    "processar_pdf",
    "extrair_dados_pagina",
    "extrair_vinculo",
    "limpar_espacos",
    "imprimir_resumo",
]
