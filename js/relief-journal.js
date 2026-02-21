/**
 * Relief Journal Manager - Daily tracking and progress visualization
 * Helps users monitor their tinnitus improvement over time
 */

class ReliefJournalManager {
    constructor() {
        this.entries = [];
        this.currentEntry = null;
        
        this.loadEntries();
        this.checkDailyCheckIn();
    }

    loadEntries() {
        const saved = localStorage.getItem('tinnitusJournalEntries');
        this.entries = saved ? JSON.parse(saved) : [];
    }

    saveEntries() {
        localStorage.setItem('tinnitusJournalEntries', JSON.stringify(this.entries));
    }

    init() {
        this.showJournalUI();
        this.bindEvents();
        this.renderChart();
    }

    checkDailyCheckIn() {
        const today = new Date().toDateString();
        const lastCheckIn = localStorage.getItem('tinnitusLastCheckIn');
        
        if (lastCheckIn !== today) {
            // Show daily check-in prompt after a delay
            setTimeout(() => this.showDailyCheckIn(), 5000);
        }
    }

    showDailyCheckIn() {
        // Prevent duplicate modals
        if (document.querySelector('.daily-checkin-modal')) return;

        const modal = document.createElement('div');
        modal.className = 'daily-checkin-modal';
        modal.innerHTML = `
            <div class="checkin-content">
                <button class="checkin-close" id="checkinClose">×</button>
                <div class="checkin-icon">📊</div>
                <h2>Daily Check-In</h2>
                <p>How is your tinnitus today?</p>
                
                <div class="severity-scale">
                    <div class="severity-labels">
                        <span>Better</span>
                        <span>Same</span>
                        <span>Worse</span>
                    </div>
                    <div class="severity-buttons" id="severityButtons">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
                            <button class="severity-btn" data-severity="${n}">
                                <span class="severity-number">${n}</span>
                            </button>
                        `).join('')}
                    </div>
                    <div class="severity-range-labels">
                        <span>1 (Minimal)</span>
                        <span>10 (Severe)</span>
                    </div>
                </div>
                
                <div class="checkin-notes">
                    <label>Notes (optional)</label>
                    <textarea id="checkinNotes" placeholder="Any observations? Sleep quality? Stress levels?" rows="3"></textarea>
                </div>
                
                <div class="checkin-tags">
                    <label>Quick Tags</label>
                    <div class="tags-group" id="checkinTags">
                        <button class="tag-btn" data-tag="good-sleep">😴 Good Sleep</button>
                        <button class="tag-btn" data-tag="bad-sleep">😫 Poor Sleep</button>
                        <button class="tag-btn" data-tag="stressed">😰 Stressed</button>
                        <button class="tag-btn" data-tag="relaxed">😌 Relaxed</button>
                        <button class="tag-btn" data-tag="loud-environment">🔊 Loud Day</button>
                        <button class="tag-btn" data-tag="quiet-environment">🤫 Quiet Day</button>
                    </div>
                </div>
                
                <button class="btn btn-start" id="saveCheckIn" disabled>Save Check-In</button>
                <button class="btn-text" id="skipCheckIn">Skip for today</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 100);
        
        let selectedSeverity = null;
        let selectedTags = [];
        
        // Bind severity buttons
        modal.querySelectorAll('.severity-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSeverity = parseInt(btn.dataset.severity);
                document.getElementById('saveCheckIn').disabled = false;
            });
        });
        
        // Bind tag buttons
        modal.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('selected');
                const tag = btn.dataset.tag;
                if (selectedTags.includes(tag)) {
                    selectedTags = selectedTags.filter(t => t !== tag);
                } else {
                    selectedTags.push(tag);
                }
            });
        });
        
        // Save button
        document.getElementById('saveCheckIn').addEventListener('click', () => {
            const notes = document.getElementById('checkinNotes').value.trim();
            this.addEntry(selectedSeverity, notes, selectedTags);
            this.closeModal(modal);
            this.showThankYou();
        });
        
        // Close and skip buttons
        document.getElementById('checkinClose').addEventListener('click', () => {
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
            this.closeModal(modal);
        });
        document.getElementById('skipCheckIn').addEventListener('click', () => {
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
            this.closeModal(modal);
        });
    }

    addEntry(severity, notes, tags) {
        const entry = {
            date: new Date().toISOString(),
            severity: severity,
            notes: notes,
            tags: tags || []
        };
        
        this.entries.push(entry);
        this.saveEntries();
        localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
        
        // Update chart if visible
        this.renderChart();
    }

    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }

    showThankYou() {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✅</span>
                <span class="toast-message">Daily check-in saved!</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('visible'), 100);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showJournalUI() {
        // Create journal panel in the session panel area
        const sessionPanel = document.querySelector('.session-panel');
        if (!sessionPanel) return;
        
        const journalPanel = document.createElement('div');
        journalPanel.className = 'journal-panel';
        journalPanel.innerHTML = `
            <div class="journal-header">
                <h3>📊 Relief Journal</h3>
                <button class="btn btn-small" id="addJournalEntry">+ New Entry</button>
            </div>
            
            <div class="journal-chart-container">
                <canvas id="journalChart"></canvas>
            </div>
            
            <div class="journal-stats">
                <div class="stat">
                    <span class="stat-value" id="avgSeverity">-</span>
                    <span class="stat-label">Avg Severity (7 days)</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="trendIndicator">-</span>
                    <span class="stat-label">Trend</span>
                </div>
                <div class="stat">
                    <span class="stat-value" id="totalEntries">-</span>
                    <span class="stat-label">Total Entries</span>
                </div>
            </div>
            
            <div class="journal-entries" id="journalEntries">
                <h4>Recent Entries</h4>
                <div class="entries-list" id="entriesList"></div>
            </div>
            
            <div class="journal-actions">
                <button class="btn btn-small" id="exportJournal">📄 Export Report</button>
                <button class="btn btn-small" id="viewAllEntries">View All</button>
            </div>
        `;
        
        sessionPanel.after(journalPanel);
    }

    bindEvents() {
        document.getElementById('addJournalEntry')?.addEventListener('click', () => {
            this.showDailyCheckIn();
        });
        
        document.getElementById('exportJournal')?.addEventListener('click', () => {
            this.exportReport();
        });
        
        document.getElementById('viewAllEntries')?.addEventListener('click', () => {
            this.showAllEntries();
        });
    }

    renderChart() {
        const canvas = document.getElementById('journalChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 400;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (this.entries.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No entries yet', width / 2, height / 2);
            return;
        }
        
        // Get last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentEntries = this.entries
            .filter(e => new Date(e.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (recentEntries.length === 0) return;
        
        // Draw chart
        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Draw axes
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw Y-axis labels (severity 1-10)
        ctx.fillStyle = '#999';
        ctx.font = '24px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i += 2) {
            const y = height - padding - (i / 10) * chartHeight;
            ctx.fillText(i.toString(), padding - 10, y + 8);
            
            // Grid lines
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Plot data points and line
        const xStep = chartWidth / (recentEntries.length - 1 || 1);
        
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        recentEntries.forEach((entry, index) => {
            const x = padding + index * xStep;
            const y = height - padding - ((entry.severity / 10) * chartHeight);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw data points
        recentEntries.forEach((entry, index) => {
            const x = padding + index * xStep;
            const y = height - padding - ((entry.severity / 10) * chartHeight);
            
            // Point circle
            ctx.fillStyle = '#00d4ff';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Point border
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Update stats
        this.updateStats(recentEntries);
        this.renderEntriesList();
    }

    updateStats(entries) {
        const last7Days = entries.slice(-7);
        
        // Average severity
        if (last7Days.length > 0) {
            const avg = last7Days.reduce((sum, e) => sum + e.severity, 0) / last7Days.length;
            document.getElementById('avgSeverity').textContent = avg.toFixed(1);
        }
        
        // Trend
        if (last7Days.length >= 2) {
            const first = last7Days[0].severity;
            const last = last7Days[last7Days.length - 1].severity;
            const diff = first - last;
            
            let trendText = '';
            if (diff > 1) {
                trendText = '📉 Improving';
                document.getElementById('trendIndicator').style.color = '#00cc66';
            } else if (diff < -1) {
                trendText = '📈 Worsening';
                document.getElementById('trendIndicator').style.color = '#ff4444';
            } else {
                trendText = '➡️ Stable';
                document.getElementById('trendIndicator').style.color = '#ffaa00';
            }
            
            document.getElementById('trendIndicator').textContent = trendText;
        }
        
        // Total entries
        document.getElementById('totalEntries').textContent = this.entries.length;
    }

    renderEntriesList() {
        const list = document.getElementById('entriesList');
        if (!list) return;
        
        const recent = this.entries.slice(-5).reverse();
        
        if (recent.length === 0) {
            list.innerHTML = '<p class="no-entries">No entries yet. Start your first daily check-in!</p>';
            return;
        }
        
        list.innerHTML = recent.map(entry => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const severity = entry.severity;
            const severityClass = severity <= 3 ? 'low' : severity <= 6 ? 'medium' : 'high';
            
            return `
                <div class="entry-item">
                    <div class="entry-header">
                        <span class="entry-date">${dateStr}</span>
                        <span class="entry-severity severity-${severityClass}">${severity}/10</span>
                    </div>
                    ${entry.notes ? `<p class="entry-notes">${entry.notes}</p>` : ''}
                    ${entry.tags && entry.tags.length > 0 ? `
                        <div class="entry-tags">
                            ${entry.tags.map(tag => `<span class="entry-tag">${this.getTagLabel(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    getTagLabel(tag) {
        const labels = {
            'good-sleep': '😴',
            'bad-sleep': '😫',
            'stressed': '😰',
            'relaxed': '😌',
            'loud-environment': '🔊',
            'quiet-environment': '🤫'
        };
        return labels[tag] || tag;
    }

    exportReport() {
        if (this.entries.length === 0) {
            alert('No entries to export yet. Start tracking first!');
            return;
        }
        
        // Create text report
        let report = 'TINNITUSSAURUS JOURNAL - PROGRESS REPORT\n';
        report += '='.repeat(50) + '\n\n';
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Total Entries: ${this.entries.length}\n\n`;
        
        // Calculate stats
        const allSeverities = this.entries.map(e => e.severity);
        const avgSeverity = allSeverities.reduce((a, b) => a + b, 0) / allSeverities.length;
        const minSeverity = Math.min(...allSeverities);
        const maxSeverity = Math.max(...allSeverities);
        
        report += `SUMMARY STATISTICS\n`;
        report += `-`.repeat(50) + '\n';
        report += `Average Severity: ${avgSeverity.toFixed(1)}/10\n`;
        report += `Best Day: ${minSeverity}/10\n`;
        report += `Worst Day: ${maxSeverity}/10\n\n`;
        
        report += `DETAILED ENTRIES\n`;
        report += `-`.repeat(50) + '\n\n';
        
        this.entries.forEach(entry => {
            const date = new Date(entry.date).toLocaleString();
            report += `Date: ${date}\n`;
            report += `Severity: ${entry.severity}/10\n`;
            if (entry.notes) report += `Notes: ${entry.notes}\n`;
            if (entry.tags && entry.tags.length > 0) report += `Tags: ${entry.tags.join(', ')}\n`;
            report += '\n';
        });
        
        // Download as text file
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tinnitus-journal-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('Journal exported successfully!');
    }

    showAllEntries() {
        // Create modal with all entries
        const modal = document.createElement('div');
        modal.className = 'journal-all-entries-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" id="closeAllEntries">×</button>
                <h2>📊 All Journal Entries</h2>
                <div class="all-entries-list">
                    ${this.entries.length === 0 ? '<p>No entries yet.</p>' : 
                        this.entries.slice().reverse().map(entry => {
                            const date = new Date(entry.date).toLocaleString();
                            return `
                                <div class="entry-item-detailed">
                                    <div class="entry-date-full">${date}</div>
                                    <div class="entry-severity-large">${entry.severity}/10</div>
                                    ${entry.notes ? `<div class="entry-notes-full">${entry.notes}</div>` : ''}
                                    ${entry.tags && entry.tags.length > 0 ? `
                                        <div class="entry-tags-full">
                                            ${entry.tags.map(t => `<span>${this.getTagLabel(t)}</span>`).join(' ')}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 100);
        
        document.getElementById('closeAllEntries').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    }
}
window.ReliefJournalManager = ReliefJournalManager;
export { ReliefJournalManager };
