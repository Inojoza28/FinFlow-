/***********************************************
 * LOCALSTORAGE E VARIÁVEIS
 ***********************************************/
const STORAGE_KEY = "planejadorData";

let userData = {
  income: 0,
  expenses: 0,
  lastSimulation: null
};

/***********************************************
 * SELETORES
 ***********************************************/
const monthlyIncome = document.getElementById("monthlyIncome");
const monthlyExpenses = document.getElementById("monthlyExpenses");
const purchaseName = document.getElementById("purchaseName");
const purchaseValue = document.getElementById("purchaseValue");
const paymentCash = document.getElementById("paymentCash");
const paymentInstallments = document.getElementById("paymentInstallments");
const installmentOptions = document.getElementById("installmentOptions");
const installmentsNum = document.getElementById("installmentsNum");
const interestRate = document.getElementById("interestRate");

const calculateBtn = document.getElementById("calculateBtn");
const summaryDiv = document.getElementById("summary");
const lastSimulationSection = document.getElementById("lastSimulationSection");
const lastSimulationsDiv = document.getElementById("lastSimulations");
const clearDataBtn = document.getElementById("clearDataBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

/* Planejamento de Poupança */
const toggleSavingPlanBtn = document.getElementById("toggleSavingPlanBtn");
const savingPlanSection = document.getElementById("savingPlanSection");
const monthsToSaveInput = document.getElementById("monthsToSave");
const planSavingBtn = document.getElementById("planSavingBtn");
const savingPlanResult = document.getElementById("savingPlanResult");

/***********************************************
 * FUNÇÕES DE PERSISTÊNCIA
 ***********************************************/
function loadDataFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    userData = JSON.parse(stored);
  }
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

/***********************************************
 * FUNÇÃO PARA REMOVER TAGS HTML
 ***********************************************/
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

/***********************************************
 * CÁLCULO DE PARCELAS (JUROS COMPOSTOS)
 ***********************************************/
function calculateInstallment(value, monthlyInterest, numberOfInstallments) {
  if (monthlyInterest === 0) return value / numberOfInstallments;
  const numerator = value * monthlyInterest * Math.pow(1 + monthlyInterest, numberOfInstallments);
  const denominator = Math.pow(1 + monthlyInterest, numberOfInstallments) - 1;
  return numerator / denominator;
}

/***********************************************
 * RENDERIZAR ÚLTIMA SIMULAÇÃO
 ***********************************************/
function renderLastSimulation() {
  if (!userData.lastSimulation) {
    lastSimulationSection.style.display = "none";
    return;
  }
  const sim = userData.lastSimulation;
  lastSimulationSection.style.display = "block";

  let html = `<p><strong>Item:</strong> ${sim.itemName}</p>`;
  html += `<p><strong>Valor:</strong> R$ ${sim.itemValue.toFixed(2)}</p>`;
  html += `<p><strong>Forma:</strong> ${sim.paymentType === "cash" ? "À Vista" : "Parcelado"}</p>`;

  if (sim.paymentType === "installments") {
    html += `<p><strong>Parcelas:</strong> ${sim.installmentsNum}x</p>`;
    html += `<p><strong>Juros:</strong> ${sim.interestRate}%</p>`;
  }

  // Exibe um pequeno extrato do detailedMessage
  const shortMsg = sim.detailedMessage.split(".")[0] || sim.detailedMessage;
  html += `<p><em>Resumo:</em> ${shortMsg.substring(0, 80)}...</p>`;

  lastSimulationsDiv.innerHTML = html;
}

/***********************************************
 * MENSAGENS PROFISSIONAIS
 ***********************************************/
function getDetailedMessage(options) {
  const { leftoverBase, itemName, itemValue, paymentType } = options;

  let msg = `
    <p><strong>Renda Mensal:</strong> R$ ${userData.income.toFixed(2)}<br>
    <strong>Despesas Fixas:</strong> R$ ${userData.expenses.toFixed(2)}<br>
    <strong>Sobra Inicial (antes da compra):</strong> R$ ${leftoverBase.toFixed(2)}</p>

    <p>
      <strong>Item Planejado:</strong> ${itemName}<br>
      <strong>Valor:</strong> R$ ${itemValue.toFixed(2)}
    </p>
  `;

  if (paymentType === "cash") {
    const leftoverAfter = options.leftoverAfter;
    if (leftoverAfter < 0) {
      const diff = Math.abs(leftoverAfter).toFixed(2);
      msg += `
        <p class="danger">
          O valor à vista excede sua sobra em R$ ${diff}.
          Tente juntar antes ou avaliar o parcelamento.
        </p>
      `;
    } else if (leftoverAfter === 0) {
      msg += `
        <p class="warning">
          Você consegue comprar à vista, mas ficará zerado de sobra.
          Qualquer imprevisto pode ser um problema.
        </p>
      `;
    } else {
      msg += `
        <p class="success">
          Compra à vista confirmada! 
          Sobram R$ ${leftoverAfter.toFixed(2)}.
        </p>
      `;
    }
  } else {
    // Parcelado
    const leftoverAfterInst = options.leftoverAfterInst;
    const n = options.installmentsNum || 0;
    const juros = options.interestRate || 0;
    const monthlyInstallment = options.monthlyInstallment || 0;

    msg += `
      <p>
        <strong>Parcelas:</strong> ${n}x<br>
        <strong>Juros Mensais:</strong> ${juros.toFixed(2)}%<br>
        <strong>Parcela Estimada:</strong> R$ ${monthlyInstallment.toFixed(2)}
      </p>
    `;

    if (leftoverAfterInst < 0) {
      const diff = Math.abs(leftoverAfterInst).toFixed(2);
      msg += `
        <p class="danger">
          Sua sobra mensal não suporta a parcela de R$ ${monthlyInstallment.toFixed(2)}.
          Faltam R$ ${diff} mensais.
        </p>
      `;
    } else if (leftoverAfterInst === 0) {
      msg += `
        <p class="warning">
          A parcela consumirá toda sua sobra. Tenha cautela com imprevistos.
        </p>
      `;
    } else {
      msg += `
        <p class="success">
          Parcela de R$ ${monthlyInstallment.toFixed(2)} é viável!
          Você ainda teria R$ ${leftoverAfterInst.toFixed(2)} mensais.
        </p>
      `;
    }
  }
  return msg;
}

/***********************************************
 * CÁLCULO E EXIBIÇÃO (COMPRA)
 ***********************************************/
function calculateAndShow() {
  summaryDiv.innerHTML = "";

  const income = parseFloat(monthlyIncome.value) || 0;
  const expenses = parseFloat(monthlyExpenses.value) || 0;
  const leftoverBase = income - expenses;

  const itemNameVal = purchaseName.value.trim();
  const itemValueVal = parseFloat(purchaseValue.value) || 0;

  if (!itemNameVal || itemValueVal <= 0) {
    summaryDiv.innerHTML = `<p class="danger">Informe o nome do item e um valor válido.</p>`;
    return;
  }

  userData.income = income;
  userData.expenses = expenses;

  // Se sobrou < 0
  if (leftoverBase < 0) {
    const msg = `
      <p><strong>Renda Mensal:</strong> R$ ${income.toFixed(2)}<br>
      <strong>Despesas Fixas:</strong> R$ ${expenses.toFixed(2)}</p>
      <p class="danger">
        Suas despesas superam sua renda. Ajuste o orçamento antes de pensar em comprar.
      </p>
    `;
    summaryDiv.innerHTML = msg;

    userData.lastSimulation = {
      itemName: itemNameVal,
      itemValue: itemValueVal,
      paymentType: paymentCash.checked ? "cash" : "installments",
      installmentsNum: 0,
      interestRate: 0,
      detailedMessage: stripHtml(msg)
    };
    saveDataToStorage();
    renderLastSimulation();
    return;
  }

  let detailedMessage = "";
  // Se for à vista
  if (paymentCash.checked) {
    const leftoverAfter = leftoverBase - itemValueVal;
    detailedMessage = getDetailedMessage({
      leftoverBase,
      itemName: itemNameVal,
      itemValue: itemValueVal,
      paymentType: "cash",
      leftoverAfter
    });
  } else {
    // Parcelado
    const n = parseInt(installmentsNum.value) || 1;
    const juros = parseFloat(interestRate.value) || 0;
    const monthlyInstall = calculateInstallment(itemValueVal, juros / 100, n);
    const leftoverAfterInst = leftoverBase - monthlyInstall;

    detailedMessage = getDetailedMessage({
      leftoverBase,
      itemName: itemNameVal,
      itemValue: itemValueVal,
      paymentType: "installments",
      installmentsNum: n,
      interestRate: juros,
      monthlyInstallment: monthlyInstall,
      leftoverAfterInst
    });
  }

  summaryDiv.innerHTML = detailedMessage;

  // Salva a simulação
  userData.lastSimulation = {
    itemName: itemNameVal,
    itemValue: itemValueVal,
    paymentType: paymentCash.checked ? "cash" : "installments",
    installmentsNum: parseInt(installmentsNum.value) || 0,
    interestRate: parseFloat(interestRate.value) || 0,
    detailedMessage: stripHtml(detailedMessage)
  };
  saveDataToStorage();

  renderLastSimulation();
}

/***********************************************
 * PLANEJAMENTO DE POUPANÇA (EXCLUSIVAMENTE p/ ITEM)
 ***********************************************/
function createSavingPlan() {
  savingPlanResult.innerHTML = "";

  const monthsVal = parseInt(monthsToSaveInput.value) || 1;
  const income = userData.income || 0;
  const expenses = userData.expenses || 0;
  const leftoverBase = income - expenses;

  const itemValueVal = parseFloat(purchaseValue.value) || 0;
  if (itemValueVal <= 0) {
    savingPlanResult.innerHTML = `<p class="danger">Informe um valor de item válido antes de criar o plano!</p>`;
    return;
  }

  if (leftoverBase <= 0) {
    savingPlanResult.innerHTML = `
      <p class="danger">
        Você não possui sobra mensal. Não é possível criar um plano de poupança agora.
      </p>
    `;
    return;
  }

  const monthlyNeeded = itemValueVal / monthsVal;
  if (monthlyNeeded <= leftoverBase) {
    // Dá para juntar tudo no período
    savingPlanResult.innerHTML = `
      <p class="success">
        Para comprar seu item de R$ ${itemValueVal.toFixed(2)} em ${monthsVal} meses,
        poupe R$ ${monthlyNeeded.toFixed(2)}/mês. Isso não excede sua sobra mensal (R$ ${leftoverBase.toFixed(2)}).
      </p>
      <p>
        Ao final de ${monthsVal} meses, terá o valor completo do item, sem parcelamento.
      </p>
    `;
  } else {
    // Não consegue juntar tudo
    const savedAfterMonths = leftoverBase * monthsVal;
    const difference = itemValueVal - savedAfterMonths;
    const shortBy = monthlyNeeded - leftoverBase;
    savingPlanResult.innerHTML = `
      <p class="warning">
        Você precisaria R$ ${monthlyNeeded.toFixed(2)}/mês para comprar em ${monthsVal} meses,
        mas sua sobra é R$ ${leftoverBase.toFixed(2)}/mês (faltam ~R$ ${shortBy.toFixed(2)} mensais).
      </p>
      <p>
        Juntando R$ ${leftoverBase.toFixed(2)}/mês por ${monthsVal} meses, terá R$ ${savedAfterMonths.toFixed(2)}.
      </p>
    `;
    if (difference > 0) {
      savingPlanResult.innerHTML += `
        <p class="success">
          <strong>Sugestão:</strong> Use R$ ${savedAfterMonths.toFixed(2)} 
          como entrada e parcele os R$ ${difference.toFixed(2)} restantes, 
          deixando as parcelas menores.
        </p>
      `;
    }
  }
}

/***********************************************
 * LIMPAR DADOS E EXPORTAR CSV
 ***********************************************/
function clearAllData() {
  userData = {
    income: 0,
    expenses: 0,
    lastSimulation: null
  };
  saveDataToStorage();

  monthlyIncome.value = "";
  monthlyExpenses.value = "";
  purchaseName.value = "";
  purchaseValue.value = "";
  installmentsNum.value = "";
  interestRate.value = "";
  paymentCash.checked = true;
  installmentOptions.style.display = "none";

  summaryDiv.innerHTML = "";
  lastSimulationSection.style.display = "none";

  // Poupança
  monthsToSaveInput.value = "";
  savingPlanResult.innerHTML = "";
  savingPlanSection.style.display = "none";
}

function exportToCsv() {
  if (!userData.lastSimulation) {
    alert("Nenhuma simulação encontrada para exportar!");
    return;
  }
  const sim = userData.lastSimulation;
  let csv = "Renda,Despesas,Item,Valor,Forma,Parcelas,Juros(%),Resumo\n";
  csv += `${userData.income},${userData.expenses},${sim.itemName},${sim.itemValue},${sim.paymentType},${sim.installmentsNum || ""},${sim.interestRate || ""},"${sim.detailedMessage}"\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "planejador_consumos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/***********************************************
 * EVENTOS
 ***********************************************/
function handlePaymentTypeChange() {
  if (paymentCash.checked) {
    installmentOptions.style.display = "none";
  } else {
    installmentOptions.style.display = "block";
  }
}

function toggleSavingPlanSection() {
  savingPlanSection.style.display =
    savingPlanSection.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  loadDataFromStorage();
  monthlyIncome.value = userData.income || "";
  monthlyExpenses.value = userData.expenses || "";

  renderLastSimulation();
  handlePaymentTypeChange();
});

paymentCash.addEventListener("change", handlePaymentTypeChange);
paymentInstallments.addEventListener("change", handlePaymentTypeChange);

calculateBtn.addEventListener("click", calculateAndShow);
clearDataBtn.addEventListener("click", clearAllData);
exportCsvBtn.addEventListener("click", exportToCsv);

toggleSavingPlanBtn.addEventListener("click", toggleSavingPlanSection);
planSavingBtn.addEventListener("click", createSavingPlan);
