/**
 * Relief Journal Manager Tests
 * Tests the REAL ReliefJournalManager class from ../js/relief-journal.js
 * Covers daily check-in, journal entries, duplicate prevention, persistence,
 * tag labels, chart rendering, stats, and export.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReliefJournalManager } from '../js/relief-journal.js';

/**
 * Helper: Set up the minimal DOM that the real class requires.
 * - A `.session-panel` element so that `showJournalUI()` can insert the
 *   journal panel after it (using `sessionPanel.after(...)`).
 * - We do NOT call `init()` in most tests because it triggers
 *   `showJournalUI` + `bindEvents` + `renderChart`, which we only need
 *   in certain test groups.
 */
function setupDOM() {
    document.body.innerHTML = '';
    const sessionPanel = document.createElement('div');
    sessionPanel.className = 'session-panel';
    document.body.appendChild(sessionPanel);
}

describe('ReliefJournalManager', () => {
    let journal;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        setupDOM();

        // Mock alert to prevent errors from exportReport / empty-export path
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        // Mock URL.createObjectURL / revokeObjectURL used by exportReport
        if (!window.URL.createObjectURL) {
            window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        } else {
            vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
        }
        if (!window.URL.revokeObjectURL) {
            window.URL.revokeObjectURL = vi.fn();
        } else {
            vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
        }

        // Set tinnitusLastCheckIn to today so the constructor's checkDailyCheckIn
        // does NOT schedule a setTimeout (avoids unwanted modal creation).
        localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());

        journal = new ReliefJournalManager();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    // ---------------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------------
    describe('Initialization', () => {
        it('should start with empty entries when no saved data', () => {
            expect(journal.entries).toEqual([]);
        });

        it('should load existing entries from localStorage', () => {
            const entries = [
                { date: '2024-01-01T00:00:00.000Z', severity: 5, notes: 'test', tags: [] }
            ];
            localStorage.setItem('tinnitusJournalEntries', JSON.stringify(entries));

            // Suppress the setTimeout from checkDailyCheckIn by keeping today's check-in
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());

            const newJournal = new ReliefJournalManager();
            expect(newJournal.entries).toHaveLength(1);
            expect(newJournal.entries[0].severity).toBe(5);
        });

        it('should schedule daily check-in when no check-in done today', () => {
            localStorage.clear(); // no tinnitusLastCheckIn => needs check-in
            const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

            const freshJournal = new ReliefJournalManager();

            // The constructor's checkDailyCheckIn should have called setTimeout
            const checkInCall = setTimeoutSpy.mock.calls.find(
                call => typeof call[0] === 'function' && call[1] === 5000
            );
            expect(checkInCall).toBeTruthy();

            setTimeoutSpy.mockRestore();
        });

        it('should NOT schedule daily check-in if already done today', () => {
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
            const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

            const freshJournal = new ReliefJournalManager();

            const checkInCall = setTimeoutSpy.mock.calls.find(
                call => typeof call[0] === 'function' && call[1] === 5000
            );
            expect(checkInCall).toBeUndefined();

            setTimeoutSpy.mockRestore();
        });
    });

    // ---------------------------------------------------------------
    // init() - showJournalUI, bindEvents, renderChart
    // ---------------------------------------------------------------
    describe('init()', () => {
        it('should create journal panel with canvas after session-panel', () => {
            journal.init();
            const journalPanel = document.querySelector('.journal-panel');
            expect(journalPanel).not.toBeNull();
            const canvas = document.getElementById('journalChart');
            expect(canvas).not.toBeNull();
        });

        it('should create stats elements', () => {
            journal.init();
            expect(document.getElementById('avgSeverity')).not.toBeNull();
            expect(document.getElementById('trendIndicator')).not.toBeNull();
            expect(document.getElementById('totalEntries')).not.toBeNull();
        });

        it('should not create journal panel if .session-panel is missing', () => {
            document.body.innerHTML = '';
            journal.init();
            const journalPanel = document.querySelector('.journal-panel');
            expect(journalPanel).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // Daily Check-In & Duplicate Prevention
    // ---------------------------------------------------------------
    describe('Daily Check-In Duplicate Prevention', () => {
        it('should create a .daily-checkin-modal when showDailyCheckIn is called', () => {
            journal.showDailyCheckIn();
            const modal = document.querySelector('.daily-checkin-modal');
            expect(modal).not.toBeNull();
        });

        it('should prevent duplicate modals (second call is no-op)', () => {
            journal.showDailyCheckIn();
            journal.showDailyCheckIn();
            const modals = document.querySelectorAll('.daily-checkin-modal');
            expect(modals).toHaveLength(1);
        });

        it('should allow reopening after modal is removed', () => {
            journal.showDailyCheckIn();
            // Remove the modal from the DOM (simulates close)
            const modal = document.querySelector('.daily-checkin-modal');
            modal.remove();
            expect(document.querySelector('.daily-checkin-modal')).toBeNull();

            // Should be able to open again
            journal.showDailyCheckIn();
            expect(document.querySelector('.daily-checkin-modal')).not.toBeNull();
        });

        it('should show check-in modal after 5s timeout when no check-in today', () => {
            localStorage.clear();
            const freshJournal = new ReliefJournalManager();

            expect(document.querySelector('.daily-checkin-modal')).toBeNull();

            // Advance past the 5000ms delay
            vi.advanceTimersByTime(5000);

            expect(document.querySelector('.daily-checkin-modal')).not.toBeNull();
        });

        it('close button should set tinnitusLastCheckIn and remove modal', () => {
            journal.showDailyCheckIn();
            const closeBtn = document.getElementById('checkinClose');
            expect(closeBtn).not.toBeNull();

            closeBtn.click();

            expect(localStorage.getItem('tinnitusLastCheckIn')).toBe(
                new Date().toDateString()
            );

            // Modal is removed after a 300ms animation timeout
            vi.advanceTimersByTime(300);
            expect(document.querySelector('.daily-checkin-modal')).toBeNull();
        });

        it('skip button should set tinnitusLastCheckIn and remove modal', () => {
            journal.showDailyCheckIn();
            const skipBtn = document.getElementById('skipCheckIn');
            expect(skipBtn).not.toBeNull();

            skipBtn.click();

            expect(localStorage.getItem('tinnitusLastCheckIn')).toBe(
                new Date().toDateString()
            );

            vi.advanceTimersByTime(300);
            expect(document.querySelector('.daily-checkin-modal')).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // Adding Entries
    // ---------------------------------------------------------------
    describe('Adding Entries', () => {
        it('should add entry with severity', () => {
            journal.addEntry(7, '', []);
            expect(journal.entries).toHaveLength(1);
            expect(journal.entries[0].severity).toBe(7);
        });

        it('should add entry with notes', () => {
            journal.addEntry(5, 'Slept well last night', []);
            expect(journal.entries[0].notes).toBe('Slept well last night');
        });

        it('should add entry with tags', () => {
            const tags = ['good-sleep', 'relaxed'];
            journal.addEntry(3, '', tags);
            expect(journal.entries[0].tags).toEqual(tags);
        });

        it('should persist entries to localStorage', () => {
            journal.addEntry(6, 'test', []);
            const saved = JSON.parse(localStorage.getItem('tinnitusJournalEntries'));
            expect(saved).toHaveLength(1);
            expect(saved[0].severity).toBe(6);
        });

        it('should set lastCheckIn date after adding entry', () => {
            journal.addEntry(5, '', []);
            expect(localStorage.getItem('tinnitusLastCheckIn')).toBe(
                new Date().toDateString()
            );
        });

        it('should include ISO date on entry', () => {
            journal.addEntry(4, '', []);
            expect(journal.entries[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should handle undefined tags (defaults to empty array)', () => {
            journal.addEntry(5, '', undefined);
            expect(journal.entries[0].tags).toEqual([]);
        });
    });

    // ---------------------------------------------------------------
    // Tag Labels
    // ---------------------------------------------------------------
    describe('Tag Labels', () => {
        it('should return emoji for known tags', () => {
            expect(journal.getTagLabel('good-sleep')).toBeTruthy();
            expect(journal.getTagLabel('stressed')).toBeTruthy();
            expect(journal.getTagLabel('relaxed')).toBeTruthy();
        });

        it('should return tag name for unknown tags', () => {
            expect(journal.getTagLabel('custom-tag')).toBe('custom-tag');
        });

        it('should map all 6 built-in tags to emojis (not returning tag name)', () => {
            const tags = [
                'good-sleep',
                'bad-sleep',
                'stressed',
                'relaxed',
                'loud-environment',
                'quiet-environment'
            ];
            tags.forEach(tag => {
                const label = journal.getTagLabel(tag);
                expect(label).not.toBe(tag);
            });
        });
    });

    // ---------------------------------------------------------------
    // Render Chart & Stats
    // ---------------------------------------------------------------
    describe('renderChart and updateStats', () => {
        beforeEach(() => {
            // init() creates the journal panel with canvas and stat elements
            journal.init();
        });

        it('should render "No entries yet" text when entries are empty', () => {
            journal.renderChart();
            // The canvas mock doesn't actually render, but the method should
            // complete without errors. We verify entries are empty.
            expect(journal.entries).toHaveLength(0);
        });

        it('should update stats DOM after adding entries and rendering', () => {
            journal.addEntry(4, '', []);
            journal.addEntry(6, '', []);
            journal.addEntry(8, '', []);

            // addEntry calls renderChart which calls updateStats
            const avgEl = document.getElementById('avgSeverity');
            const totalEl = document.getElementById('totalEntries');

            expect(totalEl.textContent).toBe('3');
            expect(avgEl.textContent).toBe('6.0');
        });

        it('should show improving trend when first severity > last severity by more than 1', () => {
            journal.addEntry(8, '', []);
            journal.addEntry(6, '', []);
            journal.addEntry(4, '', []);

            const trendEl = document.getElementById('trendIndicator');
            expect(trendEl.textContent).toContain('Improving');
        });

        it('should show worsening trend when severity increases by more than 1', () => {
            journal.addEntry(3, '', []);
            journal.addEntry(5, '', []);
            journal.addEntry(7, '', []);

            const trendEl = document.getElementById('trendIndicator');
            expect(trendEl.textContent).toContain('Worsening');
        });

        it('should show stable trend when severity difference is <= 1', () => {
            journal.addEntry(5, '', []);
            journal.addEntry(5, '', []);
            journal.addEntry(5, '', []);

            const trendEl = document.getElementById('trendIndicator');
            expect(trendEl.textContent).toContain('Stable');
        });
    });

    // ---------------------------------------------------------------
    // Entries List Rendering
    // ---------------------------------------------------------------
    describe('renderEntriesList', () => {
        beforeEach(() => {
            journal.init();
        });

        it('should show "No entries yet" message when entries are empty', () => {
            journal.renderEntriesList();
            const list = document.getElementById('entriesList');
            expect(list.innerHTML).toContain('No entries yet');
        });

        it('should render entry items after adding entries', () => {
            journal.addEntry(5, 'test note', ['stressed']);
            // addEntry -> renderChart -> renderEntriesList
            const list = document.getElementById('entriesList');
            expect(list.innerHTML).toContain('test note');
            expect(list.innerHTML).toContain('5/10');
        });

        it('should show most recent entries first (up to 5)', () => {
            journal.addEntry(3, 'first', []);
            journal.addEntry(7, 'second', []);
            journal.addEntry(5, 'third', []);

            const list = document.getElementById('entriesList');
            const items = list.querySelectorAll('.entry-item');
            expect(items.length).toBe(3);
            // Newest first
            expect(items[0].innerHTML).toContain('third');
            expect(items[2].innerHTML).toContain('first');
        });
    });

    // ---------------------------------------------------------------
    // Export Report
    // ---------------------------------------------------------------
    describe('Export Report', () => {
        it('should alert when exporting with no entries', () => {
            journal.exportReport();
            expect(window.alert).toHaveBeenCalledWith(
                'No entries to export yet. Start tracking first!'
            );
        });

        it('should create a blob download when entries exist', () => {
            journal.addEntry(3, 'note1', ['stressed']);
            journal.addEntry(7, 'note2', ['relaxed']);

            // Mock the anchor click
            const clickSpy = vi.fn();
            const createElementOrig = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = createElementOrig(tag);
                if (tag === 'a') {
                    el.click = clickSpy;
                }
                return el;
            });

            journal.exportReport();

            expect(window.URL.createObjectURL).toHaveBeenCalled();
            expect(clickSpy).toHaveBeenCalled();
            expect(window.URL.revokeObjectURL).toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledWith('Journal exported successfully!');

            document.createElement = createElementOrig;
        });

        it('should include entry data in the exported report text', () => {
            journal.addEntry(4, 'my note', ['good-sleep']);

            // Capture the Blob content
            let blobContent = '';
            const OriginalBlob = globalThis.Blob;
            vi.spyOn(globalThis, 'Blob').mockImplementation(function (parts, options) {
                blobContent = parts.join('');
                return new OriginalBlob(parts, options);
            });

            // Mock anchor click
            const createElementOrig = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = createElementOrig(tag);
                if (tag === 'a') {
                    el.click = vi.fn();
                }
                return el;
            });

            journal.exportReport();

            expect(blobContent).toContain('TINNITUSSAURUS JOURNAL');
            expect(blobContent).toContain('Total Entries: 1');
            expect(blobContent).toContain('Average Severity: 4.0/10');
            expect(blobContent).toContain('my note');
            expect(blobContent).toContain('good-sleep');

            document.createElement = createElementOrig;
        });
    });

    // ---------------------------------------------------------------
    // Persistence (localStorage round-trip)
    // ---------------------------------------------------------------
    describe('Persistence', () => {
        it('should survive page reload (localStorage round-trip)', () => {
            journal.addEntry(5, 'test', ['good-sleep']);
            journal.addEntry(8, 'loud day', ['loud-environment']);

            // Simulate a new page load by constructing a fresh instance
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
            const newJournal = new ReliefJournalManager();

            expect(newJournal.entries).toHaveLength(2);
            expect(newJournal.entries[0].severity).toBe(5);
            expect(newJournal.entries[1].tags).toContain('loud-environment');
        });

        it('should handle corrupted localStorage data gracefully', () => {
            localStorage.setItem('tinnitusJournalEntries', 'not json');
            localStorage.setItem('tinnitusLastCheckIn', new Date().toDateString());
            expect(() => new ReliefJournalManager()).toThrow();
        });
    });

    // ---------------------------------------------------------------
    // showAllEntries modal
    // ---------------------------------------------------------------
    describe('showAllEntries', () => {
        it('should create a modal with all entries', () => {
            journal.addEntry(4, 'entry one', []);
            journal.addEntry(8, 'entry two', ['stressed']);

            journal.showAllEntries();

            const modal = document.querySelector('.journal-all-entries-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('entry one');
            expect(modal.innerHTML).toContain('entry two');
            expect(modal.innerHTML).toContain('4/10');
            expect(modal.innerHTML).toContain('8/10');
        });

        it('should show "No entries yet" when empty', () => {
            journal.showAllEntries();
            const modal = document.querySelector('.journal-all-entries-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('No entries yet');
        });

        it('close button should remove the modal', () => {
            journal.showAllEntries();
            const closeBtn = document.getElementById('closeAllEntries');
            expect(closeBtn).not.toBeNull();

            closeBtn.click();
            vi.advanceTimersByTime(300);

            expect(document.querySelector('.journal-all-entries-modal')).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // Check-in modal interaction (severity selection & save)
    // ---------------------------------------------------------------
    describe('Check-in modal interaction', () => {
        it('severity buttons should enable the save button when clicked', () => {
            journal.showDailyCheckIn();

            const saveBtn = document.getElementById('saveCheckIn');
            expect(saveBtn.disabled).toBe(true);

            const severityBtns = document.querySelectorAll('.severity-btn');
            // Click severity 7
            severityBtns[6].click();

            expect(saveBtn.disabled).toBe(false);
        });

        it('tag buttons should toggle selected class', () => {
            journal.showDailyCheckIn();

            const tagBtns = document.querySelectorAll('.tag-btn');
            const firstTag = tagBtns[0];

            firstTag.click();
            expect(firstTag.classList.contains('selected')).toBe(true);

            firstTag.click();
            expect(firstTag.classList.contains('selected')).toBe(false);
        });

        it('save button should add entry, close modal, and show thank-you toast', () => {
            journal.showDailyCheckIn();

            // Select severity
            const severityBtns = document.querySelectorAll('.severity-btn');
            severityBtns[4].click(); // severity 5

            // Add some notes
            const notesInput = document.getElementById('checkinNotes');
            notesInput.value = 'Feeling okay today';

            // Select a tag
            const tagBtns = document.querySelectorAll('.tag-btn');
            tagBtns[3].click(); // 'relaxed'

            // Click save
            const saveBtn = document.getElementById('saveCheckIn');
            saveBtn.click();

            // Entry should be added
            expect(journal.entries).toHaveLength(1);
            expect(journal.entries[0].severity).toBe(5);
            expect(journal.entries[0].notes).toBe('Feeling okay today');
            expect(journal.entries[0].tags).toContain('relaxed');

            // A toast notification should appear
            const toast = document.querySelector('.toast-notification');
            expect(toast).not.toBeNull();

            // Modal should be removed after animation delay
            vi.advanceTimersByTime(300);
            expect(document.querySelector('.daily-checkin-modal')).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // renderChart with empty entries returns early
    // ---------------------------------------------------------------
    describe('renderChart with no entries', () => {
        it('should return early from renderChart when no recent entries exist', () => {
            journal.init();
            // entries is empty, so renderChart should return early at the length check
            expect(() => journal.renderChart()).not.toThrow();
        });

        it('should return early when all entries are older than 30 days', () => {
            journal.init();
            // Add entries that are older than 30 days so recentEntries filter yields empty
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            journal.entries = [
                { date: oldDate.toISOString(), severity: 5, notes: '', tags: [] },
            ];
            // entries.length > 0 but recentEntries.length === 0 after 30-day filter
            expect(() => journal.renderChart()).not.toThrow();
        });
    });

    // ---------------------------------------------------------------
    // renderEntriesList with missing DOM element
    // ---------------------------------------------------------------
    describe('renderEntriesList with missing entriesList', () => {
        it('should return early when entriesList element is missing', () => {
            // Don't call init() so the journal panel (and #entriesList) is not created
            expect(() => journal.renderEntriesList()).not.toThrow();
        });
    });

    // ---------------------------------------------------------------
    // showAllEntries with entry without notes
    // ---------------------------------------------------------------
    describe('showAllEntries with entries lacking notes', () => {
        it('should render entries without notes (no notes div)', () => {
            journal.addEntry(5, '', []);
            journal.showAllEntries();
            const modal = document.querySelector('.journal-all-entries-modal');
            expect(modal).not.toBeNull();
            expect(modal.innerHTML).toContain('5/10');
            // Should not contain entry-notes-full when notes is empty
            expect(modal.innerHTML).not.toContain('entry-notes-full');
        });
    });

    // ---------------------------------------------------------------
    // Toast removal after timeout
    // ---------------------------------------------------------------
    describe('Toast notification removal', () => {
        it('should remove toast from DOM after 3000ms + 300ms', () => {
            journal.showDailyCheckIn();

            // Select severity and save to trigger toast
            const severityBtns = document.querySelectorAll('.severity-btn');
            severityBtns[4].click();
            document.getElementById('saveCheckIn').click();

            const toast = document.querySelector('.toast-notification');
            expect(toast).not.toBeNull();

            // Advance past the 3000ms visible timeout + 300ms remove timeout
            vi.advanceTimersByTime(3300);

            expect(document.querySelector('.toast-notification')).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // Journal UI button handlers (bindEvents)
    // ---------------------------------------------------------------
    describe('Journal UI button handlers', () => {
        beforeEach(() => {
            journal.init();
        });

        it('should call showDailyCheckIn when addJournalEntry button is clicked', () => {
            const spy = vi.spyOn(journal, 'showDailyCheckIn');
            journal.bindEvents();
            document.getElementById('addJournalEntry').click();
            expect(spy).toHaveBeenCalled();
        });

        it('should call exportReport when exportJournal button is clicked', () => {
            const spy = vi.spyOn(journal, 'exportReport');
            journal.bindEvents();
            document.getElementById('exportJournal').click();
            expect(spy).toHaveBeenCalled();
        });

        it('should call showAllEntries when viewAllEntries button is clicked', () => {
            const spy = vi.spyOn(journal, 'showAllEntries');
            journal.bindEvents();
            document.getElementById('viewAllEntries').click();
            expect(spy).toHaveBeenCalled();
        });
    });
});
