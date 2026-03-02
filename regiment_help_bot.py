# Updates for regiment_help_bot.py

## New Features:
1. **Carry/Carrier Terminology:** Implement a new terminology for users related to carry and carrier events.
2. **Log Carry Button:** Added a button for logging carry events, allowing users to track their carries.
3. **Cooldown System:** Introduced a cooldown system to prevent users from triggering carry events too frequently.
4. **24-hour Role Tracking:** Implemented a system to track roles for 24 hours for accurate usage statistics.
5. **Carrier of the Week Feature:** A new feature that recognizes and rewards the 'Carrier of the Week'.

### Implementation Details:
- The cooldown system will utilize timestamps to manage frequency of carry logs.
- The role tracking will reset every 24 hours.
- Weekly updates will determine the Carrier based on a point system tied to the carry logs.

# Change Log
- Updated carry terminology throughout the codebase.
- Added functions for cooldown and role tracking.
- Created a mechanism for determining and announcing the Carrier of the Week.

# Additional Notes
- Ensure to test all new features thoroughly before deployment.
- Confirm that logging mechanisms do not interfere with existing functionalities.
- Regular updates will be required to optimize the new features and address any user feedback.