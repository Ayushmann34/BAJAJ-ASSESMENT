// script.js

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const jsonInput = document.getElementById('jsonInput');
    const jsonOutput = document.getElementById('jsonOutput');
    const errorMsg = document.getElementById('errorMsg');

    submitBtn.addEventListener('click', async () => {
        // Clear previous outputs
        errorMsg.classList.add('hidden');
        jsonOutput.textContent = 'Processing...';

        const inputText = jsonInput.value.trim();

        // Validate JSON format on the client side before sending
        let parsedData;
        try {
            parsedData = JSON.parse(inputText);
            if (!parsedData.data || !Array.isArray(parsedData.data)) {
                throw new Error('Input must be a JSON object with a "data" array.');
            }
        } catch (err) {
            showError('Invalid JSON format: ' + err.message);
            jsonOutput.textContent = 'Response will appear here...';
            return;
        }

        try {
            // Call the backend API
            const response = await fetch('/bfhl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(parsedData)
            });

            // Parse response
            const result = await response.json();

            // Display formatted output
            jsonOutput.textContent = JSON.stringify(result, null, 2);

            // Handle HTTP errors
            if (!response.ok) {
                showError(result.error || 'An error occurred while processing the request.');
            }

        } catch (err) {
            showError('Failed to connect to the server. Is the backend running?');
            jsonOutput.textContent = 'Response will appear here...';
            console.error(err);
        }
    });

    // Helper to show error messages
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }
});
