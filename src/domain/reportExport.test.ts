import { describe, expect, it } from 'vitest';
import { toDelimitedText } from './reportExport';

describe('operational report export', () => {
  it('keeps regular values in their columns', () => {
    expect(toDelimitedText([['Тип', 'Название'], ['Задача', 'Осмотр']])).toBe('Тип;Название\r\nЗадача;Осмотр');
  });

  it('quotes separators, quotes and line breaks without shifting columns', () => {
    expect(toDelimitedText([['Задача', 'Осмотр; "винты"\nпосле полёта']])).toBe('Задача;"Осмотр; ""винты""\nпосле полёта"');
  });

  it('renders missing optional values as empty cells', () => {
    expect(toDelimitedText([['Документ', undefined, null, 42]])).toBe('Документ;;;42');
  });
});
