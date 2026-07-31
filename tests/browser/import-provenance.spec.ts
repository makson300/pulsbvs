import { expect, test } from '@playwright/test';

async function openCleanDashboard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('open-demo-dashboard').click();
}

test.describe('разделение синтетических и пользовательских источников', () => {
  test('предупреждает, когда браузер не даёт сохранять локальные записи', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: () => null,
          setItem: () => { throw new Error('storage unavailable'); },
          removeItem: () => { throw new Error('storage unavailable'); },
        },
      });
    });
    await page.goto('/');
    await page.getByTestId('open-demo-dashboard').click();

    await expect(page.getByTestId('storage-unavailable-warning')).toContainText('исчезнут после перезагрузки');
  });

  test('синтетический пример не создаёт запись истории', async ({ page }) => {
    await openCleanDashboard(page);
    await page.getByTestId('open-upload').click();
    await page.getByTestId('modal-upload').getByRole('button', { name: 'Демо ухудшение' }).click();

    await expect(page.getByText('Синтетический пример: Демо: деградация батареи')).toBeVisible();
    await page.getByTestId('nav-flights').click();
    await expect(page.getByTestId('demo-analysis-notice')).toContainText('не сохранён в истории');
    await expect(page.getByTestId('import-history')).toContainText('0 записей');
  });

  test('поддержанный CSV сохраняется с выбранными активами и карточкой происхождения', async ({ page }) => {
    await openCleanDashboard(page);
    await page.getByTestId('open-upload').click();
    const modal = page.getByTestId('modal-upload');
    await modal.getByTestId('select-drone').selectOption('drone-avata-2');
    await modal.getByTestId('select-battery').selectOption('battery-not-specified');
    await modal.getByTestId('origin-source').fill('Тестовый телефон');
    await modal.getByTestId('origin-scenario').fill('Проверочный вылет');
    await modal.getByTestId('file-input').setInputFiles({
      name: 'verified-flight.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('timestamp,battery_percent,pack_voltage\n2026-07-30T09:00:00Z,90,51\n2026-07-30T09:04:00Z,82,49'),
    });

    await expect(page.getByText('Загруженный файл: verified-flight.csv')).toBeVisible();
    const history = page.getByTestId('import-history');
    await expect(history).toContainText('1 записей');
    await expect(history).toContainText('verified-flight.csv');
    await expect(history).toContainText('Avata 2 · Батарея не указана');
    await expect(history).toContainText('Источник: Тестовый телефон · Сценарий: Проверочный вылет');
  });

  test('ZIP остаётся в очереди исследования и не становится записью истории', async ({ page }) => {
    await openCleanDashboard(page);
    await page.getByTestId('open-upload').click();
    await page.getByTestId('modal-upload').getByTestId('file-input').setInputFiles({
      name: 'unverified-flight.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('not-a-decoded-log'),
    });

    await expect(page.getByText('Загруженный файл: unverified-flight.zip')).toBeVisible();
    await expect(page.getByTestId('import-history')).toContainText('0 записей');
    const pending = page.getByTestId('pending-imports');
    await expect(pending).toContainText('1 записей');
    await expect(pending).toContainText('unverified-flight.zip');
    await expect(pending).toContainText('запись с метаданными файла, а не его оригинал');
    await expect(pending).toContainText('ждёт проверки чтения данных');
  });
});
