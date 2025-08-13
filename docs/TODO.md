# TODO List

## WebApp Enhancement 
- [x] Replace "Records" by "Items".
- [x] Remove useless spanish words.
- [x] The steps Overview > Planning > Items > Analytics.
- [x] Use of sections Columns (one for penefits and the other one for expenses that should be sections opposite).
- [x] Use of rows and twos columns for data sections.
- [x] Items of "Manual Budget (Bank and Planned Deductions)" Not saved that gon when reload the page. Items could be positive benefits or expenses.
- [x] Manual Budget (Bank and Planned Deductions) default values (All items must be 0).
- [x] Review and enhance UI/UX based on PDF and Web Preview.
- [x] Improve project layout (Current structure follows Go standards well).
- [x] Fix add income/outcome Source bug.
- [x] Refactor and clean code.
- [x] Add lint and test jobs to the CI.
- [x] Add tests for Go and React (backend + frontend suites in place; expand coverage ongoing)
- [ ] Give unsaved rows a client UUID key to avoid index-key edge cases.
- [ ] Add a small unit test for the merge helper to guarantee behavior across refactors.
- [ ] Consider pausing auto-reload while the user is actively editing an unsaved row to reduce distractions.
- [ ] Harden UpdateUserStatus allowed values (done in code; keep for audit trail)
- [ ] Improve decimal parsing for locale inputs (implemented parseLocaleAmount normalization)
- [ ] Make selected header options less transparent / higher contrast (updated CSS + active classes)
- [ ] Persist manual budget added items reliably across reload (hook + integration test improved)
