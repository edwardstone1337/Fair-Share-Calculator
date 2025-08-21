// ===== Backend share integration (Cloudflare Worker) =====
const API_BASE = "https://tight-firefly-c0dd.edwardstone1337.workers.dev";

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
  return { salary1, salary2, expenses };
}

function applyState(state) {
  if (!state) return;
  if (state.salary1) document.getElementById("salary1").value = state.salary1;
  if (state.salary2) document.getElementById("salary2").value = state.salary2;
  if (Array.isArray(state.expenses)) {
    const expenseContainer = document.getElementById("expense-container");
    expenseContainer.innerHTML = "";
    state.expenses.forEach((expense, index) => {
      const newExpenseDiv = document.createElement("div");
      newExpenseDiv.classList.add("shared-expense-container-loop");
      const amountValue = expense?.amount ?? "";
      const labelValue = expense?.label ?? "";
      const deleteLink = index === 0 ? '' : `
        <a href="#" class="delete-expense-link" onclick="deleteExpense(this); return false;">
          Delete expense
        </a>
      `;
      newExpenseDiv.innerHTML = `
        <div class="expense-row">
          <div class="input-group">
            <input
              type="text"
              class="expense-input"
              id="expense${index + 1}"
              placeholder="0"
              inputmode="numeric"
              value="${amountValue}"
              oninput="formatNumberWithCommas(this)"
            />
          </div>
          <div class="input-group">
            <input
              type="text"
              class="expense-label"
              id="expenseLabel${index + 1}"
              placeholder="e.g. Rent, Groceries"
              value="${labelValue}"
            />
          </div>
        </div>
        ${deleteLink}
      `;
      expenseContainer.appendChild(newExpenseDiv);
    });
    expenseCount = Math.max(state.expenses.length, 1);
  }
  calculateShares();
}

async function shareResultsViaBackend(currentState) {
  const res = await fetch(`${API_BASE}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentState),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Share failed");
  return `${location.origin}${location.pathname}?id=${data.id}`;
}

async function loadFromIdIfPresent(apply) {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return false;
  const res = await fetch(`${API_BASE}/share/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Load failed");
  apply(data);
  return true;
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
window.onload = async function () {
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
    const expensesArray = JSON.parse(expensesParam); // Parse the expenses array
    const expenseContainer = document.getElementById("expense-container");

    // Clear any existing expense inputs
    expenseContainer.innerHTML = "";

    // Loop through the expenses and add them to the DOM
    expensesArray.forEach((expense, index) => {
      const newExpenseDiv = document.createElement("div");
      newExpenseDiv.classList.add("shared-expense-container-loop");
      
      // Support both legacy array-of-amounts and new array-of-objects with labels
      const isObject = expense !== null && typeof expense === "object";
      const amountValue = isObject ? expense.amount : expense;
      const labelValue = isObject && expense.label ? expense.label : "";
      
      // Only add delete link if it's not the first expense
      const deleteLink = index === 0 ? '' : `
        <a href="#" class="delete-expense-link" onclick="deleteExpense(this); return false;">
          Delete expense
        </a>
      `;

      newExpenseDiv.innerHTML = `
        <div class="expense-row">
          <div class="input-group">
            <input
              type="text"
              class="expense-input"
              id="expense${index + 1}"
              placeholder="0"
              inputmode="numeric"
              value="${amountValue}"
              oninput="formatNumberWithCommas(this)"
            />
          </div>
          <div class="input-group">
            <input
              type="text"
              class="expense-label"
              id="expenseLabel${index + 1}"
              placeholder="e.g. Rent, Groceries"
              value="${labelValue}"
            />
          </div>
        </div>
        ${deleteLink}
      `;
      expenseContainer.appendChild(newExpenseDiv);
    });

    // Ensure subsequent added expenses get unique incremental IDs
    expenseCount = Math.max(expensesArray.length, 1);

    // Call the calculateShares function to calculate based on the loaded values
    calculateShares();
  } else {
    // Existing localStorage code for salary fields
    if (localStorage.getItem("salary1")) {
      document.getElementById("salary1").value =
        localStorage.getItem("salary1");
    }
    if (localStorage.getItem("salary2")) {
      document.getElementById("salary2").value =
        localStorage.getItem("salary2");
    }
  }
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

  newExpenseDiv.innerHTML = `
    <div class="expense-row">
      <div class="input-group">
        <input
          type="text"
          class="expense-input"
          id="expense${expenseCount}"
          placeholder="0"
          inputmode="numeric"
          oninput="formatNumberWithCommas(this)"
        />
      </div>
      <div class="input-group">
        <input
          type="text"
          class="expense-label"
          id="expenseLabel${expenseCount}"
          placeholder="e.g. Rent, Groceries"
        />
      </div>
    </div>
    <a href="#" class="delete-expense-link" onclick="deleteExpense(this); return false;">
      Delete expense
    </a>
  `;

  expenseContainer.appendChild(newExpenseDiv);
}

function deleteExpense(deleteLink) {
  const expenseDiv = deleteLink.closest(".shared-expense-container-loop");
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
  var salary1 = parseFloat(
    document.getElementById("salary1").value.replace(/,/g, "")
  );
  var salary2 = parseFloat(
    document.getElementById("salary2").value.replace(/,/g, "")
  );

  var expenses = document.querySelectorAll(".expense-input");

  var hasError = false;

  // Validate salaries
  if (isNaN(salary1) || salary1 <= 0) {
    document.getElementById("salary1").classList.add("input-error");
    hasError = true;
  } else {
    document.getElementById("salary1").classList.remove("input-error");
  }

  if (isNaN(salary2) || salary2 <= 0) {
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
    } else {
      expenseInput.classList.remove("input-error");
      totalExpense += expense; // Sum valid expenses
      // Calculate individual shares for this expense
      var share1 = (salary1 / (salary1 + salary2)) * expense;
      var share2 = (salary2 / (salary1 + salary2)) * expense;
      var labelInput = expenseInput
        .closest(".shared-expense-container-loop")
        ?.querySelector(".expense-label");
      var label = labelInput && labelInput.value ? labelInput.value : "Expense";

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
    document.getElementById("error-display").innerHTML = `
      <div class="error-message" id="error-message" aria-live="assertive">
          <p>Oops! Looks like some numbers are missing. Please enter both salaries and at least one expense to calculate your fair shares.</p>
      </div>
    `;
    document.getElementById("error-display").style.display = "block";
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

  // Save formatted salaries to localStorage for future use
  localStorage.setItem("salary1", document.getElementById("salary1").value);
  localStorage.setItem("salary2", document.getElementById("salary2").value);

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
    <div class="share-container" id="share-container">
      <div class="share-container-text">
        <h2 class="mb-15">Here are your fair shares</h2>
      </div>
      <div class="resultTable text-left">
        <div class="d-flex space-between">
          <div class="resultTableHead"><label>Expenses</label></div>
          <div class="resultTableHead"><label>Your Share</label></div>
          <div class="resultTableHead"><label>Their Share</label></div>
        </div>`;

  // Populate the results with calculated shares for each valid expense only
  individualExpenseResults.forEach((item) => {
    resultsHTML += `
      <div class="d-flex space-between">
        <div class="resultTabledata">
          <div class="expense-amount">${item.amount.toFixed(2)}</div>
          <div class="expense-label-text">${item.label}</div>
        </div>
        <div class="resultTabledata">${item.share1.toFixed(2)}</div>
        <div class="resultTabledata">${item.share2.toFixed(2)}</div>
      </div>`;
  });

  resultsHTML += `
      <div class="d-flex space-between">
        <div class="resultTableHead"><label>Total</label></div>
        <div class="resultTableHead"><label>Your Share</label></div>
        <div class="resultTableHead"><label>Their Share</label></div>
      </div>
      <div class="d-flex space-between">
        <div class="resultTabledata">${(totalShare1 + totalShare2).toFixed(2)}</div>
        <div class="resultTabledata">${totalShare1.toFixed(2)}</div>
        <div class="resultTabledata">${totalShare2.toFixed(2)}</div>
      </div>
    </div>
    <p class="fs-14"><strong>You earn ${salary1}</strong>, and the <strong>other person earns ${salary2}.</strong></br>
      <strong>You contribute ${sharePercent1}%</strong>, and <strong>they contribute ${sharePercent2}%.</strong>
      These percentages are used to split the expense(s) proportionally, ensuring a fair contribution from each person.</p>
    <button id="shareBtn" onclick="shareResults()">Share</button>

    <button type="button" id="closeResultsModalBtn" onclick="closeModal('calculationResultsModal')">Close</button>
    
    <a href="https://www.buymeacoffee.com/edthedesigner" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
  `;

  document.getElementById("resultsContent").innerHTML = resultsHTML;
  const modal = document.getElementById("calculationResultsModal");
  modal.style.display = "flex";
  modal.classList.add("active");

  // REMOVED: The problematic event listener for '.close' that was previously here.
  // The HTML 'onclick' attribute or the single event listener added on page load will handle it.

  // Scroll to the results section smoothly for better user experience
  document
    .getElementById("share-container")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// REMOVED: The standalone event listener for '.close' is also removed for consistency,
// relying on the `onclick` attribute in the HTML. If you prefer JS-based event listeners,
// you could keep one here and remove the `onclick` from the HTML. The key is not to have it
// inside `calculateShares` or duplicated unnecessarily.
// For clarity, if your HTML for the close button is:
// <span class="close" aria-label="Close" onclick="closeModal('calculationResultsModal')">&times;</span>
// then no additional JavaScript `addEventListener` for this specific click is needed.

// Trigger 'calculate-button' click on pressing 'Enter' in any input field
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      calculateShares(); // Call the function directly instead of clicking the button
    }
  });
});

function closeModal(elementID) {
  const modal = document.getElementById(elementID);
  modal.style.display = "none";
  modal.classList.remove("active");
}

function shareResults() {
  const currentState = collectCurrentState();

  // Prefer backend short link; fall back to legacy URL if it fails
  shareResultsViaBackend(currentState)
    .then((shareUrl) => {
      return navigator.clipboard.writeText(shareUrl).then(() => {
        const snackbar = document.getElementById("snackbar");
        snackbar.className = "show";
        setTimeout(() => {
          snackbar.className = snackbar.className.replace("show", "");
        }, 3000);
      });
    })
    .catch(() => {
      const legacyUrl = buildLegacyShareUrl(currentState);
      navigator.clipboard.writeText(legacyUrl).then(() => {
        const snackbar = document.getElementById("snackbar");
        snackbar.className = "show";
        setTimeout(() => {
          snackbar.className = snackbar.className.replace("show", "");
        }, 3000);
      }).catch((err) => {
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