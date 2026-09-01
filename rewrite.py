import re

with open('src/bot/TeamsAttendanceBot.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace imports
code = code.replace(
    "import { ActivityHandler, MessageFactory, TurnContext } from 'botbuilder';",
    "import { MessageFactory, TurnContext } from 'botbuilder';\nimport { AgentApplication, TurnState } from '@microsoft/agents-hosting';"
)

# Replace class declaration
code = code.replace(
    "export class TeamsAttendanceBot extends ActivityHandler {",
    "export class TeamsAttendanceBot {"
)

# Find constructor
constructor_start = code.find("constructor() {")

# Find the end of constructor (assuming it ends right before 'async handleTextMessage')
constructor_end = code.find("    async handleTextMessage", constructor_start)

if constructor_start != -1 and constructor_end != -1:
    new_constructor = """    registerHandlers(app: AgentApplication<TurnState>) {
        app.onActivity('message', async (context: TurnContext) => {
            if (context.activity.value) {
                await this.handleCardAction(context, context.activity.value);
            } else {
                await this.handleTextMessage(context);
            }
        });
        
        app.onActivity('conversationUpdate', async (context: TurnContext) => {
            if (context.activity.membersAdded && context.activity.recipient) {
                for (const member of context.activity.membersAdded) {
                    if (member.id !== context.activity.recipient.id) {
                        await context.sendActivity('Welcome to the Attendance Bot! Type "hello" to check in.');
                    }
                }
            }
        });
    }

"""
    code = code[:constructor_start] + new_constructor + code[constructor_end:]

with open('src/bot/TeamsAttendanceBot.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("done")
