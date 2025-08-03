// Admin Panel JavaScript
let currentStory = null;
let currentSectionNumber = 1;
let verbDatabase = {};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    loadExistingStories();
    setupEventListeners();
    initializeVerbDatabase();
    initializeAIConfig();
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('back-to-app').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    document.getElementById('new-story').addEventListener('click', createNewStory);
    document.getElementById('back-to-list').addEventListener('click', showStoryList);
    
    // Editor actions
    document.getElementById('save-story').addEventListener('click', handleSaveStory);
    document.getElementById('preview-story').addEventListener('click', previewStory);
    
    // Modal actions
    document.getElementById('close-preview').addEventListener('click', closePreview);
    document.getElementById('test-story').addEventListener('click', testStory);
    
    // Editor toolbar
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', handleToolbarAction);
    });
    
    // Text editor events
    const textEditor = document.getElementById('text-editor');
    textEditor.addEventListener('input', updateVerbManager);
    textEditor.addEventListener('paste', handlePaste);
    
    // AI configuration events
    document.getElementById('save-ai-model').addEventListener('click', saveAIModel);
    document.getElementById('refresh-models').addEventListener('click', loadAIModels);
    document.getElementById('ai-model-select').addEventListener('change', onModelSelectionChange);
    
    // MD Editor events
    setupMDEditor();
}

// Load existing stories
async function loadExistingStories() {
    const storiesContainer = document.getElementById('existing-stories');
    
    try {
        const response = await fetch('/api/stories');
        if (!response.ok) throw new Error('Failed to load stories');
        
        const stories = await response.json();
        
        if (stories.length === 0) {
            storiesContainer.innerHTML = '<div class="no-stories">Пока нет созданных историй. Создайте первую!</div>';
            return;
        }
        
        storiesContainer.innerHTML = stories.map(story => `
            <div class="story-card admin">
                <h3>${story.title}</h3>
                <p>${story.description}</p>
                <div class="story-meta">
                    <span><strong>Уровень:</strong> ${getLevelText(story.level)}</span>
                    <span><strong>Глаголов:</strong> ${story.verbCount}</span>
                </div>
                <div class="story-actions">
                    <button class="btn btn-primary" onclick="editStory('${story.id}')">✏️ Редактировать</button>
                    <button class="btn btn-info" onclick="duplicateStory('${story.id}')">📋 Дублировать</button>
                    <button class="btn btn-secondary" onclick="deleteStory('${story.id}')">🗑️ Удалить</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading stories:', error);
        storiesContainer.innerHTML = '<div class="error">Ошибка загрузки историй</div>';
    }
}

// Create new story
function createNewStory() {
    currentStory = {
        id: '',
        title: '',
        description: '',
        level: 'beginner',
        verbCount: 0,
        verbData: {},
        storyText: ''
    };
    
    showStoryEditor();
    document.getElementById('editor-title').textContent = 'Создание новой истории';
    clearEditor();
}

// Edit existing story
async function editStory(storyId) {
    try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) throw new Error('Story not found');
        
        currentStory = await response.json();
        showStoryEditor();
        populateEditor();
        document.getElementById('editor-title').textContent = `Редактирование: ${currentStory.title}`;
        
    } catch (error) {
        console.error('Error loading story:', error);
        alert('Ошибка загрузки истории');
    }
}

// Show story editor
function showStoryEditor() {
    document.getElementById('story-list-section').style.display = 'none';
    document.getElementById('story-editor-section').style.display = 'block';
}

// Show story list
function showStoryList() {
    document.getElementById('story-editor-section').style.display = 'none';
    document.getElementById('story-list-section').style.display = 'block';
    loadExistingStories();
}

// Populate editor with story data
async function populateEditor() {
    if (!currentStory) return;
    
    // Load raw MD content for simple editor
    try {
        const response = await fetch(`/api/stories/${currentStory.id}/raw`);
        if (response.ok) {
            const rawContent = await response.text();
            document.getElementById('story-editor').value = rawContent;
        } else {
            // Fallback: try to reconstruct MD from story data
            const mdContent = reconstructMdFromStory(currentStory);
            document.getElementById('story-editor').value = mdContent;
        }
    } catch (error) {
        console.error('Error loading raw content:', error);
        // Fallback: try to reconstruct MD from story data
        const mdContent = reconstructMdFromStory(currentStory);
        document.getElementById('story-editor').value = mdContent;
    }
}

// Reconstruct Markdown content from story object
function reconstructMdFromStory(story) {
    let mdContent = `---
title: "${story.title}"
description: "${story.description}"
level: "${story.level}"
---

`;

    // Try to reconstruct sections from storyText HTML
    if (story.storyText) {
        // Simple conversion - this is a fallback
        let text = story.storyText;
        
        // Convert <h2> to ## 
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
        
        // Convert verb spans back to arrays (simplified)
        text = text.replace(/<span[^>]*class="verb"[^>]*>\.{3}<\/span>/g, '["verb", "option1", "option2"]');
        
        // Remove other HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Clean up extra whitespace
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        mdContent += text.trim();
    } else {
        mdContent += `## Первый раздел
This is a story about someone who ["walked", "walks", "will walk"] to the market.

## Второй раздел  
The character ["decided", "decides", "will decide"] to continue the journey.`;
    }
    
    return mdContent;
}

// Clear editor
function clearEditor() {
    document.getElementById('story-editor').value = `---
title: "Новая история"
description: "Описание новой истории"
level: "intermediate"
---

## Первый раздел
This is a story about someone who ["walked", "walks", "will walk"] to the market.

## Второй раздел
The character ["decided", "decides", "will decide"] to continue the journey.`;
}

// Handle toolbar actions
function handleToolbarAction(event) {
    const action = event.target.dataset.action;
    const editor = document.getElementById('text-editor');
    
    switch (action) {
        case 'add-heading':
            insertAtCursor(editor, '<h2>Новый раздел</h2>');
            break;
        case 'add-paragraph':
            insertAtCursor(editor, '<p>Новый параграф текста.</p>');
            break;
        case 'add-verb':
            const verbName = prompt('Введите базовую форму глагола (например: walk):');
            if (verbName) {
                const verbHtml = `<span class="verb-placeholder" data-verb="${verbName}" data-section="${currentSectionNumber}">${verbName}</span>`;
                insertAtCursor(editor, verbHtml);
                updateVerbManager();
            }
            break;
        case 'add-section-check':
            const checkHtml = `<div class="check-button-placeholder" data-section="${currentSectionNumber}">Проверить раздел ${currentSectionNumber}</div>`;
            insertAtCursor(editor, checkHtml);
            currentSectionNumber++;
            break;
        case 'clear-editor':
            if (confirm('Очистить весь текст?')) {
                editor.innerHTML = '';
                updateVerbManager();
                currentSectionNumber = 1;
            }
            break;
    }
}

// Insert content at cursor position
function insertAtCursor(element, html) {
    element.focus();
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const div = document.createElement('div');
        div.innerHTML = html;
        
        while (div.firstChild) {
            range.insertNode(div.firstChild);
        }
        
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        element.innerHTML += html;
    }
}

// Update verb manager
function updateVerbManager() {
    const editor = document.getElementById('text-editor');
    const verbPlaceholders = editor.querySelectorAll('.verb-placeholder');
    const verbList = document.getElementById('verb-list');
    
    if (verbPlaceholders.length === 0) {
        verbList.innerHTML = '<div class="no-verbs">Глаголы будут добавляться автоматически при их вставке в текст</div>';
        return;
    }
    
    const verbs = {};
    verbPlaceholders.forEach(placeholder => {
        const verbName = placeholder.dataset.verb;
        if (!verbs[verbName]) {
            verbs[verbName] = {
                name: verbName,
                tenses: verbDatabase[verbName] ? [...verbDatabase[verbName].tenses] : generateDefaultTenses(verbName),
                correct: verbDatabase[verbName] ? verbDatabase[verbName].correct : verbName
            };
        }
    });
    
    verbList.innerHTML = Object.values(verbs).map(verb => `
        <div class="verb-item">
            <h4>${verb.name}</h4>
            <div class="verb-forms">
                ${verb.tenses.map(tense => `
                    <span class="verb-form ${tense === verb.correct ? 'correct' : ''}" 
                          onclick="toggleCorrectForm('${verb.name}', '${tense}')">${tense}</span>
                `).join('')}
            </div>
                         <button class="btn btn-secondary" onclick="editVerbForms('${verb.name}')">➕ Добавить форму</button>
        </div>
    `).join('');
}

// Toggle correct form
function toggleCorrectForm(verbName, tense) {
    // Update the correct form for this verb
    const verbItems = document.querySelectorAll('.verb-item');
    verbItems.forEach(item => {
        const h4 = item.querySelector('h4');
        if (h4 && h4.textContent === verbName) {
            item.querySelectorAll('.verb-form').forEach(form => {
                form.classList.remove('correct');
                if (form.textContent === tense) {
                    form.classList.add('correct');
                }
            });
        }
    });
}

// Save story
async function saveStory() {
    if (!validateStory()) return;
    
    const storyData = collectStoryData();
    
    try {
        const response = await fetch('/api/admin/save-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(storyData)
        });
        
        if (!response.ok) throw new Error('Failed to save story');
        
        alert('История успешно сохранена!');
        showStoryList();
        
    } catch (error) {
        console.error('Error saving story:', error);
        alert('Ошибка сохранения истории. Проверьте данные и попробуйте снова.');
    }
}

// Validate story
function validateStory() {
    const id = document.getElementById('story-id').value.trim();
    const title = document.getElementById('story-title').value.trim();
    const editor = document.getElementById('text-editor');
    
    if (!id) {
        alert('Введите ID истории');
        return false;
    }
    
    if (!/^[a-z0-9-]+$/.test(id)) {
        alert('ID должен содержать только строчные буквы, цифры и дефисы');
        return false;
    }
    
    if (!title) {
        alert('Введите название истории');
        return false;
    }
    
    if (!editor.innerHTML.trim()) {
        alert('Добавьте текст истории');
        return false;
    }
    
    return true;
}

// Collect story data from simple editor
function collectStoryData() {
    const content = document.getElementById('story-editor').value.trim();
    
    if (!content) {
        return {
            id: 'preview-story',
            title: 'Предпросмотр',
            description: 'Нет содержимого',
            level: 'intermediate',
            verbCount: 0,
            verbData: {},
            storyText: '<p>Пожалуйста, введите содержимое истории</p>'
        };
    }
    
    // Parse MD content for preview
    try {
        const parsed = parseSimpleMDForPreview(content);
        return {
            id: parsed.id || 'preview-story',
            title: parsed.title || 'Предпросмотр истории',
            description: parsed.description || 'Предпросмотр',
            level: parsed.level || 'intermediate',
            verbCount: parsed.verbCount,
            verbData: parsed.verbData,
            storyText: parsed.html
        };
    } catch (error) {
        console.error('Error parsing MD for preview:', error);
        return {
            id: 'preview-story',
            title: 'Ошибка парсинга',
            description: 'Ошибка в формате Markdown',
            level: 'intermediate',
            verbCount: 0,
            verbData: {},
            storyText: `<p style="color: red;">Ошибка парсинга: ${error.message}</p><pre>${content}</pre>`
        };
    }
}

// Parse simple MD content for preview (simplified version of server-side parser)
function parseSimpleMDForPreview(content) {
    const lines = content.split('\n');
    let yamlData = { title: 'Предпросмотр', description: '', level: 'intermediate' };
    let mdContent = content;
    
    // Extract YAML front matter
    if (lines[0] === '---') {
        let yamlEnd = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
                yamlEnd = i;
                break;
            }
        }
        
        if (yamlEnd > 0) {
            const yamlLines = lines.slice(1, yamlEnd);
            yamlLines.forEach(line => {
                const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
                if (match) {
                    yamlData[match[1]] = match[2];
                }
            });
            mdContent = lines.slice(yamlEnd + 1).join('\n');
        }
    }
    
    // Process verb arrays and count them
    let verbCount = 0;
    let processedContent = mdContent;
    
    // Replace verb arrays with placeholders and count them
    processedContent = processedContent.replace(/\["([^"]+)"(?:,\s*"([^"]+)")*\]/g, (match) => {
        verbCount++;
        return `<span class="verb preview-verb">[выбор глагола]</span>`;
    });
    
    // Convert ## headers to <h2>
    processedContent = processedContent.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    
    // Convert paragraphs (simple approach)
    const paragraphs = processedContent.split('\n\n').filter(p => p.trim());
    let html = '';
    
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed.startsWith('<h2>')) {
            html += trimmed + '\n';
            html += '<div class="preview-section-note" style="color: #666; font-style: italic; margin: 10px 0;">📝 После этого раздела будет добавлена кнопка проверки автоматически</div>\n';
        } else if (trimmed) {
            html += `<p>${trimmed}</p>\n`;
        }
    });
    
    return {
        id: yamlData.id,
        title: yamlData.title,
        description: yamlData.description,
        level: yamlData.level,
        verbCount: verbCount,
        verbData: {}, // For preview, we don't need full verb data
        html: html
    };
}

// Convert editor format to HTML
function editorToHtmlFormat(editorHtml) {
    let html = editorHtml;
    
    // Convert verb placeholders
    html = html.replace(/<span class="verb-placeholder" data-verb="([^"]+)" data-section="([^"]+)">([^<]+)<\/span>/g, 
        '<span class="verb" data-verb="$1" data-section="$2">...</span>');
    
    // Convert check button placeholders
    html = html.replace(/<div class="check-button-placeholder" data-section="([^"]+)">([^<]+)<\/div>/g, 
        '<div class="check-section"><button class="section-check-btn" onclick="checkSection($1)">Проверить этот раздел</button><div class="section-score" id="section-score-$1"></div></div>');
    
    return html;
}

// Convert HTML to editor format
function htmlToEditorFormat(html) {
    let editorHtml = html;
    
    // Convert verb spans back to placeholders
    editorHtml = editorHtml.replace(/<span class="verb" data-verb="([^"]+)" data-section="([^"]+)">\.{3}<\/span>/g, 
        '<span class="verb-placeholder" data-verb="$1" data-section="$2">$1</span>');
    
    // Convert check sections back to placeholders
    editorHtml = editorHtml.replace(/<div class="check-section">.*?<\/div>/g, 
        '<div class="check-button-placeholder" data-section="1">Проверить раздел</div>');
    
    return editorHtml;
}

// Preview story
function previewStory() {
    const storyData = collectStoryData();
    const previewContent = document.getElementById('preview-content');
    
    previewContent.innerHTML = `
        <h2>${storyData.title}</h2>
        <p><strong>Уровень:</strong> ${getLevelText(storyData.level)}</p>
        <p><strong>Описание:</strong> ${storyData.description}</p>
        <p><strong>Количество глаголов:</strong> ${storyData.verbCount}</p>
        <hr>
        ${storyData.storyText}
    `;
    
    document.getElementById('preview-modal').style.display = 'flex';
}

// Close preview
function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
}

// Test story
function testStory() {
    // Save story data to sessionStorage and open main app
    const storyData = collectStoryData();
    sessionStorage.setItem('testStory', JSON.stringify(storyData));
    window.open('/?test=true', '_blank');
}

// Initialize verb database with common verbs
function initializeVerbDatabase() {
    verbDatabase = {
        be: { tenses: ['was', 'is', 'will be', 'has been', 'had been', 'will have been'], correct: 'was' },
        have: { tenses: ['had', 'has', 'will have', 'has had', 'had had', 'will have had'], correct: 'had' },
        do: { tenses: ['did', 'does', 'will do', 'has done', 'had done', 'will have done'], correct: 'did' },
        say: { tenses: ['said', 'says', 'will say', 'has said', 'had said', 'will have said'], correct: 'said' },
        get: { tenses: ['got', 'gets', 'will get', 'has got', 'had got', 'will have got'], correct: 'got' },
        make: { tenses: ['made', 'makes', 'will make', 'has made', 'had made', 'will have made'], correct: 'made' },
        go: { tenses: ['went', 'goes', 'will go', 'has gone', 'had gone', 'will have gone'], correct: 'went' },
        know: { tenses: ['knew', 'knows', 'will know', 'has known', 'had known', 'will have known'], correct: 'knew' },
        take: { tenses: ['took', 'takes', 'will take', 'has taken', 'had taken', 'will have taken'], correct: 'took' },
        see: { tenses: ['saw', 'sees', 'will see', 'has seen', 'had seen', 'will have seen'], correct: 'saw' },
        come: { tenses: ['came', 'comes', 'will come', 'has come', 'had come', 'will have come'], correct: 'came' },
        think: { tenses: ['thought', 'thinks', 'will think', 'has thought', 'had thought', 'will have thought'], correct: 'thought' },
        look: { tenses: ['looked', 'looks', 'will look', 'has looked', 'had looked', 'will have looked'], correct: 'looked' },
        want: { tenses: ['wanted', 'wants', 'will want', 'has wanted', 'had wanted', 'will have wanted'], correct: 'wanted' },
        give: { tenses: ['gave', 'gives', 'will give', 'has given', 'had given', 'will have given'], correct: 'gave' }
    };
}

// Generate default tenses for unknown verbs
function generateDefaultTenses(verb) {
    // Simple regular verb conjugation
    const pastTense = verb.endsWith('e') ? verb + 'd' : verb + 'ed';
    const presentTense = verb + 's';
    const futureTense = 'will ' + verb;
    const presentPerfect = 'has ' + pastTense;
    const pastPerfect = 'had ' + pastTense;
    const futurePerfect = 'will have ' + pastTense;
    
    return [pastTense, presentTense, futureTense, presentPerfect, pastPerfect, futurePerfect];
}

// Utility functions
function getLevelText(level) {
    const levels = {
        'beginner': 'Начинающий',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый'
    };
    return levels[level] || level;
}

function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    insertAtCursor(event.target, `<p>${text}</p>`);
    updateVerbManager();
}

// Duplicate story
async function duplicateStory(storyId) {
    try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) throw new Error('Story not found');
        
        const originalStory = await response.json();
        currentStory = {
            ...originalStory,
            id: originalStory.id + '-copy',
            title: originalStory.title + ' (Копия)'
        };
        
        showStoryEditor();
        populateEditor();
        document.getElementById('editor-title').textContent = 'Дублирование истории';
        
    } catch (error) {
        console.error('Error duplicating story:', error);
        alert('Ошибка дублирования истории');
    }
}

// Delete story
async function deleteStory(storyId) {
    if (!confirm('Вы уверены, что хотите удалить эту историю?')) return;
    
    try {
        const response = await fetch(`/api/admin/delete-story/${storyId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete story');
        
        alert('История удалена');
        loadExistingStories();
        
    } catch (error) {
        console.error('Error deleting story:', error);
        alert('Ошибка удаления истории');
    }
}

// Edit verb forms
function editVerbForms(verbName) {
    const newForm = prompt(`Добавить новую форму для глагола "${verbName}":`);
    if (!newForm || !newForm.trim()) return;
    
    // Find the verb item and add the new form
    const verbItems = document.querySelectorAll('.verb-item');
    verbItems.forEach(item => {
        const h4 = item.querySelector('h4');
        if (h4 && h4.textContent === verbName) {
            const verbForms = item.querySelector('.verb-forms');
            const newFormElement = document.createElement('span');
            newFormElement.className = 'verb-form';
            newFormElement.textContent = newForm.trim();
            newFormElement.onclick = () => toggleCorrectForm(verbName, newForm.trim());
            verbForms.appendChild(newFormElement);
        }
    });
}

// ================================
// AI Configuration Management
// ================================

let currentAIConfig = null;
let availableModels = [];

// Initialize AI configuration
async function initializeAIConfig() {
    await loadCurrentAIConfig();
    await loadAIModels();
    updateAIStatus();
}

// Load current AI configuration
async function loadCurrentAIConfig() {
    try {
        const response = await fetch('/api/ai/config');
        if (!response.ok) throw new Error('Failed to load AI config');
        
        currentAIConfig = await response.json();
        console.log('Current AI config loaded:', currentAIConfig);
        
    } catch (error) {
        console.error('Error loading AI config:', error);
        updateAIStatus('Ошибка загрузки конфигурации AI', 'disconnected');
    }
}

// Load available AI models
async function loadAIModels() {
    const modelSelect = document.getElementById('ai-model-select');
    const saveButton = document.getElementById('save-ai-model');
    
    try {
        updateAIStatus('Загрузка доступных моделей...', 'loading');
        
        const response = await fetch('/api/ai/models');
        if (!response.ok) throw new Error('Failed to load models');
        
        const result = await response.json();
        availableModels = result.models || [];
        
        // Clear and populate select
        modelSelect.innerHTML = '';
        
        if (availableModels.length === 0) {
            modelSelect.innerHTML = '<option value="">Модели не найдены</option>';
            modelSelect.disabled = true;
            saveButton.disabled = true;
            updateAIStatus('AI сервер недоступен', 'disconnected');
            return;
        }
        
        // Add models to select
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            
            // Mark current model as selected
            if (currentAIConfig && model === currentAIConfig.server.defaultModel) {
                option.selected = true;
            }
            
            modelSelect.appendChild(option);
        });
        
        modelSelect.disabled = false;
        saveButton.disabled = false;
        
        updateAIStatus(`Доступно ${availableModels.length} моделей`, 'connected');
        
    } catch (error) {
        console.error('Error loading AI models:', error);
        modelSelect.innerHTML = '<option value="">Ошибка загрузки моделей</option>';
        modelSelect.disabled = true;
        saveButton.disabled = true;
        updateAIStatus('Не удалось подключиться к AI серверу', 'disconnected');
    }
}

// Handle model selection change
function onModelSelectionChange() {
    const modelSelect = document.getElementById('ai-model-select');
    const saveButton = document.getElementById('save-ai-model');
    
    const selectedModel = modelSelect.value;
    const currentModel = currentAIConfig?.server?.defaultModel;
    
    // Enable save button only if model changed
    saveButton.disabled = !selectedModel || selectedModel === currentModel;
    
    if (selectedModel && selectedModel !== currentModel) {
        saveButton.textContent = '💾 Сохранить изменения';
        saveButton.classList.add('btn-warning');
        saveButton.classList.remove('btn-success');
    } else {
        saveButton.textContent = '💾 Сохранить модель';
        saveButton.classList.remove('btn-warning');
        saveButton.classList.add('btn-success');
    }
}

// Save selected AI model
async function saveAIModel() {
    const modelSelect = document.getElementById('ai-model-select');
    const saveButton = document.getElementById('save-ai-model');
    
    const selectedModel = modelSelect.value;
    
    if (!selectedModel) {
        alert('Пожалуйста, выберите модель');
        return;
    }
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = '💾 Сохранение...';
        updateAIStatus('Сохранение модели...', 'loading');
        
        const response = await fetch('/api/ai/model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: selectedModel })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save model');
        }
        
        const result = await response.json();
        console.log('AI model saved:', result);
        
        // Update current config
        if (currentAIConfig) {
            currentAIConfig.server.defaultModel = selectedModel;
        }
        
        // Reset button state
        saveButton.disabled = true;
        saveButton.textContent = '💾 Сохранить модель';
        saveButton.classList.remove('btn-warning');
        saveButton.classList.add('btn-success');
        
        updateAIStatus(`Модель изменена на: ${selectedModel}`, 'connected');
        
        // Show success message
        setTimeout(() => {
            updateAIStatus(`Активная модель: ${selectedModel}`, 'connected');
        }, 3000);
        
    } catch (error) {
        console.error('Error saving AI model:', error);
        saveButton.disabled = false;
        saveButton.textContent = '💾 Повторить сохранение';
        updateAIStatus(`Ошибка сохранения: ${error.message}`, 'disconnected');
    }
}

// Update AI status display
function updateAIStatus(message, status = 'loading') {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    // Remove all status classes
    statusIndicator.classList.remove('loading', 'connected', 'disconnected');
    
    // Add new status class
    statusIndicator.classList.add(status);
    
    // Update text
    statusText.textContent = message;
    
    // Update icon based on status
    switch (status) {
        case 'loading':
            statusIndicator.textContent = '🔄';
            break;
        case 'connected':
            statusIndicator.textContent = '✅';
            break;
        case 'disconnected':
            statusIndicator.textContent = '❌';
            break;
        default:
            statusIndicator.textContent = '🔄';
    }
}

// MD Editor Functions
function setupMDEditor() {
    const mdModeBtn = document.getElementById('md-mode-btn');
    const visualModeBtn = document.getElementById('visual-mode-btn');
    const mdSection = document.getElementById('md-editor-section');
    const visualSection = document.getElementById('visual-editor-section');
    const mdEditor = document.getElementById('md-editor');
    const mdPreview = document.getElementById('md-preview');
    
    // Mode switching
    mdModeBtn.addEventListener('click', () => switchToMDMode());
    visualModeBtn.addEventListener('click', () => switchToVisualMode());
    
    // MD Editor input
    mdEditor.addEventListener('input', updateMDPreview);
    
    // MD Toolbar buttons
    document.querySelectorAll('.md-tool-btn').forEach(btn => {
        btn.addEventListener('click', handleMDToolbar);
    });
    
    // Initialize with MD mode
    switchToMDMode();
    updateMDPreview();
}

function switchToMDMode() {
    const mdModeBtn = document.getElementById('md-mode-btn');
    const visualModeBtn = document.getElementById('visual-mode-btn');
    const mdSection = document.getElementById('md-editor-section');
    const visualSection = document.getElementById('visual-editor-section');
    
    mdModeBtn.classList.add('active');
    visualModeBtn.classList.remove('active');
    mdSection.style.display = 'block';
    visualSection.style.display = 'none';
}

function switchToVisualMode() {
    const mdModeBtn = document.getElementById('md-mode-btn');
    const visualModeBtn = document.getElementById('visual-mode-btn');
    const mdSection = document.getElementById('md-editor-section');
    const visualSection = document.getElementById('visual-editor-section');
    
    mdModeBtn.classList.remove('active');
    visualModeBtn.classList.add('active');
    mdSection.style.display = 'none';
    visualSection.style.display = 'block';
}

function updateMDPreview() {
    const mdEditor = document.getElementById('md-editor');
    const mdPreview = document.getElementById('md-preview');
    const content = mdEditor.value;
    
    if (!content.trim()) {
        mdPreview.innerHTML = '<p style="color: #95a5a6; font-style: italic;">Введите Markdown код слева для предпросмотра...</p>';
        return;
    }
    
    try {
        const parsed = parseMDContent(content);
        mdPreview.innerHTML = parsed;
    } catch (error) {
        mdPreview.innerHTML = `<div style="color: #e74c3c; background: #fadbd8; padding: 15px; border-radius: 5px;">
            <strong>Ошибка парсинга:</strong><br>${error.message}
        </div>`;
    }
}

function parseMDContent(content) {
    let html = '';
    
    // Parse YAML front matter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (yamlMatch) {
        const yamlContent = yamlMatch[1];
        const yamlLines = yamlContent.split('\n').filter(line => line.trim());
        
        html += '<div class="yaml-info">';
        html += '<strong>📋 Метаданные истории:</strong><br>';
        yamlLines.forEach(line => {
            if (line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());
                html += `<strong>${key}:</strong> ${value.replace(/['"]/g, '')}<br>`;
            }
        });
        html += '</div>';
        
        // Remove YAML from content
        content = content.replace(yamlMatch[0], '');
    }
    
    // Split into lines and process
    const lines = content.split('\n');
    let inParagraph = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            if (inParagraph) {
                html += '</p>';
                inParagraph = false;
            }
            continue;
        }
        
        // Headers
        if (line.startsWith('## ')) {
            if (inParagraph) {
                html += '</p>';
                inParagraph = false;
            }
            html += `<h2>${line.substring(3)}</h2>`;
            continue;
        }
        
        // Skip legacy check section buttons - they'll be auto-generated
        if (line.match(/\{checkSection\(\d+\),\s*"[^"]+"\}/)) {
            continue;
        }
        
        // Regular text with verbs
        if (!inParagraph) {
            html += '<p>';
            inParagraph = true;
        }
        
        // Process verbs in brackets
        let processedLine = line.replace(/\["([^"]+)"(?:,\s*"([^"]*)")*\]/g, (match) => {
            const verbArray = JSON.parse(match);
            const correctVerb = verbArray[0];
            return `<span class="verb" title="Правильный ответ: ${correctVerb}">${correctVerb}</span>`;
        });
        
        html += processedLine + ' ';
    }
    
    if (inParagraph) {
        html += '</p>';
    }
    
    // Auto-add check buttons after each section
    html = addAutoCheckButtons(html);
    
    return html;
}

function addAutoCheckButtons(html) {
    // Split by h2 headers and add buttons after each section
    const sections = html.split(/(<h2>.*?<\/h2>)/);
    let result = '';
    let sectionNum = 0;
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        result += section;
        
        // If this is a header, increment section number  
        if (section.match(/<h2>.*<\/h2>/)) {
            sectionNum++;
        }
        // If this is content after a header and not empty, add button
        else if (section.trim() && sectionNum > 0 && !section.match(/<h2>/)) {
            result += `<button class="check-btn" onclick="alert('Проверка раздела ${sectionNum}')">✅ Проверить раздел ${sectionNum}</button>`;
        }
    }
    
    return result;
}

function handleMDToolbar(event) {
    const action = event.target.dataset.action;
    const mdEditor = document.getElementById('md-editor');
    const cursorPos = mdEditor.selectionStart;
    const text = mdEditor.value;
    
    let insertText = '';
    let newCursorPos = cursorPos;
    
    switch (action) {
        case 'add-md-section':
            insertText = '\n## Новый раздел\nТекст раздела...\n\n';
            newCursorPos = cursorPos + insertText.length;
            break;
            
        case 'add-md-verb':
            insertText = '["правильный", "вариант1", "вариант2", "вариант3"]';
            newCursorPos = cursorPos + 2; // Position after first quote
            break;
            
        // Removed add-md-check - buttons are now auto-generated
            
        case 'md-help':
            showMDHelp();
            return;
            
        case 'toggle-fullscreen':
            toggleMDFullscreen();
            return;
    }
    
    if (insertText) {
        const newText = text.slice(0, cursorPos) + insertText + text.slice(cursorPos);
        mdEditor.value = newText;
        mdEditor.focus();
        mdEditor.setSelectionRange(newCursorPos, newCursorPos);
        updateMDPreview();
    }
}

function showMDHelp() {
    const helpContent = `
        <h3>📝 Справка по Markdown редактору</h3>
        <h4>Структура файла:</h4>
        <pre>---
title: "Название истории"
description: "Описание на русском"
level: "beginner" | "intermediate" | "advanced"
---

## Название раздела
Текст с глаголами ["правильный", "вариант1", "вариант2"].

## Следующий раздел
Больше текста с глаголами...</pre>
        
        <h4>Синтаксис:</h4>
        <ul>
            <li><strong>## Заголовок</strong> - создает новый раздел</li>
            <li><strong>["verb1", "verb2"]</strong> - массив глаголов (первый правильный)</li>
            <li><strong>Кнопки проверки</strong> - добавляются автоматически после каждого раздела</li>
        </ul>
        
        <h4>Правила:</h4>
        <ul>
            <li>История должна быть на <strong>английском языке</strong></li>
            <li>Первый глагол в массиве - всегда правильный</li>
            <li>Минимум 4, максимум 6 вариантов глаголов</li>
            <li>Кнопки добавляются автоматически - не нужно их прописывать</li>
        </ul>
    `;
    
    // Create help modal
    const helpModal = document.createElement('div');
    helpModal.className = 'modal';
    helpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Помощь</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${helpContent}
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Close on background click
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.remove();
        }
    });
}

// Save MD Story function
async function saveMDStory() {
    const mdEditor = document.getElementById('md-editor');
    const content = mdEditor.value.trim();
    
    if (!content) {
        alert('Введите содержимое истории!');
        return;
    }
    
    try {
        // Validate MD format
        parseMDContent(content);
        
        const response = await fetch('/api/admin/save-md-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ История сохранена!\n\n📖 Название: ${result.story.title}\n🆔 ID: ${result.story.id}`);
            loadExistingStories(); // Refresh story list
        } else {
            throw new Error(result.error || 'Failed to save story');
        }
        
    } catch (error) {
        alert(`❌ Ошибка сохранения: ${error.message}`);
    }
}

// Load MD story for editing
function loadMDStory(storyData) {
    const mdEditor = document.getElementById('md-editor');
    
    // Switch to MD mode
    switchToMDMode();
    
    // Build MD content from story data
    let mdContent = `---
title: "${storyData.title}"
description: "${storyData.description || 'Описание истории'}"
level: "${storyData.level || 'intermediate'}"
---

`;
    
    // Add sections
    if (storyData.sections) {
        storyData.sections.forEach((section, index) => {
            mdContent += `## ${section.title}\n`;
            mdContent += `${section.content}\n\n`;
            mdContent += `{checkSection(${index + 1}), "Проверить этот раздел"}\n\n`;
        });
    }
    
    mdEditor.value = mdContent;
    updateMDPreview();
}

// Handle save story - simple editor mode
function handleSaveStory() {
    saveSimpleStory();
}

// Save story using simple editor
async function saveSimpleStory() {
    const content = document.getElementById('story-editor').value.trim();
    
    if (!content) {
        alert('Пожалуйста, введите содержимое истории');
        return;
    }
    
    // Validate MD content by trying to parse it
    try {
        const lines = content.split('\n');
        let hasTitle = false;
        let hasSection = false;
        
        // Check for YAML front matter
        if (lines[0] === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') break;
                if (lines[i].startsWith('title:')) hasTitle = true;
            }
        }
        
        // Check for sections
        for (const line of lines) {
            if (line.startsWith('## ')) hasSection = true;
        }
        
        if (!hasTitle) {
            if (!confirm('В истории не найден заголовок (title:). Продолжить сохранение?')) return;
        }
        
        if (!hasSection) {
            if (!confirm('В истории не найдены разделы (## Название). Продолжить сохранение?')) return;
        }
        
    } catch (error) {
        console.error('Error validating content:', error);
    }
    
    try {
        const response = await fetch('/api/admin/save-md-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`История успешно сохранена!\nID: ${result.story.id}\nНазвание: ${result.story.title}`);
            
            // Refresh story list
            loadExistingStories();
            
            // Clear editor
            document.getElementById('story-editor').value = '';
            
        } else {
            throw new Error(result.error || 'Ошибка сохранения истории');
        }
        
    } catch (error) {
        console.error('Error saving story:', error);
        alert('Ошибка при сохранении истории: ' + error.message);
    }
}

// Toggle MD editor fullscreen mode
function toggleMDFullscreen() {
    const mdSection = document.getElementById('md-editor-section');
    const fullscreenBtn = document.querySelector('[data-action="toggle-fullscreen"]');
    
    if (mdSection.classList.contains('fullscreen')) {
        // Exit fullscreen
        mdSection.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '🔍 Полный экран';
        document.body.style.overflow = 'auto';
    } else {
        // Enter fullscreen
        mdSection.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '🗙 Выйти';
        document.body.style.overflow = 'hidden';
    }
    
    // Escape key handler
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && mdSection.classList.contains('fullscreen')) {
            toggleMDFullscreen();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    
    if (mdSection.classList.contains('fullscreen')) {
        document.addEventListener('keydown', escapeHandler);
    }
} 