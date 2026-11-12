import { describe, expect, it } from 'vitest';
import { criarPopupMunicipio } from './satelliteFormat.js';

describe('criarPopupMunicipio', () => {
  it('não interpreta HTML em nome/fonte', () => {
    const no = criarPopupMunicipio('<img src=x onerror=alert(1)>', 3, '<b>INPE</b>');
    expect(no.querySelector('img')).toBeNull();
    expect(no.querySelector('b')).toBeNull();
    expect(no.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(no.textContent).toContain('3 foco(s)');
  });
});
