const fs = require('fs');
let code = fs.readFileSync('src/bot/TeamsAttendanceBot.ts', 'utf8');

const replacement = \
        app.onActivity('message', async (context) => {
            const text = context.activity.text ? context.activity.text.trim().toLowerCase() : '';
            const value = context.activity.value;
            const teamsUserId = context.activity.from?.id || '';

            // 1. Employee Linking Logic
            const employee = await BackendService.getEmployeeByTeamsUserId(teamsUserId);
            
            if (!employee) {
                // Not linked yet
                if (text && text.includes('@')) {
                    const email = text.trim();
                    try {
                        await BackendService.linkTeamsUserId(email, teamsUserId);
                        await context.sendActivity(MessageFactory.text('Account successfully linked! Type \\'hello\\' to open the menu.'));
                    } catch (e) {
                        await context.sendActivity(MessageFactory.text('Error linking account. Did your admin create an account for that email?'));
                    }
                } else {
                    await context.sendActivity(MessageFactory.text('Welcome to Ascentware Bot! I don\\'t recognize your Teams account.\\\\nPlease type your official company email address to link your account.'));
                }
                return;
            }

            if (value && (value as any).action) {
                await this.handleCardAction(context, value, employee);
            } else if (text === 'hello' || text === 'hi' || text === 'check in' || text === 'start') {
\;

code = code.replace(/app\.onActivity\('message', async \\(context\\) => \\{\\s+const text = context\.activity\.text \\? context\.activity\.text\.trim\\(\\)\.toLowerCase\\(\\) : '';\\s+const value = context\.activity\.value;\\s+if \\(value && \\(value as any\\)\.action\\) \\{\\s+await this\.handleCardAction\\(context, value\\);\\s+\\} else if \\(text === 'hello' \\|\\| text === 'hi' \\|\\| text === 'check in' \\|\\| text === 'start'\\) \\{/, replacement);

code = code.replace(/private async handleCardAction\\(context: TurnContext, value: any\\) \\{/, 'private async handleCardAction(context: TurnContext, value: any, employee: any) {');

fs.writeFileSync('src/bot/TeamsAttendanceBot.ts', code);
