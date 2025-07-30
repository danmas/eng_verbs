// public/script.js
// Verb data parsed from the text
const verbData = {
    live: { tenses: ['lived', 'lives', 'will live', 'has lived', 'had lived', 'will have lived'], correct: 'lived' },
    walk: { tenses: ['walked', 'walks', 'will walk', 'has walked', 'had walked', 'will have walked'], correct: 'walked' },
    arrive: { tenses: ['arrived', 'arrives', 'will arrive', 'has arrived', 'had arrived', 'will have arrived'], correct: 'arrived' },
    speak: { tenses: ['spoke', 'speaks', 'will speak', 'has spoken', 'had spoken', 'will have spoken'], correct: 'spoke' },
    search: { tenses: ['searched', 'search', 'will search', 'have searched', 'had searched', 'will have searched'], correct: 'searched' },
    say: { tenses: ['said', 'says', 'will say', 'has said', 'had said', 'will have said'], correct: 'said' },
    dream: { tenses: ['dreamed', 'dreams', 'will dream', 'has dreamed', 'had dreamed', 'will have dreamed'], correct: 'dreamed' },
    nod: { tenses: ['nodded', 'nods', 'will nod', 'has nodded', 'had nodded', 'will have nodded'], correct: 'nodded' },
    go: { tenses: ['did we go', 'do we go', 'will we go', 'have we gone', 'had we gone', 'will we have gone'], correct: 'will we go' },
    smile: { tenses: ['smiled', 'smiles', 'will smile', 'has smiled', 'had smiled', 'will have smiled'], correct: 'smiled' },
    unfold: { tenses: ['unfolded', 'unfolds', 'will unfold', 'has unfolded', 'had unfolded', 'will have unfolded'], correct: 'unfolded' },
    touch: { tenses: ['touched', 'touch', 'will touch', 'have touched', 'had touched', 'will have touched'], correct: 'touch' },
    climb: { tenses: ['climbed', 'climbs', 'will climb', 'has climbed', 'had climbed', 'will have climbed'], correct: 'climbed' },
    soar: { tenses: ['soared', 'soar', 'will soar', 'have soared', 'had soared', 'will have soared'], correct: 'soared' },
    stretch: { tenses: ['stretched', 'stretches', 'will stretch', 'has stretched', 'had stretched', 'will have stretched'], correct: 'stretched' },
    fly: { tenses: ['flew', 'fly', 'will fly', 'have flown', 'had flown', 'will have flown'], correct: 'flew' },
    see: { tenses: ['saw', 'sees', 'will see', 'has seen', 'had seen', 'will have seen'], correct: 'saw' },
    never_imagine: { tenses: ['had never imagined', 'never imagines', 'will never imagine', 'has never imagined', 'had never imagined', 'will have never imagined'], correct: 'had never imagined' },
    reach: { tenses: ['reached', 'reach', 'will reach', 'have reached', 'had reached', 'will have reached'], correct: 'reached' },
    spill: { tenses: ['spilled', 'spill', 'will spill', 'have spilled', 'had spilled', 'will have spilled'], correct: 'spilled' },
    swim: { tenses: ['swam', 'swim', 'will swim', 'have swum', 'had swum', 'will have swum'], correct: 'swam' },
    laugh: { tenses: ['laughed', 'laughs', 'will laugh', 'has laughed', 'had laughed', 'will have laughed'], correct: 'laughed' },
    know: { tenses: ['knew', 'know', 'will know', 'have known', 'had known', 'will have known'], correct: 'knew' },
    chuckle: { tenses: ['chuckled', 'chuckles', 'will chuckle', 'has chuckled', 'had chuckled', 'will have chuckled'], correct: 'chuckled' },
    rest: { tenses: ['rested', 'rest', 'will rest', 'have rested', 'had rested', 'will have rested'], correct: 'rested' },
    gather: { tenses: ['gathered', 'gathers', 'will gather', 'has gathered', 'had gathered', 'will have gathered'], correct: 'gathered' },
    howl: { tenses: ['howled', 'howls', 'will howl', 'has howled', 'had howled', 'will have howled'], correct: 'howled' },
    darken: { tenses: ['darkened', 'darkens', 'will darken', 'has darkened', 'had darkened', 'will have darkened'], correct: 'darkened' },
    need: { tenses: ['needed', 'need', 'will need', 'have needed', 'had needed', 'will have needed'], correct: 'need' },
    warn: { tenses: ['warned', 'warns', 'will warn', 'has warned', 'had warned', 'will have warned'], correct: 'warned' },
    prepare: { tenses: ['prepared', 'prepare', 'will prepare', 'have prepared', 'had prepared', 'will have prepared'], correct: 'prepared' },
    sweep: { tenses: ['swept', 'sweeps', 'will sweep', 'has swept', 'had swept', 'will have swept'], correct: 'swept' },
    fall: { tenses: ['fell', 'falls', 'will fall', 'has fallen', 'had fallen', 'will have fallen'], correct: 'fell' },
    cry: { tenses: ['cried', 'cries', 'will cry', 'has cried', 'had cried', 'will have cried'], correct: 'cried' },
    dive: { tenses: ['dived', 'dives', 'will dive', 'has dived', 'had dived', 'will have dived'], correct: 'dived' },
    beat: { tenses: ['beat', 'beats', 'will beat', 'have beaten', 'had beaten', 'will have beaten'], correct: 'beat' },
    hit: { tenses: ['hit', 'hits', 'will hit', 'has hit', 'had hit', 'will have hit'], correct: 'hit' },
    catch: { tenses: ['caught', 'catches', 'will catch', 'has caught', 'had caught', 'will have caught'], correct: 'caught' },
    save: { tenses: ['saved', 'save', 'will save', 'have saved', 'had saved', 'will have saved'], correct: 'saved' },
    whisper: { tenses: ['whispered', 'whispers', 'will whisper', 'has whispered', 'had whispered', 'will have whispered'], correct: 'whispered' },
    must_find: { tenses: ['must find', 'had to find', 'will have to find'], correct: 'must find' },
    pass: { tenses: ['passed', 'passes', 'will pass', 'has passed', 'had passed', 'will have passed'], correct: 'passed' },
    set: { tenses: ['set', 'set', 'will set', 'have set', 'had set', 'will have set'], correct: 'set' },
    realize: { tenses: ['realized', 'realizes', 'will realize', 'has realized', 'had realized', 'will have realized'], correct: 'realized' },
    face: { tenses: ['faced', 'face', 'will face', 'have faced', 'had faced', 'will have faced'], correct: 'face' },
    trust: { tenses: ['trusted', 'trusts', 'will trust', 'has trusted', 'had trusted', 'will have trusted'], correct: 'trusted' },
    continue: { tenses: ['continued', 'continue', 'will continue', 'have continued', 'had continued', 'will have continued'], correct: 'continued' },
    be: { tenses: ['was', 'is', 'will be', 'has been', 'had been', 'will have been'], correct: 'was' },
    share: { tenses: ['shared', 'share', 'will share', 'have shared', 'had shared', 'will have shared'], correct: 'shared' }
};

// Story text with verbs replaced by placeholders and section check buttons
const storyText = `
    <h2>The Princess and the Dragon's Journey</h2>
    <p>Once upon a time, in a kingdom beyond the mountains, Princess Elara <span class="verb" data-verb="live" data-section="1">...</span> in a grand castle. Every morning, she <span class="verb" data-verb="walk" data-section="1">...</span> through the royal gardens, dreaming of adventures beyond the castle walls.</p>
    <p>One day, a great dragon named Ignis <span class="verb" data-verb="arrive" data-section="1">...</span> at the castle. But instead of breathing fire, he <span class="verb" data-verb="speak" data-section="1">...</span> kindly to the princess.</p>
    <p>"I <span class="verb" data-verb="search" data-section="1">...</span> for a companion to travel the world," he <span class="verb" data-verb="say" data-section="1">...</span>. "Would you join me, Princess?"</p>
    <p>Elara, who <span class="verb" data-verb="dream" data-section="1">...</span> of adventure all her life, <span class="verb" data-verb="nod" data-section="1">...</span> eagerly. "Yes! But where <span class="verb" data-verb="go" data-section="1">...</span> first?"</p>
    <p>Ignis <span class="verb" data-verb="smile" data-section="1">...</span> and <span class="verb" data-verb="unfold" data-section="1">...</span> his great wings. "To the floating islands, where the stars <span class="verb" data-verb="touch" data-section="1">...</span> the sea!"</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(1)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-1"></div>
    </div>
    
    <h2>The Journey Begins</h2>
    <p>Elara <span class="verb" data-verb="climb" data-section="2">...</span> onto Ignis's back, and they <span class="verb" data-verb="soar" data-section="2">...</span> into the sky. Below them, the world <span class="verb" data-verb="stretch" data-section="2">...</span> vast and endless.</p>
    <p>As they <span class="verb" data-verb="fly" data-section="2">...</span>, the princess <span class="verb" data-verb="see" data-section="2">...</span> golden deserts, emerald forests, and sapphire rivers. She <span class="verb" data-verb="never_imagine" data-section="2">...</span> such beauty.</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(2)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-2"></div>
    </div>
    
    <h2>The Floating Islands</h2>
    <p>By nightfall, they <span class="verb" data-verb="reach" data-section="3">...</span> the floating islands. Great waterfalls <span class="verb" data-verb="spill" data-section="3">...</span> from the edges of the islands into the sky, and glowing fish <span class="verb" data-verb="swim" data-section="3">...</span> through the air like birds.</p>
    <p>Elara <span class="verb" data-verb="laugh" data-section="3">...</span> in delight. "This is magical!"</p>
    <p>"I <span class="verb" data-verb="know" data-section="3">...</span> you would love it," Ignis <span class="verb" data-verb="chuckle" data-section="3">...</span>.</p>
    <p>That night, they <span class="verb" data-verb="rest" data-section="3">...</span> under a sky full of shimmering stars.</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(3)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-3"></div>
    </div>
    
    <h2>A Challenge Arises</h2>
    <p>The next morning, a storm <span class="verb" data-verb="gather" data-section="4">...</span> on the horizon. The wind <span class="verb" data-verb="howl" data-section="4">...</span>, and the sky <span class="verb" data-verb="darken" data-section="4">...</span>.</p>
    <p>"We <span class="verb" data-verb="need" data-section="4">...</span> to leave quickly," Ignis <span class="verb" data-verb="warn" data-section="4">...</span>.</p>
    <p>But as they <span class="verb" data-verb="prepare" data-section="4">...</span> to depart, a great gust of wind <span class="verb" data-verb="sweep" data-section="4">...</span> Elara from Ignis's back!</p>
    <p>She <span class="verb" data-verb="fall" data-section="4">...</span> toward the sea below.</p>
    <p>"Ignis!" she <span class="verb" data-verb="cry" data-section="4">...</span>.</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(4)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-4"></div>
    </div>
    
    <h2>The Rescue</h2>
    <p>Ignis <span class="verb" data-verb="dive" data-section="5">...</span> with all his speed. His wings <span class="verb" data-verb="beat" data-section="5">...</span> hard against the stormy air.</p>
    <p>Just before Elara <span class="verb" data-verb="hit" data-section="5">...</span> the water, he <span class="verb" data-verb="catch" data-section="5">...</span> her in his strong claws.</p>
    <p>"You <span class="verb" data-verb="save" data-section="5">...</span> me!" she <span class="verb" data-verb="whisper" data-section="5">...</span>, holding tight to his scales.</p>
    <p>"We <span class="verb" data-verb="must_find" data-section="5">...</span> shelter," he <span class="verb" data-verb="say" data-section="5">...</span>.</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(5)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-5"></div>
    </div>
    
    <h2>A New Destination</h2>
    <p>Once the storm <span class="verb" data-verb="pass" data-section="6">...</span>, they <span class="verb" data-verb="set" data-section="6">...</span> their course toward new lands.</p>
    <p>Elara <span class="verb" data-verb="realize" data-section="6">...</span> that no matter what dangers they <span class="verb" data-verb="face" data-section="6">...</span>, she <span class="verb" data-verb="trust" data-section="6">...</span> her dragon friend.</p>
    <p>And so, they <span class="verb" data-verb="continue" data-section="6">...</span> their journey together, seeking new wonders, knowing that the greatest adventure <span class="verb" data-verb="be" data-section="6">...</span> the friendship they <span class="verb" data-verb="share" data-section="6">...</span>.</p>
    
    <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(6)">Проверить этот раздел</button>
        <div class="section-score" id="section-score-6"></div>
    </div>
`;

// Initialize the interface
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('story-container');
    container.innerHTML = storyText;

    // Add dropdowns to each verb
    const verbs = document.querySelectorAll('.verb');
    verbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Select tense</option>' + 
            verbData[verbKey].tenses.map(tense => `<option value="${tense}">${tense}</option>`).join('');
        verb.innerHTML = '';
        verb.appendChild(select);

        // Store student selection
        select.addEventListener('change', (e) => {
            verb.dataset.selected = e.target.value;
        });
    });
});

// Function to check a specific section (simplified)
function checkSection(sectionNumber) {
    const sectionVerbs = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
    let correctCount = 0;
    
    sectionVerbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = verbData[verbKey].correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        verb.querySelector('select').disabled = true;
    });
    
    // Display section score
    const scoreDiv = document.getElementById(`section-score-${sectionNumber}`);
    scoreDiv.textContent = `Счет: ${correctCount} / ${sectionVerbs.length}`;
    scoreDiv.style.fontWeight = 'bold';
    scoreDiv.style.marginTop = '10px';
    
    // Disable the button after checking
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Проверено';
}

// Global check function (old working version)
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for global check button
    document.getElementById('check-answers').addEventListener('click', () => {
        let correctCount = 0;
        const verbs = document.querySelectorAll('.verb');
        verbs.forEach(verb => {
            const verbKey = verb.dataset.verb;
            const selected = verb.dataset.selected || '';
            const correct = verbData[verbKey].correct;
            
            if (selected === correct) {
                verb.style.borderBottom = '2px solid green';
                correctCount++;
            } else {
                verb.style.borderBottom = '2px solid red';
            }
            
            // Disable dropdown after checking
            verb.querySelector('select').disabled = true;
        });

        // Display score
        document.getElementById('score').textContent = `Score: ${correctCount} / ${verbs.length}`;
    });
});
