export function mountPractice(root, signal) {
  const tasks = [
    {
      id: "dobro", name: "Dobro", topic: "Operações", focus: "Multiplique por 2; confira positivo, zero e negativo.", title: "Devolva o dobro.", fn: "dobro",
      instructions: " é o número recebido. Ajuste o cálculo para devolver o dobro:",
      example: "4 → 8", initial: "valor + 2", operation: "+", number: "2",
      cases: [{ value: 4, expected: 8 }, { value: 0, expected: 0 }, { value: -3, expected: -6 }],
      initialHint: "O seu cálculo também funciona quando a entrada é zero?",
      hints: [
        "Dobrar é usar a mesma quantidade duas vezes. Com 4 em cada grupo, quanto dá a soma dos dois?",
        "Teste com zero. O dobro de 0 é 0, mas somar 2 devolve 2. Que regra vale para qualquer entrada?",
        "Um exemplo é valor + valor: o número somado com ele mesmo. Escreva esse trecho e execute."
      ],
      guidedHint: "Escolha Multiplicar e use 2. O código vai calcular duas vezes o número recebido. Execute para conferir.",
      testsReason: "4 verifica uma entrada positiva; 0 identifica regras que acrescentam uma quantidade fixa; -3 verifica se a mesma regra funciona com negativos.",
      question: "Como você calcula o dobro? Explique sua escolha, os testes e uma alternativa.",
      reference: "Regra: somo valor com ele mesmo, ou multiplico por 2.\nTestes: 4 deve virar 8; zero deve continuar zero; -3 deve virar -6.\nAlternativa e limite: devolver sempre 8 passa no primeiro caso, mas falha nos outros. Três testes ajudam, mas não provam a solução para toda entrada."
    },
    {
      id: "conversao", name: "Minutos em segundos", topic: "Conversão", focus: "Use 60 segundos por minuto; teste também valores fracionados.", title: "De minutos a segundos.", fn: "segundos",
      instructions: " é a quantidade de minutos. Devolva os segundos, inclusive para meio minuto:",
      example: "0.5 → 30", initial: "valor + 60", operation: "+", number: "60",
      cases: [{ value: 1, expected: 60 }, { value: 2.5, expected: 150 }, { value: 0, expected: 0 }],
      initialHint: "Se um minuto tem 60 segundos, como converter dois minutos e meio?",
      hints: [
        "Cada minuto contém 60 segundos. Em 2 minutos, são dois grupos de 60.",
        "Somar 60 dá 60 para zero minutos. Para zero minutos, o esperado é zero segundos.",
        "Use valor * 60: a quantidade de minutos multiplicada pelos segundos de cada minuto."
      ],
      guidedHint: "Escolha Multiplicar e use 60. Execute para conferir o minuto inteiro, o decimal e o zero.",
      testsReason: "1 verifica a unidade; 2.5 verifica minutos fracionados; 0 verifica a ausência de tempo. O ponto separa decimais nesta expressão.",
      question: "Como você transforma minutos em segundos? Explique o fator usado, os testes e uma alternativa.",
      reference: "Regra: multiplico valor por 60, pois cada minuto tem 60 segundos.\nTestes: 1 minuto dá 60; 2.5 minutos dão 150; zero dá zero.\nAlternativa e limite: somar 60 não converte uma quantidade, apenas acrescenta um minuto. Repetir uma soma exige cuidado com minutos fracionados."
    },
    {
      id: "maioridade", name: "Maioridade", topic: "Condições", focus: "Compare com 18 e inclua o limite: quem completa 18 já é maior de idade.", title: "Já tem 18 anos?", fn: "maiorDeIdade",
      instructions: " é a idade em anos. Devolva true a partir de 18 e false antes disso:",
      example: "18 → true", initial: "valor > 18", operation: ">", number: "18",
      comparison: true,
      cases: [{ value: 17, expected: false }, { value: 18, expected: true }, { value: 21, expected: true }],
      initialHint: "Quem tem exatamente 18 anos deve entrar em qual resultado?",
      hints: [
        "true significa verdadeiro; false, falso. A regra inclui quem acabou de completar 18.",
        "O sinal > exige um valor maior, sem incluir o próprio limite. Compare as saídas para 17, 18 e 21.",
        "Use valor >= 18: maior ou igual a 18. O sinal de igual inclui a idade do limite."
      ],
      guidedHint: "Escolha Maior ou igual e use 18. Isso inclui quem tem exatamente 18 anos.",
      testsReason: "17 fica abaixo do limite; 18 é exatamente o limite; 21 fica acima. O caso de 18 diferencia > de >=. Aqui, true e false são valores lógicos, não números.",
      question: "Como sua condição trata quem tem exatamente 18 anos? Explique os testes e uma alternativa.",
      reference: "Regra: comparo valor >= 18. Isso devolve true para 18 ou mais e false antes de 18.\nTestes: 17 dá false; 18 e 21 dão true.\nAlternativa e limite: valor > 17 funciona para idades inteiras, mas não equivale à regra se forem aceitas idades fracionadas. A entrada deve ter seu domínio definido."
    }
  ];
  const arithmetic = [["+", "Somar"], ["-", "Subtrair"], ["*", "Multiplicar"], ["/", "Dividir"]];
  const comparisons = [[">", "Maior que"], [">=", "Maior ou igual"], ["<", "Menor que"], ["<=", "Menor ou igual"], ["===", "Igual a"], ["!==", "Diferente de"]];
  const form = root.querySelector("#try-challenge");
  const field = form.elements.expression;
  const output = form.querySelector("output");
  const selector = root.querySelector("#sandbox-challenge");
  const guide = root.querySelector("#sandbox-guide");
  const operation = root.querySelector("#sandbox-operation");
  const number = root.querySelector("#sandbox-number");
  const meaning = root.querySelector("#sandbox-meaning");
  const guidedButton = root.querySelector("#sandbox-mode-guided");
  const codeButton = root.querySelector("#sandbox-mode-code");
  const runButton = root.querySelector("#sandbox-run");
  const hintButton = root.querySelector("#sandbox-hint");
  const hintText = root.querySelector("#sandbox-mentor");
  const next = root.querySelector("#sandbox-next");
  const journeyHint = root.querySelector("#journey-hint");
  const journeyStep = root.querySelector("#journey-test-step");
  const tutorResponse = root.querySelector("#tutor-response");
  const trackTasks = root.querySelector("#track-tasks");
  const interviewForm = root.querySelector("#interview-form");
  const answer = root.querySelector("#interview-answer");
  const criteria = [...root.querySelectorAll('#interview-review input[type="checkbox"]')];
  const states = new Map(tasks.map(task => [task.id, initialState(task)]));
  let task = tasks[0];
  let state = states.get(task.id);
  let order = tasks.map(item => item.id);
  let tutorTopic = "error";
  let nextId = null;

  function initialState(item) {
    return {
      expression: item.initial, operation: item.operation, number: item.number,
      mode: "code", hints: 0, results: null, error: "",
      answer: "", criteria: [false, false, false], reviewed: false
    };
  }

  class ExpressionError extends Error {}

  function calculate(source, value) {
    if (source.length > 120) throw new ExpressionError("Use uma expressão com até 120 caracteres.");
    if (!source.trim()) throw new ExpressionError("Escreva a expressão no trecho marcado antes de executar.");
    const tokens = source.match(/valor|\d+(?:\.\d+)?|>=|<=|===|!==|[<>()+*/-]|\S/g) || [];
    let index = 0;
    function primary() {
      const token = tokens[index++];
      if (!token) throw new ExpressionError("Complete a expressão depois do operador: falta um número ou valor.");
      if (token === "+" || token === "-") {
        const operand = primary();
        return token === "-" ? -operand : operand;
      }
      if (token === "(") {
        const result = sum();
        if (tokens[index++] !== ")") throw new ExpressionError("Feche os parênteses numéricos que você abriu. A comparação fica fora deles.");
        return result;
      }
      if (token === "valor") return value;
      if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);
      throw new ExpressionError("Use valor, números e operadores permitidos. Não são aceitos comandos, textos ou funções.");
    }
    function product() {
      let result = primary();
      while (tokens[index] === "*" || tokens[index] === "/") {
        const operator = tokens[index++];
        const right = primary();
        if (operator === "/" && right === 0) throw new ExpressionError(`Não é possível dividir por zero. Revise a expressão para a entrada ${value}.`);
        result = operator === "*" ? result * right : result / right;
      }
      return result;
    }
    function sum() {
      let result = product();
      while (tokens[index] === "+" || tokens[index] === "-") {
        const operator = tokens[index++];
        const right = product();
        result = operator === "+" ? result + right : result - right;
      }
      return result;
    }
    let result = sum();
    if (!Number.isFinite(result)) throw new ExpressionError("O resultado ficou grande demais. Tente usar números menores.");
    if (comparisons.some(([operator]) => operator === tokens[index])) {
      if (!task.comparison) throw new ExpressionError("Este desafio pede um número. Comparações ficam no desafio Maioridade.");
      const operator = tokens[index++];
      const right = sum();
      if (!Number.isFinite(right)) throw new ExpressionError("O resultado ficou grande demais. Tente usar números menores.");
      switch (operator) {
        case ">": result = result > right; break;
        case ">=": result = result >= right; break;
        case "<": result = result < right; break;
        case "<=": result = result <= right; break;
        case "===": result = result === right; break;
        case "!==": result = result !== right; break;
      }
    }
    if (index !== tokens.length) throw new ExpressionError("Revise os sinais. Use operações numéricas e, em Maioridade, no máximo uma comparação ao final.");
    return result;
  }

  function completed(itemState) {
    return Boolean(itemState.results && itemState.results.every(item => item.result === item.expected));
  }

  function mismatch() {
    return state.results?.find(item => item.result !== item.expected);
  }

  function currentHint() {
    return state.hints === 3 && state.mode === "guided"
      ? task.guidedHint : task.hints[state.hints - 1];
  }

  function renderTests() {
    root.querySelector("#sandbox-tests").replaceChildren(...task.cases.map((item, index) => {
      const result = state.results?.[index];
      const row = document.createElement("li");
      row.dataset.status = state.error ? "error" : !result ? "idle"
        : result.result === item.expected ? "correct" : "retry";
      const values = document.createElement("strong");
      values.textContent = `${item.value} → ${result ? result.result : "—"}`;
      const expected = document.createElement("small");
      expected.textContent = `Esperado: ${item.expected}`;
      const status = document.createElement("small");
      status.textContent = {
        idle: "Aguardando",
        correct: "Correto",
        retry: "Revisar",
        error: "Erro ao executar"
      }[row.dataset.status];
      row.append(values, expected, status);
      return row;
    }));
    const passed = state.results?.filter(item => item.result === item.expected).length;
    const first = task.cases[0];
    root.querySelector("#sandbox-count").textContent = state.error ? "Execução interrompida"
      : state.results ? `${passed}/3 corretos` : "3 testes";
    root.querySelector("#journey-code").textContent = state.expression.trim() || "Expressão vazia";
    root.querySelector("#journey-code").title = state.expression;
    root.querySelector("#journey-input").textContent = String(first.value);
    root.querySelector("#journey-result").textContent = state.error ? "!"
      : state.results ? String(state.results[0].result) : "—";
    root.querySelector("#journey-checks").textContent = state.error ? "Revise a expressão e tente de novo"
      : `Esperado: ${first.expected} · ${state.results ? `${passed}/3 corretos` : "aguarda execução"}`;
    if (state.results || state.error) {
      output.dataset.status = completed(state) ? "correct" : "retry";
      journeyStep.dataset.status = output.dataset.status;
    } else {
      delete output.dataset.status;
      delete journeyStep.dataset.status;
    }
    const wrong = mismatch();
    output.textContent = state.error || (completed(state)
      ? "Passou nos três testes. Continue no próximo desafio ou treine sua explicação."
      : wrong
        ? `${task.fn}(${wrong.value}) devolveu ${wrong.result}; o esperado era ${wrong.expected}. ${state.mode === "guided" ? "Revise a operação e o número escolhidos." : "Edite a expressão ou abra uma pista."}`
        : "Execute para ver o resultado de cada entrada.");
  }

  function renderHints() {
    const wrong = mismatch();
    hintText.textContent = state.hints ? currentHint()
      : state.error ? "Revise a expressão conforme a mensagem de execução. As pistas explicam a regra deste desafio."
        : completed(state) ? "Os três casos passaram. Que outra entrada você usaria para procurar um erro na sua regra?"
          : wrong ? `Com ${wrong.value}, sua regra deu ${wrong.result}; o esperado é ${wrong.expected}. ${task.initialHint}`
            : task.initialHint;
    root.querySelector("#sandbox-hint-status").textContent = state.hints ? `${state.hints} de 3 pistas abertas` : "";
    root.querySelector("#journey-hint-count").textContent = `${state.hints}/3`;
    root.querySelectorAll(".journey-dots i").forEach((dot, index) => {
      dot.dataset.open = String(index < state.hints);
    });
    hintButton.disabled = state.hints === 3;
    journeyHint.disabled = hintButton.disabled;
    hintButton.textContent = state.hints === 3 ? "Todas as pistas abertas"
      : state.hints ? "Ver próxima pista" : "Pedir pista";
  }

  function renderTutor() {
    const wrong = mismatch();
    root.querySelector("#tutor-context").textContent = `${task.name} · ${
      state.error ? "execução interrompida" : completed(state) ? "3/3 testes corretos"
        : state.results ? "resultado para revisar" : "ainda não executado"}`;
    root.querySelectorAll("[data-help]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.help === tutorTopic));
      button.disabled = button.dataset.help === "hint" && state.hints === 3;
    });
    tutorResponse.textContent = tutorTopic === "tests" ? task.testsReason
      : tutorTopic === "hint" && state.hints ? currentHint()
        : state.error ? `A expressão não foi concluída: ${state.error} Os testes não foram marcados como corretos.`
          : wrong ? `Na entrada ${wrong.value}, você obteve ${wrong.result}, mas precisa de ${wrong.expected}. ${task.initialHint} Compare a regra inteira, não só a primeira entrada.`
            : completed(state) ? `Sua expressão passou nos três casos: ${task.cases.map(item => `${item.value} → ${item.expected}`).join("; ")}. Isso não prova todos os valores possíveis. Tente explicar por que a regra se mantém.`
              : "Execute sua tentativa para comparar com o esperado. Nenhum erro foi presumido.";
  }

  function renderTrack() {
    const buttons = [...trackTasks.querySelectorAll("[data-challenge]")];
    order.forEach((id, index) => {
      const item = tasks.find(candidate => candidate.id === id);
      const button = buttons.find(candidate => candidate.dataset.challenge === id);
      const done = completed(states.get(id));
      button.querySelector(".mono").textContent = `0${index + 1} / ${item.topic}`;
      button.querySelector("small").textContent = done ? "3/3 testes corretos · revisar ↑"
        : id === task.id ? "Aberto no editor ↑" : "Abrir desafio ↑";
      button.dataset.complete = String(done);
      if (id === task.id) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      trackTasks.append(button.parentElement);
    });
    const doneCount = tasks.filter(item => completed(states.get(item.id))).length;
    root.querySelector("#track-progress").value = doneCount;
    root.querySelector("#track-status").textContent = `${doneCount} de 3 desafios com os testes corretos.`;
    const afterCurrent = order.slice(order.indexOf(task.id) + 1);
    nextId = [...afterCurrent, ...order].find(id => !completed(states.get(id))) || null;
    next.hidden = !completed(state);
    root.querySelector("#sandbox-signup").hidden = doneCount === 0;
    next.href = nextId ? "#sandbox" : "#entrevistas";
    next.textContent = nextId
      ? `Próximo: ${tasks.find(item => item.id === nextId).name} →` : "Treinar minha explicação →";
  }

  function renderFeedback() {
    renderTests();
    renderHints();
    renderTutor();
    renderTrack();
  }

  function resetResults() {
    state.results = null;
    state.error = "";
    renderFeedback();
  }

  function updateGuidedExpression() {
    state.operation = operation.value;
    state.number = number.value;
    number.setCustomValidity(/[eE]/.test(number.value)
      ? "Escreva o número sem abreviações: por exemplo, 100 em vez de 1e2." : "");
    state.expression = `valor ${operation.value} ${number.value}`;
    field.value = state.expression;
    updateGuidedMeaning();
    resetResults();
  }

  function updateGuidedMeaning() {
    const descriptions = {
      "+": `somar ${number.value} ao número recebido`,
      "-": `subtrair ${number.value} do número recebido`,
      "*": `multiplicar o número recebido por ${number.value}`,
      "/": `dividir o número recebido por ${number.value}`,
      ">": `verificar se a idade é maior que ${number.value}`,
      ">=": `verificar se a idade é maior ou igual a ${number.value}`,
      "<": `verificar se a idade é menor que ${number.value}`,
      "<=": `verificar se a idade é menor ou igual a ${number.value}`,
      "===": `verificar se a idade é igual a ${number.value}`,
      "!==": `verificar se a idade é diferente de ${number.value}`
    };
    meaning.textContent = number.value ? `O código vai ${descriptions[operation.value]}.`
      : "Escolha um número para completar a expressão.";
  }

  function renderMode() {
    const guided = state.mode === "guided";
    guide.hidden = !guided;
    field.readOnly = guided;
    operation.disabled = !guided;
    number.disabled = !guided;
    root.querySelector("#sandbox-help").textContent = guided
      ? "A expressão acompanha as escolhas abaixo." : "return devolve a resposta.";
    guidedButton.setAttribute("aria-pressed", String(guided));
    codeButton.setAttribute("aria-pressed", String(!guided));
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.hints = 0;
    renderMode();
    if (mode === "guided") updateGuidedExpression();
    else resetResults();
  }

  function renderInterviewStatus() {
    const checked = state.criteria.filter(Boolean).length;
    root.querySelector("#interview-status").textContent =
      `Você marcou ${checked} de 3 critérios na sua autoavaliação. O texto não foi avaliado automaticamente.`;
  }

  function renderInterview() {
    root.querySelector("#interview-context").textContent = `Sobre o desafio ${task.name}`;
    root.querySelector("#interview-question").textContent = task.question;
    root.querySelector("#interview-reference").textContent = task.reference;
    answer.value = state.answer;
    answer.setCustomValidity("");
    criteria.forEach((checkbox, index) => { checkbox.checked = state.criteria[index]; });
    root.querySelector("#interview-review").hidden = !state.reviewed;
    root.querySelector("#interview-review details").open = false;
    renderInterviewStatus();
  }

  function selectTask(id, focus = false) {
    task = tasks.find(item => item.id === id);
    state = states.get(task.id);
    selector.value = task.id;
    root.querySelector("#sandbox-title").textContent = task.title;
    root.querySelector("#sandbox-focus").textContent = `${task.topic} · ${task.focus}`;
    root.querySelector("#sandbox-instructions").textContent = task.instructions;
    root.querySelector("#sandbox-example").textContent = task.example;
    root.querySelector("#sandbox-function").textContent = task.fn;
    root.querySelector("#sandbox-limit").textContent = "Só a expressão marcada é interpretada: valor, números, +, -, *, / e parênteses."
      + (task.comparison ? " Aceita uma comparação ao final: >, >=, <, <=, === ou !==. Devolve true (verdadeiro) ou false (falso)." : "")
      + " Não executa JavaScript completo.";
    operation.replaceChildren(...(task.comparison ? comparisons : arithmetic).map(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
    operation.value = state.operation;
    number.value = state.number;
    number.setCustomValidity(/[eE]/.test(state.number)
      ? "Escreva o número sem abreviações: por exemplo, 100 em vez de 1e2." : "");
    field.value = state.expression;
    updateGuidedMeaning();
    renderMode();
    renderFeedback();
    renderInterview();
    root.dispatchEvent(new Event("sandbox-challenge-change"));
    if (focus) reveal(field);
  }

  function reveal(target) {
    target.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center"
    });
    target.focus({ preventScroll: true });
  }

  function openHint() {
    if (state.hints === 3) return;
    state.hints++;
    renderHints();
    renderTutor();
    root.dispatchEvent(new Event("sandbox-feedback"));
  }

  selector.addEventListener("change", () => selectTask(selector.value), { signal });
  guidedButton.addEventListener("click", () => setMode("guided"), { signal });
  codeButton.addEventListener("click", () => setMode("code"), { signal });
  operation.addEventListener("change", updateGuidedExpression, { signal });
  number.addEventListener("input", updateGuidedExpression, { signal });
  field.addEventListener("input", () => {
    state.expression = field.value;
    resetResults();
  }, { signal });
  hintButton.addEventListener("click", openHint, { signal });
  root.querySelector("#sandbox-reset").addEventListener("click", () => {
    Object.assign(state, {
      expression: task.initial, mode: "code", operation: task.operation, number: task.number,
      hints: 0, results: null, error: ""
    });
    selectTask(task.id);
    field.focus();
  }, { signal });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const wasCompleted = completed(state);
    try {
      const results = task.cases.map(item => ({ ...item, result: calculate(field.value, item.value) }));
      state.results = results;
      state.error = "";
    } catch (error) {
      if (!(error instanceof ExpressionError)) throw error;
      state.results = null;
      state.error = error.message;
    }
    renderFeedback();
    if (completed(state) && !wasCompleted) root.dispatchEvent(new Event("sandbox-success"));
    root.dispatchEvent(new Event("sandbox-feedback"));
  }, { signal });
  next.addEventListener("click", event => {
    event.preventDefault();
    if (nextId) selectTask(nextId, true);
    else {
      root.querySelector("#interview-practice").open = true;
      reveal(answer);
    }
  }, { signal });

  root.querySelector("#journey-edit").addEventListener("click", () => {
    setMode("code");
    reveal(field);
  }, { signal });
  root.querySelector("#journey-run").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    runButton.click();
    reveal(output);
  }, { signal });
  journeyHint.addEventListener("click", () => {
    openHint();
    reveal(hintText);
  }, { signal });
  root.querySelectorAll("[data-help]").forEach(button => {
    button.addEventListener("click", () => {
      tutorTopic = button.dataset.help;
      if (tutorTopic === "hint") openHint();
      else renderTutor();
      reveal(tutorResponse);
    }, { signal });
  });
  root.querySelector("#tutor-return").addEventListener("click", event => {
    event.preventDefault();
    reveal(field);
  }, { signal });
  trackTasks.querySelectorAll("[data-challenge]").forEach(button => {
    button.addEventListener("click", () => selectTask(button.dataset.challenge, true), { signal });
  });
  root.querySelectorAll('[name="track-start"]').forEach(radio => {
    radio.addEventListener("change", () => {
      order = radio.value === "zero" ? ["dobro", "conversao", "maioridade"]
        : ["maioridade", "conversao", "dobro"];
      root.querySelector("#track-reason").textContent = radio.value === "zero"
        ? "Comece com uma operação, aplique-a em uma conversão e então escreva uma condição."
        : "Como você já usou operações, comece pela condição. Depois, revise conversão e dobro.";
      renderTrack();
    }, { signal });
  });

  answer.addEventListener("input", () => {
    state.answer = answer.value;
    state.reviewed = false;
    state.criteria = [false, false, false];
    answer.setCustomValidity("");
    criteria.forEach(checkbox => { checkbox.checked = false; });
    root.querySelector("#interview-review").hidden = true;
    root.querySelector("#interview-review details").open = false;
  }, { signal });
  interviewForm.addEventListener("submit", event => {
    event.preventDefault();
    answer.setCustomValidity(answer.value.trim() ? "" : "Escreva sua explicação antes de revisar.");
    if (!interviewForm.reportValidity()) return;
    state.reviewed = true;
    root.querySelector("#interview-review").hidden = false;
    renderInterviewStatus();
    criteria[0].focus();
  }, { signal });
  criteria.forEach((checkbox, index) => {
    checkbox.addEventListener("change", () => {
      state.criteria[index] = checkbox.checked;
      renderInterviewStatus();
    }, { signal });
  });
  root.querySelector("#interview-reset").addEventListener("click", () => {
    state.answer = "";
    state.criteria = [false, false, false];
    state.reviewed = false;
    renderInterview();
    answer.focus();
  }, { signal });

  root.querySelectorAll(
    "#sandbox-challenge, #sandbox-mode-code, #sandbox-mode-guided, #sandbox-run, #sandbox-reset, #journey-edit, #journey-run, [data-help], [data-challenge], [name='track-start'], #interview-form button, #interview-form input, #interview-answer"
  ).forEach(control => { control.disabled = false; });
  selectTask("dobro");
}
