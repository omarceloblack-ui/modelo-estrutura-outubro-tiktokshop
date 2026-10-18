(function () {
  'use strict';
  const input = document.getElementById('lv-cep');
  if (!input) return;
  const ids = { street: 'lv-endereco', neighborhood: 'lv-bairro', city: 'lv-cidade', state: 'lv-uf' };
  let timer, controller, sequence = 0, lastSuccess = '', autoValues = {};
  const status = document.getElementById('lv-cep-status');
  const feedback = document.createElement('p');
  feedback.id = 'cep-feedback'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  feedback.style.cssText = 'font-size:12px;line-height:1.5;margin-top:6px;color:#71717a';
  input.parentElement.after(feedback);
  function message(text, error) { feedback.textContent = text; feedback.style.color = error ? '#be123c' : '#059669'; }
  async function lookup() {
    const cep = input.value.replace(/\D/g, '');
    if (cep.length !== 8 || cep === lastSuccess) return;
    const current = ++sequence;
    controller?.abort(); controller = new AbortController();
    const snapshots = Object.fromEntries(Object.entries(ids).map(([key,id]) => [key, document.getElementById(id)?.value || '']));
    input.setAttribute('aria-busy', 'true'); if (status) status.textContent = 'Buscando…';
    message('Buscando endereço pelo CEP…');
    try {
      const res = await fetch('/api/cep/' + cep, { signal: controller.signal });
      const data = await res.json();
      if (current !== sequence || input.value.replace(/\D/g,'') !== cep) return;
      if (!res.ok) throw Error(data.message || 'Não foi possível consultar o CEP.');
      for (const [key,id] of Object.entries(ids)) {
        const field = document.getElementById(id);
        if (field && field.value === snapshots[key]) { field.value = data[key] || ''; autoValues[id] = field.value; field.dispatchEvent(new Event('input', { bubbles: true })); }
      }
      lastSuccess = cep;
      message(data.street ? 'Endereço preenchido. Informe o número e o complemento, se houver.' : 'Cidade e UF preenchidas. Informe a rua, o bairro e o número.');
    } catch (error) { if (error.name !== 'AbortError' && current === sequence) message(error.message || 'Preencha o endereço manualmente.', true); }
    finally { if (current === sequence) { input.removeAttribute('aria-busy'); if (status) status.textContent = ''; } }
  }
  input.addEventListener('input', function () {
    clearTimeout(timer); controller?.abort(); sequence++; input.removeAttribute('aria-busy'); if (status) status.textContent = '';
    const cep = input.value.replace(/\D/g,'').slice(0,8);
    input.value = cep.length > 5 ? cep.slice(0,5) + '-' + cep.slice(5) : cep;
    if (cep !== lastSuccess) {
      for (const [id,old] of Object.entries(autoValues)) { const field = document.getElementById(id); if (field?.value === old) field.value = ''; }
      autoValues = {}; lastSuccess = ''; message('');
    }
    if (cep.length === 8) timer = setTimeout(lookup, 250);
  });
  input.addEventListener('blur', function () { clearTimeout(timer); lookup(); });
})();
