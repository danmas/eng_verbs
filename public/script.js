// public/script.js
let currentStory = null;
let currentVerbData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadStoryList();
    
    // Add event listener for back button
    document.getElementById('back-to-selection').addEventListener('click', () => {
        showStorySelection();
    });
});

// Load and display the list of available stories
async function loadStoryList() {
    const storyList = document.getElementById('story-list');
    
    try {
        const response = await fetch('/api/stories');
        if (!response.ok) throw new Error('Failed to load stories');
        
        const stories = await response.json();
        
        if (stories.length === 0) {
            storyList.innerHTML = '<div class="error">Истории не найдены. Убедитесь, что файлы находятся в папке texts/</div>';
            return;
        }
        
        storyList.innerHTML = stories.map(story => `
            <div class="story-card" onclick="loadStory('${story.id}')">
                <h3>${story.title}</h3>
                <p><strong>Уровень:</strong> ${getLevelText(story.level)}</p>
                <p><strong>Глаголов:</strong> ${story.verbCount}</p>
                <p>${story.description}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading stories:', error);
        storyList.innerHTML = '<div class="error">Ошибка загрузки историй. Проверьте соединение с сервером.</div>';
    }
}

// Convert level code to Russian text
function getLevelText(level) {
    const levels = {
        'beginner': 'Начинающий',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый'
    };
    return levels[level] || level;
}

// Load a specific story
async function loadStory(storyId) {
    const storyList = document.getElementById('story-list');
    storyList.innerHTML = '<div class="loading">Загрузка истории...</div>';
    
    try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) throw new Error('Story not found');
        
        const story = await response.json();
        currentStory = story;
        currentVerbData = story.verbData;
        
        // Show the story content
        showStoryContent(story);
        
    } catch (error) {
        console.error('Error loading story:', error);
        storyList.innerHTML = '<div class="error">Ошибка загрузки истории. Попробуйте еще раз.</div>';
    }
}

// Display the story content and hide selection
function showStoryContent(story) {
    // Hide story selection and show story content
    document.getElementById('story-selection').style.display = 'none';
    document.getElementById('story-content').style.display = 'block';
    
    // Set story title
    document.getElementById('current-story-title').textContent = story.title;
    
    // Set story content
    const container = document.getElementById('story-container');
    container.innerHTML = story.storyText;
    
    // Add dropdowns to each verb
    const verbs = document.querySelectorAll('.verb');
    verbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        if (!currentVerbData[verbKey]) {
            console.error(`Verb data not found for: ${verbKey}`);
            return;
        }
        
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Select tense</option>' + 
            currentVerbData[verbKey].tenses.map(tense => `<option value="${tense}">${tense}</option>`).join('');
        verb.innerHTML = '';
        verb.appendChild(select);

        // Store student selection
        select.addEventListener('change', (e) => {
            verb.dataset.selected = e.target.value;
        });
    });
    
    // Add event listener for global check button
    const checkButton = document.getElementById('check-answers');
    checkButton.onclick = checkAllAnswers;
    
    // Clear any previous scores
    document.getElementById('score').textContent = '';
}

// Show story selection and hide content
function showStorySelection() {
    document.getElementById('story-content').style.display = 'none';
    document.getElementById('story-selection').style.display = 'block';
    
    // Reset current story data
    currentStory = null;
    currentVerbData = null;
    
    // Reload story list in case new stories were added
    loadStoryList();
}

// Function to check a specific section
function checkSection(sectionNumber) {
    if (!currentVerbData) {
        alert('История не загружена!');
        return;
    }
    
    const sectionVerbs = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
    let correctCount = 0;
    
    sectionVerbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = currentVerbData[verbKey].correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        const select = verb.querySelector('select');
        if (select) select.disabled = true;
    });
    
    // Display section score
    const scoreDiv = document.getElementById(`section-score-${sectionNumber}`);
    if (scoreDiv) {
        scoreDiv.textContent = `Счет: ${correctCount} / ${sectionVerbs.length}`;
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.marginTop = '10px';
    }
    
    // Disable the button after checking
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Проверено';
}

// Global check function
function checkAllAnswers() {
    if (!currentVerbData) {
        alert('История не загружена!');
        return;
    }
    
    let correctCount = 0;
    const verbs = document.querySelectorAll('.verb');
    
    verbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = currentVerbData[verbKey].correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        const select = verb.querySelector('select');
        if (select) select.disabled = true;
    });

    // Display total score
    document.getElementById('score').textContent = `Общий счет: ${correctCount} / ${verbs.length}`;
    
    // Disable all section buttons
    const sectionButtons = document.querySelectorAll('.section-check-btn');
    sectionButtons.forEach(button => {
        button.disabled = true;
        button.textContent = 'Проверено';
    });
    
    // Disable global check button
    const checkButton = document.getElementById('check-answers');
    checkButton.disabled = true;
    checkButton.textContent = 'Проверено';
}
