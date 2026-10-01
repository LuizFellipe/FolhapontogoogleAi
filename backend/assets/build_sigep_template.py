"""Rebuild static SIGEP artwork; never copy personal text or source PDF objects.

Usage from repository root:
    venv/bin/python backend/assets/build_sigep_template.py sigep/roger.00369004.pdf
The generated PDF contains only vector grids, approved labels and the coat of arms.
"""
import sys
from pathlib import Path

import pymupdf as pdf


LABELS = {
    'GOVERNO DO DISTRITO FEDERAL',
    'SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL',
    'SUBSECRETARIA DE GESTÃO DE PESSOAS', 'FICHA CADASTRAL',
    'Nome:', 'Matricula:', 'Admissão:', 'Cargo:', 'Funçao:', 'Ref.Sal:', 'CH',
    'Pessoa com Deficiência:', 'Redução de CH em', 'Readaptado:', 'Nascimento:',
    'Sexo:', 'MASCULINO', 'FEMININO', 'Cor/Raça:', 'Identidade Funcional',
    'Naturalidade:', 'Nacionalidade:', 'UF:', 'CI/Número:', 'CI/Órgão:', 'CI/UF:',
    'Data Emissão da CI:', 'CPF:', 'PIS/PASEP:', 'Emissão:', 'Título Eleitoral:',
    'Zona:', 'Seção:', 'Estado Civil:', 'Nome do Cônjuge:', 'Filiação:',
    'Nome do Pai:', 'Nome da Mãe:', 'Endereço:', 'Bairro:', 'Cidade:', 'CEP:',
    'Telefone:', 'Email:', 'CARGA PRINCIPAL', 'CARGA SECUNDÁRIA', 'Unidade:',
    'CRE/Unidade Administrativa:', 'Coordenação Externa:', 'Lotação na Unidade:',
    'Turno:', 'Atuação:', 'Especialidade/Disciplina de Concurso:',
    'Escolaridade/Referência Salarial:', 'Habilitações cadastradas no SIGRH',
    'Componentes Curriculares compatíveis às Habilitações e Aptidões autorizadas',
    'Cursos/ Certificados Apresentados para Progressão', 'Curso', 'Instituição',
    'Emissão', 'Utilização', 'Data', 'C.H.', 'sigep.se.df.gov.br',
    '*Obs: Caso os dados cadastrais do servidor estejam desatualizados, por gentileza, dê entrada com requerimento geral solicitando a atualização',
    'anexando documentação comprobatória.',
}


def draw_static_page(original, page, include_courses):
    for drawing in original.get_drawings():
        rect = drawing['rect']
        # Course rows belong to the renderer, not the static artwork.
        if rect.y0 >= 593 and rect.y1 <= 794:
            continue
        if not include_courses and 565 <= rect.y0 and rect.y1 <= 593:
            continue
        shape = page.new_shape()
        for item in drawing['items']:
            if item[0] == 'l':
                shape.draw_line(item[1], item[2])
            elif item[0] == 'qu':
                shape.draw_quad(item[1])
            elif item[0] == 're':
                shape.draw_rect(item[1])
            else:
                raise ValueError(f'Unsupported drawing: {item[0]}')
        shape.finish(color=drawing.get('color'), fill=drawing.get('fill'),
                     width=drawing.get('width') or 0,
                     closePath=bool(drawing.get('closePath')),
                     lineCap=max(drawing.get('lineCap') or (0,)),
                     lineJoin=drawing.get('lineJoin') or 0)
        shape.commit()
    for block in original.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                if not include_courses and 565 <= span['origin'][1] <= 593:
                    continue
                if span['text'] in LABELS:
                    page.insert_text(span['origin'], span['text'], fontsize=span['size'],
                                     fontname='hebo' if span['font'].endswith('-Bold') else 'helv')


def build(source, destination):
    with pdf.open(source) as reference, pdf.open() as artwork:
        original = reference[0]
        image = original.get_images()[0]
        pixmap = pdf.Pixmap(reference, image[0])
        if image[1]:
            pixmap = pdf.Pixmap(pixmap, pdf.Pixmap(reference, image[1]))
        # Variants preserve original strokes even when the course area is empty.
        for include_courses in (True, False):
            page = artwork.new_page(width=595, height=842)
            draw_static_page(original, page, include_courses)
            page.insert_image(original.get_image_info()[0]['bbox'], pixmap=pixmap)
        artwork.set_metadata({'title': 'Modelo estático de ficha cadastral SIGEP'})
        artwork.save(destination, garbage=4, deflate=True)


if __name__ == '__main__':
    build(sys.argv[1], Path(__file__).with_name('sigep-ficha.pdf'))
