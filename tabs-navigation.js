document.addEventListener('DOMContentLoaded', () => {
    // 1. Structural Fix: Move "Storms" section out of "Guide" section
    const stormsSec = document.getElementById('sec-storms');
    const mainContent = document.querySelector('.main-content');

    if (stormsSec && mainContent) {
        // Move it to be a direct child of main-content, making it a sibling of other sections
        mainContent.appendChild(stormsSec);
    }

    // 2. Tab System Initialization
    const tabs = document.querySelectorAll('.tab-button');
    const sections = [
        document.getElementById('sec-realtime'),
        document.getElementById('sec-analysis'),
        document.getElementById('sec-guide'),
        document.getElementById('sec-storms')
    ];

    function switchTab(targetId) {
        // Update Buttons
        tabs.forEach(tab => {
            if (tab.dataset.tab === targetId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update Sections
        sections.forEach(sec => {
            if (sec) {
                if (sec.id === targetId) {
                    sec.style.display = 'block';
                    // Trigger reflow/animation if needed
                    sec.style.opacity = '0';
                    setTimeout(() => sec.style.opacity = '1', 50);
                } else {
                    sec.style.display = 'none';
                }
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Add Click Listeners
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    // Initialize: Show first tab, hide others
    // Check if we have a hash in URL to open specific tab, otherwise default
    // Default to realtime
    switchTab('sec-realtime');

    // Add CSS transition for fade
    sections.forEach(sec => {
        if (sec) {
            sec.style.transition = 'opacity 0.3s ease';
        }
    });

    initializeScrollToTop();
});

function initializeScrollToTop() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (!scrollButton) {
        // Create if missing (backups might miss it)
        const btn = document.createElement('div');
        btn.className = 'scroll-to-top';
        btn.title = "Retour en haut";
        document.body.appendChild(btn);

        // Use the newly created one
        return initializeScrollToTop();
    }

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollButton.classList.add('visible');
        } else {
            scrollButton.classList.remove('visible');
        }
    });

    scrollButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
