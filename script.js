window.onload = function() {
    if (localStorage.getItem('salary1')) {
        document.getElementById('salary1').value = localStorage.getItem('salary1');
    }
    if (localStorage.getItem('salary2')) {
        document.getElementById('salary2').value = localStorage.getItem('salary2');
    }
}

function formatNumber(num) {
    return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatNumberWithCommas(input) {
    // Remove non-numeric characters except for commas and dots
    var value = input.value.replace(/[^\d.,]/g, '');

    // Remove existing commas, then reformat with commas in the correct positions
    var formattedValue = value.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    input.value = formattedValue;
}

function calculateShares() {
    var salary1 = parseFloat(document.getElementById('salary1').value.replace(/,/g, ''));
    var salary2 = parseFloat(document.getElementById('salary2').value.replace(/,/g, ''));
    var expense = parseFloat(document.getElementById('expense').value.replace(/,/g, ''));

    // Check for invalid or empty inputs
    if (isNaN(salary1) || isNaN(salary2) || isNaN(expense) || salary1 <= 0 || salary2 <= 0 || expense <= 0) {
        document.getElementById('results').innerHTML = `
            <div class="error-message" id="error-message">
                <p>Oops! Looks like some numbers are missing. We need all of them to calculate your fair shares.</p>
            </div>
        `;
        document.getElementById('error-message').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    // Save salaries to localStorage
    localStorage.setItem('salary1', salary1);
    localStorage.setItem('salary2', salary2);

    var totalSalary = salary1 + salary2;
    var share1 = (salary1 / totalSalary) * expense;
    var share2 = (salary2 / totalSalary) * expense;

    document.getElementById('results').innerHTML = `
        <div class="share-container" id="share-container">
            <div class="share-container-text">
                <h2>Ta-da! 🌟</h2>
                <p>Here are your fair shares.</p>
            </div>
            <div class="share-container-boxes">
                <div class="share">
                    <div class="share-title">Your Share</div>
                    <div class="share-value">${formatNumber(share1)}</div>
                </div>
                <div class="share">
                    <div class="share-title">Partner's Share</div>
                    <div class="share-value">${formatNumber(share2)}</div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('share-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

