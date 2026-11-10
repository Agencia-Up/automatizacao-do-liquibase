const fields = [
  ['n', 'Períodos (n)', '12'],
  ['i', 'Taxa por período (%)', '1'],
  ['pv', 'Valor presente (PV)', '-1000'],
  ['pmt', 'Pagamento periódico (PMT)', '0'],
  ['fv', 'Valor futuro (FV)', ''],
];

export function calculatorMarkup() {
  const keys = ['7','8','9','÷','4','5','6','×','1','2','3','−','0',',','±','+','ENTER','x↔y','CLX','CLST'];
  return `<details class="rpn"><summary>Teclado RPN</summary>
    <p>Digite o primeiro número, toque em ENTER, digite o segundo e escolha a operação.</p>
    <output data-rpn-output aria-label="Resultado RPN" aria-live="polite">0</output>
    <div>${keys.map(key => `<button type="button" data-action="exam-rpn" data-key="${key}">${key}</button>`).join('')}</div>
  </details><form data-form="exam-finance" class="exam-finance">
    <p>Preencha os valores conhecidos e escolha o que calcular. Use sinal negativo para saídas e positivo para entradas.</p>
    <div class="exam-finance-fields">${fields.map(([name, label, example]) => `<label>${label}<input name="${name}" inputmode="decimal" placeholder="${example}" maxlength="20"></label>`).join('')}</div>
    <label>Calcular<select name="target">${fields.map(([name, label]) => `<option value="${name}" ${name === 'fv' ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    <label class="exam-finance-mode"><input type="checkbox" name="begin"> Pagamentos no início do período</label>
    <output role="status" aria-live="polite"></output>
    <div class="form-error" role="alert"></div><button class="btn" type="submit">Calcular</button>
  </form>`;
}

export function createRpn() {
  let stack = [0, 0, 0, 0];
  let entry = '';
  let lift = false;
  const push = value => { stack = [value, ...stack.slice(0, 3)]; };
  return key => {
    if (/^[0-9,]$/.test(key)) {
      if (!entry && lift) push(0);
      const digit = key === ',' ? '.' : key;
      if (!(digit === '.' && entry.includes('.')) && entry.length < 15) entry += digit;
      if (entry === '.') entry = '0.';
      stack[0] = Number(entry);
      lift = false;
      return entry.replace('.', ',');
    }
    entry = '';
    if (key === 'ENTER') { push(stack[0]); lift = false; }
    if (key === 'x↔y') { [stack[0], stack[1]] = [stack[1], stack[0]]; lift = true; }
    if (key === '±') stack[0] = -stack[0];
    if (key === 'CLX') { stack[0] = 0; lift = false; }
    if (key === 'CLST') { stack = [0, 0, 0, 0]; lift = false; }
    const [x, y, z, t] = stack;
    const operations = { '+': () => y + x, '−': () => y - x, '×': () => y * x, '÷': () => y / x };
    if (Object.hasOwn(operations, key)) {
      const result = operations[key]();
      if (!Number.isFinite(result)) return 'Erro';
      stack = [result, z, t, t];
      lift = true;
    }
    return new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 12 }).format(stack[0]);
  };
}

export function calculateFinance(values) {
  const { target, begin } = values;
  const numbers = Object.fromEntries(fields.filter(([key]) => key !== target).map(([key]) => {
    const value = String(values[key] ?? '').trim().replace(',', '.');
    if (!value && key === 'pmt') return [key, 0];
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) throw new Error('Preencha os quatro valores conhecidos. Informe zero para um pagamento periódico inexistente.');
    return [key, Number(value)];
  }));
  const { n, i, pv, pmt, fv } = numbers;
  if (n !== undefined && (n <= 0 || n > 10000)) throw new Error('Informe de 1 a 10.000 períodos, ou uma fração positiva.');
  if (i !== undefined && i <= -100) throw new Error('A taxa deve ser maior que −100%.');
  const rate = i / 100;
  const factors = (periods, r) => {
    const growth = Math.exp(periods * Math.log1p(r));
    const annuity = (r === 0 ? periods : Math.expm1(periods * Math.log1p(r)) / r) * (begin ? 1 + r : 1);
    return { growth, annuity };
  };
  let result;
  if (target === 'i' || target === 'n') {
    const residual = (periods, r) => {
      const { growth, annuity } = factors(periods, r);
      return fv + pv * growth + pmt * annuity;
    };
    const evaluate = target === 'i' ? value => residual(n, value) : value => residual(value, rate);
    let left = target === 'i' ? -0.999999 : 0.000001;
    let right = target === 'i' ? 1 : Math.min(10000, rate > 0 ? 650 / Math.log1p(rate) : 10000);
    let low = evaluate(left);
    let high = evaluate(right);
    if (target === 'i') {
      while (Math.sign(low) === Math.sign(high) && right < 64 && Number.isFinite(high)) {
        right *= 2;
        high = evaluate(right);
      }
    }
    if (!Number.isFinite(low) || !Number.isFinite(high) || Math.sign(low) === Math.sign(high)) throw new Error('Não encontrei uma solução nesse intervalo. Confira os sinais dos valores.');
    for (let step = 0; step < 80; step++) {
      const mid = (left + right) / 2;
      const value = evaluate(mid);
      if (Math.sign(low) === Math.sign(value)) {
        left = mid;
        low = value;
      } else right = mid;
    }
    result = (left + right) / 2 * (target === 'i' ? 100 : 1);
  } else {
    const { growth, annuity } = factors(n, rate);
    if (target === 'pv') result = -(fv + pmt * annuity) / growth;
    if (target === 'pmt') result = -(fv + pv * growth) / annuity;
    if (target === 'fv') result = -(pv * growth + pmt * annuity);
  }
  if (!Number.isFinite(result)) throw new Error('Não foi possível calcular com esses valores.');
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(result) + (target === 'i' ? '%' : '');
}
