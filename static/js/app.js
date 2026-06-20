// --- App State ---
let allNotes = [];
let filteredNotes = [];
let selectedNote = null;
let activeCategory = 'all';
let searchQuery = '';
let selectedTemplate = 'default';

// --- DOM Elements ---
const notesContainer = document.getElementById('notes-container');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const syncStatus = document.getElementById('sync-status');
const searchInput = document.getElementById('search-input');
const categoryFilters = document.getElementById('category-filters');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');


// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const tweetDatePreview = document.getElementById('tweet-date-preview');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('modal-overlay');
const progressCircle = document.querySelector('.progress-ring__circle');
const templateOptions = document.querySelectorAll('.template-option');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Progress Circle Setup (Radius: 10)
const radius = 10;
const circumference = 2 * Math.PI * radius;
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes(false);

    
    // Refresh handlers
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRender();
    });
    
    // Reset filters handler
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Tweet modal close handlers
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    modalOverlay.addEventListener('click', closeTweetModal);
    
    // Tweet text change handler
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Template options click handlers
    templateOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            templateOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedTemplate = opt.dataset.template;
            generateTweetText();
        });
    });
    
    // Submit Tweet handler
    submitTweetBtn.addEventListener('click', postToTwitter);
    
    // Theme toggle handler
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Export to CSV handler
    exportCsvBtn.addEventListener('click', exportToCSV);
});


// --- API Interaction ---
async function fetchReleaseNotes(forceRefresh = false) {
    setLoading(true);
    try {
        const response = await fetch(`/api/notes?refresh=${forceRefresh}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        allNotes = data.notes || [];
        
        // Update sync status text
        if (data.last_fetched) {
            const date = new Date(data.last_fetched);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            syncStatus.textContent = `Synced at ${timeStr}${data.from_cache ? ' (Cached)' : ''}`;
        }
        
        // Render Categories dynamically in the sidebar
        buildCategoriesList();
        
        // Filter and Render Release Notes
        filterAndRender();
        setLoading(false);
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message || 'Could not fetch data from server.';
        setLoading(false, true);
    }
}

// --- Loading State management ---
function setLoading(isLoading, hasError = false) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        notesContainer.classList.add('hidden');
        errorState.classList.add('hidden');
        emptyState.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        loadingState.classList.add('hidden');
        
        if (hasError) {
            errorState.classList.remove('hidden');
            notesContainer.classList.add('hidden');
        } else if (filteredNotes.length === 0) {
            emptyState.classList.remove('hidden');
            notesContainer.classList.add('hidden');
        } else {
            notesContainer.classList.remove('hidden');
        }
    }
}

// --- Category Filtering Builder ---
function buildCategoriesList() {
    // Standard types
    const categoriesCount = {
        all: allNotes.length,
        feature: 0,
        issue: 0,
        deprecation: 0,
        fix: 0,
        announcement: 0,
        general: 0
    };
    
    // Count items per category
    allNotes.forEach(note => {
        const type = note.type ? note.type.toLowerCase() : 'general';
        if (categoriesCount.hasOwnProperty(type)) {
            categoriesCount[type]++;
        } else {
            categoriesCount.general++;
        }
    });
    
    // Update count labels
    document.getElementById('count-all').textContent = categoriesCount.all;
    
    // Select container and empty all except "All Updates"
    const staticAllBtn = categoryFilters.querySelector('[data-category="all"]');
    categoryFilters.innerHTML = '';
    categoryFilters.appendChild(staticAllBtn);
    
    // Categories config
    const categoriesMeta = [
        { key: 'feature', name: 'Features', dotClass: 'feature' },
        { key: 'announcement', name: 'Announcements', dotClass: 'announcement' },
        { key: 'deprecation', name: 'Deprecations', dotClass: 'deprecation' },
        { key: 'fix', name: 'Fixes', dotClass: 'fix' },
        { key: 'issue', name: 'Issues', dotClass: 'issue' },
        { key: 'general', name: 'General', dotClass: 'general' }
    ];
    
    // Append categories that have notes
    categoriesMeta.forEach(meta => {
        const count = categoriesCount[meta.key] || 0;
        if (count > 0) {
            const btn = document.createElement('button');
            btn.className = `filter-btn ${activeCategory === meta.key ? 'active' : ''}`;
            btn.dataset.category = meta.key;
            btn.innerHTML = `
                <span class="dot ${meta.dotClass}"></span> ${meta.name}
                <span class="count">${count}</span>
            `;
            
            btn.addEventListener('click', () => selectCategory(meta.key));
            categoryFilters.appendChild(btn);
        }
    });
}

function selectCategory(category) {
    activeCategory = category;
    
    // Update active class on all buttons
    const buttons = categoryFilters.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    filterAndRender();
}

function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    selectCategory('all');
}

// --- Filtering and Rendering Logic ---
function filterAndRender() {
    filteredNotes = allNotes.filter(note => {
        // 1. Category Filter
        const noteType = note.type ? note.type.toLowerCase() : 'general';
        const matchesCategory = (activeCategory === 'all') || (noteType === activeCategory);
        
        // 2. Search Filter
        const matchesSearch = !searchQuery || 
            note.date.toLowerCase().includes(searchQuery) ||
            (note.type && note.type.toLowerCase().includes(searchQuery)) ||
            note.content_text.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // Update visual layouts
    if (filteredNotes.length === 0) {
        setLoading(false);
    } else {
        renderNotesList();
        setLoading(false);
    }
}

function renderNotesList() {
    notesContainer.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        const noteType = note.type ? note.type.toLowerCase() : 'general';
        card.className = `note-card`;
        
        // Set CSS variables for side border highlight colors
        let colorVar = 'var(--color-general)';
        let glowVar = 'var(--border-color)';
        if (noteType === 'feature') { colorVar = 'var(--color-feature)'; glowVar = 'rgba(16, 185, 129, 0.2)'; }
        else if (noteType === 'issue') { colorVar = 'var(--color-issue)'; glowVar = 'rgba(239, 68, 68, 0.2)'; }
        else if (noteType === 'deprecation') { colorVar = 'var(--color-deprecation)'; glowVar = 'rgba(249, 115, 22, 0.2)'; }
        else if (noteType === 'fix') { colorVar = 'var(--color-fix)'; glowVar = 'rgba(59, 130, 246, 0.2)'; }
        else if (noteType === 'announcement') { colorVar = 'var(--color-announcement)'; glowVar = 'rgba(139, 92, 246, 0.2)'; }
        
        card.style.setProperty('--badge-color', colorVar);
        card.style.setProperty('--badge-glow-color', glowVar);
        
        // Build card HTML
        card.innerHTML = `
            <div class="note-header">
                <div class="note-meta">
                    <span class="badge ${noteType}">${note.type || 'General'}</span>
                    <span class="note-date">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${note.date}
                    </span>
                </div>
                <div class="note-actions">
                    <button class="btn-icon copy-btn" title="Copy link to clipboard">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="btn-icon tweet-btn" title="Tweet this update">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="note-body">
                ${note.content_html}
            </div>
        `;
        
        // Action Event Listeners inside the cards
        card.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyNoteToClipboard(note);
        });

        
        card.querySelector('.tweet-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetModal(note);
        });
        
        notesContainer.appendChild(card);
    });
}

// --- Helper Actions ---
function copyNoteToClipboard(note) {
    const textToCopy = `BigQuery Release Note (${note.date}) - [${note.type}]:\n${note.content_text}\n\nLink: ${note.link}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Release note copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy text.');
    });
}

function copyLinkToClipboard(link) {
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy link: ', err);
        showToast('Failed to copy link.');
    });
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = savedTheme === 'light' || (!savedTheme && prefersLight);
    
    if (isLight) {
        document.body.classList.add('light-theme');
        updateThemeIcons(true);
    } else {
        document.body.classList.remove('light-theme');
        updateThemeIcons(false);
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeIcons(isLight);
}

function updateThemeIcons(isLight) {
    if (isLight) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

// --- CSV Export ---
function exportToCSV() {
    if (filteredNotes.length === 0) {
        showToast('No notes to export.');
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Content Text', 'Link'];
    const rows = filteredNotes.map(note => [
        `"${note.id.replace(/"/g, '""')}"`,
        `"${note.date.replace(/"/g, '""')}"`,
        `"${note.type.replace(/"/g, '""')}"`,
        `"${note.content_text.replace(/"/g, '""')}"`,
        `"${note.link.replace(/"/g, '""')}"`
    ]);
    
    // Add UTF-8 BOM so Excel opens it with correct encoding
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${activeCategory}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV exported successfully!');
}


function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    // For transition animate
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// --- Twitter Share Modal Control ---
function openTweetModal(note) {
    selectedNote = note;
    
    // Display Tweet Date Preview
    tweetDatePreview.textContent = note.date;
    
    // Reset Template Choice to Default
    selectedTemplate = 'default';
    templateOptions.forEach(opt => {
        if (opt.dataset.template === 'default') opt.classList.add('active');
        else opt.classList.remove('active');
    });
    
    // Render text with template
    generateTweetText();
    
    // Open Modal Visuals
    tweetModal.classList.add('open');
}

function closeTweetModal() {
    tweetModal.classList.remove('open');
    selectedNote = null;
}

// Generate the text for the tweet based on the selected template and note
function generateTweetText() {
    if (!selectedNote) return;
    
    const date = selectedNote.date;
    const type = selectedNote.type || 'Update';
    const link = selectedNote.link;
    const content = selectedNote.content_text;
    
    let text = '';
    
    // We want to calculate how many characters we have left for the description text.
    // X (Twitter) has 280 characters.
    // Calculate template formats
    let staticLength = 0;
    if (selectedTemplate === 'default') {
        // Format: "BigQuery Release ({date}) - {type}:\n\n{content}\n\nLink: {link} #BigQuery #GoogleCloud"
        staticLength = `BigQuery Release (${date}) - ${type}:\n\n\n\nLink: ${link} #BigQuery #GoogleCloud`.length;
    } else if (selectedTemplate === 'excited') {
        // Format: "🚀 New BigQuery Update ({date})!\n{type}: {content}\n\nDetails: {link} #GCP #BigQuery"
        staticLength = `🚀 New BigQuery Update (${date})!\n${type}: \n\nDetails: ${link} #GCP #BigQuery`.length;
    } else if (selectedTemplate === 'tech') {
        // Format: "🛠️ BigQuery Developer Update ({type}):\n\n{content}\n\n🔗 {link} #GoogleCloud #BigQuery"
        staticLength = `🛠️ BigQuery Developer Update (${type}):\n\n\n\n🔗 ${link} #GoogleCloud #BigQuery`.length;
    }
    
    const maxSnippetLength = Math.max(50, 280 - staticLength - 5); // 5 characters buffer for safety & "..."
    
    let snippet = content;
    if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength) + '...';
    }
    
    if (selectedTemplate === 'default') {
        text = `BigQuery Release (${date}) - ${type}:\n\n${snippet}\n\nLink: ${link} #BigQuery #GoogleCloud`;
    } else if (selectedTemplate === 'excited') {
        text = `🚀 New BigQuery Update (${date})!\n${type}: ${snippet}\n\nDetails: ${link} #GCP #BigQuery`;
    } else if (selectedTemplate === 'tech') {
        text = `🛠️ BigQuery Developer Update (${type}):\n\n${snippet}\n\n🔗 ${link} #GoogleCloud #BigQuery`;
    }
    
    tweetTextarea.value = text;
    updateCharCounter();
}

function updateCharCounter() {
    const text = tweetTextarea.value;
    const length = text.length;
    const limit = 280;
    const remaining = limit - length;
    
    charCountSpan.textContent = remaining;
    
    // Color indicators
    if (remaining < 0) {
        charCountSpan.style.color = '#ef4444'; // Red
        submitTweetBtn.disabled = true;
    } else if (remaining < 20) {
        charCountSpan.style.color = '#f97316'; // Orange
        submitTweetBtn.disabled = false;
    } else {
        charCountSpan.style.color = 'var(--text-muted)';
        submitTweetBtn.disabled = false;
    }
    
    // Update progress ring offset
    if (progressCircle) {
        const percentage = Math.min(length / limit, 1);
        const offset = circumference - (percentage * circumference);
        progressCircle.style.strokeDashoffset = offset;
        
        // Progress bar color
        if (remaining < 0) {
            progressCircle.style.stroke = '#ef4444';
        } else if (remaining < 20) {
            progressCircle.style.stroke = '#f97316';
        } else {
            progressCircle.style.stroke = '#3b82f6';
        }
    }
}

function postToTwitter() {
    const text = tweetTextarea.value;
    if (!text || text.length > 280) return;
    
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank');
    closeTweetModal();
}
