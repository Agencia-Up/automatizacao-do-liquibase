const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function dialogueSteps(question, path=[]){
  const steps=[];
  let id=question.dialogue.start;
  for(const choice of path){
    const node=question.dialogue.nodes[id];
    if(!node?.choices[choice])break;
    steps.push({node,choice});
    id=node.choices[choice].next;
  }
  return {steps,node:question.dialogue.nodes[id]};
}

function dialogueQuestion(question,attempt,E){
  const saved=attempt.answers[question.id];
  const path=saved||attempt.dialogueDrafts?.[question.id]||[];
  const {steps,node}=dialogueSteps(question,path);
  return `<div class="stack">${steps.map(({node,choice})=>`<div class="review-item"><p><strong>${E(node.speaker)}:</strong> ${E(node.prompt)}</p><p><strong>Sua decisão:</strong> ${E(node.choices[choice].text)}</p></div>`).join('')}
    ${node?`<div><h3>${E(node.speaker)}: ${E(node.prompt)}</h3><div class="options">${node.choices.map((choice,i)=>`<button type="button" class="btn secondary" data-action="dialogue-choice" data-index="${i}">${E(choice.text)}</button>`).join('')}</div></div>`:
      '<p role="status">Diálogo concluído.</p>'}
    ${path.length?'<button type="button" class="btn secondary" data-action="dialogue-reset">Recomeçar diálogo</button>':''}</div>`;
}

function markedText(text, ranges, escape) {
  let end = 0;
  let html = '';
  for (const [start, stop] of ranges) {
    html += escape(text.slice(end, start)) + `<mark>${escape(text.slice(start, stop))}</mark>`;
    end = stop;
  }
  return html + escape(text.slice(end));
}

export function readHighlight(prompt) {
  const selected = window.getSelection();
  if (!selected || selected.isCollapsed || !prompt?.contains(selected.anchorNode) || !prompt.contains(selected.focusNode)) return null;
  const range = selected.getRangeAt(0);
  const before = document.createRange();
  before.selectNodeContents(prompt);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  return [start, start + range.toString().length];
}

export function mergeHighlight(ranges, next) {
  const merged = [];
  for (const [start, end] of [...ranges, next].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged.slice(0, 24);
}

export function examPage(attempt, index, { E, icon, prepName }) {
  const q = attempt.questions[index];
  const total = attempt.questions.length;
  const answered = attempt.questions.filter(item => String(attempt.answers[item.id] ?? '').trim()).length;
  const marked = attempt.flags.includes(q.id);
  const tools = attempt.tools?.[q.id] || {};
  const crossed = tools.crossed || [];
  const ranges = tools.highlights || [];
  return `<main id="main" class="exam-shell">
    <header class="exam-header"><div class="exam-header-inner">
      <a class="exam-exit" href="#/simulados" aria-label="Voltar aos simulados">${icon('left', 17)} <span>Simulados</span></a>
      <div class="exam-title"><span>${E(prepName(attempt.prepId))}</span><h1>${E(attempt.quizName)}</h1></div>
      <div class="exam-clock" aria-label="${attempt.deadline ? 'Tempo restante' : 'Tempo decorrido'}">${icon('clock', 19)} <span class="timer" id="timer">—</span></div>
    </div><div class="exam-progress" role="progressbar" aria-label="Questões respondidas" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${answered}"><span style="width:${answered / total * 100}%"></span></div></header>
    <div class="exam-body"><section id="exam-work" class="card exam-question" aria-label="Questão atual">
      <div class="exam-question-meta"><span>QUESTÃO ${index + 1} DE ${total}</span><span>${E(q.subject)}</span><button type="button" class="exam-map-jump" data-action="exam-map">Mapa</button></div>
      ${q.context?`<div class="review-item"><p><strong>Caso</strong></p><p>${E(q.context)}</p></div>`:''}
      <h2 class="question-prompt" tabindex="-1">${markedText(q.prompt, ranges, E)}</h2>
      <div class="exam-tools" aria-label="Ferramentas da questão">
        <button type="button" class="exam-tool ${marked ? 'is-active' : ''}" aria-pressed="${marked}" data-action="flag">${icon('flag', 16)} ${marked ? 'Marcada para revisão' : 'Marcar para revisão'}</button>
        <button type="button" class="exam-tool ${ranges.length ? 'is-active' : ''}" data-action="highlight" title="Selecione um trecho do enunciado e toque aqui">${icon('edit', 16)} Marca-texto</button>
        ${ranges.length ? '<button type="button" class="exam-tool" data-action="clear-highlight">Limpar destaque</button>' : ''}
        ${attempt.rules.calculator ? `<button type="button" class="exam-tool" data-action="exam-calculator">${icon('grid', 16)} Calculadora</button>` : ''}
      </div>
      ${q.type==='dialogue'?dialogueQuestion(q,attempt,E):q.type === 'objective' ? `<div class="options" role="radiogroup" aria-label="Alternativas">${q.options.map((option, i) => `<div class="exam-option ${crossed.includes(i) ? 'is-crossed' : ''}">
        <label class="option"><input type="radio" name="answer" value="${i}" ${attempt.answers[q.id] === String(i) ? 'checked' : ''}><span class="letter">${letters[i]}</span><span class="option-copy">${E(option)}</span></label>
        <button type="button" class="exam-strike" data-action="strike" data-index="${i}" aria-pressed="${crossed.includes(i)}" aria-label="${crossed.includes(i) ? 'Restaurar' : 'Riscar'} alternativa ${letters[i]}" title="${crossed.includes(i) ? 'Restaurar alternativa' : 'Riscar alternativa'}"><span aria-hidden="true">×</span></button>
      </div>`).join('')}</div><button type="button" class="exam-clear" data-action="clear-answer" ${attempt.answers[q.id] === undefined || attempt.answers[q.id] === '' ? 'hidden' : ''}>Limpar resposta</button>` : `<label class="screen-reader" for="essay-answer">Sua resposta</label><textarea id="essay-answer" class="answer-area" maxlength="4000" placeholder="Escreva sua resposta…">${E(attempt.answers[q.id] || '')}</textarea>`}
      <nav class="exam-nav" aria-label="Navegação entre questões"><button class="btn secondary" data-action="previous-question" ${index === 0 ? 'disabled' : ''}>${icon('left', 15)} Anterior</button><button class="btn" data-action="${index + 1 < total ? 'next-question' : 'ask-finish'}">${index + 1 < total ? 'Próxima ' + icon('right', 15) : 'Revisar e finalizar ' + icon('check', 15)}</button></nav>
    </section><aside class="card exam-map-card" id="exam-map">
      <div class="exam-map-header"><h2>Mapa da prova</h2><span data-exam-count>${answered}/${total} respondidas</span></div>
      <div class="question-map" aria-label="Questões">${attempt.questions.map((item, i) => {
        const done = !!String(attempt.answers[item.id] ?? '').trim();
        const flag = attempt.flags.includes(item.id);
        return `<button type="button" aria-label="Ir à questão ${i + 1}${done ? ', respondida' : ''}${flag ? ', marcada para revisão' : ''}" ${i === index ? 'aria-current="step"' : ''} class="${i === index ? 'current' : ''} ${done ? 'answered' : ''} ${flag ? 'flagged' : ''}" data-action="jump-question" data-index="${i}">${i + 1}</button>`;
      }).join('')}</div>
      <p class="exam-map-legend">Verde: respondida. Ponto dourado: revisar.</p>
      <div id="save-state" class="save-state" role="status">${icon('check', 12)} Respostas salvas</div>
      <button class="btn secondary full" data-action="ask-finish">Finalizar tentativa ${icon('check', 15)}</button>
    </aside></div>
  </main>`;
}

export function updateExamProgress(attempt, index) {
  const answered = attempt.questions.filter(q => String(attempt.answers[q.id] ?? '').trim()).length;
  const total = attempt.questions.length;
  const count = document.querySelector('[data-exam-count]');
  const progress = document.querySelector('.exam-progress');
  const map = document.querySelector(`[data-action="jump-question"][data-index="${index}"]`);
  const clear = document.querySelector('[data-action="clear-answer"]');
  const q = attempt.questions[index];
  const done = !!String(attempt.answers[q.id] ?? '').trim();
  if (count) count.textContent = `${answered}/${total} respondidas`;
  if (progress) {
    progress.setAttribute('aria-valuenow', answered);
    progress.firstElementChild.style.width = `${answered / total * 100}%`;
  }
  if (clear) clear.hidden = !done;
  if (map) {
    map.classList.toggle('answered', done);
    map.setAttribute('aria-label', `Ir à questão ${index + 1}${done ? ', respondida' : ''}${attempt.flags.includes(q.id) ? ', marcada para revisão' : ''}`);
  }
}
