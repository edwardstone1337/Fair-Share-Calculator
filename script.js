// This section is responsible for loading previously saved salary values from localStorage
// when the window is loaded. It checks if the values for 'salary1' and 'salary2' exist in
// localStorage and, if so, sets those values in the respective input fields on the web page.
window.onload = function () {
  if (localStorage.getItem("salary1")) {
    document.getElementById("salary1").value = localStorage.getItem("salary1");
  }
  if (localStorage.getItem("salary2")) {
    document.getElementById("salary2").value = localStorage.getItem("salary2");
  }
};

// This function takes a numerical value and formats it as a string with two decimal places,
// adding commas as thousand separators.
function formatNumber(num) {
  return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
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
  var expense = parseFloat(
    document.getElementById("expense").value.replace(/,/g, "")
  );

  var hasError = false;

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

  if (isNaN(expense) || expense <= 0) {
    document.getElementById("expense").classList.add("input-error");
    hasError = true;
  } else {
    document.getElementById("expense").classList.remove("input-error");
  }

  if (hasError) {
    document.getElementById("error-display").innerHTML = `
            <div class="error-message" id="error-message" aria-live="assertive">
                <p>Oops! Looks like some numbers are missing. We need all of them to calculate your fair shares.</p>
            </div>
        `;
    document.getElementById("error-display").style.display = "block";
    document
      .getElementById("error-message")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Add headshake animation
    var headshakeContainer = document.querySelector(".headshake-container");
    headshakeContainer.classList.add("headshake");

    // Remove the animation class after it's done
    headshakeContainer.addEventListener("animationend", () => {
      headshakeContainer.classList.remove("headshake");
    });

    return;
  }

  // Save formatted salaries to localStorage for future use
  localStorage.setItem("salary1", document.getElementById("salary1").value);
  localStorage.setItem("salary2", document.getElementById("salary2").value);

  // Calculate each person's share of the expense
  var totalSalary = salary1 + salary2;
  var share1 = (salary1 / totalSalary) * expense;
  var share2 = (salary2 / totalSalary) * expense;

  // Display the calculated shares in the 'results' section
  document.getElementById("results").innerHTML = `
  <div class="share-container" id="share-container">
  <div class="share-container-text">
  <h2>Ta-Da!</h2>
  <p>Here are your fair shares:</p>
</div>
      <div class="share-container-boxes">
          <div class="share">
              <div class="share-title">Your Share</div>
              <div class="share-value" id="share1-placeholder"></div>
          </div>
          <div class="share">
              <div class="share-title">Partner's Share</div>
              <div class="share-value" id="share2-placeholder"></div>
          </div>
      </div>
  </div>
`;
  document.getElementById("results").style.display = "block";

  // Animate the shares
  animateCounter("share1-placeholder", share1, 300);
  animateCounter("share2-placeholder", share2, 300);

  // Animate the shares
  animateCounter("share1-placeholder", share1, 300);
  animateCounter("share2-placeholder", share2, 300);

  // Scroll to the results section smoothly for better user experience
  document
    .getElementById("share-container")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener('DOMContentLoaded', function() {
  // Get the modal
  var modal = document.getElementById('myModal');

  // Get the button that opens the modal
  var btn = document.getElementById('howitworksBtn');

  // Get the button that closes the modal
  var closemodalLarge = document.getElementById('closemodalLarge');

  // Get the span that closes the modal
  var closeSpan = document.getElementsByClassName('close')[0]; // Assuming it's the first element with class 'close'

  // When the user clicks on the button, open the modal 
  btn.onclick = function() {
      modal.style.display = "block";
      modal.scrollTop = 0;  // Reset scroll position to the top of the modal
  }

  // Function to close the modal
  function closeModal() {
      modal.style.display = "none";
  }

  // When the user clicks on the close button, close the modal
  closemodalLarge.onclick = closeModal;

  // When the user clicks on the close span (x), close the modal
  closeSpan.onclick = closeModal;

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
      if (event.target == modal) {
          closeModal();
      }
  }
});


