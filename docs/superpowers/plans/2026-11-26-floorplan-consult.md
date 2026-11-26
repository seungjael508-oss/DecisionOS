# Floorplan consultation implementation plan

Reuse the authorized unit detail form and current-contract consultation save action. Add floorplan as an exact, project-scoped return context, with the visible building group restored. Open the existing consultation form first, and label successful return to the board. Do not alter the queue, badge rules, or database.
- Test tile route, return scope and saving without a Today task action.
- Add the route/context and render the form first for floorplan visits.
- Verify regression tests, types and lint, then keep the change in an isolated local commit.
