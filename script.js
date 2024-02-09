window.onload = function() {
    if (localStorage.getItem('salary1')) {
        document.getElementById('salary1').value = localStorage.getItem('salary1');
    }
    if (localStorage.getItem('salary2')) {
        document.getElementById('salary2').value = localStorage.getItem('salary2');
    }
}

function calculateShares() {
    var salary1 = parseFloat(document.getElementById('salary1').value);
    var salary2 = parseFloat(document.getElementById('salary2').value);
    var expense = parseFloat(document.getElementById('expense').value);

    // Check for invalid or empty inputs
    if (isNaN(salary1) || isNaN(salary2) || isNaN(expense) || salary1 <= 0 || salary2 <= 0 || expense <= 0) {
        document.getElementById('results').innerHTML = `
            <div class="error-message" id="error-message">
                <p>Oops! Looks like some numbers are missing. We need all of them to calculate your fair shares</p>
            </div>
        `;

        // Scroll to the error message
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
                    <div class="share-value">${share1.toFixed(2)}</div>
                </div>
                <div class="share">
                    <div class="share-title">Partner's Share</div>
                    <div class="share-value">${share2.toFixed(2)}</div>
                </div>
            </div>
        </div>
    `;

    // Scroll to the share container
    document.getElementById('share-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}