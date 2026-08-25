import { CardFactory } from 'botbuilder';

export class CardBuilder {
    static getCheckInCard() {
        return CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.3",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Good Morning 👋",
                    "weight": "Bolder",
                    "size": "Medium"
                },
                {
                    "type": "TextBlock",
                    "text": "Status: Not Checked In",
                    "isSubtle": true
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Check In",
                    "data": { "action": "checkIn" }
                }
            ]
        });
    }

    static getWorkingCard(attendanceId: string) {
        return CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.3",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Working",
                    "weight": "Bolder",
                    "size": "Medium",
                    "color": "Good"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Start Break",
                    "data": { "action": "startBreak", "attendanceId": attendanceId }
                },
                {
                    "type": "Action.Submit",
                    "title": "Check Out",
                    "data": { "action": "checkOut", "attendanceId": attendanceId }
                }
            ]
        });
    }

    static getOnBreakCard(attendanceId: string) {
        return CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.3",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "On Break",
                    "weight": "Bolder",
                    "size": "Medium",
                    "color": "Warning"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Resume Work",
                    "data": { "action": "endBreak", "attendanceId": attendanceId }
                }
            ]
        });
    }

    static getReadOnlyReceiptCard(title: string, message: string) {
        return CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.3",
            "body": [
                {
                    "type": "TextBlock",
                    "text": title,
                    "weight": "Bolder",
                    "size": "Medium",
                    "color": "Good"
                },
                {
                    "type": "TextBlock",
                    "text": message,
                    "isSubtle": true
                }
            ]
        });
    }
}
