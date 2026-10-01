"""Browser regression with synthetic API data, no live DB writes.

Start Vite with VITE_APP_USERNAME=pdf-test VITE_APP_PASSWORD=pdf-test,
then run: python3 scripts/test_ficha_cadastral_ui.py http://127.0.0.1:5173
Requires Playwright and its Chromium browser.
"""
import asyncio
import copy
import json
import re
import sys

from playwright.async_api import async_playwright, expect


async def main(url):
    professionals = [
        {'id': 1, 'nome': 'ANA TESTE', 'matricula': '0012345X', 'cargo': 'PROFESSOR',
         'funcao': '', 'carga_horaria': '40', 'ua': '005', 'exercicio': '123',
         'unidade_lotacao': 'ESCOLA TESTE', 'status': 'ATIVO', 'turno1': 'Matutino'},
        {'id': 2, 'nome': 'BIA TESTE', 'matricula': '00234567', 'cargo': 'PROFESSOR',
         'funcao': '', 'carga_horaria': '20', 'ua': '005', 'exercicio': '456',
         'unidade_lotacao': 'ESCOLA TESTE', 'status': 'ATIVO', 'turno1': 'Noturno'},
    ]
    complementary = {1: {'cpf': '00123456789', 'telefones': ['(61) 123456789'],
                          'matricula': '0012345X', 'naturalidade': 'BRASÍLIA'}, 2: None}
    failures = {'save': False, 'pdf': False, 'delay_comp': False, 'delay_pdf': False}
    pdf_requests = []
    errors = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))

        async def mock(route):
            path = route.request.url.split('/api', 1)[-1].split('?', 1)[0]
            method = route.request.method
            status, result = 200, []
            if path == '/profissionais':
                result = professionals
            elif path.endswith('/complementar'):
                identity = int(path.split('/')[2])
                if method == 'PUT':
                    if failures['save']:
                        status, result = 500, {'error': 'Falha simulada no salvamento'}
                    else:
                        complementary[identity] = route.request.post_data_json
                        result = {'message': 'Salvo'}
                else:
                    # Capture before waiting, to deliberately return an old response.
                    result = {'complementar': copy.deepcopy(complementary[identity]),
                              'cargas': [], 'cursos': [], 'habilitacoes': [], 'componentes': []}
                    if identity == 1 and failures['delay_comp']:
                        await asyncio.sleep(0.6)
            elif path.endswith('/ficha-cadastral.pdf'):
                pdf_requests.append(path)
                if failures['delay_pdf']:
                    await asyncio.sleep(0.6)
                if failures['pdf']:
                    status, result = 500, {'error': 'Falha simulada na geração'}
                else:
                    await route.fulfill(status=200, content_type='application/pdf',
                                        headers={'Content-Disposition': 'attachment; filename=ficha-cadastral-0012345X.pdf'},
                                        body=b'%PDF-1.4\n% browser download fixture\n%%EOF')
                    return
            elif re.fullmatch(r'/profissionais/\d+', path) and method == 'PUT':
                identity = int(path.split('/')[2])
                professionals[identity - 1].update(route.request.post_data_json)
                result = {'message': 'Salvo'}
            elif path.endswith('/carencias'):
                result = {'carencias': [], 'distribuicao': []}
            elif method != 'GET':
                result = {'id': 1, 'success': True}
            await route.fulfill(status=status, content_type='application/json', body=json.dumps(result))

        await page.route('**/api/**', mock)
        await page.goto(url)
        await page.locator('input[autocomplete=username]').fill('pdf-test')
        await page.locator('input[autocomplete=current-password]').fill('pdf-test')
        await page.get_by_role('button', name='ENTRAR', exact=True).click()
        heading = page.get_by_role('heading', name='Ficha cadastral SIGEP', exact=True)
        widget = page.locator('section').filter(has=heading)
        async def expand():
            button = widget.get_by_role('button', name=re.compile('Ficha cadastral SIGEP'))
            if await button.get_attribute('aria-expanded') != 'true':
                await button.click()
        await expand()
        download = widget.get_by_role('button', name='Baixar PDF', exact=True)
        await expect(download).to_be_enabled()
        async with page.expect_download() as pending:
            await download.click()
        artifact = await pending.value
        assert artifact.suggested_filename == 'ficha-cadastral-0012345X.pdf'
        assert len(pdf_requests) == 1

        cpf = widget.locator('input[name=cpf]')
        await cpf.fill('00987654321')
        await expect(download).to_be_disabled()
        await expect(widget.get_by_text('Use “Salvar ficha” antes de emitir.', exact=True)).to_be_visible()
        await cpf.fill('00123456789')
        await expect(download).to_be_enabled()
        await cpf.fill('00987654321')
        failures['save'] = True
        await widget.get_by_role('button', name='Salvar ficha', exact=True).click()
        await expect(widget.get_by_role('status')).to_contain_text('Não foi possível salvar')
        await expect(download).to_be_disabled()
        failures['save'] = False
        await widget.get_by_role('button', name='Salvar ficha', exact=True).click()
        await expect(download).to_be_enabled()
        assert complementary[1]['naturalidade'] == 'BRASÍLIA'

        name = page.locator('input[name=name]')
        await name.fill('ANA EDITADA')
        await expect(download).to_be_disabled()
        await expect(widget.get_by_text('Use “Salvar” para salvar os dados do servidor antes de emitir.', exact=True)).to_be_visible()
        await name.fill('ANA TESTE')
        await expect(download).to_be_enabled()
        await name.fill('ANA EDITADA')
        await page.get_by_role('button', name='Salvar', exact=True).click()
        await expect(download).to_be_enabled()
        assert professionals[0]['nome'] == 'ANA EDITADA'

        failures['pdf'] = True
        await download.click()
        await expect(widget.get_by_role('status')).to_contain_text('Falha simulada na geração')
        await expect(download).to_be_enabled()
        failures['pdf'] = False
        await page.screenshot(path='/tmp/ficha-cadastral-ui.png', full_page=True)

        # While a PDF is pending, switching servers must not download its result.
        received_downloads = []
        page.on('download', lambda event: received_downloads.append(event))
        failures['delay_pdf'] = True
        await download.click()
        await expect(widget.get_by_role('button', name='Gerando…', exact=True)).to_be_disabled()
        await page.get_by_role('combobox', name='Selecionar servidor').select_option('2')
        await expand()
        await expect(download).to_be_disabled()
        await expect(widget.get_by_text('Salve a ficha antes de emitir.', exact=True)).to_be_visible()
        await page.wait_for_timeout(800)
        assert not received_downloads

        # A late complementary response for A must not mark B as imported.
        failures['delay_comp'] = True
        await page.get_by_role('combobox', name='Selecionar servidor').select_option('1')
        await page.get_by_role('combobox', name='Selecionar servidor').select_option('2')
        await expand()
        await page.wait_for_timeout(800)
        await expect(download).to_be_disabled()
        await expect(cpf).to_have_value('')
        await expect(widget.get_by_text('Salve a ficha antes de emitir.', exact=True)).to_be_visible()
        assert not errors, errors
        print('PASS: download, filename, complementary save/revert/error, principal save/revert, generation error, pending ficha, stale responses')
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173'))
