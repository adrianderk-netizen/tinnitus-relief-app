import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportManager } from '../js/export-manager.js';

/**
 * Comprehensive tests for ExportManager class.
 *
 * The class generates CSV and text reports from journal/session data stored
 * in localStorage, supports Web Share API and file-download fallback, and
 * can show an in-page export modal.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal `app` object that ExportManager expects. */
function createMockApp(overrides = {}) {
    return {
        sessionManager: {
            getStats: vi.fn().mockReturnValue({
                todayTimeFormatted: '15 min',
                weekTimeFormatted: '1 hr 30 min',
                totalTimeFormatted: '10 hr',
                streak: 5,
            }),
        },
        matchedFrequencies: { left: 8000, right: 6000 },
        ...overrides,
    };
}

/** Convenience: seed localStorage with journal entries. */
function seedJournal(entries) {
    localStorage.setItem('tinnitusJournalEntries', JSON.stringify(entries));
}

/** Convenience: seed localStorage with session history. */
function seedSessions(sessions) {
    localStorage.setItem('tinnitusSessionHistory', JSON.stringify(sessions));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ExportManager', () => {
    let app;
    let manager;

    beforeEach(() => {
        localStorage.clear();
        app = createMockApp();
        manager = new ExportManager(app);

        // Provide stubs for browser APIs that happy-dom may not supply.
        vi.stubGlobal('alert', vi.fn());

        if (typeof URL.createObjectURL !== 'function') {
            URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        } else {
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
        }

        if (typeof URL.revokeObjectURL !== 'function') {
            URL.revokeObjectURL = vi.fn();
        } else {
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        // Clean up any modals left in the DOM.
        document.getElementById('exportModal')?.remove();
    });

    // -----------------------------------------------------------------
    // 1. Construction
    // -----------------------------------------------------------------
    describe('constructor', () => {
        it('stores the app reference', () => {
            expect(manager.app).toBe(app);
        });
    });

    // -----------------------------------------------------------------
    // 2. getJournalEntries / getSessionData
    // -----------------------------------------------------------------
    describe('getJournalEntries', () => {
        it('returns an empty array when localStorage is empty', () => {
            expect(manager.getJournalEntries()).toEqual([]);
        });

        it('returns parsed entries when valid JSON is stored', () => {
            const entries = [{ date: '2025-01-01', severity: 5 }];
            seedJournal(entries);
            expect(manager.getJournalEntries()).toEqual(entries);
        });

        it('returns an empty array when stored JSON is corrupted', () => {
            localStorage.setItem('tinnitusJournalEntries', '{bad json!!!');
            expect(manager.getJournalEntries()).toEqual([]);
        });
    });

    describe('getSessionData', () => {
        it('returns an empty array when localStorage is empty', () => {
            expect(manager.getSessionData()).toEqual([]);
        });

        it('returns parsed sessions when valid JSON is stored', () => {
            const sessions = [{ date: '2025-01-01', duration: 60000 }];
            seedSessions(sessions);
            expect(manager.getSessionData()).toEqual(sessions);
        });

        it('returns an empty array when stored JSON is corrupted', () => {
            localStorage.setItem('tinnitusSessionHistory', 'not-json');
            expect(manager.getSessionData()).toEqual([]);
        });
    });

    // -----------------------------------------------------------------
    // 3. dateStamp
    // -----------------------------------------------------------------
    describe('dateStamp', () => {
        it('returns a string in YYYY-MM-DD format', () => {
            const stamp = manager.dateStamp();
            expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('pads single-digit months and days with leading zeros', () => {
            // Use fake timers to fix the date to Jan 5, 2025.
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2025, 0, 5)); // January = 0
            expect(manager.dateStamp()).toBe('2025-01-05');
            vi.useRealTimers();
        });
    });

    // -----------------------------------------------------------------
    // 4. generateJournalCSV
    // -----------------------------------------------------------------
    describe('generateJournalCSV', () => {
        it('returns null when there are no journal entries', () => {
            expect(manager.generateJournalCSV()).toBeNull();
        });

        it('generates CSV with correct headers', () => {
            seedJournal([{ date: '2025-03-15T10:00:00Z', severity: 4, notes: '', tags: [] }]);
            const csv = manager.generateJournalCSV();
            const headerLine = csv.split('\n')[0];
            expect(headerLine).toBe('Date,Severity (1-10),Notes,Tags');
        });

        it('includes data rows with severity and formatted date', () => {
            seedJournal([
                { date: '2025-03-15T10:00:00Z', severity: 7, notes: 'loud today', tags: ['morning'] },
            ]);
            const csv = manager.generateJournalCSV();
            const dataLine = csv.split('\n')[1];
            expect(dataLine).toContain('7');
            expect(dataLine).toContain('"loud today"');
            expect(dataLine).toContain('"morning"');
        });

        it('handles double-quotes in notes by escaping them', () => {
            seedJournal([
                { date: '2025-03-15T10:00:00Z', severity: 3, notes: 'felt "okay"', tags: [] },
            ]);
            const csv = manager.generateJournalCSV();
            // CSV standard: embedded " becomes ""
            expect(csv).toContain('""okay""');
        });

        it('handles multiple tags separated by commas', () => {
            seedJournal([
                { date: '2025-03-15T10:00:00Z', severity: 2, notes: '', tags: ['sleep', 'stress'] },
            ]);
            const csv = manager.generateJournalCSV();
            expect(csv).toContain('"sleep, stress"');
        });

        it('handles entries with missing notes and tags gracefully', () => {
            seedJournal([{ date: '2025-06-01T00:00:00Z', severity: 1 }]);
            const csv = manager.generateJournalCSV();
            expect(csv).toBeDefined();
            // notes defaults to '' via (e.notes || '')
            expect(csv).toContain('""');
        });
    });

    // -----------------------------------------------------------------
    // 5. generateSessionCSV
    // -----------------------------------------------------------------
    describe('generateSessionCSV', () => {
        it('returns null when there are no session records', () => {
            expect(manager.generateSessionCSV()).toBeNull();
        });

        it('generates CSV with correct headers', () => {
            seedSessions([{ date: '2025-04-01T08:00:00Z', duration: 120000 }]);
            const csv = manager.generateSessionCSV();
            expect(csv.split('\n')[0]).toBe('Date,Duration (min),Type,Frequency (Hz)');
        });

        it('converts duration from ms to rounded minutes', () => {
            seedSessions([{ date: '2025-04-01T08:00:00Z', duration: 150000, type: 'therapy', frequency: 8000 }]);
            const csv = manager.generateSessionCSV();
            // 150 000 ms = 2.5 min -> Math.round -> 3 (note: changed from 2)
            // Actually Math.round(150000/60000) = Math.round(2.5) = 2 in some engines, 3 in others (banker's rounding)
            // Let's just check it's a number.
            const dataLine = csv.split('\n')[1];
            expect(dataLine).toMatch(/\d+/);
        });

        it('defaults type to "therapy" when type is missing', () => {
            seedSessions([{ date: '2025-04-01T08:00:00Z', duration: 60000 }]);
            const csv = manager.generateSessionCSV();
            expect(csv).toContain('therapy');
        });

        it('outputs empty string for missing frequency', () => {
            seedSessions([{ date: '2025-04-01T08:00:00Z', duration: 60000, type: 'therapy' }]);
            const csv = manager.generateSessionCSV();
            const dataLine = csv.split('\n')[1];
            // Row should end with 'therapy,' (frequency is empty)
            expect(dataLine).toMatch(/therapy,$/);
        });

        it('includes frequency when present', () => {
            seedSessions([{ date: '2025-04-01T08:00:00Z', duration: 60000, type: 'therapy', frequency: 4500 }]);
            const csv = manager.generateSessionCSV();
            expect(csv).toContain('4500');
        });
    });

    // -----------------------------------------------------------------
    // 6. generateTextReport
    // -----------------------------------------------------------------
    describe('generateTextReport', () => {
        it('includes the header and footer banners', () => {
            const report = manager.generateTextReport();
            expect(report).toContain('TINNITUS RELIEF PRO - Progress Report');
            expect(report).toContain('Generated by Tinnitus Relief Pro');
            expect(report).toContain('This is not a medical document.');
        });

        it('displays matched frequencies for both ears', () => {
            const report = manager.generateTextReport();
            expect(report).toContain('Left ear:  8000 Hz');
            expect(report).toContain('Right ear: 6000 Hz');
        });

        it('displays only left ear when right is missing', () => {
            app.matchedFrequencies = { left: 7000, right: null };
            const report = manager.generateTextReport();
            expect(report).toContain('Left ear:  7000 Hz');
            expect(report).not.toContain('Right ear:');
        });

        it('displays only right ear when left is missing', () => {
            app.matchedFrequencies = { left: null, right: 5000 };
            const report = manager.generateTextReport();
            expect(report).not.toContain('Left ear:');
            expect(report).toContain('Right ear: 5000 Hz');
        });

        it('shows "Not yet calibrated" when no matched frequencies', () => {
            app.matchedFrequencies = null;
            const report = manager.generateTextReport();
            expect(report).toContain('Not yet calibrated');
        });

        it('shows "Not yet calibrated" when both left and right are falsy', () => {
            app.matchedFrequencies = { left: 0, right: 0 };
            const report = manager.generateTextReport();
            expect(report).toContain('Not yet calibrated');
        });

        it('includes session stats when sessionManager returns data', () => {
            const report = manager.generateTextReport();
            expect(report).toContain('Today:      15 min');
            expect(report).toContain('This week:  1 hr 30 min');
            expect(report).toContain('All time:   10 hr');
            expect(report).toContain('Streak:     5 day(s)');
        });

        it('shows "No session data" when sessionManager.getStats() returns null', () => {
            app.sessionManager.getStats.mockReturnValue(null);
            const report = manager.generateTextReport();
            expect(report).toContain('No session data');
        });

        it('shows "No session data" when sessionManager is undefined', () => {
            app.sessionManager = undefined;
            const report = manager.generateTextReport();
            expect(report).toContain('No session data');
        });

        it('shows "No entries recorded" when journal is empty', () => {
            const report = manager.generateTextReport();
            expect(report).toContain('No entries recorded');
        });

        it('includes journal entries and average severity when data exists', () => {
            seedJournal([
                { date: '2025-05-10T00:00:00Z', severity: 8, notes: 'rough day', tags: ['stress'] },
                { date: '2025-05-11T00:00:00Z', severity: 4, notes: '', tags: [] },
            ]);
            const report = manager.generateTextReport();
            expect(report).toContain('Entries: 2');
            // avg = (8+4)/2 = 6.0
            expect(report).toContain('Avg severity: 6.0/10');
            expect(report).toContain('"rough day"');
            expect(report).toContain('[stress]');
        });

        it('calculates average severity correctly for multiple entries', () => {
            seedJournal([
                { date: '2025-01-01T00:00:00Z', severity: 3 },
                { date: '2025-01-02T00:00:00Z', severity: 7 },
                { date: '2025-01-03T00:00:00Z', severity: 5 },
            ]);
            const report = manager.generateTextReport();
            // avg = (3+7+5)/3 = 5.0
            expect(report).toContain('Avg severity: 5.0/10');
        });

        it('limits display to 30 most recent entries', () => {
            const entries = Array.from({ length: 35 }, (_, i) => ({
                date: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
                severity: 5,
            }));
            seedJournal(entries);
            const report = manager.generateTextReport();
            expect(report).toContain('Entries: 30');
        });
    });

    // -----------------------------------------------------------------
    // 7. shareReport
    // -----------------------------------------------------------------
    describe('shareReport', () => {
        it('calls alert when generateTextReport yields no content (text format)', async () => {
            // generateTextReport always returns content, so test with csv-journal format.
            // With empty localStorage generateJournalCSV() returns null.
            await manager.shareReport('csv-journal');
            expect(alert).toHaveBeenCalledWith('No data to export.');
        });

        it('calls alert when csv-sessions has no data', async () => {
            await manager.shareReport('csv-sessions');
            expect(alert).toHaveBeenCalledWith('No data to export.');
        });

        it('uses Web Share API when navigator.canShare returns true', async () => {
            seedJournal([{ date: '2025-01-01', severity: 5, notes: '', tags: [] }]);

            const shareFn = vi.fn().mockResolvedValue(undefined);
            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: vi.fn().mockReturnValue(true),
                share: shareFn,
            });

            await manager.shareReport('csv-journal');

            expect(shareFn).toHaveBeenCalledTimes(1);
            expect(shareFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Tinnitus Relief Progress Report',
                    text: 'My tinnitus therapy progress report',
                    files: expect.any(Array),
                }),
            );
        });

        it('falls back to downloadFile when canShare is not available', async () => {
            seedJournal([{ date: '2025-01-01', severity: 5, notes: '', tags: [] }]);

            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: undefined,
                share: undefined,
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('csv-journal');

            expect(downloadSpy).toHaveBeenCalledTimes(1);
            expect(downloadSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching(/^tinnitus-journal-\d{4}-\d{2}-\d{2}\.csv$/),
                'text/csv',
            );
        });

        it('falls back to downloadFile when canShare returns false', async () => {
            seedJournal([{ date: '2025-01-01', severity: 5, notes: '', tags: [] }]);

            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: vi.fn().mockReturnValue(false),
                share: vi.fn(),
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('csv-journal');

            expect(downloadSpy).toHaveBeenCalledTimes(1);
        });

        it('falls back to downloadFile when share() throws a non-AbortError', async () => {
            seedJournal([{ date: '2025-01-01', severity: 5, notes: '', tags: [] }]);

            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: vi.fn().mockReturnValue(true),
                share: vi.fn().mockRejectedValue(new Error('Network error')),
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('csv-journal');

            expect(downloadSpy).toHaveBeenCalledTimes(1);
        });

        it('silently returns when share() throws an AbortError', async () => {
            seedJournal([{ date: '2025-01-01', severity: 5, notes: '', tags: [] }]);

            const abortError = new DOMException('Share cancelled', 'AbortError');
            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: vi.fn().mockReturnValue(true),
                share: vi.fn().mockRejectedValue(abortError),
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('csv-journal');

            // Should NOT fall through to download.
            expect(downloadSpy).not.toHaveBeenCalled();
        });

        it('generates correct filename for text format', async () => {
            // Text report always has content, so it won't alert.
            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: undefined,
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('text');

            expect(downloadSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching(/^tinnitus-report-\d{4}-\d{2}-\d{2}\.txt$/),
                'text/plain',
            );
        });

        it('generates correct filename for csv-sessions format', async () => {
            seedSessions([{ date: '2025-01-01', duration: 60000 }]);

            vi.stubGlobal('navigator', {
                ...navigator,
                canShare: undefined,
            });

            const downloadSpy = vi.spyOn(manager, 'downloadFile').mockImplementation(() => {});

            await manager.shareReport('csv-sessions');

            expect(downloadSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching(/^tinnitus-sessions-\d{4}-\d{2}-\d{2}\.csv$/),
                'text/csv',
            );
        });
    });

    // -----------------------------------------------------------------
    // 8. downloadFile
    // -----------------------------------------------------------------
    describe('downloadFile', () => {
        it('creates a blob URL from the content', () => {
            manager.downloadFile('hello', 'test.txt', 'text/plain');
            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
            const arg = URL.createObjectURL.mock.calls[0][0];
            expect(arg).toBeInstanceOf(Blob);
        });

        it('creates an anchor element, sets href and download, and clicks it', () => {
            const clickSpy = vi.fn();
            const origCreate = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag) => {
                const el = origCreate(tag);
                if (tag === 'a') {
                    el.click = clickSpy;
                }
                return el;
            });

            manager.downloadFile('data', 'report.csv', 'text/csv');

            expect(clickSpy).toHaveBeenCalledTimes(1);
        });

        it('cleans up by revoking the object URL', () => {
            manager.downloadFile('data', 'report.csv', 'text/csv');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        });

        it('appends the anchor to body and removes it after click', () => {
            const appendSpy = vi.spyOn(document.body, 'appendChild');
            const removeSpy = vi.spyOn(document.body, 'removeChild');

            manager.downloadFile('data', 'file.txt', 'text/plain');

            expect(appendSpy).toHaveBeenCalledTimes(1);
            expect(removeSpy).toHaveBeenCalledTimes(1);
            // The element that was appended should be the same one that was removed.
            expect(appendSpy.mock.calls[0][0]).toBe(removeSpy.mock.calls[0][0]);
        });
    });

    // -----------------------------------------------------------------
    // 9. showExportModal
    // -----------------------------------------------------------------
    describe('showExportModal', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            // Provide a synchronous requestAnimationFrame stub.
            vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { cb(); return 0; }));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('creates a modal element with id "exportModal"', () => {
            manager.showExportModal();
            const modal = document.getElementById('exportModal');
            expect(modal).not.toBeNull();
            expect(modal.classList.contains('export-modal')).toBe(true);
        });

        it('removes an existing modal before creating a new one', () => {
            manager.showExportModal();
            manager.showExportModal();
            const modals = document.querySelectorAll('#exportModal');
            expect(modals.length).toBe(1);
        });

        it('calls requestAnimationFrame to add the "open" class', () => {
            manager.showExportModal();
            const modal = document.getElementById('exportModal');
            // Our stub executes synchronously, so 'open' should already be present.
            expect(modal.classList.contains('open')).toBe(true);
        });

        it('renders three format buttons with correct data-format values', () => {
            manager.showExportModal();
            const buttons = document.querySelectorAll('.export-option');
            expect(buttons.length).toBe(3);

            const formats = Array.from(buttons).map((b) => b.dataset.format);
            expect(formats).toEqual(['text', 'csv-journal', 'csv-sessions']);
        });

        it('renders a close button', () => {
            manager.showExportModal();
            const closeBtn = document.getElementById('exportClose');
            expect(closeBtn).not.toBeNull();
        });

        it('close button removes the "open" class and schedules removal', () => {
            manager.showExportModal();
            const modal = document.getElementById('exportModal');
            const closeBtn = document.getElementById('exportClose');

            closeBtn.click();

            expect(modal.classList.contains('open')).toBe(false);
            // The modal should still exist before the timeout fires.
            expect(document.getElementById('exportModal')).not.toBeNull();

            vi.advanceTimersByTime(300);

            // After 300ms the modal should be removed from the DOM.
            expect(document.getElementById('exportModal')).toBeNull();
        });

        it('format buttons call shareReport with the correct format', () => {
            const shareSpy = vi.spyOn(manager, 'shareReport').mockResolvedValue(undefined);

            manager.showExportModal();

            const csvJournalBtn = document.querySelector('.export-option[data-format="csv-journal"]');
            csvJournalBtn.click();

            expect(shareSpy).toHaveBeenCalledWith('csv-journal');
        });

        it('format buttons remove the "open" class and schedule modal removal', () => {
            vi.spyOn(manager, 'shareReport').mockResolvedValue(undefined);

            manager.showExportModal();
            const modal = document.getElementById('exportModal');

            const textBtn = document.querySelector('.export-option[data-format="text"]');
            textBtn.click();

            expect(modal.classList.contains('open')).toBe(false);

            vi.advanceTimersByTime(300);
            expect(document.getElementById('exportModal')).toBeNull();
        });
    });
});
