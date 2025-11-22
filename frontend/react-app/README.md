# Project Requirements
**Regular Users**
- [x] A page that displays the current available points.
- [x] A page that displays the user's QR code for the purpose of initiating a transaction.
- [ ] A page that allows the user to manually enter a user ID to transfer points (QR code scanning capability is NOT required.)
- [ ] A page that allows the user to make a point redemption request
- [ ] A page that displays the QR code of an unprocessed redemption request.
- [ ] A page that displays all available promotions.
- [ ] A page that displays all published events.
- [ ] A page that displays a specific event and allows a user to RSVP to an event.
- [ ] A page that displays all past transactions for the current logged in user (with filters, order-by, and pagination).
    - Each transaction card should be displayed "nicely", e.g., instead of relatedId, it should display the utorid of the sender/receiver.
    - Some way to make each transaction type distinct in appearance, e.g., using different colors.

**Cashiers**
- [ ] A page that allows the cashier to create a transaction.
    - QR code scanning capability is NOT required.
- [ ] A page that allows the cashier to manually enter a transaction ID to process redemption requests.
    - QR code scanning capability is NOT required.

**Managers**
- [ ] A page that displays all users with filters, order-by, and pagination).
- [ ] A page that allows managers to update users, e.g., make a user verified, promote a user to cashier, etc.
- [ ] A page that displays ALL transactions (with filters, order-by, and pagination).
- [ ] A page that displays a specific transaction, with the option of creating an adjustment transaction for it, and marking it as suspicious.
- [ ] A page that allows managers to create new promotions.
- [ ] A page that displays all promotions (with filters, order-by, and pagination).
- [ ] A page that allows managers to view/edit/delete a specific promotion.
- [ ] A page that allows managers to create new events.
- [ ] A page that displays all events (with filters, order-by, and pagination).
- [ ] A page that allows managers to view/edit/delete a specific event.
- [ ] A page that allows managers to add or remove users from an event.

**Event Organizer (and all Managers)**
- [ ] A page that displays the events that the user is responsible for.
- [ ] A page that allows the user to view/edit a specific event that he/she is responsible for.
- [ ] A page that allows adding a user to the event that he/she is responsible for.
- [ ] A page that allows awarding points to a single guest, or to all guests who have RSVPed.

**Superuser**
- [ ] The ability to promote any user to managers or superusers.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
