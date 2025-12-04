# Basic Functionality
**Regular Users**
- [x] A page that displays the current available points.
- [x] A page that displays the user's QR code for the purpose of initiating a transaction.
- [x] A page that allows the user to manually enter a user ID to transfer points (QR code scanning capability is NOT required.)
- [ ] A page that allows the user to make a point redemption request
- [ ] A page that displays the QR code of an unprocessed redemption request.
- [ ] A page that displays all available promotions.
- [x] A page that displays all published events.
- [x] A page that displays a specific event and allows a user to RSVP to an event.
- [ ] A page that displays all past transactions for the current logged in user (with filters, order-by, and pagination).
    - Each transaction card should be displayed "nicely", e.g., instead of relatedId, it should display the utorid of the sender/receiver.
    - Some way to make each transaction type distinct in appearance, e.g., using different colors.

**Cashiers**
- [x] A page that allows the cashier to create a transaction.
    - QR code scanning capability is NOT required.
- [ ] A page that allows the cashier to manually enter a transaction ID to process redemption requests.
    - QR code scanning capability is NOT required.

**Managers**
- [ ] A page that displays all users with filters, order-by, and pagination.
- [ ] A page that allows managers to update users, e.g., make a user verified, promote a user to cashier, etc.
- [x] A page that displays ALL transactions (with filters, order-by, and pagination).
- [x] A page that displays a specific transaction, with the option of creating an adjustment transaction for it, and marking it as suspicious.
- [ ] A page that allows managers to create new promotions.
- [ ] A page that displays all promotions (with filters, order-by, and pagination).
- [ ] A page that allows managers to view/edit/delete a specific promotion.
- [x] A page that allows managers to create new events.
- [x] A page that displays all events (with filters, order-by, and pagination).
- [x] A page that allows managers to view/edit/delete a specific event.
- [x] A page that allows managers to add or remove users from an event.

**Event Organizer (and all Managers)**
- [x] A page that displays the events that the user is responsible for.
- [x] A page that allows the user to view/edit a specific event that he/she is responsible for.
- [x] A page that allows adding a user to the event that he/she is responsible for.
- [x] A page that allows awarding points to a single guest, or to all guests who have RSVPed.

**Superuser**
- [ ] The ability to promote any user to managers or superusers.

# Required Pages
**Landing Page (10 marks)**
- [x] Regular users (3 points):
    - Dashboard showing points balance and recent transactions.
- [x] Cashiers (3 points):
    - Quick access to transaction creation and redemption processing.
- [x] Managers & Superusers (4 points):
    - Overview of events, promotions, and user management.

**Accounts (60 marks)**
- [x] Login (5 marks):
    - Users can log in with their credentials.
- [x] Registration (5 marks):
    - Cashiers (or higher) can create accounts for users.
- [x] Profile Management (5 marks):
    - Users can update their account information and passwords.
- [x] Password Reset (5 marks):
    - Users can reset their password if they have forgotten.
- [ ] Interface Switching (15 marks):
    - Users can switch between different interfaces (e.g., cashier, event organizer, manager).
    - For example, a manager can switch to the regular user interface to accumulate points, while a regular user who is also an event organizer can switch to the organizer interface to manage events.
- [x] User Listing (15 marks): Managers can view a list of users.
- [x] User Management (10 marks): Mangers can verify a user and make a cashier either suspicious or not. Managers or higher can promote/demote users.

**Transactions (50 marks)**
- [x] Purchase (10 marks):
    - Cashiers can create purchase transactions.
    - Cashiers can correctly apply promotions to transactions.
- [x] Redemption (10 marks):
    - Users can make a redemption request.
    - Cashiers can process the redemption request.
- [x] Adjustment (5 marks):
    - Managers can create adjustment transactions.
- [x] Transfer (10 marks):
    - Users can transfer points to another user. 
- [x] Transaction Listing (15 marks) Users can see their past transactions. Managers can see ALL transactions.

**Events (45 marks)**
- [x] Event Management (15 marks):
    - Managers can create, update, and delete events. (DONE)
    - Managers can add event organizers. (DONE)
    - Event organizers can update events.
- [x] Event Listing (15 marks):
    - All logged in users can view the list of events. (DONE)
- [x] RSVP and Attendance (10 marks):
    - Users can RSVP to events. (DONE)
    - Managers and event organizers can add guests to an event. (only managers rn)
    - Managers can remove guests from an event. (DONE)
- [x] Point Allocation (5 marks):
    - Managers and event organizers can award points to guests.

**Promotions (25 marks)**
- [x] Promotion Management (10 marks):
    - Managers can create, update, and delete promotions.
- [x] Promotion Listing (15 marks):
    - All logged in users can view the list of promotions.


# Feature Ideas
- Need to find  online prisma db
