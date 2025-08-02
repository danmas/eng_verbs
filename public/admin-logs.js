document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counterEl = document.getElementById('counter');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const logView = document.getElementById('log-view');

    const promptArea = document.getElementById('prompt-area');
    const rawRequestArea = document.getElementById('raw-request-area');
    const contentArea = document.getElementById('content-area');
    const rawResponseArea = document.getElementById('raw-response-area');

    let logs = [];
    let currentIndex = 0;

    async function fetchLogs() {
        try {
            const response = await fetch('/api/admin/ai-logs');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.success) {
                logs = data.logs;
                if (logs.length > 0) {
                    currentIndex = 0;
                    displayLog(currentIndex);
                    logView.style.display = 'grid';
                } else {
                    showError('Логов пока нет. Выполните действие, использующее AI.');
                }
            } else {
                showError(data.error || 'Не удалось загрузить логи.');
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            showError('Ошибка при загрузке логов. Проверьте консоль сервера.');
        } finally {
            loader.style.display = 'none';
        }
    }

    function displayLog(index) {
        if (index < 0 || index >= logs.length) return;

        const { request, response } = logs[index];

        // Request
        promptArea.value = request.prompt || 'N/A';
        rawRequestArea.value = JSON.stringify(request, null, 2);
        
        // Response
        if (response.content) {
            // Unescape newlines for readability
            contentArea.value = response.content.replace(/\\n/g, '\n');
        } else if (response.error) {
            contentArea.value = `ERROR: ${response.error}\n\n${JSON.stringify(response.details, null, 2) || ''}`;
        } else {
            contentArea.value = 'N/A';
        }

        rawResponseArea.value = JSON.stringify(response, null, 2);

        updateNavigation();
    }

    function updateNavigation() {
        counterEl.textContent = `Запись ${currentIndex + 1} из ${logs.length}`;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === logs.length - 1;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        logView.style.display = 'none';
    }

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            displayLog(currentIndex);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < logs.length - 1) {
            currentIndex++;
            displayLog(currentIndex);
        }
    });

    fetchLogs();
});
