import { MessageFactory, TurnContext } from 'botbuilder';
import { AgentApplication, TurnState } from '@microsoft/agents-hosting';
import { BackendService } from './services/BackendService';
import { CardBuilder } from './cards/CardBuilder';
import { PlanTasksCard } from './cards/PlanTasksCard';
import { ReviewTasksCard } from './cards/ReviewTasksCard';
import * as fs from 'fs';
import * as path from 'path';

const MAP_FILE = path.join(__dirname, '../../activityMap.json');
const CONSUMED_FILE = path.join(__dirname, '../../consumedIds.json');

export class TeamsAttendanceBot {
    private static activityMap: Record<string, string> = {};
    private static consumedIds: Record<string, boolean> = {};
    private static processingIds = new Set<string>();

    private static loadData() {
        if (fs.existsSync(MAP_FILE)) {
            try { this.activityMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')); } catch (e) {}
        }
        if (fs.existsSync(CONSUMED_FILE)) {
            try { this.consumedIds = JSON.parse(fs.readFileSync(CONSUMED_FILE, 'utf8')); } catch (e) {}
        }
    }

    private static saveData() {
        try { fs.writeFileSync(MAP_FILE, JSON.stringify(this.activityMap)); } catch (e) {}
        try { fs.writeFileSync(CONSUMED_FILE, JSON.stringify(this.consumedIds)); } catch (e) {}
    }

    private static setActivity(key: string, id: string) {
        this.activityMap[key] = id;
        this.saveData();
    }

    private static getActivity(key: string): string | null {
        return this.activityMap[key] || null;
    }

    private static deleteActivity(key: string) {
        delete this.activityMap[key];
        this.saveData();
    }

    private static markConsumed(id: string) {
        this.consumedIds[id] = true;
        this.saveData();
    }

    private static isConsumed(id: string): boolean {
        return !!this.consumedIds[id];
    }

    constructor() {
        TeamsAttendanceBot.loadData();
    }

    registerHandlers(app: AgentApplication<TurnState>) {
        app.onActivity('conversationUpdate', async (context) => {
            const membersAdded = context.activity.membersAdded;
            if (membersAdded && membersAdded.length > 0) {
                for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                    if (membersAdded[cnt].id !== context.activity.recipient?.id) {
                        const response = await context.sendActivity({ type: 'message', attachments: [CardBuilder.getCheckInCard()] } as any);
                        if (response && response.id) {
                            TeamsAttendanceBot.setActivity(membersAdded[cnt].id + '_checkIn', response.id);
                        }
                    }
                }
            }
        });

        app.onActivity('message', async (context) => {
            const text = context.activity.text ? context.activity.text.trim().toLowerCase() : '';
            const value = context.activity.value;

            if (value && (value as any).action) {
                await this.handleCardAction(context, value);
            } else if (text === 'hello' || text === 'hi' || text === 'check in' || text === 'start') {
                const response = await context.sendActivity({ type: 'message', attachments: [CardBuilder.getCheckInCard()] } as any);
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity(context.activity.from?.id + '_checkIn', response.id);
                }
            } else {
                await context.sendActivity("Type 'hello' to open the menu, or click the buttons on the cards.");
            }
        });
    }

    async handleCardAction(context: any, value: any) {
        const teamsUserId = context.activity.from?.id;
        let fallbackId = (value as any).attendanceId ? TeamsAttendanceBot.getActivity((value as any).attendanceId + '_' + (value as any).action) : null;
        if (!fallbackId) {
            fallbackId = TeamsAttendanceBot.getActivity(teamsUserId + '_' + (value as any).action) || null;
        }
        
        // Prioritize our internally tracked fallback ID, because the emulator's replyToId
        // can sometimes point to the user's original message rather than the bot's card.
        const replyToId = fallbackId || context.activity.replyToId;
        
        console.log(`[DEBUG] action=${(value as any).action}, activity.id=${context.activity.id}, activity.replyToId=${context.activity.replyToId}, fallbackId=${fallbackId}, final replyToId=${replyToId}`);

        // Idempotency: Prevent double-clicks and reuse of old consumed cards
        if (replyToId) {
            if (TeamsAttendanceBot.isConsumed(replyToId) || TeamsAttendanceBot.processingIds.has(replyToId)) {
                return;
            }
            TeamsAttendanceBot.processingIds.add(replyToId);
        }

        try {
            if ((value as any).action === 'checkIn') {
                const attendance = await BackendService.checkIn(teamsUserId);
                
                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Checked In", `Time: ${new Date(attendance.checkIn).toLocaleTimeString()}`)] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }
                
                const response = await context.sendActivity({ type: 'message', attachments: [PlanTasksCard.getCard(attendance.id)] });
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity(attendance.id + '_saveAllTasks', response.id);
                }
            } 
            else if ((value as any).action === 'saveAllTasks') {
                const tasks = [];
                let totalEstimatedMinutes = 0;

                for (let i = 1; i <= 5; i++) {
                    const tName = value[`taskName_${i}`];
                    if (tName && tName.trim() !== '') {
                        const estimatedMinutes = parseInt(value[`estimatedMinutes_${i}`], 10) || 0;
                        totalEstimatedMinutes += estimatedMinutes;
                        
                        tasks.push({
                            taskName: tName,
                            priority: value[`priority_${i}`],
                            estimatedMinutes: estimatedMinutes
                        });
                    }
                }
                
                const permissionMinutes = parseInt(value.permissionMinutes, 10) || 0;
                const grandTotal = totalEstimatedMinutes + permissionMinutes;

                if (grandTotal !== 480) {
                    const errorMsg = `Your planned tasks (${totalEstimatedMinutes} mins) plus approved leave/permission (${permissionMinutes} mins) equals ${grandTotal} mins. Your plan must account for exactly 8 hours (480 mins). Please adjust your plan below.`;
                    
                    // The emulator sometimes fails to render updated cards, so we also send the error as a normal text message.
                    await context.sendActivity(MessageFactory.text(`⚠️ Validation Error: ${errorMsg}`));

                    if (replyToId) {
                        try { await context.deleteActivity(replyToId); } catch (e) {}
                        TeamsAttendanceBot.processingIds.delete(replyToId);
                    }
                    
                    const response = await context.sendActivity({ type: 'message', attachments: [PlanTasksCard.getCard((value as any).attendanceId, errorMsg, value)] });
                    if (response && response.id) {
                        TeamsAttendanceBot.setActivity((value as any).attendanceId + '_saveAllTasks', response.id);
                    }
                    
                    return; // Prevent saving
                }
                
                if (tasks.length > 0 || permissionMinutes > 0) {
                    await BackendService.saveWorkPlan((value as any).attendanceId, tasks, permissionMinutes);
                }

                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Day Planned", `Saved ${tasks.length} tasks and ${permissionMinutes} mins of leave.`)] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }

                const response = await context.sendActivity({ type: 'message', attachments: [CardBuilder.getWorkingCard((value as any).attendanceId)] });
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_startBreak', response.id);
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_checkOut', response.id);
                }
            }
            else if ((value as any).action === 'startBreak') {
                await BackendService.startBreak((value as any).attendanceId);
                
                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Break Started", "Have a good rest!")] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }

                const response = await context.sendActivity({ type: 'message', attachments: [CardBuilder.getOnBreakCard((value as any).attendanceId)] });
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_endBreak', response.id);
                }
            }
            else if ((value as any).action === 'endBreak') {
                await BackendService.endBreak((value as any).attendanceId);

                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Break Ended", "Back to work!")] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }

                const response = await context.sendActivity({ type: 'message', attachments: [CardBuilder.getWorkingCard((value as any).attendanceId)] });
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_startBreak', response.id);
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_checkOut', response.id);
                }
            }
            else if ((value as any).action === 'checkOut') {
                const tasks = await BackendService.getTasks((value as any).attendanceId);

                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Reviewing Day", "Initiating checkout process...")] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }

                const response = await context.sendActivity({ type: 'message', attachments: [ReviewTasksCard.getCard((value as any).attendanceId, tasks)] });
                if (response && response.id) {
                    TeamsAttendanceBot.setActivity((value as any).attendanceId + '_submitReview', response.id);
                }
            }
            else if ((value as any).action === 'submitReview') {
                const tasksToUpdate = [];
                for (const key of Object.keys(value)) {
                    if (key.startsWith('status_')) {
                        const taskId = key.replace('status_', '');
                        tasksToUpdate.push({
                            id: taskId,
                            status: value[key],
                            timeTakenMinutes: value[`timeTaken_${taskId}`],
                            remarks: value[`remarks_${taskId}`] || ''
                        });
                    }
                }

                if (tasksToUpdate.length > 0) {
                    await BackendService.bulkUpdateTasks(tasksToUpdate);
                }

                const result = await BackendService.checkOut((value as any).attendanceId);

                if (replyToId) {
                    try { await context.deleteActivity(replyToId); } catch (e) {}
                    await context.sendActivity({ 
                        attachments: [CardBuilder.getReadOnlyReceiptCard("Checked Out", `Working Time: ${result.workingMinutes} mins, Break Time: ${result.breakMinutes} mins`)] 
                    });
                    TeamsAttendanceBot.markConsumed(replyToId);
                }

                await context.sendActivity(MessageFactory.text("You are checked out for the day. See you tomorrow!"));
            }
        } catch (error: any) {
            console.error(error);
            let msg = error.message;
            if (error.response && error.response.data && error.response.data.error) {
                msg = typeof error.response.data.error === 'object' ? JSON.stringify(error.response.data.error) : error.response.data.error;
            }
            await context.sendActivity(MessageFactory.text(`Error: ${msg}`));
        } finally {
            if (replyToId) {
                TeamsAttendanceBot.processingIds.delete(replyToId);
            }
        }
    }
}
