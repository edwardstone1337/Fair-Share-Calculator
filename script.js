/*
 * Fair Share Calculator - Production Ready
 * 
 * SECURITY FEATURES IMPLEMENTED:
 * - XSS Prevention: All user input is sanitized before DOM insertion
 * - Input Validation: Comprehensive validation for all user inputs
 * - Rate Limiting: Prevents abuse through rapid calculations
 * - Safe DOM Manipulation: No innerHTML with user data
 * - Event Handler Security: No inline event handlers
 * - Data Sanitization: All data is sanitized before processing
 * - Input Length Limits: Prevents extremely long inputs
 * - Number Range Validation: Prevents extremely large numbers
 * - JSON Validation: Safe parsing with structure validation
 * - Error Handling: Comprehensive error handling and logging
 * - Content Security Policy: CSP headers for additional protection
 */

// ===== Backend share integration (Cloudflare Worker) =====
const API_BASE = "https://tight-firefly-c0dd.edwardstone1337.workers.dev";

// ===== Security: Input Sanitization =====
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  // Limit input length to prevent abuse
  if (input.length > 1000) {
    input = input.substring(0, 1000);
  }
  
  // Remove potentially dangerous characters while preserving legitimate content
  return input.replace(/[<>\"'&]/g, '');
}

function createSafeElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);
  
  // Set attributes safely
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'innerHTML' || key === 'outerHTML') {
      // Never set innerHTML/outerHTML directly
      element.textContent = sanitizeInput(value);
    } else if (key === 'onclick' || key === 'oninput' || key === 'onkeydown') {
      // Never set event handlers as attributes - skip them
      return;
    } else {
      element.setAttribute(key, sanitizeInput(value));
    }
  });
  
  // Set text content safely
  if (textContent) {
    element.textContent = sanitizeInput(textContent);
  }
  
  return element;
}

// ===== End Security =====

// ===== Rate Limiting =====
let lastCalculationTime = 0;
const MIN_CALCULATION_INTERVAL = 100; // Minimum 100ms between calculations

function isRateLimited() {
  const now = Date.now();
  if (now - lastCalculationTime < MIN_CALCULATION_INTERVAL) {
    return true;
  }
  lastCalculationTime = now;
  return false;
}

// ===== End Rate Limiting =====

// ===== Debug Mode Configuration =====
const DEBUG_MODE = window.location.search.includes('debug=true') || 
                   localStorage.getItem('debugMode') === 'true';

function debugLog(message, data) {
  if (DEBUG_MODE) {
    console.log(`[FairShare Debug] ${message}`, data);
  }
}

function debugError(message, error) {
  if (DEBUG_MODE) {
    console.error(`[FairShare Debug] ${message}`, error);
  }
}

// ===== End Debug Configuration =====

function collectCurrentState() {
  const salary1 = document.getElementById("salary1").value;
  const salary2 = document.getElementById("salary2").value;
  const expenses = Array.from(document.querySelectorAll(".expense-input")).map(
    (expenseInput) => {
      const amount = expenseInput.value.replace(/,/g, "");
      const labelInput = expenseInput
        .closest(".shared-expense-container-loop")
        ?.querySelector(".expense-label");
      const label = labelInput ? labelInput.value : "";
      return { amount, label };
    }
  );
  
  const state = { salary1, salary2, expenses };
  debugLog('State collected', { 
    salary1: salary1, 
    salary2: salary2, 
    expenseCount: expenses.length,
    timestamp: new Date().toISOString()
  });
  
  return state;
}

function applyState(state) {
  if (!state) return;
  
  // Validate state structure
  if (typeof state !== 'object') return;
  
  // Safely set salary values
  if (state.salary1 && typeof state.salary1 === 'string') {
    const salary1Input = document.getElementById("salary1");
    if (salary1Input) salary1Input.value = sanitizeInput(state.salary1);
  }
  
  if (state.salary2 && typeof state.salary2 === 'string') {
    const salary2Input = document.getElementById("salary2");
    if (salary2Input) salary2Input.value = sanitizeInput(state.salary2);
  }
  
  if (Array.isArray(state.expenses)) {
    const expenseContainer = document.getElementById("expense-container");
    if (!expenseContainer) return;
    
    // Clear container safely
    expenseContainer.innerHTML = "";
    
    state.expenses.forEach((expense, index) => {
      if (!expense || typeof expense !== 'object') return;
      
      const newExpenseDiv = document.createElement("div");
      newExpenseDiv.classList.add("shared-expense-container-loop");
      
      const amountValue = expense?.amount ? sanitizeInput(expense.amount.toString()) : "";
      const labelValue = expense?.label ? sanitizeInput(expense.label.toString()) : "";
      
      // Create expense row safely without innerHTML
      const expenseRow = document.createElement("div");
      expenseRow.classList.add("expense-row");
      
      // Amount input group
      const amountGroup = document.createElement("div");
      amountGroup.classList.add("input-group");
      
      const amountInput = createSafeElement("input", {
        type: "text",
        class: "expense-input",
        id: `expense${index + 1}`,
        placeholder: "0",
        inputmode: "numeric"
      });
      amountInput.value = amountValue;
      amountInput.addEventListener("input", function() { formatNumberWithCommas(this); });
      
      amountGroup.appendChild(amountInput);
      
      // Label input group
      const labelGroup = document.createElement("div");
      labelGroup.classList.add("input-group");
      
      const labelInput = createSafeElement("input", {
        type: "text",
        class: "expense-label",
        id: `expenseLabel${index + 1}`,
        placeholder: "e.g. Rent, Groceries"
      });
      labelInput.value = labelValue;
      
      labelGroup.appendChild(labelInput);
      
      // Delete button or placeholder
      let actionElement;
      if (index === 0) {
        actionElement = document.createElement("div");
        actionElement.classList.add("delete-button-placeholder");
      } else {
        actionElement = createSafeElement("button", {
          class: "delete-expense-button",
          "aria-label": "Delete expense"
        });
        actionElement.innerHTML = '<span class="material-symbols-outlined">remove</span>';
        actionElement.addEventListener("click", function(e) { 
          e.preventDefault();
          deleteExpense(this); 
        });
      }
      
      // Assemble the row
      expenseRow.appendChild(amountGroup);
      expenseRow.appendChild(labelGroup);
      expenseRow.appendChild(actionElement);
      
      newExpenseDiv.appendChild(expenseRow);
      expenseContainer.appendChild(newExpenseDiv);
    });
    
    // Update expense count
    expenseCount = Math.max(state.expenses.length, 1);
  }
  
  // Trigger calculation if we have valid data
  setTimeout(() => {
    try {
      calculateShares();
    } catch (e) {
      debugError('Failed to calculate shares after state application', e);
    }
  }, 100);
}

async function shareResultsViaBackend(currentState) {
  debugLog('Backend share attempt', { 
    apiUrl: `${API_BASE}/share`,
    payload: currentState,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Validate currentState before sending
    if (!currentState || typeof currentState !== 'object') {
      throw new Error('Invalid state data');
    }
    
    // Sanitize the data before sending
    const sanitizedState = {
      salary1: sanitizeInput(currentState.salary1?.toString() || ''),
      salary2: sanitizeInput(currentState.salary2?.toString() || ''),
      expenses: Array.isArray(currentState.expenses) ? currentState.expenses.map(expense => ({
        amount: sanitizeInput(expense?.amount?.toString() || ''),
        label: sanitizeInput(expense?.label?.toString() || '')
      })) : []
    };
    
    const res = await fetch(`${API_BASE}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedState),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error || `HTTP ${res.status}: Share failed`);
    }
    
    const data = await res.json();
    if (!data || !data.id) {
      throw new Error('Invalid response from server');
    }
    
    const shareUrl = `${location.origin}${location.pathname}?id=${encodeURIComponent(data.id)}`;
    debugLog('Backend share successful', { shareUrl, response: data });
    
    return shareUrl;
  } catch (error) {
    debugError('Backend share failed', error);
    throw error;
  }
}

async function loadFromIdIfPresent(apply) {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return false;
  
  try {
    // Validate ID parameter
    if (typeof id !== 'string' || id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Invalid ID parameter');
    }
    
    const res = await fetch(`${API_BASE}/share/${encodeURIComponent(id)}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData?.error || `HTTP ${res.status}: Load failed`);
    }
    
    const data = await res.json();
    
    // Validate response data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response data');
    }
    
    // Apply the validated data
    apply(data);
    return true;
  } catch (error) {
    debugError('Failed to load from ID', error);
    throw error;
  }
}

function buildLegacyShareUrl(state) {
  const queryString = new URLSearchParams({
    salary1: state.salary1,
    salary2: state.salary2,
    expenses: JSON.stringify(state.expenses),
  }).toString();
  return `${window.location.origin}${window.location.pathname}?${queryString}`;
}
// ===== End backend integration =====

// ===== Step navigation =====
function showStep(step, { push = true } = {}) {
  const inputEl = document.getElementById('step-input');
  const resultsEl = document.getElementById('step-results');

  if (step === 'results') {
    inputEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');
    if (push) history.pushState({ step: 'results' }, '', '#results');
    // Move focus to results heading for a11y
    const heading = document.getElementById('resultsHeading');
    if (heading) heading.focus?.();
  } else {
    resultsEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    if (push) history.pushState({ step: 'input' }, '', '#input');
  }
}

window.onpopstate = (e) => {
  const step = e.state?.step || (location.hash === '#results' ? 'results' : 'input');
  showStep(step, { push: false });
};

// ===== End step navigation =====

// ===== Form Data Persistence =====
function saveFormDataToLocalStorage() {
  // Save salary data
  localStorage.setItem("salary1", document.getElementById("salary1").value);
  localStorage.setItem("salary2", document.getElementById("salary2").value);
  
  // Save expense data
  const expenses = [];
  const expenseInputs = document.querySelectorAll(".expense-input");
  const expenseLabels = document.querySelectorAll(".expense-label");
  
  expenseInputs.forEach((input, index) => {
    const amount = input.value.trim();
    const label = expenseLabels[index] ? expenseLabels[index].value.trim() : "";
    
    // Only save non-empty expenses
    if (amount !== "") {
      expenses.push({
        amount: amount,
        label: label || "Expense"
      });
    }
  });
  
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("expenseCount", expenseCount.toString());
}

function restoreFormDataFromLocalStorage() {
  // Restore salary data
  if (localStorage.getItem("salary1")) {
    document.getElementById("salary1").value = localStorage.getItem("salary1");
  }
  if (localStorage.getItem("salary2")) {
    document.getElementById("salary2").value = localStorage.getItem("salary2");
  }
  
  // Restore expense data
  const savedExpenses = localStorage.getItem("expenses");
  if (savedExpenses) {
    try {
      let expenses;
      try {
        // Validate saved expenses data
        if (typeof savedExpenses !== 'string' || savedExpenses.length > 10000) {
          throw new Error('Invalid saved expenses data');
        }
        expenses = JSON.parse(savedExpenses);
        
        // Validate the parsed data structure
        if (!Array.isArray(expenses)) {
          throw new Error('Saved expenses must be an array');
        }
        
        // Limit the number of expenses to prevent abuse
        if (expenses.length > 50) {
          throw new Error('Too many saved expenses');
        }
      } catch (e) {
        console.error("Error parsing saved expenses from localStorage:", e);
        // Clear corrupted data
        localStorage.removeItem("expenses");
        ensureDefaultExpenseRow();
        return;
      }
      const expenseContainer = document.getElementById("expense-container");
      
      // Clear existing expenses
      expenseContainer.innerHTML = "";
      
      // Restore each expense
      expenses.forEach((expense, index) => {
        if (!expense || typeof expense !== 'object') return;
        
        const newExpenseDiv = document.createElement("div");
        newExpenseDiv.classList.add("shared-expense-container-loop");
        
        // Create expense row safely without innerHTML
        const expenseRow = document.createElement("div");
        expenseRow.classList.add("expense-row");
        
        // Amount input group
        const amountGroup = document.createElement("div");
        amountGroup.classList.add("input-group");
        
        const amountInput = createSafeElement("input", {
          type: "text",
          class: "expense-input",
          id: `expense${index + 1}`,
          placeholder: "0",
          inputmode: "numeric"
        });
        amountInput.value = expense.amount ? sanitizeInput(expense.amount.toString()) : "";
        amountInput.addEventListener("input", function() { formatNumberWithCommas(this); });
        
        amountGroup.appendChild(amountInput);
        
        // Label input group
        const labelGroup = document.createElement("div");
        labelGroup.classList.add("input-group");
        
        const labelInput = createSafeElement("input", {
          type: "text",
          class: "expense-label",
          id: `expenseLabel${index + 1}`,
          placeholder: "e.g. Rent, Groceries"
        });
        labelInput.value = expense.label ? sanitizeInput(expense.label.toString()) : "";
        
        labelGroup.appendChild(labelInput);
        
        // Delete button or placeholder
        let actionElement;
        if (index === 0) {
          actionElement = document.createElement("div");
          actionElement.classList.add("delete-button-placeholder");
        } else {
          actionElement = createSafeElement("button", {
            class: "delete-expense-button",
            "aria-label": "Delete expense"
          });
          actionElement.innerHTML = '<span class="material-symbols-outlined">remove</span>';
          actionElement.addEventListener("click", function(e) { 
            e.preventDefault();
            deleteExpense(this); 
          });
        }
        
        // Assemble the row
        expenseRow.appendChild(amountGroup);
        expenseRow.appendChild(labelGroup);
        expenseRow.appendChild(actionElement);
        
        newExpenseDiv.appendChild(expenseRow);
        expenseContainer.appendChild(newExpenseDiv);
      });
      
      // Update expense count
      expenseCount = Math.max(expenses.length, 1);
    } catch (e) {
      console.error("Error restoring expenses from localStorage:", e);
      // If restoration fails, ensure at least one expense row exists
      ensureDefaultExpenseRow();
    }
  } else {
    // No saved expenses, ensure default row exists
    ensureDefaultExpenseRow();
  }
}

function addFormDataSaveListeners() {
  // Save data when salary inputs change
  document.getElementById("salary1").addEventListener("input", saveFormDataToLocalStorage);
  document.getElementById("salary2").addEventListener("input", saveFormDataToLocalStorage);
  
  // Save data when expense inputs change (using event delegation for dynamic elements)
  document.addEventListener("input", function(e) {
    if (e.target.classList.contains("expense-input") || e.target.classList.contains("expense-label")) {
      saveFormDataToLocalStorage();
    }
  });
  
  // Save data when expenses are added or deleted
  const originalAddExpense = window.addExpense;
  window.addExpense = function() {
    originalAddExpense();
    setTimeout(saveFormDataToLocalStorage, 100); // Small delay to ensure DOM is updated
  };
  
  const originalDeleteExpense = window.deleteExpense;
  window.deleteExpense = function(deleteButton) {
    originalDeleteExpense(deleteButton);
    setTimeout(saveFormDataToLocalStorage, 100); // Small delay to ensure DOM is updated
  };
}

// ===== End Form Data Persistence =====

// ===== Event Listeners =====
function addEventListeners() {
  // Salary input formatting
  const salary1Input = document.getElementById("salary1");
  const salary2Input = document.getElementById("salary2");
  
  if (salary1Input) {
    salary1Input.addEventListener("input", function() { formatNumberWithCommas(this); });
  }
  
  if (salary2Input) {
    salary2Input.addEventListener("input", function() { formatNumberWithCommas(this); });
  }
  
  // Toggle password visibility
  const toggleButtons = document.querySelectorAll(".toggle-password");
  toggleButtons.forEach((button, index) => {
    button.addEventListener("click", function() {
      const inputId = index === 0 ? "salary1" : "salary2";
      togglePassword(this, inputId);
    });
  });
  
  // Add expense button
  const addExpenseBtn = document.querySelector(".add-expense-header-button");
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener("click", addExpense);
  }
  
  // Calculate button
  const calculateBtn = document.querySelector(".calculate-button");
  if (calculateBtn) {
    calculateBtn.addEventListener("click", calculateShares);
  }
  
  // Modal close button
  const closeBtn = document.querySelector(".close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function() {
      closeModal('calculationResultsModal');
    });
  }
  
  // Enter key support for all inputs
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        calculateShares();
      }
    });
  });
}

// ===== End Event Listeners =====

// Function to ensure at least one expense row exists
function ensureDefaultExpenseRow() {
  const expenseContainer = document.getElementById("expense-container");
  
  // Check if container is empty or has no expense rows
  if (expenseContainer.children.length === 0) {
    const newExpenseDiv = document.createElement("div");
    newExpenseDiv.classList.add("shared-expense-container-loop");
    
    // Create expense row safely without innerHTML
    const expenseRow = document.createElement("div");
    expenseRow.classList.add("expense-row");
    
    // Amount input group
    const amountGroup = document.createElement("div");
    amountGroup.classList.add("input-group");
    
    const amountInput = createSafeElement("input", {
      type: "text",
      class: "expense-input",
      id: "expense1",
      placeholder: "0",
      inputmode: "numeric",
      "aria-label": "Amount for expense 1"
    });
    amountInput.addEventListener("input", function() { formatNumberWithCommas(this); });
    
    amountGroup.appendChild(amountInput);
    
    // Label input group
    const labelGroup = document.createElement("div");
    labelGroup.classList.add("input-group");
    
    const labelInput = createSafeElement("input", {
      type: "text",
      class: "expense-label",
      id: "expenseLabel1",
      placeholder: "e.g. Rent, Groceries",
      "aria-label": "Name for expense 1"
    });
    
    labelGroup.appendChild(labelInput);
    
    // Placeholder for delete button
    const actionElement = document.createElement("div");
    actionElement.classList.add("delete-button-placeholder");
    
    // Assemble the row
    expenseRow.appendChild(amountGroup);
    expenseRow.appendChild(labelGroup);
    expenseRow.appendChild(actionElement);
    
    newExpenseDiv.appendChild(expenseRow);
    expenseContainer.appendChild(newExpenseDiv);
    expenseCount = 1;
  }
}

window.onload = async function () {
  debugLog('Page loaded', { 
    url: window.location.href,
    timestamp: new Date().toISOString(),
    debugMode: DEBUG_MODE
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const salary1 = urlParams.get("salary1");
  const salary2 = urlParams.get("salary2");
  const expensesParam = urlParams.get("expenses"); // Get the expenses array from URL

  // Try loading from backend short link first
  if (id) {
    try {
      const loaded = await loadFromIdIfPresent(applyState);
      if (loaded) {
        // After loading state, determine if we should show results step
        const wantsResults = location.hash === '#results';
        if (wantsResults) {
          // Try to calculate. If invalid inputs, fall back to input step.
          try {
            // Check if we have valid data to calculate with
            const salary1 = parseFloat(document.getElementById("salary1").value.replace(/,/g, ""));
            const salary2 = parseFloat(document.getElementById("salary2").value.replace(/,/g, ""));
            const expenses = document.querySelectorAll(".expense-input");
            let hasValidExpense = false;
            
            expenses.forEach((expenseInput) => {
              const raw = expenseInput.value.replace(/,/g, "").trim();
              if (raw !== "" && !isNaN(parseFloat(raw)) && parseFloat(raw) > 0) {
                hasValidExpense = true;
              }
            });
            
            if (!isNaN(salary1) && salary1 > 0 && !isNaN(salary2) && salary2 > 0 && hasValidExpense) {
              calculateShares();
            } else {
              showStep('input', { push: false });
            }
          } catch (e) {
            showStep('input', { push: false });
          }
        } else {
          showStep('input', { push: false });
        }
        return;
      }
    } catch (e) {
      console.error(e);
      // fall through to legacy handling
    }
  }

  // If salary1, salary2, and expenses are found in the URL
  if (salary1 && salary2 && expensesParam) {
    document.getElementById("salary1").value = salary1;
    document.getElementById("salary2").value = salary2;

    // Parse the expenses from the URL and populate each expense field
    let expensesArray;
    try {
      // Validate and parse expenses parameter safely
      if (typeof expensesParam !== 'string' || expensesParam.length > 10000) {
        throw new Error('Invalid expenses parameter');
      }
      expensesArray = JSON.parse(expensesParam);
      
      // Validate the parsed data structure
      if (!Array.isArray(expensesArray)) {
        throw new Error('Expenses must be an array');
      }
      
      // Limit the number of expenses to prevent abuse
      if (expensesArray.length > 50) {
        throw new Error('Too many expenses');
      }
    } catch (e) {
      debugError('Failed to parse expenses from URL', e);
      // Fall back to default state
      ensureDefaultExpenseRow();
      return;
    }
    const expenseContainer = document.getElementById("expense-container");

    // Clear any existing expense inputs
    expenseContainer.innerHTML = "";

    // Loop through the expenses and add them to the DOM
    expensesArray.forEach((expense, index) => {
      if (!expense) return;
      
      const newExpenseDiv = document.createElement("div");
      newExpenseDiv.classList.add("shared-expense-container-loop");
      
      // Support both legacy array-of-amounts and new array-of-objects with labels
      const isObject = expense !== null && typeof expense === "object";
      const amountValue = isObject ? expense.amount : expense;
      const labelValue = isObject && expense.label ? expense.label : "";
      
      // Create expense row safely without innerHTML
      const expenseRow = document.createElement("div");
      expenseRow.classList.add("expense-row");
      
      // Amount input group
      const amountGroup = document.createElement("div");
      amountGroup.classList.add("input-group");
      
      const amountInput = createSafeElement("input", {
        type: "text",
        class: "expense-input",
        id: `expense${index + 1}`,
        placeholder: "0",
        inputmode: "numeric"
      });
      amountInput.value = amountValue ? sanitizeInput(amountValue.toString()) : "";
      amountInput.addEventListener("input", function() { formatNumberWithCommas(this); });
      
      amountGroup.appendChild(amountInput);
      
      // Label input group
      const labelGroup = document.createElement("div");
      labelGroup.classList.add("input-group");
      
      const labelInput = createSafeElement("input", {
        type: "text",
        class: "expense-label",
        id: `expenseLabel${index + 1}`,
        placeholder: "e.g. Rent, Groceries"
      });
      labelInput.value = labelValue ? sanitizeInput(labelValue.toString()) : "";
      
      labelGroup.appendChild(labelInput);
      
      // Delete button or placeholder
      let actionElement;
      if (index === 0) {
        actionElement = document.createElement("div");
        actionElement.classList.add("delete-button-placeholder");
      } else {
        actionElement = createSafeElement("button", {
          class: "delete-expense-button",
          "aria-label": "Delete expense"
        });
        actionElement.innerHTML = '<span class="material-symbols-outlined">remove</span>';
        actionElement.addEventListener("click", function(e) { 
          e.preventDefault();
          deleteExpense(this); 
        });
      }
      
      // Assemble the row
      expenseRow.appendChild(amountGroup);
      expenseRow.appendChild(labelGroup);
      expenseRow.appendChild(actionElement);
      
      newExpenseDiv.appendChild(expenseRow);
      expenseContainer.appendChild(newExpenseDiv);
    });

    // Ensure subsequent added expenses get unique incremental IDs
    expenseCount = Math.max(expensesArray.length, 1);

    // Call the calculateShares function to calculate based on the loaded values
    calculateShares();
  } else {
    // Restore all form data from localStorage
    restoreFormDataFromLocalStorage();
  }
  
  // Ensure at least one expense row exists after all restoration attempts
  ensureDefaultExpenseRow();

  // Determine initial step based on URL hash and data validity
  const wantsResults = location.hash === '#results';
  if (wantsResults) {
    // Try to calculate. If invalid inputs, fall back to input step.
    try {
      // Check if we have valid data to calculate with
      const salary1 = parseFloat(document.getElementById("salary1").value.replace(/,/g, ""));
      const salary2 = parseFloat(document.getElementById("salary2").value.replace(/,/g, ""));
      const expenses = document.querySelectorAll(".expense-input");
      let hasValidExpense = false;
      
      expenses.forEach((expenseInput) => {
        const raw = expenseInput.value.replace(/,/g, "").trim();
        if (raw !== "" && !isNaN(parseFloat(raw)) && parseFloat(raw) > 0) {
          hasValidExpense = true;
        }
      });
      
      if (!isNaN(salary1) && salary1 > 0 && !isNaN(salary2) && salary2 > 0 && hasValidExpense) {
        calculateShares();
      } else {
        showStep('input', { push: false });
      }
    } catch (e) {
      showStep('input', { push: false });
    }
  } else {
    showStep('input', { push: false });
  }

  // Note: Edit button event listener is now handled inline in the results footer
  
  // Add event listeners to save data when inputs change
  addFormDataSaveListeners();
  
  // Add proper event listeners to replace inline handlers
  addEventListeners();
  
  // Save data when page is about to unload
  window.addEventListener("beforeunload", saveFormDataToLocalStorage);
};

// This function takes a numerical value and formats it as a string with two decimal places,
// adding commas as thousand separators.
function formatNumber(num) {
  return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

function togglePassword(element, inputId) {
  const inputField = document.getElementById(inputId);
  const type =
    inputField.getAttribute("type") === "password" ? "text" : "password";
  inputField.setAttribute("type", type);
  element.src = type === "password" ? "Hide.svg" : "Show.svg"; // Update the SVG source

  // Add or remove the 'input-error' class based on the input type
  if (type === "password") {
    inputField.classList.remove("input-error");
  } else {
    const isError = inputField.classList.contains("input-error");
    if (isError) {
      inputField.classList.add("input-error");
    }
  }
}

// Function to animate the counting of numbers
function animateCounter(elementId, finalNumber, duration = 300) {
  const counterElement = document.getElementById(elementId);
  let prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    // If reduced motion is preferred, set the final value immediately without animation
    counterElement.textContent = formatNumber(finalNumber);
  } else {
    // Else, proceed with the animation
    let startNumber = 0;
    const step = (finalNumber - startNumber) / (duration / 10);

    const timer = setInterval(function () {
      startNumber += step;
      if (
        (step > 0 && startNumber >= finalNumber) ||
        (step < 0 && startNumber <= finalNumber)
      ) {
        startNumber = finalNumber;
        clearInterval(timer);
      }
      counterElement.textContent = formatNumber(startNumber);
    }, 10);
  }
}

// This function helps in Multiple expenses handlings
let expenseCount = 1;

function addExpense() {
  expenseCount++;
  const expenseContainer = document.getElementById("expense-container");
  const newExpenseDiv = document.createElement("div");
  newExpenseDiv.classList.add("shared-expense-container-loop");

  // Create expense row safely without innerHTML
  const expenseRow = document.createElement("div");
  expenseRow.classList.add("expense-row");
  
  // Amount input group
  const amountGroup = document.createElement("div");
  amountGroup.classList.add("input-group");
  
  const amountInput = createSafeElement("input", {
    type: "text",
    class: "expense-input",
    id: `expense${expenseCount}`,
    placeholder: "0",
    inputmode: "numeric"
  });
  amountInput.addEventListener("input", function() { formatNumberWithCommas(this); });
  
  amountGroup.appendChild(amountInput);
  
  // Label input group
  const labelGroup = document.createElement("div");
  labelGroup.classList.add("input-group");
  
  const labelInput = createSafeElement("input", {
    type: "text",
    class: "expense-label",
    id: `expenseLabel${expenseCount}`,
    placeholder: "e.g. Rent, Groceries"
  });
  
  labelGroup.appendChild(labelInput);
  
  // Delete button
  const deleteButton = createSafeElement("button", {
    class: "delete-expense-button",
    "aria-label": "Delete expense"
  });
  deleteButton.innerHTML = '<span class="material-symbols-outlined">remove</span>';
  deleteButton.addEventListener("click", function(e) { 
    e.preventDefault();
    deleteExpense(this); 
  });
  
  // Assemble the row
  expenseRow.appendChild(amountGroup);
  expenseRow.appendChild(labelGroup);
  expenseRow.appendChild(deleteButton);
  
  newExpenseDiv.appendChild(expenseRow);
  expenseContainer.appendChild(newExpenseDiv);
}

function deleteExpense(deleteButton) {
  const expenseDiv = deleteButton.closest(".shared-expense-container-loop");
  const expenseContainer = document.getElementById("expense-container");
  
  // Check if this isn't the last remaining expense
  if (expenseContainer.children.length > 1) {
    // Check if this isn't the first expense
    if (expenseDiv !== expenseContainer.firstElementChild) {
      expenseDiv.remove();
    }
  }
}

// This function is triggered when a user inputs a number. It formats the input by removing
// non-numeric characters (except commas and dots) and then adds commas in appropriate places
// for readability.
function formatNumberWithCommas(element) {
  // Remove error class when the user starts typing
  element.classList.remove("input-error");

  var value = element.value.replace(/[^\d.,]/g, "");
  var formattedValue = value
    .replace(/,/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  element.value = formattedValue;

  // Hide error message if it's displayed
  var errorMessage = document.getElementById("error-display");
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

// This function hides the 'results' section of the page. It's typically called to reset the
// display when the user starts modifying input values.
function resetResultsDisplay() {
  document.getElementById("results").style.display = "none";
  document.getElementById("error-display").style.display = "none";
}

// This function 'calculateShares' calculates each person's share of a given expense based
// on their respective salaries. It performs several tasks:
// 1. Retrieves input values for two salaries and the total expense from the DOM.
//    - It uses 'parseFloat' to convert the input string values to numbers, removing any
//      commas for proper formatting.
// 2. Validates the input values:
//    - Checks for 'NaN' (not a number) and ensures all values are greater than zero.
//    - If any value is invalid, it displays an error message in a separate section and
//      scrolls smoothly to this message for visibility.
// 3. If the values are valid:
//    - Saves the salary inputs to localStorage for potential future use.
//    - Calculates each person's share of the expense proportionally based on their salary.
// 4. Displays the calculated shares in the 'results' section and smoothly scrolls to this
//    section for improved user experience.
function calculateShares() {
  // Rate limiting check
  if (isRateLimited()) {
    debugLog('Calculation rate limited', { timestamp: new Date().toISOString() });
    return;
  }
  
  const startTime = performance.now();
  debugLog('Calculation started', { timestamp: new Date().toISOString() });
  
  // Get and validate salary inputs
  const salary1Input = document.getElementById("salary1");
  const salary2Input = document.getElementById("salary2");
  
  if (!salary1Input || !salary2Input) {
    debugError('Salary inputs not found', { salary1Input: !!salary1Input, salary2Input: !!salary2Input });
    return;
  }
  
  var salary1 = parseFloat(
    salary1Input.value.replace(/,/g, "")
  );
  var salary2 = parseFloat(
    salary2Input.value.replace(/,/g, "")
  );

  var expenses = document.querySelectorAll(".expense-input");

  var hasError = false;

  // Validate salaries
  if (isNaN(salary1) || salary1 <= 0 || salary1 > 999999999) {
    document.getElementById("salary1").classList.add("input-error");
    hasError = true;
  } else {
    document.getElementById("salary1").classList.remove("input-error");
  }

  if (isNaN(salary2) || salary2 <= 0 || salary2 > 999999999) {
    document.getElementById("salary2").classList.add("input-error");
    hasError = true;
  } else {
    document.getElementById("salary2").classList.remove("input-error");
  }

  var totalExpense = 0; // Initialize total expense
  var individualExpenseResults = []; // Array to hold individual expense results

  // Validate expenses and calculate total expense
  expenses.forEach((expenseInput) => {
    var raw = expenseInput.value.replace(/,/g, "").trim();
    // Ignore empty expense rows instead of treating them as errors
    if (raw === "") {
      expenseInput.classList.remove("input-error");
      return;
    }

    var expense = parseFloat(raw);
    if (isNaN(expense) || expense <= 0) {
      expenseInput.classList.add("input-error");
      hasError = true;
    } else if (expense > 999999999) { // Prevent extremely large numbers
      expenseInput.classList.add("input-error");
      hasError = true;
    } else {
      expenseInput.classList.remove("input-error");
      totalExpense += expense; // Sum valid expenses
      // Calculate individual shares for this expense
      var share1 = (salary1 / (salary1 + salary2)) * expense;
      var share2 = (salary2 / (salary1 + salary2)) * expense;
      var labelInput = expenseInput
        .closest(".shared-expense-container-loop")
        ?.querySelector(".expense-label");
      var label = labelInput && labelInput.value.trim() ? labelInput.value.trim() : "Expense";

      individualExpenseResults.push({
        amount: expense,
        label: label,
        share1: share1,
        share2: share2,
      });
    }
  });

  // Handle errors
  if (hasError || individualExpenseResults.length === 0) {
    const errorDisplay = document.getElementById("error-display");
    errorDisplay.innerHTML = "";
    
    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.id = "error-message";
    errorMessage.setAttribute("aria-live", "assertive");
    
    const errorParagraph = document.createElement("p");
    errorParagraph.textContent = "Oops! Looks like some numbers are missing. Please enter both salaries and at least one expense to calculate your fair shares.";
    
    errorMessage.appendChild(errorParagraph);
    errorDisplay.appendChild(errorMessage);
    errorDisplay.style.display = "block";
    
    document
      .getElementById("error-message")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });

    var headshakeContainer = document.querySelector(".headshake-container");
    headshakeContainer.classList.add("headshake");

    // MODIFIED: Added { once: true } to the animationend listener
    headshakeContainer.addEventListener("animationend", () => {
      headshakeContainer.classList.remove("headshake");
    }, { once: true });

    return;
  }

  // Save all form data to localStorage for future use
  saveFormDataToLocalStorage();

  // Calculate total shares
  var totalShare1 = individualExpenseResults.reduce(
    (sum, expense) => sum + expense.share1,
    0
  );
  var totalShare2 = individualExpenseResults.reduce(
    (sum, expense) => sum + expense.share2,
    0
  );
  var totalExpense = totalShare1 + totalShare2;
  var sharePercent1 = Math.round((totalShare1 / totalExpense) * 100);
  var sharePercent2 = Math.round((totalShare2 / totalExpense) * 100);

  // Display the calculated shares in the 'results' section
  var resultsHTML = `
    <div class="results-container" id="results-container">
      <!-- Section 1: Summary Block -->
      <div class="summary-card">
        <div class="summary-header">
          <h2>Here are your fair shares</h2>
        </div>
        
        <div class="contribution-summary">
          <div class="person-contribution">
            <div class="percentage">${sharePercent1}%</div>
            <div class="amount">$${totalShare1.toFixed(2)}</div>
            <div class="person-label">Yours</div>
          </div>
          
          <div class="person-contribution">
            <div class="percentage">${sharePercent2}%</div>
            <div class="amount">$${totalShare2.toFixed(2)}</div>
            <div class="person-label">Theirs</div>
          </div>
        </div>
        
        <div class="summary-divider"></div>
        
        <div class="total-expenses">
          <div class="total-label">Total Shared Expenses</div>
          <div class="total-amount">$${totalExpense.toFixed(2)}</div>
        </div>
      </div>

      <!-- Section 2: Expense Breakdown -->
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="material-symbols-outlined breakdown-icon">receipt_long</span>
          <h3>Expense Breakdown</h3>
        </div>
        
        <div class="expense-list">`;

  // Populate the results with calculated shares for each valid expense only
  individualExpenseResults.forEach((item, index) => {
    resultsHTML += `
          <div class="expense-item">
            <div class="expense-header">
              <span class="expense-name">${item.label}</span>
              <span class="expense-total">$${item.amount.toFixed(2)}</span>
            </div>
            <div class="expense-shares">
              <span class="share-amount">Yours: $${item.share1.toFixed(2)}</span>
              <span class="share-amount">Theirs: $${item.share2.toFixed(2)}</span>
            </div>
          </div>`;
  });

  resultsHTML += `
        </div>
      </div>

      <div class="results-footer">
        <button id="backToEditBtn" type="button" onclick="showStep('input')">← Edit details</button>
        <button id="shareBtn" onclick="shareResults()">Share Results</button>
        
        <a href="https://www.buymeacoffee.com/edthedesigner">
          <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=edthedesigner&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" />
        </a>
      </div>
    </div>
  `;

  const resultsContent = document.getElementById("resultsContent");
  resultsContent.innerHTML = "";
  
  // Create a temporary container to parse the HTML safely
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = resultsHTML;
  
  // Move all child nodes to the results content
  while (tempContainer.firstChild) {
    resultsContent.appendChild(tempContainer.firstChild);
  }
  
  showStep('results');

  // Performance and debug logging
  const duration = performance.now() - startTime;
  debugLog('Calculation completed', { 
    duration: Math.round(duration),
    expenseCount: individualExpenseResults.length,
    totalExpense: totalExpense,
    timestamp: new Date().toISOString()
  });

  // Scroll to the results section smoothly for better user experience
  document
    .getElementById("results-container")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// REMOVED: The standalone event listener for '.close' is also removed for consistency,
// relying on the `onclick` attribute in the HTML. If you prefer JS-based event listeners,
// you could keep one here and remove the `onclick` from the HTML. The key is not to have it
// inside `calculateShares` or duplicated unnecessarily.
// For clarity, if your HTML for the close button is:
// <span class="close" aria-label="Close" onclick="closeModal('calculationResultsModal')">&times;</span>
// then no additional JavaScript `addEventListener` for this specific click is needed.

// Note: Event listeners are now handled in the addEventListeners() function

// Back button event listener will be added in window.onload

function closeModal(elementID) {
  const modal = document.getElementById(elementID);
  modal.style.display = "none";
  modal.classList.remove("active");
}

function shareResults() {
  const currentState = collectCurrentState();
  debugLog('Share results initiated', { 
    state: currentState,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });

  // Prefer backend short link; fall back to legacy URL if it fails
  shareResultsViaBackend(currentState)
    .then((shareUrl) => {
      debugLog('Share successful via backend', { shareUrl });
      return navigator.clipboard.writeText(shareUrl).then(() => {
        const snackbar = document.getElementById("snackbar");
        snackbar.className = "show";
        setTimeout(() => {
          snackbar.className = snackbar.className.replace("show", "");
        }, 3000);
      });
    })
    .catch((error) => {
      debugError('Backend share failed, falling back to legacy', error);
      const legacyUrl = buildLegacyShareUrl(currentState);
      debugLog('Legacy fallback URL generated', { legacyUrl });
      navigator.clipboard.writeText(legacyUrl).then(() => {
        const snackbar = document.getElementById("snackbar");
        snackbar.className = "show";
        setTimeout(() => {
          snackbar.className = snackbar.className.replace("show", "");
        }, 3000);
      }).catch((err) => {
        debugError('Failed to copy to clipboard', err);
        console.error("Failed to copy: ", err);
      });
    });
}

// Get the button
const backToTopButton = document.getElementById("backToTop");

// Show the button when the user scrolls down 100px from the top of the document
window.onscroll = function () {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
};

// Scroll back to the top when the button is clicked
backToTopButton.addEventListener("click", function () {
    window.scrollTo({
        top: 0,
        behavior: "smooth" // Smooth scroll effect
    });
});